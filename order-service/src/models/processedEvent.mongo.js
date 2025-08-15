import mongoose from 'mongoose';

const ProcessedEventSchema = new mongoose.Schema({
  eventType: { type: String, required: true },
  eventId: { type: String, required: true },
}, { timestamps: true });

ProcessedEventSchema.index({ eventType: 1, eventId: 1 }, { unique: true });

export const ProcessedEvent = mongoose.model('ProcessedEvent', ProcessedEventSchema);
