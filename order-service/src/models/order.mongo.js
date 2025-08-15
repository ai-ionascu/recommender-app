import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  status: { type: String, enum: ['pending','pending_payment','paid','shipped','delivered','cancelled'], default: 'pending_payment' },
  currency: { type: String, default: 'EUR' },
  totalAmount: { type: Number, min: 0, required: true },
  items: { type: [OrderItemSchema], default: [] }
}, { timestamps: true });

OrderSchema.index({ userId: 1, createdAt: -1 });

export const Order = mongoose.model('Order', OrderSchema);
