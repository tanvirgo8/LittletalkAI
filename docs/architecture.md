# LittleTalk AI - Architecture & Diagrams

This document contains architectural diagrams describing the production design of LittleTalk AI.

---

## 1. System Context Diagram (C4 Level 1)

```mermaid
C4Context
    title System Context Diagram - LittleTalk AI

    Person(child, "Young Child (Age 3-6)", "Learns English words, phrases, and sentences through playful conversation.")
    Person(parent, "Parent / Guardian", "Monitors learning progress and controls privacy settings.")

    System(littletalk, "LittleTalk AI", "Adaptive English-learning chatbot with deterministic progression and social-emotional learning.")

    System_Ext(firestore, "Firebase Firestore", "Remote NoSQL cloud document database for persistent profile and activity storage.")
    System_Ext(llm, "Optional LLM Provider", "External LLM (OpenAI / Gemini) used optionally for open-ended conversation.")

    Rel(child, littletalk, "Interacts via touch, quick replies, and speech read-aloud", "HTTPS")
    Rel(parent, littletalk, "Views progress and manages data via Parent Dashboard", "HTTPS")
    Rel(littletalk, firestore, "Persists profiles, activities, and sessions", "gRPC / HTTPS")
    Rel(littletalk, llm, "Optional requests with 1.5s timeout", "HTTPS / JSON")
```

---

## 2. Container & Component Architecture (C4 Level 2 & 3)

```mermaid
graph TD
    subgraph Browser Client [Frontend Client Application]
        A[Next.js App Router UI] --> B[HeaderBar Component]
        A --> C[Mascot SVG Controller - Lumi]
        A --> D[ModeSelector Component]
        A --> E[ActivityCard Component]
        A --> F[ChatInterface Component]
        A --> G[ParentModal Component]
        A --> H[Web Speech Synthesis API]
    end

    subgraph Serverless Backend [Next.js Route Handlers]
        I[/api/chat] --> J[Zod Payload Validator]
        K[/api/activity/answer] --> J
        L[/api/progress] --> J
        M[/api/session/reset] --> J
        N[/api/profile/delete] --> J

        J --> O[Mode Detection & State Machine]
        J --> P[SEL Emotional Response Engine]
        J --> Q[Mastery & Progression Engine]
        J --> R[Chat Provider Router]

        R --> S[Deterministic Rule Provider - Default]
        R -. Feature Flag .-> T[Optional LLM Provider]
        T --> U[Child Safety Guardrail Validator]
    end

    subgraph Storage Abstraction Layer
        Q <--> V[Database Adapter Interface]
        O <--> V
        V --> W[(In-Memory Demo Adapter)]
        V -. Configured .-> X[(Firebase Firestore Remote)]
    end
```

---

## 3. Chat & Activity Request Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Child as Child User
    participant Client as Web Frontend (Next.js)
    participant Route as /api/chat Handler
    participant Mode as Mode Detection Engine
    participant Mastery as Mastery Engine
    participant Provider as Provider Router
    participant DB as Database Adapter

    Child->>Client: Taps "Learn Words" or submits answer
    Client->>Route: POST /api/chat { message, sessionId, profileId }
    Note over Route: Start latency timer t0

    Route->>DB: getSession(sessionId)
    DB-->>Route: SessionContext (Level, Mode, Recent Answers)

    Route->>Mode: detectMode(message, session)
    Mode-->>Route: ModeDetectionResult (mode, confidence)

    alt Mode is LEARNING
        Route->>Mastery: getNextActivity(currentLevel, completedActivities)
        Mastery-->>Route: Activity & First Unanswered Question
    else Mode is CONVERSATION
        Route->>Provider: generateResponse(message, context)
        alt LLM Enabled
            Provider->>Provider: Call LLM with 1500ms timeout & safety check
        else Deterministic Default
            Provider->>Provider: Generate instant child-safe SEL reply
        end
        Provider-->>Route: Safe conversational reply
    else Mode is SUPPORT / BREAK
        Route->>Route: Generate empathetic SEL response
    end

    Route->>DB: saveSession(updatedSession)
    Route-->>Client: 200 OK ChatResponse { reply, mode, activity, timings }
    Note over Route: Measure totalMs, modeDetectionMs, learningEngineMs

    Client->>Child: Render Mascot reaction & Activity Card
    opt Audio Read-Aloud is ON
        Client->>Child: Speak question/reply via Web Speech API
    end
```

---

## 4. Learning-State & Mastery Progression Diagram

```mermaid
stateDiagram-v2
    [*] --> L1_Vocabulary: Profile Created at Level 1

    state L1_Vocabulary {
        [*] --> L1_Questions
        L1_Questions --> L1_Scoring: Answer Submitted
        L1_Scoring --> L1_Reward: Correct Answer (+1 Star)
        L1_Scoring --> L1_Review: Topic Accuracy < 50%
        L1_Reward --> L1_Assessment: Record Assessed Answer
        L1_Review --> L1_Questions: Present Review Activity
        L1_Assessment --> L1_Ready: Assessed Count >= 10 & Mastery >= 80%
    }

    L1_Ready --> L2_Phrases: Level-Up Event (1 -> 2)

    state L2_Phrases {
        [*] --> L2_Questions: Short Phrases & Sentence Fragments
        L2_Questions --> L2_Scoring: Answer Submitted
        L2_Scoring --> L2_Reward: Correct Answer (+1 Star)
        L2_Scoring --> L2_Review: Accuracy < 50%
        L2_Reward --> L2_Assessment: Record Assessed Answer
        L2_Assessment --> L2_Ready: Assessed Count >= 10 & Mastery >= 80%
    }

    L2_Ready --> L3_Sentences: Level-Up Event (2 -> 3)

    state L3_Sentences {
        [*] --> L3_Questions: Sentences, Descriptions & Dialogues
        L3_Questions --> L3_Lifelong: Mastery Achieved
    }
```

---

## 5. Deployment Diagram (Vercel Global Edge Network)

```mermaid
graph TD
    subgraph Client Tier
        Browser[Child & Parent Browser Devices]
    end

    subgraph Vercel Edge Tier
        EdgeDNS[Vercel Global Anycast DNS]
        CDN[Vercel Edge Network / CDN]
        WAF[Web Application Firewall & Headers]
    end

    subgraph Serverless Execution Tier
        Lambda[Next.js Serverless Route Handlers - Node.js 20+]
        StaticCache[Static Pre-rendered Pages]
    end

    subgraph Cloud Persistence Tier
        Firestore[(Google Cloud Firebase Firestore)]
        ExternalLLM[(External LLM API - Optional)]
    end

    Browser --> EdgeDNS
    EdgeDNS --> CDN
    CDN --> WAF
    WAF --> StaticCache
    WAF --> Lambda

    Lambda --> Firestore
    Lambda -. Optional API Key .-> ExternalLLM
```
