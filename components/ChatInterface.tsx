'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { ConversationTurn, QuickReply } from '@/lib/types';
import { Send, Volume2, Sparkles, User } from 'lucide-react';
import { Mascot } from './Mascot';

interface ChatInterfaceProps {
  turns: ConversationTurn[];
  quickReplies?: QuickReply[];
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  audioEnabled: boolean;
  onSpeak: (text: string) => void;
}

export function ChatInterface({
  turns,
  quickReplies = [],
  onSendMessage,
  isLoading,
  audioEnabled,
  onSpeak,
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [turns, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full bg-amber-50/40 rounded-3xl sm:rounded-4xl border-3 border-amber-200/90 shadow-xl overflow-hidden">
      {/* Chat Messages Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {turns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-10">
            <Mascot state="idle" size="lg" />
            <h3 className="text-xl sm:text-2xl font-extrabold text-amber-950 mt-4">
              Hi friend! I&apos;m Lumi! 🌟
            </h3>
            <p className="text-sm sm:text-base font-semibold text-amber-800/80 max-w-sm mt-1">
              Tap a button below or say hello to start learning words, playing games, and chatting!
            </p>
          </div>
        ) : (
          turns.map((turn, index) => {
            const isBot = turn.role === 'bot';

            return (
              <div
                key={index}
                className={`flex items-start gap-2.5 sm:gap-3 ${
                  isBot ? 'justify-start' : 'justify-end'
                } animate-fade-in`}
              >
                {isBot && (
                  <div className="shrink-0 -mt-1">
                    <Mascot state="idle" size="sm" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-3xl px-4 py-3 text-sm sm:text-base font-medium leading-relaxed shadow-sm ${
                    isBot
                      ? 'bg-white text-gray-800 border-2 border-amber-200/90 rounded-tl-sm'
                      : 'bg-sky-500 text-white font-bold rounded-tr-sm shadow-sky-200'
                  }`}
                >
                  <p>{turn.content}</p>

                  {isBot && audioEnabled && (
                    <button
                      onClick={() => onSpeak(turn.content)}
                      className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 hover:text-amber-900 transition-colors"
                      title="Read aloud"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Hear again</span>
                    </button>
                  )}
                </div>

                {!isBot && (
                  <div className="w-8 h-8 rounded-full bg-sky-200 border-2 border-sky-400 flex items-center justify-center text-sky-800 shrink-0 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs sm:text-sm pl-2 animate-pulse">
            <Mascot state="thinking" size="sm" />
            <span>Lumi is thinking... ⭐</span>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Quick Replies Tray */}
      {quickReplies.length > 0 && !isLoading && (
        <div className="px-4 py-2.5 bg-amber-100/70 border-t border-amber-200/70 overflow-x-auto no-scrollbar flex items-center gap-2">
          <span className="text-xs font-bold text-amber-900 shrink-0 hidden sm:inline">
            Quick Replies:
          </span>
          {quickReplies.map((qr) => (
            <button
              key={qr.id}
              onClick={() => onSendMessage(qr.value)}
              className="px-3.5 py-2 rounded-2xl bg-white hover:bg-amber-50 text-amber-950 font-bold text-xs sm:text-sm border-2 border-amber-300 shadow-xs hover:border-amber-400 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              {qr.label}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Box */}
      <form
        onSubmit={handleSubmit}
        className="p-3 sm:p-4 bg-white border-t-2 border-amber-100 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Talk to Lumi or type here..."
          disabled={isLoading}
          maxLength={300}
          className="flex-1 bg-amber-50/60 border-2 border-amber-200 rounded-2xl px-4 py-2.5 sm:py-3 text-sm sm:text-base font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 sm:p-3 rounded-2xl font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
