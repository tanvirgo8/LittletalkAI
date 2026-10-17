// ============================================================
// LittleTalk AI - SEL (Social Emotional Learning) Engine
// Age-appropriate emotional support responses
// ============================================================
import type { ConversationMode, LearningLevel } from './types';

// ─── Response Templates ────────────────────────────────────

const ENCOURAGEMENT_RESPONSES = [
  "You're doing great! Keep trying! 💪",
  "I believe in you! You can do it! ⭐",
  "Every try makes you smarter! 🧠",
  "You're so brave for trying! 🌟",
  "Practice makes perfect! Keep going! 🎯",
];

const CORRECT_ANSWER_RESPONSES = [
  "You got it! You worked hard on that one! 🌟",
  "Amazing! That's exactly right! 🎉",
  "Yes! You're so smart! ⭐",
  "Wonderful! You did it! 🎊",
  "Fantastic! You really know your stuff! 🏆",
  "Super! I knew you could do it! 🚀",
];

const INCORRECT_ANSWER_RESPONSES = [
  "Good try! Let's look at it together. 😊",
  "Almost! Every try helps you learn! 💫",
  "That's okay! Let's try again! 🤗",
  "Oops! But you're still learning! Keep going! 🌈",
  "Not quite, but don't give up! You're learning! 💪",
];

const FRUSTRATION_RESPONSES = [
  "That's okay! Learning takes practice! Would you like an easier question? 🌸",
  "I understand, this is tricky! Shall we try something simpler? 🤗",
  "It's okay to find things hard! That means you're learning! Want a hint? 💡",
  "You're doing great just by trying! Want to try an easier one? 🌟",
];

const SADNESS_RESPONSES = [
  "I'm sorry you're feeling sad. 💙 Would you like to tell a trusted grown-up, or would you like a quiet activity?",
  "It's okay to feel sad sometimes. 💜 Would you like to take a little break?",
  "I hear you. 🤗 It's brave to share how you feel. Would you like to do something calming?",
];

const BREAK_RESPONSES = [
  "Of course! Rest is important! 😴 Come back whenever you're ready!",
  "That's smart! Everyone needs a break sometimes! 🌙 See you soon!",
  "Great idea! Rest up and come back refreshed! 💤 I'll be here!",
];

const BREAK_RETURN_RESPONSES = [
  "Welcome back! I missed you! 🎉 Ready to learn?",
  "You're back! 🌟 Great to see you! Want to continue where we left off?",
  "Yay! You came back! 🎊 Ready to have some fun learning?",
];

const GREETING_RESPONSES = [
  "Hi there! 👋 I'm Lumi, your learning friend! What would you like to do today?",
  "Hello! 🌟 Welcome back! Ready to learn something fun?",
  "Hey! 🎉 Great to see you! Shall we learn some English together?",
];

const CONVERSATION_STARTERS = [
  "That sounds wonderful! Tell me more! 🌈",
  "Wow, I love that! What else do you like? 😊",
  "How interesting! I love learning about you! 🌟",
  "That's so cool! I never knew that! 🤩",
  "You're so creative! I love talking with you! 💫",
];

const SAFETY_RESPONSE =
  "Thank you for telling me that. 💙 This sounds really important. " +
  "Please talk to a grown-up you trust right now — like a parent, teacher, or another adult who takes care of you. " +
  "You are safe and you are not in trouble. They will help you. 🤗";

const ENGAGEMENT_RESPONSES = [
  "Let's play! 🎮 Want to do a word game or a quiz?",
  "Game time! 🎯 How about a fun quiz about colors or animals?",
  "Yay! Let's have fun! 🎊 Shall we try a learning game?",
];

// ─── SEL Response Generator ────────────────────────────────

export interface SELContext {
  mode: ConversationMode;
  attemptCount: number;
  isCorrect?: boolean;
  hasFrustration: boolean;
  hasSafetyConcern: boolean;
  isGreeting: boolean;
  isReturningFromBreak: boolean;
  childMessage: string;
  currentLevel: LearningLevel;
}

export interface SELResponse {
  message: string;
  suggestBreak?: boolean;
  suggestEasier?: boolean;
  requiresTrustedAdult?: boolean;
  type: SELResponseType;
}

export type SELResponseType =
  | 'correct'
  | 'incorrect'
  | 'frustration'
  | 'sadness'
  | 'safety'
  | 'break'
  | 'break_return'
  | 'greeting'
  | 'encouragement'
  | 'conversation'
  | 'engagement'
  | 'general';

/**
 * Generate an age-appropriate SEL response.
 * All responses are pre-defined — no LLM for safety-critical interactions.
 */
export function generateSELResponse(ctx: SELContext): SELResponse {
  // Safety takes absolute priority
  if (ctx.hasSafetyConcern) {
    return {
      message: SAFETY_RESPONSE,
      requiresTrustedAdult: true,
      type: 'safety',
    };
  }

  // Break mode
  if (ctx.mode === 'BREAK') {
    return {
      message: pickRandom(BREAK_RESPONSES),
      suggestBreak: true,
      type: 'break',
    };
  }

  // Returning from break
  if (ctx.isReturningFromBreak) {
    return {
      message: pickRandom(BREAK_RETURN_RESPONSES),
      type: 'break_return',
    };
  }

  // Greeting
  if (ctx.isGreeting) {
    return {
      message: pickRandom(GREETING_RESPONSES),
      type: 'greeting',
    };
  }

  // Support mode - check for sadness vs frustration
  if (ctx.mode === 'SUPPORT') {
    const hasSadness =
      /sad|cry|crying|unhappy|bad|feel bad/i.test(ctx.childMessage);

    if (hasSadness) {
      return {
        message: pickRandom(SADNESS_RESPONSES),
        suggestBreak: true,
        type: 'sadness',
      };
    }

    return {
      message: pickRandom(FRUSTRATION_RESPONSES),
      suggestEasier: true,
      type: 'frustration',
    };
  }

  // Frustration detected during learning
  if (ctx.hasFrustration && ctx.mode === 'LEARNING') {
    return {
      message: pickRandom(FRUSTRATION_RESPONSES),
      suggestEasier: true,
      type: 'frustration',
    };
  }

  // Learning mode - correct/incorrect answer feedback
  if (ctx.mode === 'LEARNING') {
    if (ctx.isCorrect === true) {
      return {
        message: pickRandom(CORRECT_ANSWER_RESPONSES),
        type: 'correct',
      };
    }
    if (ctx.isCorrect === false) {
      return {
        message: pickRandom(INCORRECT_ANSWER_RESPONSES),
        type: 'incorrect',
      };
    }
    // Encouragement during learning (no answer yet)
    return {
      message: pickRandom(ENCOURAGEMENT_RESPONSES),
      type: 'encouragement',
    };
  }

  // Engagement mode
  if (ctx.mode === 'ENGAGEMENT') {
    return {
      message: pickRandom(ENGAGEMENT_RESPONSES),
      type: 'engagement',
    };
  }

  // Conversation mode
  if (ctx.mode === 'CONVERSATION') {
    return {
      message: generateConversationalResponse(ctx.childMessage),
      type: 'conversation',
    };
  }

  // Fallback
  return {
    message: pickRandom(ENCOURAGEMENT_RESPONSES),
    type: 'general',
  };
}

/**
 * Generate a simple conversational response.
 * Keeps language simple and age-appropriate.
 * Uses pre-defined patterns, not LLM for safety.
 */
function generateConversationalResponse(message: string): string {
  const lower = message.toLowerCase();

  if (/favorite (color|colour)/i.test(message)) {
    return "My favorite color is rainbow! 🌈 Every color is beautiful! What's your favorite color?";
  }
  if (/favorite animal/i.test(message)) {
    return "I love ALL animals! 🐾 But I especially like cute little bunnies! 🐰 What's your favorite animal?";
  }
  if (/favorite food|favorite fruit/i.test(message)) {
    return "I love strawberries! 🍓 They're sweet and red! What's your favorite fruit?";
  }
  if (/how are you|how do you feel/i.test(message)) {
    return "I'm so happy today! 😊 Especially when I get to learn with you! How are you feeling?";
  }
  if (/your name|who are you/i.test(message)) {
    return "I'm Lumi! 🌟 Your friendly learning buddy! I love helping kids learn English!";
  }
  if (/do you (like|love)/i.test(message)) {
    return "Yes, I love learning! 📚 And I especially love learning with you! What do you love?";
  }
  if (/story|tell me/i.test(message)) {
    return "Oh! I love stories! 📖 Once upon a time, a little star named Lumi helped children learn... just like me! Would you like to learn some English words now?";
  }
  if (/joke/i.test(message)) {
    return "Okay, here's one! 😄 Why did the apple go to school? Because it wanted to be a little SMARTER! Get it? 🍎 Want to learn something fun now?";
  }
  if (/age|old are you/i.test(message)) {
    return "I'm as old as a star! 🌟 Which means I've been around forever! But I feel young and happy every day!";
  }

  return pickRandom(CONVERSATION_STARTERS);
}

// ─── Utility ───────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a hint message for struggling children.
 */
export function generateHintMessage(hint: string): string {
  return `Here's a little hint: ${hint} 💡 Can you try again?`;
}

/**
 * Generate encouragement when a child has many wrong answers.
 */
export function generatePersistenceMessage(attemptCount: number): string {
  if (attemptCount === 2) {
    return "Keep trying! You almost have it! 💪";
  }
  if (attemptCount === 3) {
    return "You've tried so hard! That's amazing! Let me give you a hint... 💡";
  }
  return "Great job for not giving up! Let's try an easier one! 🌟";
}

/**
 * Generate a topic introduction message.
 */
export function generateTopicIntro(topic: string, level: LearningLevel): string {
  const intros: Record<string, string> = {
    colors: "Let's learn about COLORS! 🎨 Colors are everywhere!",
    animals: "Let's meet some ANIMALS! 🐾 Animals are so interesting!",
    numbers: "Let's COUNT! 🔢 Numbers are super fun!",
    fruits: "Let's explore FRUITS! 🍎 Fruits are yummy and colorful!",
    family: "Let's learn about FAMILY! 👨‍👩‍👧 Family is so special!",
    objects: "Let's look at THINGS around us! 🪑 Objects are everywhere!",
    phrases: "Let's learn SHORT PHRASES! 💬 We can say so much!",
    sentences: "Let's make SENTENCES! 📝 Words come together to say big things!",
    conversation: "Let's CHAT! 🗣️ Talking is so fun!",
  };
  return intros[topic] || "Let's learn something new! 🌟";
}

/**
 * Generate a level-up celebration message.
 */
export function generateLevelUpMessage(newLevel: LearningLevel): string {
  const messages: Record<LearningLevel, string> = {
    1: "You're starting Level 1! Let's learn some words! 🌱",
    2: "You made it to Level 2! 🌿 Now let's learn short phrases!",
    3: "Wow, Level 3! 🌳 You can make real sentences now! You're amazing!",
  };
  return messages[newLevel];
}
