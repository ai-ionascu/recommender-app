import amqp from 'amqplib';

const url = process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672';
const exchange = process.env.RABBITMQ_EXCHANGE || 'events';

let connection;
let channel;

export async function getChannel() {
  if (channel) return channel;
  connection = await amqp.connect(url);
  channel = await connection.createConfirmChannel(); // confirm channel => publish cu ack
  await channel.assertExchange(exchange, 'topic', { durable: true });
  console.log('[Rabbit] connected, exchange:', exchange);
  return channel;
}

export async function publishEvent(routingKey, message) {
  const ch = await getChannel();
  const payload = Buffer.from(JSON.stringify(message));
  await ch.publish(exchange, routingKey, payload, { persistent: true });
  // confirm publish (await nextTick confirm)
  await new Promise((resolve, reject) =>
    ch.waitForConfirms(err => (err ? reject(err) : resolve()))
  );
}
