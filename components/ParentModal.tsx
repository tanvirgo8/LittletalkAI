'use client';

import React, { useState, useEffect } from 'react';
import { TOPIC_LABELS, type ProgressSummary, type LearningLevel } from '@/lib/types';
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
  Layers,
  Table,
  Check,
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

  const [activeTab, setActiveTab] = useState<'progress' | 'privacy' | 'controls' | 'database'>('progress');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Database Tab States
  const [dbStats, setDbStats] = useState<any>(null);
  const [selectedTable, setSelectedTable] = useState<string>('activities');
  const [tableRecords, setTableRecords] = useState<any[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  useEffect(() => {
    if (isUnlocked && activeTab === 'database') {
      fetchDbStats();
      fetchTableRecords(selectedTable);
    }
  }, [isUnlocked, activeTab, selectedTable]);

  const fetchDbStats = async () => {
    try {
      setIsLoadingDb(true);
      const res = await fetch('/api/database');
      if (res.ok) {
        const data = await res.json();
        setDbStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch DB stats', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

  const fetchTableRecords = async (table: string) => {
    try {
      setIsLoadingDb(true);
      const res = await fetch(`/api/database?table=${table}`);
      if (res.ok) {
        const data = await res.json();
        setTableRecords(data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch table records', err);
    } finally {
      setIsLoadingDb(false);
    }
  };

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
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 animate-fade-in"
    >
      <div className="bg-white w-full max-w-3xl rounded-2xl sm:rounded-4xl shadow-2xl border-2 sm:border-4 border-amber-300 overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-amber-100/80 px-4 sm:px-6 py-3 sm:py-4 border-b border-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700" />
            <h2 id="parent-modal-title" className="text-base sm:text-xl font-extrabold text-amber-950">
              Grown-Up &amp; Parent Dashboard
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 sm:p-1.5 rounded-full hover:bg-amber-200 text-amber-800 transition-colors cursor-pointer"
            aria-label="Close parent dashboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Math Challenge Gate */}
        {!isUnlocked ? (
          <div className="p-5 sm:p-8 text-center my-auto">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-amber-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-3 sm:mb-4 text-amber-600">
              <Lock className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">Parent Verification</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
              Please solve this quick problem to verify you are a parent:
            </p>

            <form onSubmit={handleUnlock} className="max-w-xs mx-auto space-y-3 sm:space-y-4">
              <div className="text-xl sm:text-2xl font-black text-amber-950 bg-amber-50 py-2.5 sm:py-3 rounded-2xl border-2 border-amber-200">
                {num1} + {num2} = ?
              </div>
              <input
                type="number"
                value={gateInput}
                onChange={(e) => setGateInput(e.target.value)}
                placeholder="Enter answer"
                autoFocus
                className="w-full text-center text-lg sm:text-xl font-bold p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 border-gray-300 focus:border-amber-500 focus:outline-none"
              />
              {gateError && (
                <p className="text-xs font-bold text-rose-600">
                  That answer is incorrect. Please try again.
                </p>
              )}
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-2.5 sm:py-3 rounded-xl sm:rounded-2xl shadow-md transition-all cursor-pointer text-sm sm:text-base"
              >
                Enter Parent Dashboard
              </button>
            </form>
          </div>
        ) : (
          /* Unlocked Parent Dashboard Content */
          <div className="flex-1 overflow-y-auto flex flex-col touch-scroll">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 bg-gray-50/80 px-3 sm:px-6 pt-2 sm:pt-3 gap-1 sm:gap-2 overflow-x-auto no-scrollbar overscroll-x-contain">
              <button
                onClick={() => setActiveTab('progress')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl sm:rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'progress'
                    ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Learning Progress
              </button>
              <button
                onClick={() => setActiveTab('database')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl sm:rounded-t-2xl border-b-2 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  activeTab === 'database'
                    ? 'border-indigo-600 text-indigo-950 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
                <span>Database &amp; Tables</span>
              </button>
              <button
                onClick={() => setActiveTab('privacy')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl sm:rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'privacy'
                    ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Safety &amp; Privacy
              </button>
              <button
                onClick={() => setActiveTab('controls')}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-t-xl sm:rounded-t-2xl border-b-2 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'controls'
                    ? 'border-amber-500 text-amber-900 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Data Controls
              </button>
            </div>

            {actionSuccess && (
              <div className="m-3 sm:m-4 p-3 bg-emerald-100 border border-emerald-300 rounded-xl sm:rounded-2xl text-emerald-800 text-xs sm:text-sm font-bold flex items-center gap-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {/* Tab 1: Progress */}
            {activeTab === 'progress' && (
              <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">
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
                    <p className="text-[11px] text-emerald-700 mt-0.5">Accuracy Rate</p>
                  </div>
                </div>

                {/* Topic Breakdown */}
                <div className="border border-gray-200 rounded-2xl p-4">
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-600" />
                    Topic Progress Breakdown
                  </h4>
                  {Object.keys(progressSummary.topicProgress).length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-2">
                      No activities assessed yet in this session. Start learning to see topic mastery!
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {Object.entries(progressSummary.topicProgress).map(([topic, data]) => {
                        const rate = data.attempts > 0 ? Math.round((data.correct / data.attempts) * 100) : 0;
                        const label = TOPIC_LABELS[topic as keyof typeof TOPIC_LABELS] || topic;
                        return (
                          <div key={topic} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-gray-700">
                              <span>{label}</span>
                              <span>
                                {data.correct}/{data.attempts} ({rate}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-400' : 'bg-rose-400'
                                }`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Storage Disclosure Badge */}
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="text-xs text-emerald-950 font-medium">
                    <span>
                      <strong>Persistent Relational Storage:</strong> Using SQLite on-disk tables + Firebase Cloud sync. Mock data removed.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Database & Tables (Live Inspection) */}
            {activeTab === 'database' && (
              <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5">
                {/* Header Status Banner */}
                <div className="bg-indigo-50 border-2 border-indigo-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <h4 className="font-extrabold text-indigo-950 text-sm sm:text-base">
                        SQLite 3 Relational Database Engine
                      </h4>
                    </div>
                    <p className="text-xs text-indigo-800/90 mt-1">
                      File: <code className="bg-white/80 px-1.5 py-0.5 rounded text-indigo-900 font-mono text-[11px]">data/littletalk.db</code> • Persistent on disk • Foreign key constraints active
                    </p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-full text-xs font-extrabold">
                      <Check className="w-3.5 h-3.5" /> Live Relational Tables
                    </span>
                  </div>
                </div>

                {/* Tables Grid / Selector */}
                <div>
                  <h5 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Database Tables (Click to Inspect Live Records)
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {dbStats?.tables?.map((table: any) => {
                      const isSelected = selectedTable === table.name;
                      return (
                        <button
                          key={table.name}
                          onClick={() => setSelectedTable(table.name)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
                              : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold truncate">{table.name}</span>
                            <span
                              className={`text-[11px] font-extrabold px-1.5 py-0.2 rounded-full ${
                                isSelected ? 'bg-indigo-800 text-white' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {table.rowCount}
                            </span>
                          </div>
                          <p
                            className={`text-[10px] mt-1 line-clamp-1 ${
                              isSelected ? 'text-indigo-200' : 'text-gray-500'
                            }`}
                          >
                            {table.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Table Records Live Viewer */}
                <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Table className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-xs sm:text-sm text-gray-800">
                        Table: <span className="font-mono text-indigo-900">{selectedTable}</span> ({tableRecords.length} records loaded from DB)
                      </span>
                    </div>
                    {isLoadingDb && (
                      <span className="text-[11px] text-indigo-600 font-bold animate-pulse">
                        Querying database...
                      </span>
                    )}
                  </div>

                  <div className="max-h-60 overflow-x-auto overflow-y-auto p-2">
                    {tableRecords.length === 0 ? (
                      <p className="text-xs text-gray-500 italic p-4 text-center">
                        No records stored in this table yet. Table schema is ready.
                      </p>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            {Object.keys(tableRecords[0] || {}).map((col) => (
                              <th key={col} className="p-2 font-mono text-[11px] text-gray-700 uppercase">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableRecords.slice(0, 15).map((row: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-indigo-50/40">
                              {Object.entries(row).map(([k, v]: [string, any]) => (
                                <td key={k} className="p-2 font-mono text-[11px] text-gray-800 max-w-[200px] truncate">
                                  {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Safety & Privacy */}
            {activeTab === 'privacy' && (
              <div className="p-3.5 sm:p-6 space-y-4">
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-2xl space-y-2">
                  <h4 className="font-bold text-sky-950 text-sm flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-sky-700" />
                    COPPA &amp; Early-Childhood Safety Compliance
                  </h4>
                  <ul className="text-xs text-sky-900/90 space-y-2 mt-2">
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

            {/* Tab 4: Data Controls */}
            {activeTab === 'controls' && (
              <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-6">
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
