import mongoose from 'mongoose';

const ShippingSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address1: { type: String, required: true, trim: true },
    address2: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    zip: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    userId: { type: String, index: true },
    userEmail:   { type: String, index: true },
    status: { type: String, enum: ['pending_payment', 'paid', 'cancelled'], default: 'pending_payment' },
    items: [
      {
        productId: String,
        name: String,
        price: Number,
        qty: Number,
        image: String,
      }
    ],
    subtotal: { type: Number, default: 0 },
    currency: { type: String, default: 'eur' },
    stripePaymentIntentId: { type: String },
    shipping: { type: ShippingSchema, required: true }, // <-- nou
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', OrderSchema);
