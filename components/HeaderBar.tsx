'use client';

import React from 'react';
import type { LearningLevel, ConversationMode } from '@/lib/types';
import { Volume2, VolumeX, Shield, Star, Sparkles } from 'lucide-react';

interface HeaderBarProps {
  level: LearningLevel;
  stars: number;
  mode: ConversationMode;
  audioEnabled: boolean;
  onToggleAudio: () => void;
  onOpenParentModal: () => void;
}

const LEVEL_LABELS: Record<LearningLevel, { title: string; color: string; badge: string }> = {
  1: {
    title: 'Level 1: Words',
    badge: 'L1',
    color: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  2: {
    title: 'Level 2: Phrases',
    badge: 'L2',
    color: 'bg-sky-100 text-sky-800 border-sky-300',
  },
  3: {
    title: 'Level 3: Sentences',
    badge: 'L3',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
  },
};

const MODE_LABELS: Record<ConversationMode, { label: string; icon: string; bg: string }> = {
  LEARNING: { label: 'Learning', icon: '📚', bg: 'bg-amber-100 text-amber-900 border-amber-300' },
  CONVERSATION: { label: 'Chatting', icon: '💬', bg: 'bg-blue-100 text-blue-900 border-blue-300' },
  ENGAGEMENT: { label: 'Playing', icon: '🎮', bg: 'bg-pink-100 text-pink-900 border-pink-300' },
  SUPPORT: { label: 'Help & Care', icon: '🌸', bg: 'bg-rose-100 text-rose-900 border-rose-300' },
  BREAK: { label: 'Resting', icon: '🌙', bg: 'bg-indigo-100 text-indigo-900 border-indigo-300' },
};

export function HeaderBar({
  level,
  stars,
  mode,
  audioEnabled,
  onToggleAudio,
  onOpenParentModal,
}: HeaderBarProps) {
  const currentLvl = LEVEL_LABELS[level] || LEVEL_LABELS[1];
  const currentMode = MODE_LABELS[mode] || MODE_LABELS.LEARNING;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b-2 border-amber-100 shadow-sm px-2.5 sm:px-6 py-2 sm:py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-1.5 sm:gap-3">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-400 flex items-center justify-center text-white shadow-md shadow-amber-200">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 fill-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-extrabold text-amber-950 tracking-tight leading-tight flex items-center gap-1">
              LittleTalk <span className="text-amber-500">AI</span>
            </h1>
            <p className="text-[10px] sm:text-[11px] font-semibold text-amber-700/80 -mt-0.5 hidden sm:block">
              English Learning for Kids
            </p>
          </div>
        </div>

        {/* Center Indicators: Level & Mode */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Level Badge */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full border text-[11px] sm:text-sm font-bold shadow-xs ${currentLvl.color}`}
            title="Your child's learning stage"
          >
            <span className="hidden sm:inline">{currentLvl.title}</span>
            <span className="sm:hidden">{currentLvl.badge}</span>
          </div>

          {/* Mode Pill */}
          <div
            className={`hidden md:flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-bold shadow-xs ${currentMode.bg}`}
          >
            <span>{currentMode.icon}</span>
            <span>{currentMode.label}</span>
          </div>
        </div>

        {/* Right Actions: Stars, Audio, Parent Portal */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Stars Counter */}
          <div
            className="flex items-center gap-1 bg-amber-50 border-2 border-amber-300/80 px-2 sm:px-3 py-1 rounded-full text-amber-900 font-extrabold text-xs sm:text-base shadow-xs"
            title={`${stars} Stars Earned!`}
          >
            <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-amber-400 text-amber-500 animate-wiggle shrink-0" />
            <span>{stars}</span>
          </div>

          {/* Audio Read-Aloud Toggle */}
          <button
            onClick={onToggleAudio}
            aria-label={audioEnabled ? 'Turn speech audio off' : 'Turn speech audio on'}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer ${
              audioEnabled
                ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
            }`}
            title={audioEnabled ? 'Voice is ON' : 'Voice is OFF'}
          >
            {audioEnabled ? (
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          {/* Parent Zone Button */}
          <button
            onClick={onOpenParentModal}
            className="flex items-center gap-1 bg-white hover:bg-amber-50 text-amber-900 border-2 border-amber-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs hover:border-amber-400 cursor-pointer"
            title="Parent Area: View progress & safety controls"
          >
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
            <span className="hidden sm:inline">Parents</span>
          </button>
        </div>
      </div>
    </header>
  );
}
