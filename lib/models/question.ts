import mongoose, { Schema, Document } from 'mongoose';

export interface QuestionDocument extends Document {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  season?: number;
  episode?: string;
  funFact?: string;
  source: {
    url: string;
    description: string;
  };
}

const QuestionSchema = new Schema({
  questionText: { type: String, required: true, unique: true },
  options: { type: [String], required: true },
  correctAnswerIndex: { type: Number, required: true },
  category: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  season: { type: Number },
  episode: { type: String },
  funFact: { type: String },
  source: {
    url: { type: String, required: true },
    description: { type: String, required: true },
  },
}, { timestamps: true });

export const QuestionModel = mongoose.models.Question as mongoose.Model<QuestionDocument> ||
  mongoose.model<QuestionDocument>('Question', QuestionSchema);
