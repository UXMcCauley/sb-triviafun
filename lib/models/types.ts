export interface PlayerAnswer {
  questionIndex: number;
  selectedAnswer: number;
  timeToAnswer: number; // seconds
  correct: boolean;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  answers: PlayerAnswer[];
}

export interface QuestionSource {
  url: string;
  description: string;
}

export interface Question {
  questionText: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  packIds: string[];
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  season?: number;
  episode?: string;
  source: QuestionSource;
}

export interface Pack {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  themeColor: string;
  icon: string;
  isDefault: boolean;
  questionCount: number;
}

export type GameStatus = 'lobby' | 'active' | 'finished';

export interface GameSettings {
  timerSeconds: number;
  questionCount: number;
}

export interface Game {
  gameCode: string;
  status: GameStatus;
  packIds: string[];
  questions: string[]; // ObjectId references as strings
  shuffledOptionOrders: number[][];
  shuffledCorrectAnswers: number[];
  currentQuestionIndex: number;
  players: Player[];
  questionStartedAt: number | null;
  settings: GameSettings;
  seriesId?: string;
  seriesIndex?: number;
  createdAt: Date;
}

// Pusher event payloads
export interface PlayerJoinedEvent {
  player: { id: string; name: string };
  players: { id: string; name: string }[];
}

export interface NewQuestionEvent {
  questionIndex: number;
  questionText: string;
  options: [string, string, string, string];
  category?: string;
  difficulty: string;
  totalQuestions: number;
  startedAt: number;
  timerDuration: number;
}

export interface PlayerResult {
  id: string;
  name: string;
  correct: boolean;
  timeToAnswer: number;
  pointsEarned: number;
  totalScore: number;
}

export interface AnswerRevealEvent {
  questionIndex: number;
  correctAnswerIndex: number;
  playerResults: PlayerResult[];
  players: { id: string; name: string; score: number }[];
  source?: QuestionSource | null;
  funFact?: string | null;
}

export interface GamePausedEvent {
  paused: boolean;
}

export interface GameFinishedEvent {
  players: { id: string; name: string; score: number }[];
  winner: { id: string; name: string; score: number };
}
