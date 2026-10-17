// ============================================================
// LittleTalk AI - API Request & Payload Validation (Zod)
// ============================================================
import { z } from 'zod';

export const ChatRequestSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, 'Message cannot be empty')
      .max(500, 'Message cannot exceed 500 characters'),
    sessionId: z.string().max(100).optional(),
    profileId: z.string().max(100).optional(),
    selectedOption: z.string().max(200).optional(),
    answerId: z.string().max(100).optional(),
  })
  .transform((data) => ({
    ...data,
    sessionId: data.sessionId?.trim() || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    profileId: data.profileId?.trim() || `child_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  }));

export const AnswerRequestSchema = z
  .object({
    sessionId: z.string().max(100).optional(),
    profileId: z.string().max(100).optional(),
    activityId: z.string().max(100).optional(),
    questionId: z.string().max(100).optional(),
    answer: z.string().trim().max(300).optional(),
    selectedAnswer: z.string().trim().max(300).optional(),
    selectedOption: z.string().trim().max(300).optional(),
    answerId: z.string().max(100).optional(),
  })
  .transform((data) => ({
    ...data,
    sessionId: data.sessionId?.trim() || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    profileId: data.profileId?.trim() || `child_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    activityId: data.activityId?.trim() || 'l1-colors-1',
    questionId: data.questionId?.trim() || 'l1-c1-q1',
    answer: (data.answer || data.selectedAnswer || data.selectedOption || '').trim(),
    answerId:
      data.answerId ||
      `ans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  }))
  .refine((data) => data.answer.length > 0, {
    message: 'Answer cannot be empty',
    path: ['answer'],
  });

export const SessionResetSchema = z
  .object({
    sessionId: z.string().max(100).optional(),
    profileId: z.string().max(100).optional(),
  })
  .transform((data) => ({
    sessionId: data.sessionId?.trim() || 'default_session',
    profileId: data.profileId?.trim() || 'default_child',
  }));

export const ProfileDeleteSchema = z
  .object({
    profileId: z.string().max(100).optional(),
  })
  .transform((data) => ({
    profileId: data.profileId?.trim() || 'default_child',
  }));
