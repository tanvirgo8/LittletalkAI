// ============================================================
// LittleTalk AI - API Request & Payload Validation (Zod)
// ============================================================
import { z } from 'zod';

export const ChatRequestSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(500, 'Message cannot exceed 500 characters'),
  sessionId: z.string().min(1, 'Session ID is required').max(100),
  profileId: z.string().min(1, 'Profile ID is required').max(100),
  selectedOption: z.string().max(200).optional(),
  answerId: z.string().max(100).optional(),
});

export const AnswerRequestSchema = z
  .object({
    sessionId: z.string().min(1, 'Session ID is required').max(100),
    profileId: z.string().min(1, 'Profile ID is required').max(100),
    activityId: z.string().min(1, 'Activity ID is required').max(100),
    questionId: z.string().min(1, 'Question ID is required').max(100),
    answer: z.string().trim().max(300).optional(),
    selectedAnswer: z.string().trim().max(300).optional(),
    selectedOption: z.string().trim().max(300).optional(),
    answerId: z.string().max(100).optional(),
  })
  .transform((data) => ({
    ...data,
    answer: (data.answer || data.selectedAnswer || data.selectedOption || '').trim(),
    answerId:
      data.answerId ||
      `ans_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  }))
  .refine((data) => data.answer.length > 0, {
    message: 'Answer cannot be empty',
    path: ['answer'],
  });

export const SessionResetSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required').max(100),
  profileId: z.string().min(1, 'Profile ID is required').max(100),
});

export const ProfileDeleteSchema = z.object({
  profileId: z.string().min(1, 'Profile ID is required').max(100),
});
