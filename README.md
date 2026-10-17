# LittleTalk AI 🌟

> **Adaptive, Child-Safe English Learning Chatbot for Children Under 7 Years Old**  
> *Production-Minded Application built with Next.js 15, React 19, TypeScript 5.8, SQLite 3, Firebase Firestore, Tailwind CSS 4, and Zod.*

---

## 📑 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Technology Stack](#️-architecture--technology-stack)
- [Database Architecture (Dual SQLite & Firebase)](#-database-architecture)
- [Prerequisites & System Requirements](#-prerequisites--system-requirements)
- [Quickstart (Local Development Setup)](#-quickstart-local-development-setup)
- [Environment Configuration](#-environment-configuration)
- [Database Seeding & Operations](#-database-seeding--operations)
- [Automated Testing & Type Checking](#-automated-testing--type-checking)
- [Performance Benchmark (Sub-2ms Latency)](#-performance-benchmark)
- [Deployment Instructions](#-deployment-instructions)
  - [Deploy to Vercel (Recommended Serverless)](#1-deploy-to-vercel)
  - [Deploy to Firebase App Hosting](#2-deploy-to-firebase-app-hosting)
  - [Deploy to Docker / Google Cloud Run / Self-Hosted VPS](#3-deploy-with-docker--cloud-run--vps)
  - [Deploy to Render or Railway](#4-deploy-to-render-or-railway)
- [Parental Controls & Child Safety (COPPA Aligned)](#-parental-controls--child-safety)
- [Directory Structure](#-directory-structure)
- [Documentation Index](#-documentation-index)

---

## 📖 Overview

**LittleTalk AI** is an adaptive, child-safe conversational web application designed for early childhood language acquisition (ages 3–6). Traditional LLMs often struggle with unpredictable hallucination, slow token streaming latency, and non-deterministic scoring. LittleTalk AI solves this with:

1. **A Relational Learning Engine:** Powered by SQLite 3 with 8 relational tables and Firebase Firestore integration.
2. **A 5-Mode State Machine:** Contextually switching between `LEARNING`, `CONVERSATION`, `ENGAGEMENT`, `SUPPORT`, and `BREAK`.
3. **An Empathetic SEL Companion ("Lumi the Star"):** Encourages effort and persistence, normalizes mistakes without negative reinforcement, and escalates safety concerns to parents.
4. **Dual Child-Tuned Audio Synthesizers:** Browser-native speech synthesis offering a lively 10-year-old older child voice or a cheerful toddler/baby voice.

---

## ✨ Key Features

- **3-Stage Curriculum Progression:**
  - **Level 1 (Vocabulary):** Object and word recognition with visual emoji cues (*"What color is the banana? 🍌"* &rarr; Yellow).
  - **Level 2 (Short Phrases):** Early syntax and combinations (*"I see a cat.", "The ball is red."*).
  - **Level 3 (Sentences & Descriptions):** Multi-word expressions and open questions (*"The little cat is sleeping.", "What do you like to play?"*).
- **Deterministic Server-Side Mastery:**
  - Configurable mastery threshold ($\ge 80\%$ accuracy over minimum 10 assessed curriculum answers).
  - General chat banter never advances a child's educational level.
  - Automatic weakest-topic detection with tailored review activities.
- **5-Mode Contextual State Machine:**
  - `LEARNING`: Curriculum lessons and quiz activities.
  - `CONVERSATION`: Friendly banter, curiosity answers, and gentle stories.
  - `ENGAGEMENT`: Interactive guessing games and word fun.
  - `SUPPORT`: Gentle encouragement, hints, and immediate adult safety escalation.
  - `BREAK`: Calming resting state when tiredness or fatigue is detected.
- **Dual Voice Tuning:**
  - **Kid Voice:** 10-year-old older sibling persona (Pitch: 1.48, Rate: 0.96).
  - **Baby Voice:** Cute toddler voice (Pitch: 1.70, Rate: 0.88).
  - Automatic browser voice detection and emoji-filtering for crystal-clear pronunciation.
- **Parent Portal with Live Database Inspector:**
  - Gated behind a random arithmetic parental challenge (`4 + 3 = ?`).
  - Real-time progress breakdown across all topics.
  - Live Database viewer displaying table names, row counts, and stored records.
  - One-click session reset and permanent data deletion buttons (COPPA compliant).

---

## 🛠️ Architecture & Technology Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 15.5 (App Router)** | High-performance React 19 framework with SSR and Route Handlers. |
| **Language** | **TypeScript 5.8** | Complete static type safety across schemas, state, and API routes. |
| **Styling** | **Tailwind CSS 4 + PostCSS** | Modern CSS-first design with rounded tactile child UI and micro-animations. |
| **Validation** | **Zod 4** | Strict schema validation for all API inputs, answers, and queries. |
| **Primary Relational DB** | **SQLite 3 (`node:sqlite`)** | Embedded zero-latency relational engine with WAL mode and foreign keys. |
| **Cloud Database** | **Firebase Firestore** | Google Cloud NoSQL persistence with security rules. |
| **Audio** | **Web Speech API** | Client-side zero-latency speech synthesis (zero audio streaming cost). |
| **Test Runner** | **Vitest 5** | Isolated automated test runner (52 unit & integration tests). |

```mermaid
flowchart TD
    User([Child & Parent]) <--> Client[Next.js 15 App Router Frontend]
    Client --> Speech[Web Speech Synthesis API]
    Client <--> API[API Route Handlers]

    subgraph API Route Handlers
        API --> V[Zod Validation Layer]
        V --> M[5-Mode Detection Engine]
        V --> S[SEL Emotional Engine]
        V --> E[Deterministic Mastery Engine]
    end

    subgraph Storage Layer
        API <--> DBAdapter[Database Adapter Layer]
        DBAdapter <--> SQLite[(SQLite 3 Relational DB - 8 Tables)]
        DBAdapter <--> Firestore[(Google Firebase Firestore)]
    end
```

---

## 🗄️ Database Architecture

LittleTalk AI incorporates a **production-ready database design** featuring 8 normalized relational tables:

```
┌─────────────────────────────────────────────────────────────────┐
│                    LITTLETALK RELATIONAL DB                     │
├───────────────────┬─────────────────────────────────────────────┤
│ Table Name        │ Description                                 │
├───────────────────┼─────────────────────────────────────────────┤
│ activities        │ Curriculum units (Topic, Level, Type)       │
│ questions         │ Curriculum questions, hints, & choices      │
│ child_profiles    │ Child learner profiles, level, and stars    │
│ learning_sessions │ Active sessions, current topic, and streak  │
│ conversation_turns│ Full turn history with latency and mode     │
│ activity_progress │ Per-activity progress, attempts, & mastery  │
│ assessed_answers  │ Idempotent records of scored attempts       │
│ dictionary_knowledge Knowledge base for open conversational words│
└───────────────────┴─────────────────────────────────────────────┘
```

- **Built-in Relational Storage:** Utilizes Node.js's built-in `node:sqlite` in `data/littletalk.db`. Zero native compilation or external C++ binding dependencies required.
- **Firebase Firestore Integration:** Configured with cloud persistence for multi-device sync and parental review.

---

## 💻 Prerequisites & System Requirements

Ensure the following runtimes are installed on your workstation or build server:

- **Node.js:** `v18.18+`, `v20+`, or `v24+` (Recommended: **Node.js v24.19.0** for native `node:sqlite`)
- **Package Manager:** `npm` v9+ or v10+ (or `pnpm` / `yarn`)
- **Operating System:** Windows, macOS, or Linux (Ubuntu 22.04+ / Alpine / Debian)
- **Web Browser:** Modern Chromium (Chrome/Edge), Safari, or Firefox with Speech Synthesis support.

---

## 🚀 Quickstart (Local Development Setup)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/littletalk-ai.git
cd littletalk-ai
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

The application will start at:
👉 **`http://localhost:3000`**

On initial startup, LittleTalk AI will automatically:
1. Initialize the SQLite relational database at `data/littletalk.db`.
2. Seed curriculum activities and questions across all 3 levels.
3. Establish default demo sessions with zero manual configuration.

---

## ⚙️ Environment Configuration

LittleTalk AI works **out-of-the-box with zero configuration** using its local SQLite database.

If you wish to connect Firebase Firestore or an optional LLM provider, copy the example environment template:

```bash
cp .env.example .env.local
```

### Environment Variables

| Variable | Required? | Default | Description |
| :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Optional | `""` | Firebase Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Optional | `""` | Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Optional | `littletalk-ai` | Firebase Google Cloud Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Optional | `""` | Firebase Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Optional | `""` | Firebase Messaging Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Optional | `""` | Firebase Web App ID |
| `ENABLE_LLM` | Optional | `"false"` | Toggle external LLM provider (`"true"` / `"false"`) |
| `LLM_API_KEY` | Optional | `""` | API Key for optional OpenAI or Gemini provider |
| `LLM_MODEL` | Optional | `gpt-4o-mini` | LLM model identifier |
| `LLM_ENDPOINT` | Optional | `""` | Custom OpenAI-compatible completion endpoint |

---

## 🗃️ Database Seeding & Operations

### Automatic Local SQLite Seeding
Local SQLite tables are automatically created and seeded when the server starts. If you ever need to reset or inspect local database files:
```bash
# View database file
ls -la data/littletalk.db

# Inspect database schema via Parent Dashboard UI:
# Navigate to Parent Dashboard -> Live Database & Tables
```

### Seeding Firebase Firestore
To populate your remote Firebase Firestore database with the curriculum questions:
```bash
node scripts/seed-firebase.js
```

---

## 🧪 Automated Testing & Type Checking

The test suite covers:
- Server-side answer scoring and idempotency.
- Mastery calculation and level progression (80% threshold).
- 5-Mode intent detection and safety escalation.
- Social and emotional learning (SEL) response praise.
- Database relational table schema and queries.

```bash
# Run all 52 unit & integration tests
npm test

# Run tests in interactive watch mode
npm run test:watch

# Run static type-checking
npm run type-check

# Run Next.js linter
npm run lint
```

### Test Suite Status: **52 / 52 Passing** ✅
- `tests/database.test.ts` (6 tests)
- `tests/user-fixes.test.ts` (6 tests)
- `tests/api-routes.test.ts` (8 tests)
- `tests/chat-provider.test.ts` (4 tests)
- `tests/mode-detection.test.ts` (11 tests)
- `tests/mastery-engine.test.ts` (10 tests)
- `tests/sel-engine.test.ts` (7 tests)

---

## ⚡ Performance Benchmark

LittleTalk AI guarantees sub-2-second response latency for early learners:

```bash
npm run bench
```

### Empirical Measured Results ($N = 100$ Interactions)
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
Target (< 2000ms):      PASSED (Sub-2ms deterministic response)
====================================================
```

---

## 🚢 Deployment Instructions

### 1. Deploy to Vercel (Serverless Ready)

LittleTalk AI is fully optimized for Vercel Serverless Functions with native `/tmp` directory detection and graceful in-memory relational failover:

1. **Node.js 22.x Runtime:**
   - LittleTalk AI uses `node:sqlite` (introduced in Node.js 22.5+).
   - In `package.json`, `"engines": { "node": ">=22.5.0" }` is pre-configured so Vercel automatically selects the Node 22.x runtime.
   - Alternatively, in your Vercel Dashboard, go to **Settings &rarr; General &rarr; Node.js Version** and select **22.x**.

2. **Push your code to GitHub / GitLab:**
   ```bash
   git add .
   git commit -m "feat: complete LittleTalk AI production release"
   git push origin main
   ```

3. **Import Project into Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new) and select your repository.
   - Framework preset: **Next.js** (detected automatically).
   - Root Directory: `./`

4. **Environment Variables (Optional):**
   - If using cloud persistence with Firebase, add:
     - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
     - `NEXT_PUBLIC_FIREBASE_API_KEY`
     - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
     - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
     - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - *Note: If no Firebase keys are set, LittleTalk AI automatically runs offline in persistent serverless SQLite mode with zero external dependencies.*

5. **Serverless Filesystem Tolerance:**
   - In AWS Lambda / Vercel Serverless containers, `process.cwd()` is strictly read-only (`/var/task`). LittleTalk AI automatically detects this and stores runtime SQLite data safely in `/tmp/littletalk.db`.
   - If deployed on an older Node version without `node:sqlite`, the system automatically switches to the built-in in-memory relational store without dropping requests or throwing 500 errors.

6. **Click "Deploy"**:
   - Vercel builds the production bundle and deploys all API routes and UI within ~60 seconds.


---

### 2. Deploy to Firebase App Hosting

To host both the SSR frontend and serverless API handlers on Firebase:

1. Install the Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in and initialize App Hosting:
   ```bash
   firebase login
   firebase apphosting:backends:create --project littletalk-ai
   ```
3. Link your GitHub repository through the Firebase Console. Firebase App Hosting will automatically trigger Cloud Build and deploy upon git push.
4. Deploy security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

---

### 3. Deploy with Docker / Cloud Run / VPS

To run LittleTalk AI as a self-contained container with local persistent SQLite storage:

#### Create a `Dockerfile`:
```dockerfile
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

COPY .next ./.next
COPY public ./public
COPY data ./data

EXPOSE 3000
CMD ["npm", "start"]
```

#### Build and Run Locally:
```bash
# 1. Build Next.js application
npm run build

# 2. Build Docker container
docker build -t littletalk-ai .

# 3. Run container with persistent data volume
docker run -p 3000:3000 -v $(pwd)/data:/app/data littletalk-ai
```

#### Deploy to Google Cloud Run:
```bash
gcloud run deploy littletalk-ai \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

### 4. Deploy to Render or Railway

For zero-devops hosting with persistent SQLite disk storage:

#### Render:
1. Create a **New Web Service** connected to your repository.
2. Set **Build Command:** `npm install && npm run build`
3. Set **Start Command:** `npm start`
4. Add a **Persistent Disk** mounted at `/app/data` (size: 1 GB).

#### Railway:
1. Create a new project and link the repository.
2. In service settings, add a volume mounted to `/app/data`.
3. Add environment variables and Railway will automatically deploy.

---

## 🔒 Parental Controls & Child Safety

LittleTalk AI adheres strictly to the **Children's Online Privacy Protection Act (COPPA)** guidelines:

1. **Zero Child PII Collection:** No account creation, email addresses, passwords, or phone numbers are ever solicited from children.
2. **Local Session Keys:** Profiles are identified through random pseudonymous keys (e.g., `child_1792...`).
3. **No Voice Recording:** Audio processing occurs 100% on the child's local device using the browser's native Web Speech Synthesis API. No audio streams are sent to remote servers.
4. **Gated Parent Dashboard:** Protected by arithmetic challenges to verify adult access.
5. **Right to Forget (Instant Data Purge):** Parents can permanently delete all stored sessions, answers, and progress with a single click.
6. **Harm & Safety Escalation:** If a child expresses danger, distress, or abuse, the system immediately displays adult safety escalation messages without promising false secrecy.

---

## 📁 Directory Structure

```
├── app/
│   ├── api/
│   │   ├── activity/answer/route.ts   # Answer scoring & progression (Idempotent)
│   │   ├── chat/route.ts              # Main chat engine with mode detection
│   │   ├── database/route.ts          # Live database statistics & table inspector
│   │   ├── profile/delete/route.ts    # Parent portal data purge endpoint
│   │   ├── progress/route.ts          # Child progress & mastery summary
│   │   └── session/reset/route.ts     # Session reset endpoint
│   ├── globals.css                    # Tailwind CSS 4 styles & animations
│   ├── layout.tsx                     # Root layout with Nunito typography
│   └── page.tsx                       # Main child & parent interactive interface
├── components/
│   ├── ActivityCard.tsx               # Tactile quiz card with speech & hint buttons
│   ├── ChatInterface.tsx              # Child chat dialogue & quick reply chips
│   ├── HeaderBar.tsx                  # Level badge, star counter, voice profile toggle
│   ├── Mascot.tsx                     # Animated vector SVG star mascot (Lumi)
│   ├── ModeSelector.tsx               # 5-mode child navigation buttons
│   └── ParentModal.tsx                # Gated parent portal & live database inspector
├── data/
│   └── littletalk.db                  # Local SQLite 3 relational database file
├── docs/
│   ├── api-design.md                  # Complete OpenAPI specification & schemas
│   ├── architecture.md                # Mermaid system diagrams
│   ├── data-model.md                  # Relational & Firestore schema specs
│   ├── performance.md                 # Latency analysis & benchmark reports
│   ├── security-and-privacy.md        # COPPA alignment & threat assessment
│   ├── system-design.md               # 18-section architectural system design
│   └── video-script.md                # 2-minute project walkthrough script
├── lib/
│   ├── chat-provider.ts               # Offline rule provider & optional LLM fallback
│   ├── curriculum-seed.ts             # Seed curriculum definitions
│   ├── db-adapter.ts                  # Storage abstraction (SQLite, Firestore, In-Memory)
│   ├── learning-content.ts            # Database query methods for curriculum
│   ├── mastery-engine.ts              # Deterministic scoring & progression logic
│   ├── mode-detection.ts              # 5-mode intent classifier & safety rules
│   ├── sel-engine.ts                  # Social-emotional praise generator
│   ├── session-manager.ts             # Session lifecycle manager
│   ├── sound-effects.ts               # Web Audio API procedural sound synthesizers
│   ├── sqlite-db.ts                   # SQLite 3 relational engine (8 tables)
│   ├── types.ts                       # TypeScript interfaces & data contracts
│   └── validations.ts                 # Zod validation schemas
├── scripts/
│   ├── benchmark.js                   # Latency measurement benchmark suite
│   └── seed-firebase.js               # Firebase Firestore curriculum seeder
├── tests/
│   ├── api-routes.test.ts             # API route handler integration tests
│   ├── chat-provider.test.ts          # Chat engine & guardrail tests
│   ├── database.test.ts               # SQLite relational database schema tests
│   ├── mastery-engine.test.ts         # Progression & scoring unit tests
│   ├── mode-detection.test.ts         # Intent classification tests
│   ├── sel-engine.test.ts             # Emotional learning unit tests
│   └── user-fixes.test.ts             # Regression & bugfix test suite
├── firestore.rules                    # Strict Firebase security rules
├── next.config.js                     # Next.js security headers & server externals
├── package.json                       # Scripts & project dependencies
├── tsconfig.json                      # TypeScript configuration
└── vitest.config.ts                   # Vitest testing configuration
```

---

## 📚 Documentation Index

For deep-dive architectural specifications, consult the following documents in `docs/`:

1. [System Design Document](docs/system-design.md) — Comprehensive 18-section system design.
2. [Architecture Diagrams](docs/architecture.md) — Context, container, and sequence diagrams.
3. [API Design Specification](docs/api-design.md) — Route contracts, request/response payloads, and error codes.
4. [Data Model & Database Specs](docs/data-model.md) — Relational table schemas, indexes, and Firestore collections.
5. [Performance & Latency Analysis](docs/performance.md) — Sub-2-second benchmark results and profiling data.
6. [Security & Privacy Blueprint](docs/security-and-privacy.md) — COPPA adherence, threat model, and safety guardrails.
7. [Presentation Video Script](docs/video-script.md) — 2-minute product walkthrough and demonstration script.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
