'use client';

import ReactionCluster, { type ReactionCounts } from '@/components/ReactionCluster';

interface QuestionCardProps {
  questionText: string;
  options: string[];
  questionIndex: number;
  totalQuestions: number;
  category?: string;
  difficulty?: string;
  selectedAnswer?: number | null;
  correctAnswer?: number | null;
  onSelect?: (index: number) => void;
  disabled?: boolean;
  size?: 'display' | 'player';
  reactions?: ReactionCounts;
}

const optionColors = [
  'bg-[#c62828] hover:brightness-110 shadow-[0_4px_0_0_#7f1010]',
  'bg-[#1565c0] hover:brightness-110 shadow-[0_4px_0_0_#0c3a70]',
  'bg-[#2e7d32] hover:brightness-110 shadow-[0_4px_0_0_#1b4d1e]',
  'bg-[#f9a825] hover:brightness-110 text-trivia-navy shadow-[0_4px_0_0_#b9770b]',
];

const optionLabels = ['A', 'B', 'C', 'D'];

export default function QuestionCard({
  questionText,
  options,
  questionIndex,
  totalQuestions,
  category,
  difficulty,
  selectedAnswer,
  correctAnswer,
  onSelect,
  disabled,
  size = 'display',
  reactions,
}: QuestionCardProps) {
  const isDisplay = size === 'display';
  const isRevealed = correctAnswer !== null && correctAnswer !== undefined;

  return (
    <div className="w-full">
      {isDisplay && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          <span className="rounded-full bg-trivia-badge px-4 py-1.5 text-xs font-extrabold tracking-[0.12em] text-white shadow-md">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
        </div>
      )}

      {!isDisplay && (
        <div className="mb-3 flex items-center justify-between">
          <span className="rounded-full bg-trivia-badge/95 px-3 py-1 text-[11px] font-extrabold tracking-wider text-white">
            {questionIndex + 1} / {totalQuestions}
          </span>
          <div className="flex flex-wrap justify-end gap-1.5">
            {category && (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/80">
                {category}
              </span>
            )}
            {difficulty && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                  difficulty === 'easy'
                    ? 'bg-trivia-mint/25 text-trivia-mint'
                    : difficulty === 'medium'
                      ? 'bg-trivia-gold/20 text-trivia-gold'
                      : 'bg-red-500/25 text-red-200'
                }`}
              >
                {difficulty}
              </span>
            )}
          </div>
        </div>
      )}

      <div className={`mb-3 flex justify-end ${isDisplay ? 'pr-1' : ''}`}>
        <ReactionCluster counts={reactions} />
      </div>

      {isDisplay && (category || difficulty) && (
        <div className="mb-4 flex flex-wrap justify-center gap-2">
          {category && (
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm font-bold text-white/80">
              {category}
            </span>
          )}
          {difficulty && (
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                difficulty === 'easy'
                  ? 'bg-trivia-mint/20 text-trivia-mint'
                  : difficulty === 'medium'
                    ? 'bg-trivia-gold/20 text-trivia-gold'
                    : 'bg-red-500/20 text-red-200'
              }`}
            >
              {difficulty}
            </span>
          )}
        </div>
      )}

      <div className={isDisplay ? 'trivia-question-slab px-6 py-8 sm:px-10 sm:py-10' : 'rounded-2xl border border-white/10 bg-trivia-navy-mid/80 px-4 py-5'}>
        <h2
          className={`relative z-1 font-extrabold leading-tight text-white ${
            isDisplay ? 'text-3xl sm:text-4xl md:text-5xl' : 'text-xl sm:text-2xl'
          }`}
        >
          {questionText}
        </h2>
      </div>

      <div
        className={`grid grid-cols-1 gap-3 ${isDisplay ? 'mt-8 md:grid-cols-2' : 'mt-5 md:grid-cols-2'}`}
      >
        {options.map((option, i) => {
          let classes = optionColors[i];

          if (isRevealed) {
            if (i === correctAnswer) {
              classes = 'bg-emerald-500 ring-2 ring-trivia-mint/80 shadow-[0_4px_0_0_#0d4d2a]';
            } else if (i === selectedAnswer && i !== correctAnswer) {
              classes = 'bg-red-900/80 opacity-80';
            } else {
              classes = 'bg-trivia-navy/80 opacity-45';
            }
          } else if (selectedAnswer === i) {
            classes = `${optionColors[i]} ring-2 ring-white/90 ring-offset-2 ring-offset-trivia-navy`;
          }

          return (
            <button
              key={i}
              type="button"
              onClick={() => !disabled && !isRevealed && onSelect?.(i)}
              disabled={disabled || isRevealed}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`animate-trivia-in-up ${classes} ${
                isDisplay ? 'rounded-2xl p-5 text-left text-lg sm:text-xl' : 'rounded-xl p-4 text-left text-base'
              } font-extrabold text-white transition-all duration-200 ${
                !disabled && !isRevealed ? 'cursor-pointer active:translate-y-0.5 active:shadow-none' : 'cursor-default'
              }`}
            >
              <span
                className={`mr-3 inline-flex shrink-0 items-center justify-center rounded-lg bg-black/20 font-black ${
                  isDisplay ? 'h-10 w-10 text-lg' : 'h-8 w-8 text-sm'
                }`}
              >
                {optionLabels[i]}
              </span>
              <span className="align-middle">{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
