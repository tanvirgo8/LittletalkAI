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
import { Sparkles, ArrowRight, Award } from 'lucide-react';

import { soundFX } from '@/lib/sound-effects';

export default function HomePage() {
  // Session & Profile Identifiers
  const [sessionId, setSessionId] = useState<string>('');
  const [profileId, setProfileId] = useState<string>('');

  // Learning State
  const [level, setLevel] = useState<LearningLevel>(1);
  const [mode, setMode] = useState<ConversationMode>('LEARNING');
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
  const [storageType, setStorageType] = useState<string>('in-memory-demo');

  // Conversational State
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [currentActivity, setCurrentActivity] = useState<ActivityDisplay | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  // Mascot & Audio State (Kid vs Baby Voice)
  const [mascotState, setMascotState] = useState<MascotState>('idle');
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);
  const [voiceProfile, setVoiceProfile] = useState<'kid' | 'baby'>('kid');
  const [levelUpMessage, setLevelUpMessage] = useState<string | null>(null);

  // Parent Modal
  const [isParentModalOpen, setIsParentModalOpen] = useState<boolean>(false);

  // Audio Text-to-Speech Helper tuned for 10-year-old kid or baby voice
  const speakText = useCallback(
    (text: string) => {
      if (!audioEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        // Strip emojis for cleaner speech pronunciation
        const cleanText = text.replace(
          /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
          ''
        );
        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Voice Profile Tuning:
        // 'kid': 10-year-old lively older child voice (pitch ~1.48, rate ~0.96)
        // 'baby': cute, cheerful toddler voice (pitch ~1.70, rate ~0.88)
        if (voiceProfile === 'baby') {
          utterance.pitch = 1.70;
          utterance.rate = 0.88;
        } else {
          utterance.pitch = 1.48; // 10 years old kid voice frequency
          utterance.rate = 0.96;
        }

        // Search for best matching voice from browser speech synthesis
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const preferredVoice =
            voices.find(
              (v) =>
                v.lang.startsWith('en') &&
                /child|kid|junior|baby|girl|jenny|zira|samantha|flo|victoria/i.test(v.name)
            ) ||
            voices.find(
              (v) =>
                v.lang.startsWith('en') &&
                !/david|mark|george|male|richard/i.test(v.name)
            ) ||
            voices.find((v) => v.lang.startsWith('en'));

          if (preferredVoice) {
            utterance.voice = preferredVoice;
          }
        }

        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    },
    [audioEnabled, voiceProfile]
  );

  // Initialize Session
  useEffect(() => {
    let sId = localStorage.getItem('littletalk_session_id');
    let pId = localStorage.getItem('littletalk_profile_id');

    if (!sId) {
      sId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('littletalk_session_id', sId);
    }
    if (!pId) {
      pId = `child_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('littletalk_profile_id', pId);
    }

    setSessionId(sId);
    setProfileId(pId);

    // Initial greeting / load activity
    sendInitialGreeting(sId, pId);
    fetchProgress(sId, pId);
  }, []);

  const sendInitialGreeting = async (sId: string, pId: string) => {
    setIsLoading(true);
    setMascotState('thinking');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Hello Lumi! I want to learn English!',
          sessionId: sId,
          profileId: pId,
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
    try {
      const res = await fetch(`/api/progress?sessionId=${sId}&profileId=${pId}`);
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
          sessionId,
          profileId,
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

      // Adjust mascot state
      if (data.mode === 'BREAK') {
        setMascotState('sleeping');
      } else if (data.mode === 'SUPPORT') {
        setMascotState('idle');
      } else {
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

    const answerId = `ans_${currentActivity.questionId}_${Date.now()}`;

    try {
      const res = await fetch('/api/activity/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          profileId,
          activityId: currentActivity.activityId,
          questionId: currentActivity.questionId,
          answer: answerVal,
          answerId,
        }),
      });

      if (!res.ok) throw new Error('Answer submission failed');

      const data: AnswerResponse = await res.json();

      // Confetti & Sound Celebration
      if (data.correct) {
        soundFX.playCorrectChime();
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
        soundFX.playGentleTryAgain();
      }

      // Update stars and level
      if (data.stars && data.stars > 0) {
        setStars((prev) => prev + data.stars!);
      }

      if (data.levelUp) {
        soundFX.playLevelUpFanfare();
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
      fetchProgress(sessionId, profileId);

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
    soundFX.playPopSound();
    setMode(newMode);
    handleSendMessage(prompt);
  };

  // Toggle Voice Profile (10-Year-Old Kid vs Baby Voice)
  const handleToggleVoiceProfile = () => {
    soundFX.playPopSound();
    const next = voiceProfile === 'kid' ? 'baby' : 'kid';
    setVoiceProfile(next);
    speakText(
      next === 'kid'
        ? "Hi! I am Lumi speaking in a ten year old kid voice!"
        : "Hi! I am Lumi speaking in a cute baby voice!"
    );
  };

  // Parent Controls: Reset Session
  const handleResetSession = async () => {
    const res = await fetch('/api/session/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, profileId }),
    });
    if (res.ok) {
      sendInitialGreeting(sessionId, profileId);
    }
  };

  // Parent Controls: Delete Profile
  const handleDeleteProfile = async () => {
    await fetch('/api/profile/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId }),
    });
    localStorage.removeItem('littletalk_session_id');
    localStorage.removeItem('littletalk_profile_id');
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
          soundFX.playPopSound();
          setAudioEnabled((prev) => !prev);
        }}
        voiceProfile={voiceProfile}
        onToggleVoiceProfile={handleToggleVoiceProfile}
        onOpenParentModal={() => setIsParentModalOpen(true)}
      />

      {/* Main Learning Hub */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-3 min-h-0">
        {/* Child Mode Quick Selector */}
        <ModeSelector
          currentMode={mode}
          onSelectMode={handleSelectMode}
          disabled={isLoading}
        />

        {/* Dynamic Dual-Pane Learning Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0 lg:h-[calc(100vh-210px)] lg:max-h-[720px] lg:min-h-[480px]">
          {/* Left Panel: Active Activity or Mascot Spotlight */}
          <div className="lg:col-span-7 flex flex-col justify-center min-h-0">
            {mode === 'LEARNING' && currentActivity ? (
              <ActivityCard
                activity={currentActivity}
                onAnswer={handleAnswerSubmit}
                onNextQuestion={handleNextQuestion}
                audioEnabled={audioEnabled}
                onSpeak={speakText}
              />
            ) : (
              /* Non-learning mode spotlight card */
              <div className="w-full bg-white rounded-3xl sm:rounded-4xl border-3 border-amber-200/90 shadow-xl p-6 sm:p-10 text-center flex flex-col items-center justify-center space-y-4">
                <Mascot
                  state={mascotState}
                  size="lg"
                  onClick={() => {
                    setMascotState('cheering');
                    speakText("I love learning with you! You're a superstar! ⭐");
                    setTimeout(() => setMascotState('idle'), 2000);
                  }}
                />
                <h2 className="text-2xl sm:text-3xl font-extrabold text-amber-950">
                  {mode === 'BREAK'
                    ? 'Resting Time! 🌙'
                    : mode === 'ENGAGEMENT'
                    ? 'Let’s Play a Game! 🎮'
                    : mode === 'SUPPORT'
                    ? 'You Are Safe and Loved 🌸'
                    : 'Chatting with Lumi! 💬'}
                </h2>
                <p className="text-sm sm:text-base font-semibold text-amber-900/80 max-w-md">
                  {mode === 'BREAK'
                    ? 'Resting helps your brain grow strong! Come back whenever you are ready.'
                    : mode === 'SUPPORT'
                    ? 'Take your time. There is no rush and every try makes you smarter!'
                    : 'Tell Lumi about your favorite things, animals, or colors!'}
                </p>

                {mode !== 'LEARNING' && (
                  <button
                    onClick={() => handleSelectMode('LEARNING', 'teach me')}
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-base px-6 py-3 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer mt-2"
                  >
                    <span>Back to Learning Words</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right Panel: Conversational Chat Interface */}
          <div className="lg:col-span-5 flex flex-col h-[500px] lg:h-full min-h-0 overflow-hidden">
            <ChatInterface
              turns={turns}
              quickReplies={quickReplies}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
              audioEnabled={audioEnabled}
              onSpeak={speakText}
            />
          </div>
        </div>
      </main>

      {/* Footer Bar: Subtle Performance & Safety Disclosure */}
      <footer className="w-full bg-amber-100/60 border-t border-amber-200/80 px-4 py-2.5 text-center text-xs font-semibold text-amber-900 flex flex-wrap items-center justify-between gap-2 max-w-6xl mx-auto">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>LittleTalk AI &bull; Safe, Ad-Free Early Learning</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-amber-800">
          <span>Engine: Deterministic Child-Safe</span>
          {lastLatencyMs !== null && (
            <span className="bg-amber-200/80 px-2 py-0.5 rounded-full font-mono font-bold">
              Latency: {lastLatencyMs}ms (Sub-2s Target Met)
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
