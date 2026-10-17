# LittleTalk AI - API Design & Contracts

This document specifies the REST Route Handler contracts for LittleTalk AI.

---

## Standard Error Model

All failure responses conform to the following JSON structure:

```json
{
  "error": "Human-readable error description",
  "code": "MACHINE_READABLE_CODE",
  "correlationId": "req_1729166400_abc12",
  "timestamp": "2026-10-17T12:00:00.000Z",
  "details": null
}
```

Standard HTTP status codes:
* `200 OK`: Request succeeded.
* `400 Bad Request`: Payload validation failed (Zod validation error).
* `404 Not Found`: Profile, session, or activity ID not found.
* `500 Internal Server Error`: Unexpected server exception.

---

## 1. POST `/api/chat`

Handles child messages, detects conversational mode, selects activities, and instruments timings.

### Request Headers
* `Content-Type: application/json`

### Request Body
```json
{
  "message": "Teach me colors",
  "sessionId": "sess_1729166400_x9z",
  "profileId": "child_1729166400_p1",
  "selectedOption": "Yellow",
  "answerId": "opt-0"
}
```

### Response `200 OK`
```json
{
  "reply": "Let's learn about COLORS! 🎨 Colors are everywhere! Let's try: What color is the banana? 🍌",
  "mode": "LEARNING",
  "quickReplies": [
    { "id": "opt-0", "label": "Yellow", "value": "Yellow" },
    { "id": "opt-1", "label": "Blue", "value": "Blue" },
    { "id": "opt-2", "label": "Green", "value": "Green" }
  ],
  "activity": {
    "activityId": "l1-colors-1",
    "questionId": "l1-c1-q1",
    "question": "What color is the banana? 🍌",
    "imageHint": "🍌",
    "options": [
      { "id": "opt-0", "label": "Yellow", "value": "Yellow" },
      { "id": "opt-1", "label": "Blue", "value": "Blue" },
      { "id": "opt-2", "label": "Green", "value": "Green" }
    ],
    "topic": "colors",
    "level": 1,
    "hint": "Bananas are bright and sunny!"
  },
  "suggestedBreak": false,
  "progressUpdate": {
    "currentLevel": 1,
    "starsEarned": 0,
    "totalStars": 5,
    "masteryPercent": 80,
    "topicLabel": "🎨 Colors"
  },
  "timings": {
    "totalMs": 1,
    "modeDetectionMs": 0,
    "learningEngineMs": 0,
    "dbMs": 0
  }
}
```

---

## 2. POST `/api/activity/answer`

Evaluates a child's answer server-side, updates progress, assigns stars, and checks level progression. **Enforces idempotency.**

### Request Body
```json
{
  "sessionId": "sess_1729166400_x9z",
  "profileId": "child_1729166400_p1",
  "activityId": "l1-colors-1",
  "questionId": "l1-c1-q1",
  "answer": "Yellow",
  "answerId": "ans_1729166400_k12"
}
```

### Response `200 OK` (Correct Answer)
```json
{
  "correct": true,
  "correctAnswer": "Yellow",
  "feedback": "You got it! You worked hard on that one! 🌟",
  "stars": 1,
  "masteryUpdate": {
    "currentLevel": 1,
    "masteryPercent": 90,
    "answeredCount": 10,
    "requiredCount": 10
  },
  "levelUp": {
    "fromLevel": 1,
    "toLevel": 2,
    "message": "Amazing! 🌟 You reached Level 2! You've learned so many words! Now let's try short sentences!"
  }
}
```

### Response `200 OK` (Duplicate Submission Replay)
```json
{
  "correct": true,
  "correctAnswer": "Yellow",
  "feedback": "You already answered this correctly! Great job! ⭐",
  "stars": 0,
  "isDuplicate": true,
  "masteryUpdate": {
    "currentLevel": 1,
    "masteryPercent": 90,
    "answeredCount": 10,
    "requiredCount": 10
  }
}
```

---

## 3. GET `/api/progress`

Retrieves authorized child progress without PII.

### Query Parameters
* `profileId` (`string`): Target child profile identifier.
* `sessionId` (`string`): Optional active session identifier.

### Response `200 OK`
```json
{
  "profileId": "child_1729166400_p1",
  "currentLevel": 1,
  "progressSummary": {
    "totalAnswered": 12,
    "totalCorrect": 10,
    "streakCount": 3,
    "level1Mastered": true,
    "level2Mastered": false,
    "starsEarned": 11,
    "topicProgress": {
      "colors": {
        "topic": "colors",
        "attempts": 5,
        "correct": 5,
        "lastAttemptAt": "2026-10-17T12:00:00Z"
      }
    }
  },
  "recentTopics": ["colors"],
  "sessionCount": 1,
  "storageType": "in-memory-demo"
}
```

---

## 4. POST `/api/session/reset`

Resets the active conversational turn history and active question while preserving earned stars and level progress.

### Request Body
```json
{
  "sessionId": "sess_1729166400_x9z",
  "profileId": "child_1729166400_p1"
}
```

### Response `200 OK`
```json
{
  "success": true,
  "message": "Session state reset successfully. Progress preserved.",
  "sessionId": "sess_1729166400_x9z",
  "currentLevel": 1,
  "currentMode": "LEARNING"
}
```

---

## 5. POST `/api/profile/delete`

Parent-facing permanent deletion of profile, sessions, and activity scores.

### Request Body
```json
{
  "profileId": "child_1729166400_p1"
}
```

### Response `200 OK`
```json
{
  "success": true,
  "message": "All profile and activity data has been permanently deleted.",
  "profileId": "child_1729166400_p1",
  "deletedAt": "2026-10-17T12:05:00.000Z"
}
```
