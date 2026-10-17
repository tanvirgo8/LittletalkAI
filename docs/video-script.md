# LittleTalk AI - 2-Minute Video Presentation Script

**Language:** English-Only  
**Total Duration:** 2:00 (120 Seconds)  
**Presenter:** Senior Full-Stack Engineer & AI Systems Architect  
**Product:** LittleTalk AI (Adaptive English Learning for Kids Under 7)  

---

## Shot List & Timecoded Script

| Timestamp | Screen Action & Shot | Spoken Narration (Script) |
| :--- | :--- | :--- |
| **0:00 – 0:15** | **Shot 1: Problem & Product Intro**<br>Screen displays LittleTalk AI homepage. Lumi the star mascot is gently floating with cheerful eyes. Large colorful title: "LittleTalk AI". | *"Teaching English to preschoolers aged three to six requires patience, warmth, and absolute safety. Most AI tools either hallucinate complex words or lock learning behind manipulative paywalls. Meet LittleTalk AI—an adaptive, child-safe language companion powered by a deterministic progressive learning engine and social-emotional awareness."* |
| **0:15 – 0:40** | **Shot 2: Interface & 3-Level Progression**<br>Cursor clicks "Learn Words". Shows Level 1 Question: *"What color is the banana? 🍌"*. Clicks "Listen 🔊" to hear audio. Clicks "Yellow". Confetti pops, star increases to 1. Shows Level badge switching to Level 2 and Level 3 descriptions. | *"LittleTalk AI features large, tactile touch targets and browser-native speech synthesis so pre-readers can listen to questions. We implement three structured learning stages: Level 1 teaches vocabulary like colors and animals; Level 2 introduces short phrases like 'I see a cat'; and Level 3 guides full sentences and conversation. Level progression is strictly deterministic—requiring eighty percent mastery across ten assessed answers, preventing unearned advancements."* |
| **0:40 – 1:05** | **Shot 3: Mode Detection & Social Emotional Learning (SEL)**<br>Child enters: *"I can't do it."* Chat mode switches to `SUPPORT` 🌸. Lumi responds with empathy: *"That's okay! Learning takes practice! Would you like an easier question?"* Then child enters: *"I am tired."* Mode switches to `BREAK` 🌙; Lumi's eyes close with gentle 'Zzz' animation. | *"Our dedicated mode-detection engine recognizes five distinct behavioral states: Learning, Conversation, Play, Support, and Rest. When a child struggles, Lumi normalizes mistakes and offers a simpler activity. When they feel tired, Lumi suggests a calming break rather than pushing screen time. Crucially, if safety concerns are voiced, Lumi firmly encourages speaking to a trusted adult without ever promising secrecy."* |
| **1:05 – 1:30** | **Shot 4: System Architecture & Persistence**<br>Screen shows Parent Portal unlocked via math challenge ("4 + 3 = 7"). Reveals topic accuracy breakdown, COPPA zero-PII policies, and Storage Mode indicator. Splits to show `system-design.md` architecture diagram. | *"Under the hood, LittleTalk AI is built with Next.js 15, TypeScript, Tailwind CSS, and Zod. Our database abstraction supports both persistent Firebase Firestore and an instant in-memory demo mode. All scoring, level progression, and star allocation happen exclusively on the server—Firestore security rules completely block arbitrary client tampering."* |
| **1:30 – 1:45** | **Shot 5: Performance & Fallback Engine**<br>Screen shows terminal executing `npm test` (40/40 tests passing) and `npm run bench`. Highlights p50 = 0.34ms and p95 = 1.63ms latency. | *"For latency, our specification required responses under two seconds. By default, our deterministic rule engine evaluates requests in under two milliseconds—with a p50 of zero-point-three-four milliseconds. If an optional LLM is enabled, it is restricted to a one-point-five second timeout and lexical guardrails, instantly falling back to safe local templates if unavailable."* |
| **1:45 – 2:00** | **Shot 6: Summary & Wrap-Up**<br>Screen returns to child interface. Child receives bonus star, Lumi cheers, parent reset button demonstrated. | *"LittleTalk AI combines the responsiveness of deterministic systems with the warmth of early childhood pedagogy. It is safe, ad-free, verified with comprehensive tests, and ready for production deployment. Thank you!"* |

---

## Production Notes
* **Visual Highlights:** Ensure browser zoom is set to 100% on high-DPI display so Lumi's SVG glow and typography are crisp.
* **Audio Notes:** Audio read-aloud demonstration should clearly demonstrate the speech synthesis rate configured at 0.9 for preschooler clarity.
* **Video File Disclosure:** This script is prepared for presentation recording; no physical MP4/WebM video file has been pre-recorded.
