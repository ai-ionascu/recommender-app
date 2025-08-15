import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
  priceSnapshot: { type: Number, required: true, min: 0 }
}, { _id: true });

const CartSchema = new mongoose.Schema({
  userId: { type: String, index: true, unique: true, required: true }, // UUID string din JWT
  items: { type: [CartItemSchema], default: [] }
}, { timestamps: true });

export const Cart = mongoose.model('Cart', CartSchema);
