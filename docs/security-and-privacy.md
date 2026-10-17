# LittleTalk AI - Child Safety, Privacy & Security Architecture

**Audience:** Children Under 7 (Ages 3–6), Parents, and Educators  
**Compliance Mindset:** Strict adherence to Children's Online Privacy Protection Act (COPPA) and GDPR for Kids (GDPR-K) principles.

---

## 1. Core Child-Safety Principles

### 1.1 Zero Personal Identifiable Information (PII)
* **No Child Sign-Up:** Children never create accounts, log in, or provide email addresses.
* **Anonymous Sessions:** All sessions run under randomly generated UUIDs (`sess_*` and `child_*`) stored locally in client `localStorage`.
* **Proactive PII Filtering:** Lexical filters actively block prompts or model outputs requesting addresses, full names, telephone numbers, or school locations.

### 1.2 Zero Surveillance (No Audio, Video, or Biometrics)
* **No Microphone Recording:** The application does **not** record child audio or send voice data to any cloud service.
* **Client-Side Speech Synthesis:** Voice read-aloud is performed exclusively on the child's device using the browser's native `window.speechSynthesis` API.
* **No Emotion Diagnoses:** LittleTalk AI strictly disclaims psychological diagnosing. Emotional cues (tiredness, frustration) are treated solely as conversational signals to slow down pacing or suggest a break.

### 1.3 Child Safety Guardrails & Safety Escalation
* **Safety Pattern Trigger:** If a child inputs phrases containing harm, abuse, or danger (e.g. "someone hurt me"), the system immediately triggers the `SUPPORT` state with high priority:
  > *"Thank you for telling me that. 💙 This sounds really important. Please talk to a grown-up you trust right now — like a parent, teacher, or another adult who takes care of you. You are safe and you are not in trouble. They will help you. 🤗"*
* **No Secret-Keeping:** The chatbot will **never** promise secrecy or agree to keep secrets from parents or caregivers.

---

## 2. Social and Emotional Learning (SEL) Guidelines

* **Effort Over Intelligence:** Praise emphasizes diligence ("You worked hard on that one!") rather than innate brilliance, cultivating a growth mindset.
* **Normalizing Mistakes:** Incorrect answers are framed positively ("Good try! Let's look at it together.") without shame, red alert boxes, or scary buzzers.
* **Anti-Manipulation Engagement:** No streak anxiety, countdown timers, artificial scarcity, or notifications designed to induce screen addiction.
* **Clear Bot Identity:** Lumi explicitly clarifies that it is a friendly learning star companion and does not pretend to be a real human or biological family member.

---

## 3. Threat Model & Technical Security Controls

| Threat Vector | Mitigation Strategy |
| :--- | :--- |
| **Untrusted Model Output** | All LLM responses pass through `validateChildSafety()`: max length $\le 280$ characters, zero violent/adult vocabulary, immediate fallback to deterministic SEL engine. |
| **Client Progress Tampering** | Clients cannot manipulate stars, levels, or scores. All scoring and progression logic executes server-side. |
| **API Denial of Service / Spam** | Request payload sizes bounded at 500 characters; Zod input schemas reject malformed JSON; strict HTTP security headers. |
| **Data Leakage in Client Bundles** | Zero API secrets in client bundles. `LLM_API_KEY` and Firebase private keys are only accessible on server-side Route Handlers. |
| **Unbounded Token / Database Cost** | Conversation history bounded to 6 turns; assessed answers bounded to 20 items. |

---

## 4. Parental Verification & Data Erasure

* **Parental Gate Challenge:** To access parent settings, an arithmetic gate ("Solve 7 + 4 = ?") prevents accidental child entry.
* **Right to be Forgotten:** Parents have direct access to:
  * **Reset Session:** Clears current chat turns while preserving earned stars.
  * **Permanent Data Deletion:** Executes `POST /api/profile/delete`, permanently purging profile records and activity histories.
