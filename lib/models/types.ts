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

export interface Question {
  questionText: string;
  options: [string, string, string, string];
  correctAnswerIndex: number;
  category?: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export type GameStatus = 'lobby' | 'active' | 'finished';

export interface Game {
  gameCode: string;
  status: GameStatus;
  questions: Question[];
  currentQuestionIndex: number;
  players: Player[];
  questionStartedAt: number | null; // timestamp when current question started
  timerDuration: number; // seconds
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

export interface AnswerRevealEvent {
  questionIndex: number;
  correctAnswerIndex: number;
  players: { id: string; name: string; score: number }[];
}

export interface GameFinishedEvent {
  players: { id: string; name: string; score: number }[];
  winner: { id: string; name: string; score: number };
}
