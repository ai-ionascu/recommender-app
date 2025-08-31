import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  productId: { type: Number, required: true },
  qty: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 }
}, { _id: false });

/**
 * Basic shipping/billing shape (keep it minimal & optional).
 * Extend later if you need more fields.
 */
const AddressSchema = new mongoose.Schema({
  name: { type: String },          // recipient full name
  line1: { type: String },
  line2: { type: String },
  city: { type: String },
  state: { type: String },
  postalCode: { type: String },
  country: { type: String },       // ISO-2 preferred, e.g. "RO"
  phone: { type: String }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  status: {
    type: String,
    enum: ['pending','pending_payment','paid','shipped','delivered','cancelled'],
    default: 'pending_payment'
  },
  currency: { type: String, default: 'EUR' },

  // Active PaymentIntent id allowed to settle this order (set by ensurePaymentIntent)
  paymentIntentId: { type: String, index: true },

  // Totals (keep your existing field for compatibility)
  totalAmount: { type: Number, min: 0, required: true },

  // Items
  items: { type: [OrderItemSchema], default: [] },

  // Minimal customer + addresses (all optional)
  customerEmail: { type: String },
  customerPhone: { type: String },
  shippingAddress: { type: AddressSchema, default: undefined },
  billingAddress: { type: AddressSchema, default: undefined }
}, { timestamps: true });

OrderSchema.index({ userId: 1, createdAt: -1 });

export const Order = mongoose.model('Order', OrderSchema);
