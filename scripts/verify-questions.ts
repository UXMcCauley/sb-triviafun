import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('ERROR: Set ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

interface Question {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  category?: string;
  difficulty?: string;
  season?: number;
  episode?: string;
  source?: { url: string; description: string };
}

interface VerificationResult {
  index: number;
  questionText: string;
  markedAnswer: string;
  verdict: 'correct' | 'incorrect' | 'ambiguous';
  explanation: string;
  suggestedAnswer?: string;
}

async function verifyBatch(questions: Question[], startIdx: number): Promise<VerificationResult[]> {
  const batch = questions.map((q, i) => {
    const idx = startIdx + i;
    const letters = ['A', 'B', 'C', 'D'];
    const optionsList = q.options.map((opt, j) => `  ${letters[j]}. ${opt}`).join('\n');
    const markedLetter = letters[q.correctAnswerIndex];
    return `QUESTION ${idx + 1}:
${q.questionText}
${optionsList}
Marked correct: ${markedLetter}. ${q.options[q.correctAnswerIndex]}
${q.episode ? `Episode: ${q.episode}` : ''}${q.season ? ` (Season ${q.season})` : ''}`;
  }).join('\n\n---\n\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `You are a Seinfeld trivia expert. Verify whether each question below has the correct answer marked. For each question, respond with a JSON array of objects with these fields:
- "index": the question number
- "verdict": "correct" if the marked answer is factually right, "incorrect" if it's wrong, "ambiguous" if the question or answer is misleading/debatable
- "explanation": brief reason (1-2 sentences)
- "suggestedAnswer": only include this field if verdict is "incorrect" — give the letter (A/B/C/D) of the correct option, or "none" if correct answer isn't among the options

Respond with ONLY the JSON array, no markdown fences.

${batch}`
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    const results = JSON.parse(text.trim());
    return results.map((r: { index: number; verdict: string; explanation: string; suggestedAnswer?: string }) => {
      const qIdx = r.index - 1;
      const q = questions[qIdx - startIdx];
      return {
        index: r.index,
        questionText: q?.questionText || `Question ${r.index}`,
        markedAnswer: q ? q.options[q.correctAnswerIndex] : 'unknown',
        verdict: r.verdict as 'correct' | 'incorrect' | 'ambiguous',
        explanation: r.explanation,
        suggestedAnswer: r.suggestedAnswer,
      };
    });
  } catch {
    console.error('Failed to parse API response for batch starting at', startIdx);
    console.error('Response:', text.slice(0, 500));
    return [];
  }
}

async function main() {
  // Read all pack files
  const packsDir = path.join(__dirname, '..', 'data', 'packs');
  const packFiles = fs.readdirSync(packsDir).filter((f) => f.endsWith('.json'));

  const allQuestions: { pack: string; questions: Question[] }[] = [];

  for (const file of packFiles) {
    const raw = fs.readFileSync(path.join(packsDir, file), 'utf-8');
    const pack = JSON.parse(raw);
    if (pack.questions && pack.questions.length > 0) {
      allQuestions.push({ pack: pack.name, questions: pack.questions });
    }
  }

  if (allQuestions.length === 0) {
    console.log('No questions found to verify.');
    return;
  }

  const allResults: VerificationResult[] = [];
  const BATCH_SIZE = 10;

  for (const { pack, questions } of allQuestions) {
    console.log(`\nVerifying pack: ${pack} (${questions.length} questions)`);
    console.log('='.repeat(60));

    for (let i = 0; i < questions.length; i += BATCH_SIZE) {
      const batch = questions.slice(i, i + BATCH_SIZE);
      process.stdout.write(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(questions.length / BATCH_SIZE)}...`);

      try {
        const results = await verifyBatch(batch, i);
        allResults.push(...results);

        const incorrect = results.filter((r) => r.verdict === 'incorrect').length;
        const ambiguous = results.filter((r) => r.verdict === 'ambiguous').length;
        console.log(` done (${incorrect} incorrect, ${ambiguous} ambiguous)`);
      } catch (err) {
        console.log(` ERROR: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  const correct = allResults.filter((r) => r.verdict === 'correct');
  const incorrect = allResults.filter((r) => r.verdict === 'incorrect');
  const ambiguous = allResults.filter((r) => r.verdict === 'ambiguous');

  console.log(`Total verified: ${allResults.length}`);
  console.log(`  Correct:   ${correct.length}`);
  console.log(`  Incorrect: ${incorrect.length}`);
  console.log(`  Ambiguous: ${ambiguous.length}`);

  if (incorrect.length > 0) {
    console.log('\n--- INCORRECT ANSWERS ---');
    for (const r of incorrect) {
      console.log(`\n  Q${r.index}: ${r.questionText}`);
      console.log(`    Marked: ${r.markedAnswer}`);
      console.log(`    Suggested: ${r.suggestedAnswer}`);
      console.log(`    Reason: ${r.explanation}`);
    }
  }

  if (ambiguous.length > 0) {
    console.log('\n--- AMBIGUOUS QUESTIONS ---');
    for (const r of ambiguous) {
      console.log(`\n  Q${r.index}: ${r.questionText}`);
      console.log(`    Marked: ${r.markedAnswer}`);
      console.log(`    Reason: ${r.explanation}`);
    }
  }

  // Write full results to file
  const outputPath = path.join(__dirname, '..', 'data', 'verification-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
  console.log(`\nFull results saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
