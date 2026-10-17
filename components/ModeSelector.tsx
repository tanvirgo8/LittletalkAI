'use client';

import React, { useState, useEffect } from 'react';
import type { ConversationMode } from '@/lib/types';
import { BookOpen, MessageCircle, Gamepad2, Heart, Moon, Loader2 } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: ConversationMode;
  onSelectMode: (mode: ConversationMode, promptText: string) => void;
  disabled?: boolean;
}

const MODES = [
  {
    mode: 'CONVERSATION' as ConversationMode,
    label: "Let's Chat",
    icon: MessageCircle,
    prompt: "Hello Lumi! Let's chat!",
    color: 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-200',
    activeColor: 'ring-4 ring-sky-300 bg-sky-600 text-white',
  },
  {
    mode: 'LEARNING' as ConversationMode,
    label: 'Learn Words',
    icon: BookOpen,
    prompt: 'teach me words',
    color: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200',
    activeColor: 'ring-4 ring-emerald-300 bg-emerald-600 text-white',
  },
  {
    mode: 'ENGAGEMENT' as ConversationMode,
    label: 'Play Game',
    icon: Gamepad2,
    prompt: 'let\'s play a game',
    color: 'bg-purple-500 hover:bg-purple-600 text-white shadow-purple-200',
    activeColor: 'ring-4 ring-purple-300 bg-purple-600 text-white',
  },
  {
    mode: 'SUPPORT' as ConversationMode,
    label: 'Need Help',
    icon: Heart,
    prompt: 'I need some help',
    color: 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200',
    activeColor: 'ring-4 ring-rose-300 bg-rose-600 text-white',
  },
  {
    mode: 'BREAK' as ConversationMode,
    label: 'Take a Break',
    icon: Moon,
    prompt: 'I am tired, I want a break',
    color: 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-200',
    activeColor: 'ring-4 ring-indigo-300 bg-indigo-600 text-white',
  },
];

export function ModeSelector({
  currentMode,
  onSelectMode,
  disabled = false,
}: ModeSelectorProps) {
  const [pendingMode, setPendingMode] = useState<ConversationMode | null>(null);

  useEffect(() => {
    if (!disabled) {
      setPendingMode(null);
    }
  }, [disabled]);

  return (
    <nav
      aria-label="Activity Mode Options"
      className="w-full flex items-center justify-start sm:justify-center gap-1.5 sm:gap-2.5 py-1 sm:py-2 px-1 sm:px-2 overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x"
    >
      {MODES.map((item) => {
        const Icon = item.icon;
        const isActive = currentMode === item.mode;
        const isThisLoading = disabled && (pendingMode === item.mode || (pendingMode === null && isActive));

        return (
          <button
            key={item.mode}
            disabled={disabled}
            onClick={() => {
              setPendingMode(item.mode);
              onSelectMode(item.mode, item.prompt);
            }}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all duration-200 cursor-pointer active:scale-95 whitespace-nowrap shrink-0 min-h-[42px] sm:min-h-[46px] ${
              isActive ? item.activeColor : item.color
            } ${disabled ? (isThisLoading ? 'cursor-wait brightness-105' : 'opacity-60 cursor-not-allowed') : ''}`}
          >
            {isThisLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin shrink-0 text-white" />
            ) : (
              <Icon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
