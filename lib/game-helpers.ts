import { sql } from "./db";

export type DbQuestion = {
  id: string;
  question_text: string;
  options: string[];
  correct_answer_index: number;
  category: string | null;
  difficulty: "easy" | "medium" | "hard";
  season: number | null;
  episode: string | null;
  source: { url: string; description: string } | null;
  fun_fact: string | null;
};

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

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

/**
 * Select random questions for a game from the given packs.
 * If no packIds provided, uses default packs.
 */
export async function selectQuestionsForGame(
  packIds: string[] | undefined,
  count: number
): Promise<DbQuestion[]> {
  const resolvedPackIds = packIds && packIds.length > 0 ? await resolvePackIds(packIds) : null;

  // No packs selected: use default packs; if none default, sample globally.
  const basePackIds =
    resolvedPackIds && resolvedPackIds.length > 0
      ? resolvedPackIds
      : ((await sql`
          select id from packs where is_default = true
        `) as Array<{ id: string }>)
          .map((r) => r.id);

  let rows: unknown[];
  if (basePackIds.length > 0) {
    rows = await sql`
      select
        q.id,
        q.question_text,
        q.options,
        q.correct_answer_index,
        q.category,
        q.difficulty,
        q.season,
        q.episode,
        q.source,
        q.fun_fact
      from questions q
      where q.id in (
        select pq.question_id
        from pack_questions pq
        where pq.pack_id = any(${basePackIds}::uuid[])
      )
      order by random()
      limit ${count}
    `;
  } else {
    rows = await sql`
      select
        id,
        question_text,
        options,
        correct_answer_index,
        category,
        difficulty,
        season,
        episode,
        source,
        fun_fact
      from questions
      order by random()
      limit ${count}
    `;
  }

  return (rows as Array<any>).map((r) => ({
    ...r,
    options: Array.isArray(r.options) ? r.options : r.options ?? [],
    source: r.source ?? null,
  })) as DbQuestion[];
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
  question: {
    questionText: string;
    options: string[];
    category?: string | null;
    difficulty: string;
    source?: { url: string; description: string } | null;
  },
  optionOrder: number[]
): {
  questionText: string;
  options: string[];
  category?: string | null;
  difficulty: string;
  source?: { url: string; description: string } | null;
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
): Promise<string[]> {
  const ids: string[] = [];
  const slugs: string[] = [];

  for (const val of packIdsOrSlugs) {
    if (isUuid(val)) {
      ids.push(val);
    } else {
      slugs.push(val);
    }
  }

  if (slugs.length > 0) {
    const packs = (await sql`
      select id from packs where slug = any(${slugs})
    `) as Array<{ id: string }>;
    ids.push(...packs.map((p) => p.id));
  }

  return ids;
}
