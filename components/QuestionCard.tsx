'use client';

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
}

const optionColors = [
  'bg-red-600 hover:bg-red-500',
  'bg-blue-600 hover:bg-blue-500',
  'bg-green-600 hover:bg-green-500',
  'bg-yellow-600 hover:bg-yellow-500',
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
}: QuestionCardProps) {
  const isDisplay = size === 'display';
  const isRevealed = correctAnswer !== null && correctAnswer !== undefined;

  return (
    <div className="w-full">
      {/* Question header */}
      <div className="flex items-center justify-between mb-4">
        <span className={`${isDisplay ? 'text-lg' : 'text-sm'} text-white/50 font-mono`}>
          Question {questionIndex + 1} / {totalQuestions}
        </span>
        <div className="flex gap-2">
          {category && (
            <span className={`${isDisplay ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'} bg-white/10 rounded-full text-white/70`}>
              {category}
            </span>
          )}
          {difficulty && (
            <span className={`${isDisplay ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5'} rounded-full ${
              difficulty === 'easy' ? 'bg-green-500/20 text-green-300' :
              difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-red-500/20 text-red-300'
            }`}>
              {difficulty}
            </span>
          )}
        </div>
      </div>

      {/* Question text */}
      <h2 className={`${isDisplay ? 'text-4xl' : 'text-xl'} font-bold text-white mb-8 leading-tight`}>
        {questionText}
      </h2>

      {/* Options grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((option, i) => {
          let classes = optionColors[i];

          if (isRevealed) {
            if (i === correctAnswer) {
              classes = 'bg-green-500 ring-4 ring-green-300';
            } else if (i === selectedAnswer && i !== correctAnswer) {
              classes = 'bg-red-800 opacity-60';
            } else {
              classes = 'bg-gray-700 opacity-40';
            }
          } else if (selectedAnswer === i) {
            classes = `${optionColors[i]} ring-4 ring-white`;
          }

          return (
            <button
              key={i}
              onClick={() => !disabled && !isRevealed && onSelect?.(i)}
              disabled={disabled || isRevealed}
              className={`${classes} ${isDisplay ? 'p-6 text-xl' : 'p-4 text-base'} rounded-xl font-semibold text-white text-left transition-all duration-200 flex items-center gap-4 ${
                !disabled && !isRevealed ? 'cursor-pointer active:scale-95' : 'cursor-default'
              }`}
            >
              <span className={`${isDisplay ? 'w-10 h-10 text-lg' : 'w-8 h-8 text-sm'} bg-white/20 rounded-lg flex items-center justify-center font-bold shrink-0`}>
                {optionLabels[i]}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
