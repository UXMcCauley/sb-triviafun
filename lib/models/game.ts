import mongoose, { Schema, Document } from 'mongoose';
import type { Game } from './types';

export interface GameDocument extends Omit<Game, 'createdAt' | 'packIds' | 'questions'>, Document {
  packIds: mongoose.Types.ObjectId[];
  questions: mongoose.Types.ObjectId[];
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

const GameSchema = new Schema({
  gameCode: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['lobby', 'active', 'finished'], default: 'lobby' },
  packIds: [{ type: Schema.Types.ObjectId, ref: 'Pack' }],
  questions: [{ type: Schema.Types.ObjectId, ref: 'Question' }],
  // Parallel arrays for per-game option shuffling
  shuffledOptionOrders: { type: [[Number]], default: [] },
  shuffledCorrectAnswers: { type: [Number], default: [] },
  currentQuestionIndex: { type: Number, default: 0 },
  players: { type: [PlayerSchema], default: [] },
  questionStartedAt: { type: Number, default: null },
  settings: {
    timerSeconds: { type: Number, default: 15 },
    questionCount: { type: Number, default: 15 },
  },
  seriesId: { type: String, index: true },
  seriesIndex: { type: Number, default: 0 },
}, { timestamps: true });

export const GameModel = mongoose.models.Game as mongoose.Model<GameDocument> ||
  mongoose.model<GameDocument>('Game', GameSchema);
