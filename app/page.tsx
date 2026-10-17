'use client';

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import type {
  ConversationTurn,
  ConversationMode,
  LearningLevel,
  ActivityDisplay,
  ProgressSummary,
  QuickReply,
  AnswerResponse,
  ChatResponse,
} from '@/lib/types';
import { HeaderBar } from '@/components/HeaderBar';
import { ModeSelector } from '@/components/ModeSelector';
import { ActivityCard } from '@/components/ActivityCard';
import { ChatInterface } from '@/components/ChatInterface';
import { Mascot, type MascotState } from '@/components/Mascot';
import { ParentModal } from '@/components/ParentModal';
import { Sparkles, ArrowRight, Award, MessageCircle } from 'lucide-react';

import { soundFX } from '@/lib/sound-effects';

const DEFAULT_ACTIVITY: ActivityDisplay = {
  activityId: 'l1-colors-1',
  questionId: 'l1-c1-q1',
  question: 'What color is the banana? 🍌',
  imageHint: '🍌',
  options: [
    { id: 'opt-0', label: 'Yellow', value: 'Yellow' },
    { id: 'opt-1', label: 'Blue', value: 'Blue' },
    { id: 'opt-2', label: 'Green', value: 'Green' },
  ],
  topic: 'colors',
  level: 1,
  hint: 'Bananas are bright and sunny!',
};

export default function HomePage() {
  // Session & Profile Identifiers with safe synchronous fallback
  const [sessionId, setSessionId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('littletalk_session_id');
        if (stored) return stored;
      } catch {}
    }
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  });
  const [profileId, setProfileId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('littletalk_profile_id');
        if (stored) return stored;
      } catch {}
    }
    return `child_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  });

  // Learning State
  const [level, setLevel] = useState<LearningLevel>(1);
  const [mode, setMode] = useState<ConversationMode>('CONVERSATION');
  const [mobileTab, setMobileTab] = useState<'chat' | 'activity'>('chat');
  const [stars, setStars] = useState<number>(0);
  const [progressSummary, setProgressSummary] = useState<ProgressSummary>({
    totalAnswered: 0,
    totalCorrect: 0,
    streakCount: 0,
    topicProgress: {},
    level1Mastered: false,
    level2Mastered: false,
    starsEarned: 0,
  });
  const [storageType, setStorageType] = useState<string>('SQLite (Local Relational DB)');

  // Conversational State
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [currentActivity, setCurrentActivity] = useState<ActivityDisplay | null>(DEFAULT_ACTIVITY);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  // Mascot & Audio State (Kid vs Baby Voice)
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [voiceProfile, setVoiceProfile] = useState<'kid' | 'baby'>('kid');
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);

  // Parent Modal
  const [isParentModalOpen, setIsParentModalOpen] = useState<boolean>(false);

  // Helper to guarantee selection of pleasant female voices and strictly exclude male defaults
  const findFemaleVoice = useCallback((voicesList: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (!voicesList || voicesList.length === 0) return null;

    const isExplicitMale = (name: string) =>
      /david|mark|george|richard|guy|male|man\b|james|paul|john|ravi|stefan|daniel|alex|fred/i.test(name);

    const isFemaleKeyword = (name: string) =>
      /zira|jenny|aria|samantha|victoria|karen|susan|fiona|moira|flo|female|woman|girl|hazel|catherine|stephanie|eva/i.test(name);

    const enVoices = voicesList.filter((v) => v.lang.startsWith('en'));
    const candidatePool = enVoices.length > 0 ? enVoices : voicesList;

    // 1. High priority: known female child/friendly English voices
    const topFemale = candidatePool.find((v) => isFemaleKeyword(v.name) && !isExplicitMale(v.name));
    if (topFemale) return topFemale;

    // 2. Second priority: any English voice that is NOT explicitly male
    const nonMale = candidatePool.find((v) => !isExplicitMale(v.name));
    if (nonMale) return nonMale;

    return candidatePool[0] || null;
  }, []);

  // Audio Text-to-Speech Helper strictly locked to female voice
  const speakText = useCallback(
    (text: string) => {
      if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }

      const executeSpeak = (loadedVoices: SpeechSynthesisVoice[]) => {
        try {
          window.speechSynthesis.cancel();
          // Strip emojis for cleaner speech pronunciation
          const cleanText = text.replace(
            /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
            ''
          );
          if (!cleanText.trim()) return;

          const utterance = new SpeechSynthesisUtterance(cleanText);

          // Female Voice Tuning:
          // 'kid': lively child-friendly female tone (pitch ~1.25, rate ~0.95)
          // 'baby': cute, cheerful toddler tone (pitch ~1.45, rate ~0.90)
          if (voiceProfile === 'baby') {
            utterance.pitch = 1.45;
            utterance.rate = 0.90;
          } else {
            utterance.pitch = 1.25;
            utterance.rate = 0.95;
          }

          const femaleVoice = findFemaleVoice(loadedVoices);
          if (femaleVoice) {
            utterance.voice = femaleVoice;
          }

          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.warn('Speech synthesis error:', e);
        }
      };

      const currentVoices = window.speechSynthesis.getVoices();
      if (currentVoices && currentVoices.length > 0) {
        executeSpeak(currentVoices);
      } else {
        // Voices not loaded yet by browser — wait for onvoiceschanged so it NEVER defaults to OS male voice!
        let hasSpoken = false;
        const handleVoicesReady = () => {
          if (hasSpoken) return;
          hasSpoken = true;
          const readyVoices = window.speechSynthesis.getVoices();
          executeSpeak(readyVoices);
        };

        window.speechSynthesis.onvoiceschanged = handleVoicesReady;

        // Fallback timer if onvoiceschanged doesn't fire
        setTimeout(() => {
          if (!hasSpoken) {
            hasSpoken = true;
            const fallbackVoices = window.speechSynthesis.getVoices();
            executeSpeak(fallbackVoices);
          }
        }, 300);
      }
    },
    [audioEnabled, voiceProfile, findFemaleVoice]
  );

  // Initialize Session
  useEffect(() => {
    let sId = sessionId;
    let pId = profileId;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedS = localStorage.getItem('littletalk_session_id');
        const storedP = localStorage.getItem('littletalk_profile_id');
        if (storedS) sId = storedS;
        else localStorage.setItem('littletalk_session_id', sId);
        if (storedP) pId = storedP;
        else localStorage.setItem('littletalk_profile_id', pId);
      }
    } catch {}

    setSessionId(sId);
    setProfileId(pId);

    // Initial greeting / load activity
    sendInitialGreeting(sId, pId);
    fetchProgress(sId, pId);
  }, []);

  const sendInitialGreeting = async (sId: string, pId: string) => {
    setIsLoading(true);
    setMascotState('thinking');
    const activeSId = sId || sessionId || `sess_${Date.now()}`;
    const activePId = pId || profileId || `child_${Date.now()}`;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: "Hello Lumi! Let's chat!",
          sessionId: activeSId,
          profileId: activePId,
        }),
      });

      if (res.ok) {
        const data: ChatResponse = await res.json();
        setTurns([
          {
            role: 'bot',
            content: data.reply,
            timestamp: new Date().toISOString(),
            mode: data.mode,
          },
        ]);
        setMode(data.mode);
        if (data.activity) setCurrentActivity(data.activity);
        if (data.quickReplies) setQuickReplies(data.quickReplies);
        if (data.timings) setLastLatencyMs(data.timings.totalMs);
        setMascotState('idle');

        if (audioEnabled) {
          speakText(data.reply);
        }
      }
    } catch (err) {
      console.error('Initial greeting failed', err);
      setMascotState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProgress = async (sId: string, pId: string) => {
    const activeSId = sId || sessionId || `sess_${Date.now()}`;
    const activePId = pId || profileId || `child_${Date.now()}`;
    try {
      const res = await fetch(`/api/progress?sessionId=${activeSId}&profileId=${activePId}`);
      if (res.ok) {
        const data = await res.json();
        setLevel(data.currentLevel);
        setProgressSummary(data.progressSummary);
        setStars(data.progressSummary.starsEarned || 0);
        if (data.storageType) setStorageType(data.storageType);
      }
    } catch (err) {
      console.error('Failed to fetch progress', err);
    }
  };

  // Chat message submission
  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const activeSessionId = sessionId || `sess_${Date.now()}`;
    const activeProfileId = profileId || `child_${Date.now()}`;

    // Append child turn immediately
    const userTurn: ConversationTurn = {
      role: 'child',
      content: messageText,
      timestamp: new Date().toISOString(),
      mode,
    };
    setTurns((prev) => [...prev, userTurn]);
    setIsLoading(true);
    setMascotState('thinking');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          sessionId: activeSessionId,
          profileId: activeProfileId,
        }),
      });

      if (!res.ok) throw new Error('Chat API returned error');

      const data: ChatResponse = await res.json();

      const botTurn: ConversationTurn = {
        role: 'bot',
        content: data.reply,
        timestamp: new Date().toISOString(),
        mode: data.mode,
      };
      setTurns((prev) => [...prev, botTurn]);
      setMode(data.mode);

      if (data.activity) setCurrentActivity(data.activity);
      if (data.quickReplies) setQuickReplies(data.quickReplies);
      if (data.timings) setLastLatencyMs(data.timings.totalMs);

      // Auto-switch mobile view if the child triggered a learning activity or question
      const isLearningPrompt = /learn|words|teach|practice|quiz|play|game|question/i.test(messageText);
      if (isLearningPrompt && (data.activity || data.mode === 'LEARNING' || data.mode === 'ENGAGEMENT')) {
        setMobileTab('activity');
      } else if (data.mode === 'CONVERSATION' && /chat|hello|hi|joke|story|sing/i.test(messageText)) {
        setMobileTab('chat');
      }

      // Check if this response scored a quiz answer
      if (data.reply.includes('correct!') || data.reply.includes('Spot on!')) {
        try { soundFX.playCorrectChime(); } catch {}
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#FFD54F', '#FFA000', '#4DD9AC', '#42BFF5', '#FF7B6B'],
          });
        } catch {}
        setMascotState('cheering');
        setTimeout(() => setMascotState('idle'), 2500);
      } else if (data.reply.includes('Good try!')) {
        try { soundFX.playGentleTryAgain(); } catch {}
      }

      if (data.progressUpdate?.totalStars !== undefined) {
        setStars(data.progressUpdate.totalStars);
      }
      fetchProgress(activeSessionId, activeProfileId);

      // Adjust mascot state
      if (data.mode === 'BREAK') {
        setMascotState('sleeping');
      } else if (data.mode === 'SUPPORT') {
        setMascotState('idle');
      } else if (!data.reply.includes('correct!') && !data.reply.includes('Spot on!')) {
        setMascotState('idle');
      }

      if (audioEnabled) {
        speakText(data.reply);
      }
    } catch (err) {
      console.error('Chat error', err);
      setTurns((prev) => [
        ...prev,
        {
          role: 'bot',
          content: "Oops! Lumi had a little hiccup. Let's try again! 🌟",
          timestamp: new Date().toISOString(),
        },
      ]);
      setMascotState('idle');
    } finally {
      setIsLoading(false);
    }
  };

  // Answer submission
  const handleAnswerSubmit = async (answerVal: string): Promise<AnswerResponse | null> => {
    if (!currentActivity) return null;

    const activeSessionId =
      sessionId ||
      (typeof window !== 'undefined' ? localStorage.getItem('littletalk_session_id') : null) ||
      `sess_${Date.now()}`;
    const activeProfileId =
      profileId ||
      (typeof window !== 'undefined' ? localStorage.getItem('littletalk_profile_id') : null) ||
      `child_${Date.now()}`;

    const answerId = `ans_${currentActivity.questionId}_${Date.now()}`;

    try {
      const res = await fetch('/api/activity/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          profileId: activeProfileId,
          activityId: currentActivity.activityId,
          questionId: currentActivity.questionId,
          answer: answerVal,
          answerId,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        console.error('Answer submission API error:', errJson);
        throw new Error(errJson?.error || `Answer submission failed with status ${res.status}`);
      }

      const data: AnswerResponse = await res.json();

      // Confetti & Sound Celebration
      if (data.correct) {
        try { soundFX.playCorrectChime(); } catch {}
        setMascotState('cheering');
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
            colors: ['#FFD54F', '#FFA000', '#4DD9AC', '#42BFF5', '#FF7B6B'],
          });
        } catch {
          // ignore confetti if unsupported
        }
      } else {
        try { soundFX.playGentleTryAgain(); } catch {}
      }

      // Update stars and level
      if (data.stars && data.stars > 0) {
        setStars((prev) => prev + data.stars!);
      }

      if (data.levelUp) {
        try { soundFX.playLevelUpFanfare(); } catch {}
        setLevel(data.levelUp.toLevel);
        setLevelUpMessage(data.levelUp.message);
        try {
          confetti({
            particleCount: 120,
            spread: 90,
            origin: { y: 0.4 },
          });
        } catch {}
      }

      // Refresh progress data in background
      fetchProgress(activeSessionId, activeProfileId);

      return data;
    } catch (err) {
      console.error('Failed to submit answer', err);
      return null;
    }
  };

  // Next Question Request
  const handleNextQuestion = () => {
    setMascotState('idle');
    handleSendMessage('next question');
  };

  // Mode Selection
  const handleSelectMode = (newMode: ConversationMode, prompt: string) => {
    try { soundFX.playPopSound(); } catch {}
    setMode(newMode);
    if (newMode === 'CONVERSATION') {
      setMobileTab('chat');
    } else {
      setMobileTab('activity');
    }
    handleSendMessage(prompt);
  };

  // Toggle Voice Profile (Female Child Voice vs Cute Female Toddler Voice)
  const handleToggleVoiceProfile = () => {
    try { soundFX.playPopSound(); } catch {}
    const next = voiceProfile === 'kid' ? 'baby' : 'kid';
    setVoiceProfile(next);
    speakText(
      next === 'kid'
        ? "Hi! I am Lumi speaking with a cheerful girl voice!"
        : "Hi! I am Lumi speaking with a cute toddler voice!"
    );
  };

  // Parent Controls: Reset Session
  const handleResetSession = async () => {
    const activeSessionId = sessionId || `sess_${Date.now()}`;
    const activeProfileId = profileId || `child_${Date.now()}`;
    const res = await fetch('/api/session/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: activeSessionId, profileId: activeProfileId }),
    });
    if (res.ok) {
      sendInitialGreeting(activeSessionId, activeProfileId);
    }
  };

  // Parent Controls: Delete Profile
  const handleDeleteProfile = async () => {
    const activeProfileId = profileId || `child_${Date.now()}`;
    await fetch('/api/profile/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: activeProfileId }),
    });
    try {
      localStorage.removeItem('littletalk_session_id');
      localStorage.removeItem('littletalk_profile_id');
    } catch {}
    // Re-initialize with clean slate
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Level-Up Celebration Banner */}
      {levelUpMessage && (
        <div className="bg-amber-400 text-amber-950 font-extrabold px-4 py-3 text-center shadow-md animate-fade-in flex items-center justify-center gap-2 z-40">
          <Award className="w-6 h-6 text-amber-900 shrink-0" />
          <span className="text-sm sm:text-base">{levelUpMessage}</span>
          <button
            onClick={() => setLevelUpMessage(null)}
            className="ml-3 underline text-xs font-bold hover:text-amber-800 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Header */}
      <HeaderBar
        level={level}
        stars={stars}
        mode={mode}
        audioEnabled={audioEnabled}
        onToggleAudio={() => {
          try { soundFX.playPopSound(); } catch {}
          setAudioEnabled((prev) => !prev);
        }}
        onOpenParentModal={() => setIsParentModalOpen(true)}
      />

      {/* Main Learning Hub */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2.5 sm:p-5 flex flex-col gap-2.5 sm:gap-3">
        {/* Child Mode Quick Selector */}
        <ModeSelector
          currentMode={mode}
          onSelectMode={handleSelectMode}
          disabled={isLoading}
        />

        {/* Responsive Mobile View Toggle (< lg screens) */}
        <div className="lg:hidden flex items-center justify-center p-1 bg-amber-200/50 rounded-2xl border border-amber-300/70 max-w-sm mx-auto w-full shadow-xs">
          <button
            onClick={() => setMobileTab('chat')}
            className={`flex-1 py-1.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'chat'
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-amber-950 hover:bg-amber-100'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Chat with Lumi</span>
          </button>
          <button
            onClick={() => setMobileTab('activity')}
            className={`flex-1 py-1.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'activity'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-amber-950 hover:bg-amber-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Learning Card</span>
          </button>
        </div>

        {/* Dynamic Dual-Pane Learning Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-5 flex-1 items-start">
          {/* Left Panel: Active Activity or Mascot Spotlight */}
          <div
            className={`lg:col-span-7 flex flex-col justify-center ${
              mobileTab === 'activity' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            {(mode === 'LEARNING' || mode === 'ENGAGEMENT' || (mode === 'SUPPORT' && currentActivity)) && currentActivity ? (
              <ActivityCard
                key={currentActivity.questionId}
                activity={currentActivity}
                onAnswer={handleAnswerSubmit}
                onNextQuestion={handleNextQuestion}
                audioEnabled={audioEnabled}
                onSpeak={speakText}
                onOpenChat={() => setMobileTab('chat')}
              />
            ) : (
              /* Non-learning mode spotlight card */
              <div className="w-full bg-white rounded-2xl sm:rounded-4xl border-2 sm:border-3 border-amber-200/90 shadow-lg sm:shadow-xl p-4 sm:p-10 text-center flex flex-col items-center justify-center space-y-3 sm:space-y-4">
                <Mascot
                  state={mascotState}
                  size="lg"
                  onClick={() => {
                    setMascotState('cheering');
                    speakText("I love learning with you! You're a superstar! ⭐");
                    setTimeout(() => setMascotState('idle'), 2000);
                  }}
                />
                <h2 className="text-xl sm:text-3xl font-extrabold text-amber-950">
                  {mode === 'BREAK'
                    ? 'Resting Time! 🌙'
                    : mode === 'ENGAGEMENT'
                    ? 'Let’s Play a Game! 🎮'
                    : mode === 'SUPPORT'
                    ? 'You Are Safe and Loved 🌸'
                    : 'Chatting with Lumi! 💬'}
                </h2>
                <p className="text-xs sm:text-base font-semibold text-amber-900/80 max-w-md px-2">
                  {mode === 'BREAK'
                    ? 'Resting helps your brain grow strong! Come back whenever you are ready.'
                    : mode === 'SUPPORT'
                    ? 'Take your time. There is no rush and every try makes you smarter!'
                    : 'Tell Lumi about your favorite things, animals, or colors!'}
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-1 sm:mt-2">
                  {mode !== 'LEARNING' && (
                    <button
                      onClick={() => handleSelectMode('LEARNING', 'teach me words')}
                      className="inline-flex items-center gap-1.5 sm:gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs sm:text-base px-4 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <span>Start Learning Words</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  )}
                  {currentActivity && mode !== 'LEARNING' && (
                    <button
                      onClick={() => {
                        setMode('LEARNING');
                        setMobileTab('activity');
                      }}
                      className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs sm:text-base px-4 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Practice Question</span>
                    </button>
                  )}
                  <button
                    onClick={() => setMobileTab('chat')}
                    className="lg:hidden inline-flex items-center gap-1.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>Open Chat Box</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel: Conversational Chat Interface */}
          <div
            className={`lg:col-span-5 flex flex-col h-[calc(100dvh-220px)] sm:h-[520px] lg:h-[580px] min-h-[400px] max-h-[720px] overflow-hidden ${
              mobileTab === 'chat' ? 'flex' : 'hidden lg:flex'
            }`}
          >
            <ChatInterface
              turns={turns}
              quickReplies={quickReplies}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              audioEnabled={audioEnabled}
              onSpeak={speakText}
              onOpenActivity={() => setMobileTab('activity')}
            />
          </div>
        </div>
      </main>

      {/* Footer Bar: Subtle Performance & Safety Disclosure */}
      <footer className="w-full bg-amber-100/60 border-t border-amber-200/80 px-3 sm:px-4 py-2 sm:py-2.5 text-center text-xs font-semibold text-amber-900 flex flex-wrap items-center justify-between gap-1.5 sm:gap-2 max-w-6xl mx-auto pb-safe">
        <div className="flex items-center gap-1.5 mx-auto sm:mx-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span className="text-[11px] sm:text-xs">LittleTalk AI &bull; Safe, Ad-Free Early Learning</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-amber-800 mx-auto sm:mx-0">
          <span>Deterministic Child-Safe</span>
          {lastLatencyMs !== null && (
            <span className="bg-amber-200/80 px-2 py-0.5 rounded-full font-mono font-bold">
              {lastLatencyMs}ms
            </span>
          )}
          <span className="hidden sm:inline">Storage: {storageType}</span>
        </div>
      </footer>

      {/* Parent Modal Portal */}
      <ParentModal
        isOpen={isParentModalOpen}
        onClose={() => setIsParentModalOpen(false)}
        level={level}
        stars={stars}
        progressSummary={progressSummary}
        storageType={storageType}
        onResetSession={handleResetSession}
        onDeleteProfile={handleDeleteProfile}
      />
    </div>
  );
}
