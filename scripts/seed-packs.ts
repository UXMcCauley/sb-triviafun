import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

// Load .env.local if environment variable not already set
if (!process.env.MONGODB_URI) {
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
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('ERROR: Set MONGODB_URI environment variable');
  process.exit(1);
}

const PackSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  tagline: { type: String, required: true },
  description: { type: String, required: true },
  themeColor: { type: String, required: true },
  icon: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
  questions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
}, { timestamps: true });

const QuestionSchema = new mongoose.Schema({
  questionText: { type: String, required: true, unique: true },
  options: { type: [String], required: true },
  correctAnswerIndex: { type: Number, required: true },
  packIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Pack', index: true }],
  category: { type: String },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  season: { type: Number },
  episode: { type: String },
  source: {
    url: { type: String, required: true },
    description: { type: String, required: true },
  },
  funFact: { type: String },
}, { timestamps: true });

const Pack = mongoose.models.Pack || mongoose.model('Pack', PackSchema);
const Question = mongoose.models.Question || mongoose.model('Question', QuestionSchema);

interface PackFileQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  category?: string;
  difficulty: string;
  season?: number;
  episode?: string;
  source: { url: string; description: string };
  funFact?: string;
}

interface PackFile {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  themeColor: string;
  icon: string;
  isDefault: boolean;
  questions: PackFileQuestion[];
}

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected.');

  const packsDir = path.join(__dirname, '..', 'data', 'packs');
  const packFiles = fs.readdirSync(packsDir).filter((f) => f.endsWith('.json'));

  console.log(`Found ${packFiles.length} pack files.`);

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const file of packFiles) {
    const raw = fs.readFileSync(path.join(packsDir, file), 'utf-8');
    const packData: PackFile = JSON.parse(raw);

    console.log(`\nProcessing pack: ${packData.name} (${packData.slug})`);

    // Upsert the pack (without questions array first)
    const pack = await Pack.findOneAndUpdate(
      { slug: packData.slug },
      {
        $set: {
          name: packData.name,
          tagline: packData.tagline,
          description: packData.description,
          themeColor: packData.themeColor,
          icon: packData.icon,
          isDefault: packData.isDefault,
        },
      },
      { upsert: true, new: true }
    );

    const questionIds: mongoose.Types.ObjectId[] = [];
    let created = 0;
    let updated = 0;
    let errors = 0;

    for (const q of packData.questions) {
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
              source: q.source,
              funFact: q.funFact,
            },
            $addToSet: { packIds: pack._id },
          },
          { upsert: true, new: true, rawResult: true }
        );

        const questionDoc = await Question.findOne({ questionText: q.questionText });
        if (questionDoc) {
          questionIds.push(questionDoc._id as mongoose.Types.ObjectId);
        }

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

    // Update pack with question references
    await Pack.findByIdAndUpdate(pack._id, { $set: { questions: questionIds } });

    console.log(`  Questions - Created: ${created}, Updated: ${updated}, Errors: ${errors}`);
    totalCreated += created;
    totalUpdated += updated;
    totalErrors += errors;
  }

  console.log(`\n--- Summary ---`);
  console.log(`Total questions created: ${totalCreated}`);
  console.log(`Total questions updated: ${totalUpdated}`);
  console.log(`Total errors: ${totalErrors}`);
  console.log(`Total questions in DB: ${await Question.countDocuments()}`);
  console.log(`Total packs in DB: ${await Pack.countDocuments()}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
