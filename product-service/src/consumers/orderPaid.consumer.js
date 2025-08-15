import amqp from 'amqplib';
import { pool } from '../config/db.js';
import { ProductRepository } from '../repositories/product.repository.js';

const url = process.env.RABBITMQ_URL || 'amqp://appuser:appsecret@rabbitmq:5672';
const exchange = process.env.RABBITMQ_EXCHANGE || 'events';
const queue = process.env.RABBITMQ_STOCK_QUEUE || 'product.stock.adjust';
const routingKey = 'order.paid';

async function alreadyProcessed(client, eventType, eventId) {
  const { rows } = await client.query(
    `SELECT 1 FROM processed_events WHERE event_type = $1 AND event_id = $2 LIMIT 1`,
    [eventType, eventId]
  );
  return rows.length > 0;
}

async function markProcessed(client, eventType, eventId) {
  await client.query(
    `INSERT INTO processed_events (event_type, event_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [eventType, eventId]
  );
}

export async function startOrderPaidConsumer() {
  const conn = await amqp.connect(url);
  const ch = await conn.createChannel();

  await ch.assertExchange(exchange, 'topic', { durable: true });

  // DLX for invalid messages
  const dlx = `${exchange}.dlx`;
  const dlq = `${queue}.dlq`;
  await ch.assertExchange(dlx, 'fanout', { durable: true });
  await ch.assertQueue(dlq, { durable: true });
  await ch.bindQueue(dlq, dlx, '');

  await ch.assertQueue(queue, {
    durable: true,
    arguments: {
      'x-dead-letter-exchange': dlx
    }
  });
  await ch.bindQueue(queue, exchange, routingKey);

  await ch.prefetch(1);
  console.log('[Rabbit][product-service] waiting on', queue, 'for', routingKey);

  ch.consume(queue, async (msg) => {
    if (!msg) return;
    const text = msg.content.toString();
    console.log('[order.paid] received:', text);
    try {
      const payload = JSON.parse(text);
      const eventId = payload.orderId;
      const client = await pool.connect();
      try {
        await ProductRepository.begin(client);

        const done = await alreadyProcessed(client, payload.event, eventId);
        if (done) {
          console.log('[order.paid] duplicate event, skipping:', eventId);
          await ProductRepository.commit(client);
          ch.ack(msg);
          return;
        }

        for (const it of payload.items) {
          const pid = Number(it.productId);
          if (!Number.isFinite(pid)) throw new Error(`Invalid productId ${it.productId}`);
          const ok = await ProductRepository.decrementStockTx(client, pid, it.qty);
          if (!ok) throw new Error(`Insufficient or missing product ${pid}`);
        }

        await markProcessed(client, payload.event, eventId);
        await ProductRepository.commit(client);
        console.log('[order.paid] adjusted stock for items:', payload.items.map(i=>i.productId).join(','));
        ch.ack(msg);
      } catch (e) {
        await ProductRepository.rollback(client);
        console.error('[order.paid consumer] tx error:', e.message);
        // Important: NO requeue. Will go to DLQ via x-dead-letter-exchange
        if (/Invalid productId|Insufficient|missing product/i.test(e.message)) {
          try { await markProcessed(client, payload.event, eventId); } catch {}
          ch.nack(msg, false, false);
        } else {
          ch.nack(msg, false, false);
        }
      } finally {
        client.release();
      }
    } catch (e) {
      console.error('[order.paid consumer] invalid message:', e.message);
      ch.ack(msg);
    }
  });
}
