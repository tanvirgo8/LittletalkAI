# LittleTalk AI - Data Model & Persistence Specification

This document defines the schema, security boundaries, and persistence architecture for LittleTalk AI.

---

## 1. Firestore Schema Definition

The database is structured to balance read efficiency, minimal write amplification, and child privacy.

```
/profiles/{profileId}
    │
    ├── /activities/{activityId}
    │
    └── /sessions/{sessionId}
```

### 1.1 Collection: `profiles/{profileId}`

Represents a child's learning profile (anonymous or parent-managed).

| Field | Type | Required | Description | Security / Ownership |
| :--- | :--- | :--- | :--- | :--- |
| `profileId` | `string` | Yes | Unique UUID identifier for profile. | Server-generated. Immutable. |
| `nickname` | `string` | No | Optional display nickname (max 20 chars). | User/Parent managed. |
| `currentLevel` | `number` | Yes | Active learning stage (1, 2, or 3). | **Server-managed only.** |
| `preferences` | `map` | No | Optional favorite colors, topics. | User/Parent managed. |
| `progressSummary` | `map` | Yes | Aggregate progress metrics (see below). | **Server-managed only.** |
| `createdAt` | `string` | Yes | ISO 8601 creation timestamp. | Server set. |
| `updatedAt` | `string` | Yes | ISO 8601 modification timestamp. | Server set. |

#### Sub-structure: `progressSummary`
```json
{
  "totalAnswered": 24,
  "totalCorrect": 21,
  "streakCount": 4,
  "level1Mastered": true,
  "level2Mastered": false,
  "starsEarned": 23,
  "topicProgress": {
    "colors": {
      "topic": "colors",
      "attempts": 8,
      "correct": 7,
      "lastAttemptAt": "2026-10-17T12:00:00Z"
    }
  }
}
```

---

### 1.2 Subcollection: `profiles/{profileId}/activities/{activityId}`

Tracks activity-level progress, attempts, and completion state.

| Field | Type | Description |
| :--- | :--- | :--- |
| `activityId` | `string` | Unique activity identifier (e.g., `l1-colors-1`). |
| `topic` | `string` | Subject domain (`colors`, `animals`, `fruits`, etc.). |
| `level` | `number` | Difficulty level (1, 2, or 3). |
| `attempts` | `number` | Cumulative submissions by the child. |
| `correctCount` | `number` | Number of correct responses. |
| `status` | `string` | Status: `'pending'`, `'active'`, `'completed'`, or `'review'`. |
| `updatedAt` | `string` | Timestamp of last activity interaction. |

---

### 1.3 Subcollection: `profiles/{profileId}/sessions/{sessionId}` (or Top-Level `sessions/{sessionId}`)

Stores bounded transient conversational context and mastery sliding windows.

| Field | Type | Description |
| :--- | :--- | :--- |
| `sessionId` | `string` | Unique session UUID. |
| `profileId` | `string` | Foreign key referencing child profile. |
| `currentMode` | `string` | Active mode: `LEARNING`, `CONVERSATION`, `ENGAGEMENT`, `SUPPORT`, `BREAK`. |
| `currentLevel` | `number` | Current learning level (1, 2, 3). |
| `currentTopic` | `string` | Active topic context (e.g. `colors`). |
| `currentActivityId`| `string` | Currently active question activity ID. |
| `currentQuestionId`| `string` | Currently active question ID. |
| `recentTurns` | `array` | Bounded sliding window of recent conversation turns (max 6). |
| `recentAssessedAnswers` | `array` | Sliding window of assessed answers used for mastery calculation (max 20). |
| `answeredQuestionIds` | `array` | Set of question IDs answered in this session (idempotency enforcement). |
| `lastInteractionAt` | `string` | Timestamp of most recent user interaction. |

---

## 2. Firestore Security Rules & Access Control

The complete rules defined in `firestore.rules`:
* **Zero Client Mutation of Mastery:** Direct client `create` or `update` requests to `profiles` and `activities` collections are unconditionally rejected (`allow write: if false`).
* **Server-Only Progression:** Scoring, star additions, and level transitions occur exclusively inside Next.js server Route Handlers.
* **Parental Data Deletion:** Authenticated parents can delete their child's profile document and all subcollections (`allow delete: if isOwner(profileId)`).

---

## 3. Storage Trade-Off Analysis

| Dimension | In-Memory Session Context | Remote Firestore Context |
| :--- | :--- | :--- |
| **Response Latency** | **&lt; 1 ms** (in-process Map access) | **50 - 150 ms** (network round trip to GCP) |
| **Write Amplification** | Zero database costs | 1 write per conversational turn |
| **Persistence** | Resets on server instance restart | Persists permanently across devices |
| **Scalability** | Node-instance bounded | Scales globally across cloud regions |
| **LittleTalk Strategy** | Fast in-memory state for active turn generation | Asynchronous periodic flushing to Firestore for persistence |

---

## 4. In-Memory Demo Fallback & Disclosure

When running without Firebase credentials:
1. The app automatically initializes `MemoryDatabaseAdapter`.
2. All operations function identically to Firestore.
3. The parent dashboard and API responses explicitly declare `storageType: 'in-memory-demo'`.
4. The system never silently pretends that demo data has been saved to remote cloud storage.
