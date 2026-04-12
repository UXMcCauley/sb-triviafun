import { QuestionModel, type QuestionDocument } from './models/question';
import { PackModel } from './models/pack';
import mongoose from 'mongoose';

/**
 * Shuffle an array using Fisher-Yates algorithm.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Generate a 4-character game code.
 */
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Select random questions for a game from the given packs.
 * If no packIds provided, uses default packs.
 */
export async function selectQuestionsForGame(
  packIds: mongoose.Types.ObjectId[] | string[] | undefined,
  count: number
): Promise<QuestionDocument[]> {
  let matchFilter: Record<string, unknown>;

  if (packIds && packIds.length > 0) {
    const objectIds = packIds.map((id) =>
      typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
    );
    matchFilter = { packIds: { $in: objectIds } };
  } else {
    // Use default packs
    const defaultPacks = await PackModel.find({ isDefault: true }).select('_id');
    const defaultIds = defaultPacks.map((p) => p._id);
    if (defaultIds.length > 0) {
      matchFilter = { packIds: { $in: defaultIds } };
    } else {
      matchFilter = {};
    }
  }

  const dbCount = await QuestionModel.countDocuments(matchFilter);
  if (dbCount === 0) return [];

  const sampled = await QuestionModel.aggregate([
    { $match: matchFilter },
    { $sample: { size: Math.min(count, dbCount) } },
  ]);

  // Convert aggregation results back to documents
  return sampled.map((q) => q as QuestionDocument);
}

/**
 * Generate shuffle mappings for a set of questions.
 * Returns parallel arrays: one for option orders, one for shuffled correct answer indices.
 */
export function generateShuffleMappings(
  questions: Array<{ options: string[]; correctAnswerIndex: number }>
): {
  shuffledOptionOrders: number[][];
  shuffledCorrectAnswers: number[];
} {
  const shuffledOptionOrders: number[][] = [];
  const shuffledCorrectAnswers: number[] = [];

  for (const q of questions) {
    // Create indexed options
    const indices = q.options.map((_, i) => i);
    const shuffledIndices = shuffleArray(indices);

    shuffledOptionOrders.push(shuffledIndices);
    shuffledCorrectAnswers.push(
      shuffledIndices.indexOf(q.correctAnswerIndex)
    );
  }

  return { shuffledOptionOrders, shuffledCorrectAnswers };
}

/**
 * Apply shuffle mapping to a question's options to get the display-ready version.
 */
export function getShuffledQuestion(
  question: { questionText: string; options: string[]; category?: string; difficulty: string; source?: { url: string; description: string } },
  optionOrder: number[]
): {
  questionText: string;
  options: string[];
  category?: string;
  difficulty: string;
  source?: { url: string; description: string };
} {
  return {
    questionText: question.questionText,
    options: optionOrder.map((i) => question.options[i]),
    category: question.category,
    difficulty: question.difficulty,
    source: question.source,
  };
}

/**
 * Resolve pack ObjectIds from slugs or IDs.
 */
export async function resolvePackIds(
  packIdsOrSlugs: string[]
): Promise<mongoose.Types.ObjectId[]> {
  // Try to determine if these are ObjectIds or slugs
  const objectIds: mongoose.Types.ObjectId[] = [];
  const slugs: string[] = [];

  for (const val of packIdsOrSlugs) {
    if (mongoose.Types.ObjectId.isValid(val) && String(new mongoose.Types.ObjectId(val)) === val) {
      objectIds.push(new mongoose.Types.ObjectId(val));
    } else {
      slugs.push(val);
    }
  }

  if (slugs.length > 0) {
    const packs = await PackModel.find({ slug: { $in: slugs } }).select('_id');
    objectIds.push(...packs.map((p) => p._id as mongoose.Types.ObjectId));
  }

  return objectIds;
}
