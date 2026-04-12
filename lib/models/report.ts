import mongoose, { Schema, Document } from 'mongoose';

export interface ReportDocument extends Document {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  reportedBy: string; // player name
  gameCode: string;
  reason?: string;
  createdAt: Date;
}

const ReportSchema = new Schema({
  questionText: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswerIndex: { type: Number, required: true },
  reportedBy: { type: String, required: true },
  gameCode: { type: String, required: true },
  reason: { type: String },
}, { timestamps: true });

export const ReportModel = mongoose.models.Report as mongoose.Model<ReportDocument> ||
  mongoose.model<ReportDocument>('Report', ReportSchema);
