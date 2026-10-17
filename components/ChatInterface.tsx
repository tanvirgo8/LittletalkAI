'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ConversationTurn, QuickReply } from '@/lib/types';
import { Send, Volume2, Sparkles, User, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Mascot } from './Mascot';

interface ChatInterfaceProps {
  turns: ConversationTurn[];
  quickReplies?: QuickReply[];
  onSendMessage: (msg: string) => void;
  isLoading: boolean;
  audioEnabled: boolean;
  onSpeak: (text: string) => void;
  onOpenActivity?: () => void;
}

export function ChatInterface({
  turns,
  quickReplies = [],
  onSendMessage,
  isLoading,
  audioEnabled,
  onSpeak,
  onOpenActivity,
}: ChatInterfaceProps) {
  const [inputText, setInputText] = useState('');
  const [clickedReplyValue, setClickedReplyValue] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const quickRepliesRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setClickedReplyValue(null);
    }
  }, [isLoading]);

  // Mouse drag-to-scroll tracking
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const checkScrollability = useCallback(() => {
    if (quickRepliesRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = quickRepliesRef.current;
      setCanScrollLeft(scrollLeft > 4);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
    }
  }, []);

  useEffect(() => {
    // Check initially and on next frame when DOM renders
    checkScrollability();
    const timer = setTimeout(checkScrollability, 100);
    const el = quickRepliesRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollability, { passive: true });
      window.addEventListener('resize', checkScrollability);
      return () => {
        clearTimeout(timer);
        el.removeEventListener('scroll', checkScrollability);
        window.removeEventListener('resize', checkScrollability);
      };
    }
    return () => clearTimeout(timer);
  }, [quickReplies, checkScrollability]);

  const scrollQuickReplies = (direction: 'left' | 'right') => {
    if (quickRepliesRef.current) {
      const offset = direction === 'left' ? -200 : 200;
      quickRepliesRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleQuickRepliesWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (quickRepliesRef.current && e.deltaY !== 0) {
      quickRepliesRef.current.scrollLeft += e.deltaY;
      checkScrollability();
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!quickRepliesRef.current) return;
    isDraggingRef.current = true;
    dragStartXRef.current = e.pageX - quickRepliesRef.current.offsetLeft;
    dragStartScrollLeftRef.current = quickRepliesRef.current.scrollLeft;
    hasDraggedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !quickRepliesRef.current) return;
    const x = e.pageX - quickRepliesRef.current.offsetLeft;
    const walk = (x - dragStartXRef.current) * 1.5;
    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
    }
    quickRepliesRef.current.scrollLeft = dragStartScrollLeftRef.current - walk;
    checkScrollability();
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [turns, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    onSendMessage(inputText);
    setInputText('');
  };

  return (
    <div className="flex flex-col h-full max-h-full min-h-0 bg-amber-50/40 rounded-2xl sm:rounded-4xl border-2 sm:border-3 border-amber-200/90 shadow-lg sm:shadow-xl overflow-hidden">
      {onOpenActivity && (
        <div className="lg:hidden flex items-center justify-between px-3 py-1.5 bg-amber-100/90 border-b border-amber-200 text-xs font-bold text-amber-950">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Interactive Learning Card</span>
          </span>
          <button
            onClick={onOpenActivity}
            className="text-[11px] bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded-xl shadow-xs cursor-pointer active:scale-95 font-bold"
          >
            Open Card &rarr;
          </button>
        </div>
      )}
      {/* Chat Messages Scrollable Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-5 space-y-3 sm:space-y-4 touch-scroll"
      >
        {turns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-6 sm:py-10">
            <Mascot state="idle" size="md" />
            <h3 className="text-lg sm:text-2xl font-extrabold text-amber-950 mt-3 sm:mt-4">
              Hi friend! I&apos;m Lumi! 🌟
            </h3>
            <p className="text-xs sm:text-base font-semibold text-amber-800/80 max-w-sm mt-1 px-2">
              Tap a button below or say hello to start learning words, playing games, and chatting!
            </p>
          </div>
        ) : (
          turns.map((turn, index) => {
            const isBot = turn.role === 'bot';

            return (
              <div
                key={index}
                className={`flex items-start gap-2 sm:gap-3 ${
                  isBot ? 'justify-start' : 'justify-end'
                } animate-fade-in`}
              >
                {isBot && (
                  <div className="shrink-0 -mt-0.5">
                    <Mascot state="idle" size="xs" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[75%] rounded-2xl sm:rounded-3xl px-3.5 py-2.5 sm:px-4 sm:py-3 text-xs sm:text-base font-medium leading-relaxed shadow-xs ${
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
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-sky-200 border-2 border-sky-400 flex items-center justify-center text-sky-800 shrink-0 shadow-xs">
                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-center gap-2 text-amber-800 font-bold text-xs sm:text-sm pl-1 animate-pulse">
            <Mascot state="thinking" size="xs" />
            <span>Lumi is thinking... ⭐</span>
          </div>
        )}
      </div>

      {/* Quick Replies Tray */}
      {quickReplies.length > 0 && (
        <div className="relative bg-amber-100/80 border-t border-amber-200/80 flex items-center px-1.5 py-1.5 sm:px-2 sm:py-2">
          {/* Scroll Left Button */}
          {canScrollLeft && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => scrollQuickReplies('left')}
              className="absolute left-1 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-amber-950 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer shrink-0 border border-amber-300"
              aria-label="Scroll left"
              title="Scroll left"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          )}

          <div
            ref={quickRepliesRef}
            onWheel={handleQuickRepliesWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="flex-1 overflow-x-auto overscroll-x-contain touch-pan-x flex items-center gap-1.5 sm:gap-2 px-2 py-0.5 scroll-smooth select-none cursor-grab active:cursor-grabbing quick-replies-scroll"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: '#f59e0b #fef0d0',
            }}
          >
            <span className="text-[11px] sm:text-xs font-bold text-amber-900 shrink-0 hidden md:inline">
              Quick Replies:
            </span>
            {quickReplies.map((qr) => {
              const isThisClicked = isLoading && clickedReplyValue === qr.value;
              return (
                <button
                  key={qr.id}
                  disabled={isLoading}
                  onClick={() => {
                    if (!hasDraggedRef.current && !isLoading) {
                      setClickedReplyValue(qr.value);
                      onSendMessage(qr.value);
                    }
                  }}
                  className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white hover:bg-amber-50 text-amber-950 font-bold text-xs sm:text-sm border-2 border-amber-300 shadow-xs hover:border-amber-400 transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0 min-h-[36px] flex items-center justify-center gap-1.5 ${
                    isThisClicked
                      ? 'bg-amber-100 border-amber-500 cursor-wait'
                      : isLoading
                      ? 'opacity-50 pointer-events-none'
                      : ''
                  }`}
                >
                  {isThisClicked && (
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-amber-700 shrink-0" />
                  )}
                  <span>{qr.label}</span>
                </button>
              );
            })}
          </div>

          {/* Scroll Right Button */}
          {canScrollRight && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => scrollQuickReplies('right')}
              className="absolute right-1 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-400 hover:bg-amber-500 disabled:opacity-40 text-amber-950 flex items-center justify-center shadow-md active:scale-90 transition-all cursor-pointer shrink-0 border border-amber-300"
              aria-label="Scroll right"
              title="Scroll right"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>
          )}
        </div>
      )}

      {/* Message Input Box */}
      <form
        onSubmit={handleSubmit}
        className="p-2.5 sm:p-4 bg-white border-t-2 border-amber-100 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Talk to Lumi or type here..."
          disabled={isLoading}
          maxLength={300}
          className="flex-1 bg-amber-50/60 border-2 border-amber-200 rounded-xl sm:rounded-2xl px-3.5 py-2 sm:px-4 sm:py-2.5 text-base font-semibold text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-amber-400 transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 sm:p-3 rounded-xl sm:rounded-2xl font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0 min-h-[42px] min-w-[42px] flex items-center justify-center"
          aria-label="Send message"
        >
          {isLoading && !clickedReplyValue ? (
            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
          ) : (
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>
      </form>
    </div>
  );
}
