'use client';

import React, { useState } from 'react';
import type { ActivityDisplay, AnswerResponse } from '@/lib/types';
import { Lightbulb, Volume2, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';

interface ActivityCardProps {
  activity: ActivityDisplay;
  onAnswer: (answer: string) => Promise<AnswerResponse | null>;
  onNextQuestion: () => void;
  audioEnabled: boolean;
  onSpeak: (text: string) => void;
}

export function ActivityCard({
  activity,
  onAnswer,
  onNextQuestion,
  audioEnabled,
  onSpeak,
}: ActivityCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleSelect = async (optValue: string) => {
    if (selectedOption !== null || isSubmitting) return;

    setSelectedOption(optValue);
    setIsSubmitting(true);

    try {
      const res = await onAnswer(optValue);
      setAnswerResult(res);
      if (res && audioEnabled) {
        onSpeak(res.feedback);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setAnswerResult(null);
    setShowHint(false);
    onNextQuestion();
  };

  return (
    <div className="w-full bg-white rounded-3xl sm:rounded-4xl border-3 border-amber-200/90 shadow-xl overflow-hidden p-4 sm:p-6 transition-all">
      {/* Activity Header */}
      <div className="flex items-center justify-between gap-2 border-b border-amber-100 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider">
            {activity.topic}
          </span>
          <span className="text-xs font-semibold text-gray-500">
            Level {activity.level}
          </span>
        </div>

        {/* Listen to Question Button */}
        <button
          onClick={() => onSpeak(activity.question)}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
          title="Read question aloud"
        >
          <Volume2 className="w-4 h-4 text-amber-600" />
          <span>Listen</span>
        </button>
      </div>

      {/* Main Question & Image Hint */}
      <div className="text-center my-3 sm:my-4">
        {activity.imageHint && (
          <div className="text-5xl sm:text-6xl mb-3 select-none filter drop-shadow-md animate-bounce-gentle">
            {activity.imageHint}
          </div>
        )}
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight leading-snug">
          {activity.question}
        </h2>
      </div>

      {/* Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 my-5">
        {activity.options.map((opt) => {
          const isChosen = selectedOption === opt.value;
          const hasResult = answerResult !== null;
          const isCorrect = answerResult?.correctAnswer === opt.value;

          let btnStyle =
            'bg-amber-50/70 hover:bg-amber-100 text-gray-800 border-2 border-amber-200 hover:border-amber-300';

          if (hasResult) {
            if (isCorrect) {
              btnStyle = 'bg-emerald-500 text-white border-2 border-emerald-600 shadow-lg scale-102';
            } else if (isChosen && !isCorrect) {
              btnStyle = 'bg-rose-100 text-rose-800 border-2 border-rose-300 opacity-80';
            } else {
              btnStyle = 'bg-gray-100 text-gray-400 border-2 border-gray-200 opacity-50';
            }
          }

          return (
            <button
              key={opt.id}
              disabled={selectedOption !== null || isSubmitting}
              onClick={() => handleSelect(opt.value)}
              className={`w-full min-h-[58px] sm:min-h-[64px] px-4 py-3 rounded-2xl sm:rounded-3xl font-extrabold text-base sm:text-lg flex items-center justify-between transition-all duration-200 cursor-pointer shadow-sm active:scale-98 ${btnStyle} ${
                selectedOption === null ? 'hover:-translate-y-0.5' : ''
              }`}
            >
              <span className="flex-1 text-center font-bold">{opt.label}</span>
              {hasResult && isCorrect && (
                <CheckCircle2 className="w-6 h-6 text-white shrink-0 ml-2" />
              )}
              {hasResult && isChosen && !isCorrect && (
                <XCircle className="w-6 h-6 text-rose-600 shrink-0 ml-2" />
              )}
            </button>
          );
        })}
      </div>

      {/* Hint Drawer */}
      {activity.hint && !answerResult && (
        <div className="mt-2 text-center">
          {!showHint ? (
            <button
              onClick={() => setShowHint(true)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-600 hover:text-amber-800 transition-colors"
            >
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>Need a hint?</span>
            </button>
          ) : (
            <div className="inline-block bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-xs sm:text-sm font-medium text-amber-900 animate-fade-in">
              💡 <span className="font-bold">Hint:</span> {activity.hint}
            </div>
          )}
        </div>
      )}

      {/* Answer Feedback Banner & Next Button */}
      {answerResult && (
        <div className="mt-5 p-4 rounded-2xl sm:rounded-3xl border-2 transition-all animate-fade-in bg-amber-50/90 border-amber-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p
                className={`text-base sm:text-lg font-extrabold ${
                  answerResult.correct ? 'text-emerald-700' : 'text-amber-900'
                }`}
              >
                {answerResult.feedback}
              </p>
              {answerResult.stars && answerResult.stars > 0 ? (
                <p className="text-xs sm:text-sm font-bold text-amber-600 flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                  <Sparkles className="w-4 h-4 fill-amber-400 text-amber-500" />
                  <span>+{answerResult.stars} Star!</span>
                </p>
              ) : null}
            </div>

            <button
              onClick={handleNext}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-base px-6 py-3 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>Next Question</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
