import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: Set MONGODB_URI environment variable');
  process.exit(1);
}

const QuestionSchema = new mongoose.Schema({
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

const Question = mongoose.models.Question || mongoose.model('Question', QuestionSchema);

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected.');

  const questionsPath = path.join(__dirname, '..', 'data', 'questions.json');
  const raw = fs.readFileSync(questionsPath, 'utf-8');
  const questions = JSON.parse(raw);

  console.log(`Found ${questions.length} questions in seed file.`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const q of questions) {
    try {
      const result = await Question.findOneAndUpdate(
        { questionText: q.questionText },
        {
          $set: {
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            category: q.category,
            difficulty: q.difficulty,
            season: q.season,
            episode: q.episode,
            funFact: q.funFact || undefined,
            source: q.source,
          },
        },
        { upsert: true, new: true, rawResult: true }
      );

      if (result.lastErrorObject?.updatedExisting) {
        updated++;
      } else {
        created++;
      }
    } catch (err: unknown) {
      errors++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`  Error upserting "${q.questionText.slice(0, 50)}...": ${message}`);
    }
  }

  console.log(`\nDone! Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
  console.log(`Total questions in DB: ${await Question.countDocuments()}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
