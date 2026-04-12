import mongoose, { Schema, Document } from 'mongoose';

export interface PlayerStatsDocument extends Document {
  phone: string;
  displayName: string;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  bestScore: number;
  correctAnswers: number;
  totalAnswers: number;
  lastPlayedAt: Date;
  createdAt: Date;
}

const PlayerStatsSchema = new Schema({
  phone: { type: String, required: true, unique: true, index: true },
  displayName: { type: String, required: true },
  gamesPlayed: { type: Number, default: 0 },
  gamesWon: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  totalAnswers: { type: Number, default: 0 },
  lastPlayedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const PlayerStatsModel = mongoose.models.PlayerStats as mongoose.Model<PlayerStatsDocument> ||
  mongoose.model<PlayerStatsDocument>('PlayerStats', PlayerStatsSchema);
