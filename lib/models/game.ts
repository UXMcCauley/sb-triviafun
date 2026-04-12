import mongoose, { Schema, Document } from 'mongoose';
import type { Game } from './types';

export interface GameDocument extends Omit<Game, 'createdAt'>, Document {
  createdAt: Date;
}

const PlayerAnswerSchema = new Schema({
  questionIndex: { type: Number, required: true },
  selectedAnswer: { type: Number, required: true },
  timeToAnswer: { type: Number, required: true },
  correct: { type: Boolean, required: true },
}, { _id: false });

const PlayerSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  score: { type: Number, default: 0 },
  answers: { type: [PlayerAnswerSchema], default: [] },
}, { _id: false });

const QuestionSchema = new Schema({
  questionText: { type: String, required: true },
  options: { type: [String], required: true },
  correctAnswerIndex: { type: Number, required: true },
  category: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  funFact: { type: String },
}, { _id: false });

const GameSchema = new Schema({
  gameCode: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['lobby', 'active', 'finished'], default: 'lobby' },
  questions: { type: [QuestionSchema], required: true },
  currentQuestionIndex: { type: Number, default: 0 },
  players: { type: [PlayerSchema], default: [] },
  questionStartedAt: { type: Number, default: null },
  timerDuration: { type: Number, default: 15 },
}, { timestamps: true });

export const GameModel = mongoose.models.Game as mongoose.Model<GameDocument> ||
  mongoose.model<GameDocument>('Game', GameSchema);
