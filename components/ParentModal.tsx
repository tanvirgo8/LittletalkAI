'use client';

import React, { useState } from 'react';
import type { ProgressSummary, LearningLevel } from '@/lib/types';
import { TOPIC_LABELS } from '@/lib/learning-content';
import {
  Shield,
  X,
  Lock,
  RotateCcw,
  Trash2,
  CheckCircle,
  Database,
  Sparkles,
  Info,
  Award,
} from 'lucide-react';

interface ParentModalProps {
  isOpen: boolean;
  onClose: () => void;
  level: LearningLevel;
  stars: number;
  progressSummary: ProgressSummary;
  storageType: string;
  onResetSession: () => Promise<void>;
  onDeleteProfile: () => Promise<void>;
}

export function ParentModal({
  isOpen,
  onClose,
  level,
  stars,
  progressSummary,
  storageType,
  onResetSession,
  onDeleteProfile,
}: ParentModalProps) {
  // Math gate challenge to prevent accidental child access
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [num1] = useState(() => Math.floor(Math.random() * 5) + 3);
  const [num2] = useState(() => Math.floor(Math.random() * 5) + 2);
  const [gateInput, setGateInput] = useState('');
  const [gateError, setGateError] = useState(false);

  const [activeTab, setActiveTab] = useState<'progress' | 'privacy' | 'controls'>('progress');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (parseInt(gateInput, 10) === num1 + num2) {
      setIsUnlocked(true);
      setGateError(false);
    } else {
      setGateError(true);
      setGateInput('');
    }
  };

  const handleResetSessionClick = async () => {
    if (!confirm('Are you sure you want to reset the current chat session? Earned stars will be saved.')) {
      return;
    }
    setIsProcessing(true);
    try {
      await onResetSession();
      setActionSuccess('Active session reset successfully!');
      setTimeout(() => setActionSuccess(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteProfileClick = async () => {
    if (
      !confirm(
        'WARNING: This will permanently delete all child learning records, earned stars, and activity data. This cannot be undone.'
      )
    ) {
      return;
    }
    setIsProcessing(true);
    try {
      await onDeleteProfile();
      setActionSuccess('All data has been permanently deleted.');
      setTimeout(() => {
        setActionSuccess(null);
        onClose();
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="parent-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
    >
      <div className="bg-white w-full max-w-2xl rounded-3xl sm:rounded-4xl shadow-2xl border-4 border-amber-300 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-amber-100/80 px-6 py-4 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-700" />
            <h2 id="parent-modal-title" className="text-xl font-extrabold text-amber-950">
              Grown-Up &amp; Parent Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-amber-200 text-amber-800 transition-colors cursor-pointer"
            aria-label="Close parent dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Math Challenge Gate */}
        {!isUnlocked ? (
          <div className="p-8 text-center my-auto">
            <div className="w-16 h-16 bg-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-amber-600">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Parent Verification</h3>
            <p className="text-sm text-gray-600 mb-6">
              Please solve this quick problem to verify you are a parent:
            </p>

            <form onSubmit={handleUnlock} className="max-w-xs mx-auto space-y-4">
              <div className="text-2xl font-black text-amber-950 bg-amber-50 py-3 rounded-2xl border-2 border-amber-200">
                {num1} + {num2} = ?
              </div>
              <input
                type="number"
                value={gateInput}
                onChange={(e) => setGateInput(e.target.value)}
                placeholder="Enter answer"
                autoFocus
                className="w-full text-center text-xl font-bold p-3 rounded-2xl border-2 border-gray-300 focus:border-amber-500 focus:outline-none"
              />
              {gateError && (
                <p className="text-xs font-bold text-rose-600">
                  That answer is incorrect. Please try again.
                </p>
              )}
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3 rounded-2xl shadow-md transition-all cursor-pointer"
              >
                Enter Parent Dashboard
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked Parent Dashboard Content */
          <div className="flex-1 overflow-y-auto flex flex-col">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/80 px-6 pt-3 gap-2">
              <button
                onClick={() => setActiveTab('progress')}
                className={`px-4 py-2 text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer ${
                  activeTab === 'progress'
                    ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Learning Progress
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-4 py-2 text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Safety &amp; Privacy
              </button>
              <button
                onClick={() => setActiveTab('controls')}
                className={`px-4 py-2 text-sm font-bold rounded-t-2xl border-b-2 transition-all cursor-pointer ${
                  activeTab === 'controls'
                    ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Data Controls
              </button>
            </div>

            {actionSuccess && (
              <div className="m-4 p-3 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-800 text-sm font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Tab 1: Progress */}
            {activeTab === 'progress' && (
              <div className="p-6 space-y-6">
                {/* Highlights Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center">
                    <p className="text-xs font-bold text-amber-800 uppercase">Level</p>
                    <p className="text-2xl font-black text-amber-950 mt-1">Level {level}</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      {level === 1 ? 'Words' : level === 2 ? 'Phrases' : 'Sentences'}
                    </p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center">
                    <p className="text-xs font-bold text-amber-800 uppercase">Stars</p>
                    <p className="text-2xl font-black text-amber-600 mt-1 flex items-center justify-center gap-1">
                      <Sparkles className="w-5 h-5 fill-amber-400" />
                      {stars}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">Stars Earned</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center">
                    <p className="text-xs font-bold text-amber-800 uppercase">Attempted</p>
                    <p className="text-2xl font-black text-gray-900 mt-1">
                      {progressSummary.totalAnswered}
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">Assessed Questions</p>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-center">
                    <p className="text-xs font-bold text-amber-800 uppercase">Mastery</p>
                    <p className="text-2xl font-black text-emerald-600 mt-1">
                      {progressSummary.totalAnswered > 0
                        ? Math.round(
                            (progressSummary.totalCorrect / progressSummary.totalAnswered) * 100
                          )
                        : 0}
                      %
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Overall Accuracy</p>
                  </div>
                </div>

                {/* Level Advancement Rules Disclosure */}
                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-xs sm:text-sm text-sky-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-sky-950">
                    <Award className="w-4 h-4 text-sky-600" />
                    <span>Level Progression Rule (Configurable &amp; Deterministic)</span>
                  </div>
                  <p>
                    Advancement requires <strong>&ge; 80% accuracy</strong> over at least{' '}
                    <strong>10 assessed answers</strong> at the current level. Single lucky guesses or
                    conversational messages will never advance a child’s level.
                  </p>
                </div>

                {/* Topic Breakdown */}
                <div>
                  <h4 className="text-sm font-extrabold text-gray-900 mb-3 uppercase tracking-wider">
                    Topic Performance
                  </h4>
                  {Object.keys(progressSummary.topicProgress).length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No assessed activities completed yet. Start answering questions with Lumi!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(progressSummary.topicProgress).map(([topic, tp]) => {
                        if (!tp) return null;
                        const accuracy =
                          tp.attempts > 0 ? Math.round((tp.correct / tp.attempts) * 100) : 0;
                        const label = TOPIC_LABELS[topic as keyof typeof TOPIC_LABELS] || topic;

                        return (
                          <div key={topic} className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                            <div className="flex justify-between items-center text-xs sm:text-sm font-bold mb-1">
                              <span>{label}</span>
                              <span className="text-amber-800">
                                {tp.correct}/{tp.attempts} correct ({accuracy}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                              <div
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${accuracy}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Safety & Privacy */}
            {activeTab === 'privacy' && (
              <div className="p-6 space-y-5 text-sm text-gray-700">
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                  <Database className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-950">Active Storage Mode</h4>
                    <p className="text-xs sm:text-sm text-amber-900/90 mt-1">
                      Current backend storage engine:{' '}
                      <strong className="uppercase">{storageType}</strong>.
                      {storageType === 'in-memory-demo' ? (
                        <span className="block mt-1 text-xs text-amber-800">
                          ⚠️ Demo Mode limitation: Data is stored in server memory and resets upon
                          server restart. When valid Firebase environment variables are provided,
                          persistent remote Firestore storage is enabled.
                        </span>
                      ) : (
                        <span className="block mt-1 text-xs text-emerald-800">
                          ✓ Remote Firebase Firestore persistence enabled.
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-extrabold text-gray-900 uppercase tracking-wider text-xs">
                    Child Safety &amp; COPPA Principles
                  </h4>
                  <ul className="space-y-2 text-xs sm:text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>
                        <strong>Zero Advertising &amp; Commercialization:</strong> No third-party ad
                        networks, sponsors, or trackers.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>
                        <strong>No Biometrics, Camera, or Mic Tracking:</strong> Audio read-aloud uses
                        browser-native speech synthesis client-side; no voice recordings are stored or
                        sent to servers.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>
                        <strong>Zero Personal Identifiable Information (PII):</strong> No full names,
                        emails, phone numbers, or addresses are ever requested or stored.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>
                        <strong>Safety Escalation:</strong> If a child expresses danger or harm, Lumi
                        firmly and gently directs them to a trusted grown-up without promising secrecy.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 3: Data Controls */}
            {activeTab === 'controls' && (
              <div className="p-6 space-y-6">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 font-bold text-amber-950">
                    <RotateCcw className="w-5 h-5 text-amber-600" />
                    <span>Reset Current Session</span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-900 mt-1">
                    Clears recent chat messages and returns to the initial lesson screen. All earned stars
                    and level mastery will be preserved.
                  </p>
                  <button
                    onClick={handleResetSessionClick}
                    disabled={isProcessing}
                    className="mt-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Reset Active Chat
                  </button>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
                  <div className="flex items-center gap-2 font-bold text-rose-950">
                    <Trash2 className="w-5 h-5 text-rose-600" />
                    <span>Permanently Delete All Data</span>
                  </div>
                  <p className="text-xs sm:text-sm text-rose-900 mt-1">
                    Purges all child progress, earned stars, and session history in accordance with
                    parental consent and data erasure standards.
                  </p>
                  <button
                    onClick={handleDeleteProfileClick}
                    disabled={isProcessing}
                    className="mt-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Permanently Delete Profile
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
