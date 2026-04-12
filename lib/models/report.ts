import mongoose, { Schema, Document } from 'mongoose';

export interface ReportDocument extends Document {
  questionId: mongoose.Types.ObjectId;
  reportedBy: string;
  gameCode: string;
  reason?: string;
  createdAt: Date;
}

const ReportSchema = new Schema({
  questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  reportedBy: { type: String, required: true },
  gameCode: { type: String, required: true, index: true },
  reason: { type: String },
}, { timestamps: true });

export const ReportModel = mongoose.models.Report as mongoose.Model<ReportDocument> ||
  mongoose.model<ReportDocument>('Report', ReportSchema);
