import mongoose, { Schema, Document } from 'mongoose';

export interface PackDocument extends Document {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  themeColor: string;
  icon: string;
  isDefault: boolean;
  questions: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const PackSchema = new Schema({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  tagline: { type: String, required: true },
  description: { type: String, required: true },
  themeColor: { type: String, required: true },
  icon: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
}, { timestamps: true });

export const PackModel = mongoose.models.Pack as mongoose.Model<PackDocument> ||
  mongoose.model<PackDocument>('Pack', PackSchema);
