# LittleTalk AI 🌟

> **Adaptive, Child-Safe English Learning Chatbot for Children Under 7 Years Old**  
> *Production-Minded MVP built with Next.js 15, TypeScript, Tailwind CSS, Zod, and Firebase Firestore.*

---

## 📖 Project Overview

**LittleTalk AI** is an educational web application and conversational companion designed specifically for preschoolers and early learners aged 3 to 6. Rather than relying on unpredictable LLM output or punitive gamification loops, LittleTalk AI pairs an **interactive, deterministic learning engine** with an **age-appropriate Social and Emotional Learning (SEL) companion** named **Lumi the Star**.

Children learn foundational vocabulary (Colors, Animals, Numbers, Fruits, Family, Objects), short phrases, and sentences through tactile multiple-choice questions, quick replies, and browser-native speech synthesis. All scoring, progression, and star allocation occur strictly server-side.

---

## ✨ Key Features

* **3 Structured Learning Stages:**
  * **Level 1 (Vocabulary):** Object and word recognition with emoji hints (e.g., *"What color is the banana? 🍌"* &rarr; Yellow).
  * **Level 2 (Short Phrases):** Combinations and syntax (e.g., *"I see a cat.", "The ball is red."*).
  * **Level 3 (Sentences & Conversations):** Descriptions and open-ended dialogue (e.g., *"The little cat is sleeping.", "What do you like to play?"*).
* **Deterministic Mastery & Progression Engine:**
  * Configurable mastery threshold (&ge; 80% accuracy over minimum 10 assessed answers).
  * Ordinary conversational banter **never** advances a child's learning level.
  * Automatic weakest-topic identification and review activity triggers for struggling learners.
* **5-Mode Contextual State Machine:**
  * `LEARNING`: Pre-defined lessons and structured quiz activities.
  * `CONVERSATION`: Friendly, open banter, jokes, and stories.
  * `ENGAGEMENT`: Interactive games and quiz requests.
  * `SUPPORT`: Encouragement, hints, simpler questions, and safety escalation.
  * `BREAK`: Calming resting state when tiredness is expressed.
* **Social and Emotional Learning (SEL):**
  * Praises effort, persistence, and brave tries rather than intelligence alone.
  * Normalizes mistakes without red error shaming or loud buzzers.
  * Escalates safety concerns immediately to trusted adults without false promises of secrecy.
* **Zero PII & Child Privacy (COPPA Aligned):**
  * No user accounts, passwords, or emails required for children.
  * No camera, microphone, or voice data recording; uses browser-native text-to-speech.
  * Zero ads, zero tracking scripts, zero dark patterns.
* **Parent Dashboard & Privacy Controls:**
  * Gated with an arithmetic parental verification challenge (`4 + 3 = ?`).
  * Real-time progress breakdown across topics.
  * Direct session reset and permanent data purge buttons.
* **Sub-2-Second Response Latency:**
  * Fast-path deterministic responses execute in **&lt; 2 ms** (measured p50: **0.34 ms**, p95: **1.63 ms**).

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | High-performance React framework with server-side API Route Handlers. |
| **Language** | TypeScript 5.8 | End-to-end type safety across schemas, state models, and components. |
| **Styling** | Tailwind CSS 4 + PostCSS | Custom child-friendly color palette, responsive tactile buttons, and keyframes. |
| **Validation** | Zod | Runtime validation of all API payloads, inputs, and state schemas. |
| **Database** | Firebase Firestore | Cloud NoSQL persistence with security rules + In-Memory Demo fallback. |
| **Testing** | Vitest | Lightning-fast test runner (40 automated tests across all core engines). |
| **Icons & FX** | Lucide React + Canvas Confetti | Child-accessible vector icons and celebratory confetti bursts. |

---

## 🏗️ Architecture Summary

```mermaid
graph TD
    User([Child & Parent]) <--> Client[Next.js App Router UI]
    Client --> Speech[Web Speech Synthesis API]
    Client <--> API[/api/chat & /api/activity/answer & /api/progress]

    subgraph Serverless Backend
        API --> Zod[Zod Validation]
        API --> Mode[Mode Detection Engine]
        API --> SEL[SEL Emotional Engine]
        API --> Mastery[Deterministic Mastery Engine]
        API --> ProviderRouter[Provider Router]
        ProviderRouter --> RuleProvider[Deterministic Rule Provider - Default]
        ProviderRouter -. Feature Flag .-> LLMProvider[Optional LLM Provider - 1.5s Timeout]
    end

    subgraph Storage Layer
        API <--> DBAdapter[Database Adapter Interface]
        DBAdapter --> Memory[(In-Memory Demo Adapter)]
        DBAdapter -. Configured .-> Firestore[(Firebase Firestore Remote)]
    end
```

---

## 🚀 Prerequisites & Installation

### Prerequisites
* **Node.js:** v18.18+ or v20+ (tested on Node.js v24.19.0)
* **npm:** v9+ or v10+

### Installation
```bash
# Clone the repository
git clone https://github.com/your-username/littletalk-ai.git
cd littletalk-ai

# Install dependencies
npm install
```

---

## ⚙️ Environment Configuration

The application is designed to run **100% in Demo Mode out-of-the-box** without any API keys or Firebase setup.

To configure optional Firebase Firestore persistence or an optional LLM:
```bash
cp .env.example .env.local
```

### Environment Variables Reference
```env
# Optional Firebase Firestore
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-app.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-app.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"

# Optional LLM Integration (Disabled by default)
ENABLE_LLM="false"
LLM_API_KEY="your-openai-or-gemini-key"
LLM_MODEL="gpt-4o-mini"
LLM_ENDPOINT="https://api.openai.com/v1/chat/completions"
```

---

## 💻 Local Development

```bash
# Start local Next.js development server
npm run dev

# Open http://localhost:3000 in your browser
```

---

## 🧪 Running Automated Tests

We maintain comprehensive automated unit and API integration tests using **Vitest**:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch
```

### Test Suite Summary (40/40 Passing)
* `tests/mastery-engine.test.ts`: Level progression, 80% threshold over 10 questions, review triggers, weakest topic detection, duplicate answer prevention.
* `tests/mode-detection.test.ts`: 5-mode intent classification, safety priority escalation, transition constraints.
* `tests/sel-engine.test.ts`: Praise for effort, mistake normalization, safety escalation to trusted adult without secrecy.
* `tests/chat-provider.test.ts`: Offline deterministic provider, LLM safety guardrails, timeout fallbacks.
* `tests/api-routes.test.ts`: API route payload validation, server-side scoring, idempotency handling, progress checks.

---

## ⚡ Performance Testing & Benchmark

Run the automated latency benchmark:

```bash
npm run bench
```

### Empirical Measured Results (Sample $N = 100$)
```
================ BENCHMARK RESULTS ================
Sample Size:            100 interactions
Total Benchmark Time:   0.12s
----------------------------------------------------
End-to-End Chat Latency:
  - Mean:               0.95 ms
  - p50 (Median):       0.34 ms
  - p95:                1.63 ms
  - p99:                16.24 ms
  - Min / Max:          0.20 ms / 16.29 ms
----------------------------------------------------
Answer Scoring Latency:
  - p50 (Median):       0.25 ms
  - p95:                4.60 ms
----------------------------------------------------
Sub-2-Second Compliance: 100.0%
Target (< 2000ms):      PASSED (Sub-10ms deterministic response)
====================================================
```
*Measurements recorded on Node.js v24.19.0 win32 x64.*

---

## 📦 Production Build

```bash
# Build the optimized production bundle
npm run build

# Start the production server
npm start
```

---

## 🛡️ Demo Mode Limitations & Disclosures

1. **In-Memory Storage:** When running without Firebase credentials, child progress and session data are stored in server memory and reset when the server restarts.
2. **Explicit Labeling:** The UI footer and Parent Dashboard prominently disclose whether storage is `'in-memory-demo'` or `'firestore'`.
3. **No False Guarantees:** The system never pretends data is saved remotely when running in demo mode.

---

## 🚀 Deployment to Vercel

1. Push your repository to GitHub / GitLab:
   ```bash
   git add .
   git commit -m "feat: complete LittleTalk AI adaptive learning chatbot MVP"
   git push origin main
   ```
2. Import the project in the [Vercel Dashboard](https://vercel.com).
3. (Optional) Add your Firebase or LLM environment variables in Vercel Project Settings.
4. Deploy! Next.js App Router will automatically provision serverless Route Handlers and edge caching.

---

## 📁 Project Structure

```
├── app/
│   ├── api/
│   │   ├── activity/answer/route.ts  # Answer scoring & progression (Idempotent)
│   │   ├── chat/route.ts             # Main chat interaction & mode detection
│   │   ├── profile/delete/route.ts   # Parent-facing data purge
│   │   ├── progress/route.ts         # Progress summary endpoint
│   │   └── session/reset/route.ts    # Session reset endpoint
│   ├── globals.css                   # Tailwind v4 styles & child-safe animations
│   ├── layout.tsx                    # Root HTML shell with Nunito font
│   └── page.tsx                      # Main child & parent learning portal
├── components/
│   ├── ActivityCard.tsx              # Tactile quiz card with speech & hints
│   ├── ChatInterface.tsx             # Friendly chat bubbles & quick replies
│   ├── HeaderBar.tsx                 # Level badge, stars count, voice toggle
│   ├── Mascot.tsx                    # Animated vector SVG star Lumi
│   ├── ModeSelector.tsx              # 5-mode child buttons
│   └── ParentModal.tsx               # Gated parent portal with progress & deletion
├── docs/
│   ├── api-design.md                 # Complete OpenAPI specs & payloads
│   ├── architecture.md               # Mermaid context, container, and sequence diagrams
│   ├── data-model.md                 # Firestore schemas & persistence trade-offs
│   ├── performance.md                # Latency targets & benchmark measurements
│   ├── security-and-privacy.md       # COPPA alignment & threat model
│   ├── system-design.md              # 18-section architectural system design
│   └── video-script.md               # 2-minute English presentation script
├── lib/
│   ├── chat-provider.ts              # Deterministic provider & optional LLM adapter
│   ├── db-adapter.ts                 # Storage abstraction (Firestore & In-Memory)
│   ├── learning-content.ts           # Curated educational database for L1, L2, L3
│   ├── mastery-engine.ts             # Deterministic scoring & progression logic
│   ├── mode-detection.ts             # 5-mode intent classifier & safety rules
│   ├── sel-engine.ts                 # Social & emotional response generator
│   ├── session-manager.ts            # Bounded context & session state
│   ├── types.ts                      # TypeScript interfaces & contracts
│   └── validations.ts                # Zod schemas for all API payloads
├── scripts/
│   └── benchmark.js                  # Automated latency benchmark suite
├── tests/
│   ├── api-routes.test.ts            # Route handler integration tests
│   ├── chat-provider.test.ts         # Provider & guardrail unit tests
│   ├── mastery-engine.test.ts        # Progression & scoring unit tests
│   ├── mode-detection.test.ts        # Intent classification unit tests
│   └── sel-engine.test.ts            # Emotional learning unit tests
├── firestore.rules                   # Strict Firestore security rules
├── next.config.js                    # Security headers & webpack aliases
├── package.json                      # Scripts & dependencies
├── tsconfig.json                     # TypeScript compiler configuration
└── vitest.config.ts                  # Test runner configuration
```
