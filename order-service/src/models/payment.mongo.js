import mongoose from 'mongoose';

const PaymentSchema = new mongoose.Schema({
  orderId: { type: mongoose.Types.ObjectId, ref: 'Order', unique: true, required: true },
  provider: { type: String, default: 'stripe_test' },
  intentId: { type: String, unique: true },
  status: { type: String, enum: ['requires_action','requires_payment_method','processing','succeeded','failed','canceled'] },
  amount: { type: Number, min: 0, required: true },
  currency: { type: String, default: 'EUR' },
  raw: {}
}, { timestamps: true });

export const Payment = mongoose.model('Payment', PaymentSchema);
