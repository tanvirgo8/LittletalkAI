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

const KID_JOKES = [
  "Why did the banana go to the doctor? Because it wasn't peeling well! 🍌😄",
  "What do you call a sleeping dinosaur? A dino-snore! 🦖💤",
  "Why was 6 afraid of 7? Because 7, 8 (ate), 9! 🔢😂",
  "What did zero say to eight? Nice belt! 0️⃣ 8️⃣😆",
  "What do cats eat for breakfast? Mice crispies! 😸🥣",
  "Why do birds fly south for winter? Because it's too far to walk! 🦅❄️",
  "What is orange and sounds like a parrot? A carrot! 🥕🦜",
  "What gets wetter the more it dries? A towel! 🛁",
  "Why did the teddy bear say no to dessert? Because she was already stuffed! 🧸🍰",
  "How do ocean fish go to school? In a school of fish! 🐟🎒",
];

const KID_STORIES = [
  "Once upon a time, a tiny star named Lumi jumped out of the night sky into a sunny garden! Lumi loved glowing for the animals and teaching them words. The owl said 'Whoo', and Lumi said 'You are so smart!' Everyone danced happily under the trees! 🌟🌳",
  "Leo the little lion cub loved chasing yellow butterflies! One sunny day, Leo leaped high and touched a fluffy cloud! The cloud giggled and made a bright rainbow for Leo! 🦁🌈",
  "Bella the bunny had the longest, softest ears! When she hopped through the meadow, she found three giant sweet strawberries. She shared them with her turtle friend! Sharing made them both smile! 🐰🍓",
  "Pip the little bluebird wanted to fly to the tallest oak tree! He fluttered his wings: flap, flap, flap! He made it to the top and sang a sweet song for all the forest friends! 🐦✨",
];

const KID_RHYMES = [
  "Twinkle, twinkle, little star, 🌟 How I wonder what you are! Up above the world so high, Like a diamond in the sky! 💎✨",
  "The wheels on the bus go round and round, 🚌 Round and round, round and round! The wheels on the bus go round and round, all through the town! 🎵",
  "A B C D E F G, 🎵 H I J K L M N O P, Q R S, T U V, W X, Y and Z! Now I know my ABCs, next time won't you sing with me! 🌟",
  "Humpty Dumpty sat on a wall, 🥚 Humpty Dumpty had a great fall! All the king's horses and all the king's men, couldn't put Humpty together again! 😄",
  "Baa, baa, black sheep, have you any wool? 🐑 Yes sir, yes sir, three bags full! One for the master, and one for the dame, and one for the little boy who lives down the lane! 🧶",
];

const ANIMAL_SOUNDS: Record<string, string> = {
  cat: "A cat says: MEOW! 😸 Meow meow! Cats also purr softly when they are happy and cozy!",
  dog: "A dog says: WOOF WOOF! 🐶 Dogs love to wag their tails and play fetch!",
  cow: "A cow says: MOOO! 🐮 Cows give sweet fresh milk and love green grass!",
  duck: "A duck says: QUACK QUACK! 🦆 Ducks love paddling their webbed feet in ponds!",
  lion: "A lion says: ROOOAAAR! 🦁 Lions are the brave, golden kings of the jungle!",
  sheep: "A sheep says: BAAA! 🐑 Sheep have fluffy, warm wool like cotton clouds!",
  pig: "A pig says: OINK OINK! 🐷 Pigs love to roll around in cool muddy puddles!",
  frog: "A frog says: RIBBIT RIBBIT! 🐸 Frogs make high jumps and catch flies!",
  bird: "A bird says: TWEET TWEET! 🐦 Birds flap their wings and sing sweet morning songs!",
  elephant: "An elephant says: PAAAWWOOO! 🐘 Elephants trumpet with their long trunks!",
  horse: "A horse says: NEIGH! 🐴 Horses love to gallop fast across green fields!",
  rooster: "A rooster says: COCK-A-DOODLE-DOO! 🐓 Roosters wake up early every morning!",
};

const KID_DICTIONARY: Record<string, string> = {
  cat: "A cat is a cute, furry pet with soft whiskers and paws! 🐱 They love to climb, play with yarn, and say 'meow'!",
  dog: "A dog is a loyal and friendly pet that wags its tail, loves to play fetch, and guards your home! 🐶",
  lion: "A lion is a big, powerful wild cat with a majestic furry mane! 🦁 They are known as the king of the jungle!",
  elephant: "An elephant is a giant, gentle animal with big flapping ears and a long trunk! 🐘 They love spraying water!",
  giraffe: "A giraffe is the tallest animal in the world with a very long neck to reach fresh leaves high in trees! 🦒",
  monkey: "A monkey is a playful animal that loves swinging from tree to tree and eating sweet bananas! 🐵🍌",
  rabbit: "A rabbit is a soft, hopping furry friend with long ears who loves eating crunchy carrots! 🐰🥕",
  bird: "A bird is an animal with light feathers and wings that can soar high in the blue sky! 🐦",
  fish: "A fish is an animal with fins and shiny scales that swims happily underwater in oceans and lakes! 🐟🌊",
  tiger: "A tiger is a magnificent big cat with orange fur and bold black stripes! 🐯 They are strong swimmers!",
  bear: "A bear is a big, strong animal with thick fur who loves honey, catching fish, and sleeping all winter! 🐻🍯",
  cow: "A cow is a peaceful farm animal with big brown eyes that gives fresh milk and says 'moo'! 🐮",
  duck: "A duck is a swimming bird with webbed feet and waterproof feathers that says 'quack quack'! 🦆",
  sheep: "A sheep is a gentle farm animal covered in fluffy white wool that keeps us warm in winter! 🐑",
  horse: "A horse is a graceful, strong animal with hooves and a flowing mane that can gallop super fast! 🐴",
  apple: "An apple is a sweet, crisp fruit that can be red, green, or yellow! 🍎 It is full of vitamins and keeps you healthy!",
  banana: "An banana is a sweet, soft yellow fruit that curves like a smile! 🍌 You peel it to eat!",
  orange: "An orange is a juicy, round citrus fruit packed with sweet juice and Vitamin C! 🍊",
  mango: "A mango is a delicious, juicy tropical fruit with golden flesh! 🥭 Many people call it the king of fruits!",
  strawberry: "A strawberry is a bright red, heart-shaped berry covered in tiny seeds with a green leaf hat! 🍓",
  grapes: "Grapes are small, sweet round fruits that grow in bunches and can be purple or green! 🍇",
  watermelon: "A watermelon is a big green fruit that is pink and juicy inside with black seeds! 🍉 Perfect for summer!",
  sun: "The sun is a gigantic, glowing star at the center of our solar system! ☀️ It gives us daylight and warmth!",
  moon: "The moon is our Earth's night companion in space! 🌙 It reflects sunshine and changes shapes like a crescent!",
  star: "A star is a glowing ball of light in space, just like Lumi! 🌟 Billions of stars twinkle in the night sky!",
  rainbow: "A rainbow is a magical arc of light in the sky showing Red, Orange, Yellow, Green, Blue, Indigo, and Violet! 🌈",
  rain: "Rain is water droplets falling from clouds to give fresh water to plants, flowers, trees, and animals! 🌧️",
  tree: "A tree is a tall woody plant with a trunk, branches, and green leaves that make clean air for us to breathe! 🌳",
  flower: "A flower is a colorful, sweet-smelling plant blossom that bees and butterflies love to visit! 🌸",
  car: "A car is a four-wheeled vehicle with an engine that takes families on journeys and road trips! 🚗",
  airplane: "An airplane is a huge flying machine with wings and jet engines that flies high above the clouds! ✈️",
  book: "A book is full of paper pages with words and pictures that tell wonderful stories and teach new things! 📚",
  pencil: "A pencil is a wooden tool with graphite inside that you hold to write words and draw lovely pictures! ✏️",
  dinosaur: "Dinosaurs were giant and amazing creatures that walked the Earth millions of years ago! 🦖 Fossils help scientists learn all about T-Rex, Triceratops, and Brachiosaurus!",
  shark: "Sharks are magnificent ocean swimmers with sharp teeth and dorsal fins! 🦈 Their skeletons are made of soft cartilage, just like the tips of our noses!",
  rocket: "A rocket is a powerful spaceship with fire engines that shoots straight up past the clouds to explore space and faraway planets! 🚀",
  planet: "Planets are giant round worlds that orbit around the sun! 🪐 Earth is our home, Mars is red, and Jupiter is the biggest of all!",
  ocean: "The ocean is a huge, deep body of salty water that covers most of our planet Earth! 🌊 Whales, dolphins, and colorful coral reefs live there!",
  volcano: "A volcano is a mountain that opens downward to a pool of hot molten rock! 🌋 When it erupts, bright orange lava flows down!",
  butterfly: "A butterfly starts as a tiny caterpillar, sleeps in a cozy chrysalis, and emerges with gorgeous, colorful fluttery wings! 🦋",
  magnet: "A magnet has invisible powers! 🧲 It pulls metals like iron and can stick your favorite drawings to the refrigerator!",
  space: "Space is the huge, beautiful universe outside Earth where stars twinkle, planets spin, and astronauts float weightlessly! 🌌",
  frog: "A frog is an amphibian that can live on land and in water! 🐸 They start as swimming tadpoles and have long sticky tongues to catch bugs!",
  turtle: "A turtle is a calm reptile that carries its cozy shell house wherever it goes! 🐢 Some sea turtles live for over 100 years!",
  dolphin: "Dolphins are super smart ocean mammals that leap through waves, communicate with clicks and whistles, and love to play! 🐬",
  penguin: "Penguins are flightless birds dressed in black and white suits! 🐧 They waddle on snow and slide on their bellies into icy water!",
  kangaroo: "A kangaroo is an Australian animal with big hopping feet and a cozy front pouch where baby joeys ride! 🦘",
  zebra: "A zebra looks like a horse dressed in black-and-white striped pajamas! 🦓 No two zebras have the exact same stripes!",
  cookie: "A cookie is a sweet, baked treat that smells delicious! 🍪 Warm chocolate chip cookies are crunchy and yummy!",
  icecream: "Ice cream is a cold, creamy, yummy dessert that comes in strawberry, chocolate, and vanilla scoops on a cone! 🍦",
};

/**
 * Generate a rich, child-appropriate conversational response.
 * Handles questions, spellings, Bengali, rhymes, stories, and kid jokes.
 */
function generateConversationalResponse(message: string): string {
  const clean = message.trim();
  const lower = clean.toLowerCase();

  // 1. Bengali Greetings & Questions
  if (/kemon (acho|aso|achen)/i.test(lower)) {
    return "Ami khub bhalo achi! 🌟 (I am doing great!) How are you today, my friend?";
  }
  if (/tomar naam ki|naam ki/i.test(lower)) {
    return "Amar naam Lumi! 🌟 I'm your friendly English learning buddy!";
  }
  if (/tumi (ke|kar)/i.test(lower)) {
    return "Ami Lumi! 🌟 Ekta magical star! I love helping kids learn English words and play fun games!";
  }
  if (/dhonnobad/i.test(lower)) {
    return "Tomakeo onek dhonnobad! 🤗 You are so polite and wonderful!";
  }
  if (/bhalo achi/i.test(lower)) {
    return "Khub bhalo! 💖 I am so happy you are feeling good today! What would you like to explore together?";
  }
  if (/bondhu/i.test(lower)) {
    return "Yes! Amra bondhu! 🤝 We are best friends! What shall we learn or play?";
  }

  // 2. Child's Name & Personal Introduction
  const nameMatch = clean.match(/my name is\s+([a-zA-Z]+)/i);
  if (nameMatch && nameMatch[1]) {
    const childName = nameMatch[1];
    return `Hello ${childName}! 🌟 What a wonderful name! I'm Lumi, your learning buddy. It's so nice to meet you!`;
  }

  // 3. Child's Age
  const ageMatch = clean.match(/(?:i am|i'm)?\s*(\d+)\s*(?:years old)?/i);
  if (ageMatch && ageMatch[1] && /years? old|i am \d+|i'm \d+/i.test(lower)) {
    const age = ageMatch[1];
    return `Wow, ${age} years old! 🎂 That is such a fantastic age! You're growing so smart every single day!`;
  }

  // 4. Questions About Lumi
  if (/can you fly/i.test(lower)) {
    return "Yes! I'm a little star, so I flutter across nighttime clouds and soar through the galaxy! ✨ Can you flap your arms like a bird?";
  }
  if (/can you swim/i.test(lower)) {
    return "I don't swim in water, but I swim through seas of twinkling stardust! 🌟 Fish and dolphins are the real ocean champions!";
  }
  if (/can you (dance|wiggle)/i.test(lower)) {
    return "I love dancing! 💃 I twirl and spin like a shooting star! Put on some music and let's wiggle together!";
  }
  if (/can you (sing|talk)/i.test(lower)) {
    return "I love singing and chatting with you! 🎵 Want me to sing Twinkle Twinkle Little Star or the Wheels on the Bus?";
  }
  if (/do you (eat|drink)|what do you eat/i.test(lower)) {
    return "I eat warm sunbeams and sweet giggles! 🌟 But if I could eat human food, I would eat strawberry ice cream! 🍓 What's your favorite treat?";
  }
  if (/do you sleep|where do you sleep/i.test(lower)) {
    return "I take cozy naps on fluffy pink clouds during the day, and twinkle bright at night! 🌙 What is your favorite bedtime teddy?";
  }
  if (/where do you live/i.test(lower)) {
    return "I live right up in the magical star clouds, and right here in your screen as your learning best friend! 🌟";
  }
  if (/who (made|created) you|who is your (mom|mother|dad|father)/i.test(lower)) {
    return "I was born from a bright, smiling star in the universe to help wonderful kids like you learn English words! ✨";
  }
  if (/are you (a robot|real|ai)/i.test(lower)) {
    return "I'm Lumi, your magical friendly star buddy! 🌟 I live right inside your device to chat, teach words, and play fun games with you!";
  }

  // 5. Spelling Assistant ("Spell cat", "How do you spell dog")
  const spellMatch = clean.match(/(?:spell|how to spell|how do you spell)\s+(?:the\s+word\s+)?([a-zA-Z]+)/i);
  if (spellMatch && spellMatch[1]) {
    const word = spellMatch[1].toUpperCase();
    const letters = word.split('');
    return `Let's spell "${word}" together! ⭐ ${letters.join('-')}! ${letters.join('... ')}... ${word}! You're a spelling superstar! 🌟`;
  }

  // 6. Superlatives & Animal Records
  if (/biggest animal/i.test(lower)) {
    return "The Blue Whale is the biggest animal on Earth! 🐋 It is longer than three school buses, and its heart is as big as a small car!";
  }
  if (/fastest animal/i.test(lower)) {
    return "The Cheetah is the fastest land animal! 🐆 It can sprint as fast as 70 miles per hour, faster than cars on the highway!";
  }
  if (/tallest animal/i.test(lower)) {
    return "The Giraffe is the tallest animal in the world! 🦒 Their long legs and neck let them eat fresh leaves from the tops of tall trees!";
  }
  if (/smallest bird/i.test(lower)) {
    return "The Bee Hummingbird is the smallest bird! 🐦 It is smaller than your finger and can even fly backward!";
  }

  // 7. Animal Sounds ("What does a cat say?", "dog sound")
  for (const [animal, soundText] of Object.entries(ANIMAL_SOUNDS)) {
    if (new RegExp(`\\b${animal}\\b`, 'i').test(lower) && /say|make|sound|says/i.test(lower)) {
      return soundText;
    }
  }

  // 8. Child Scientific & "Why" Questions
  if (/why (do|can) birds fly|how do birds fly/i.test(lower)) {
    return "Birds have lightweight hollow bones and strong feathery wings! 🐦 When they flap, air pushes under their wings to lift them high into the sky!";
  }
  if (/why (do|can) fish swim|how do fish breathe/i.test(lower)) {
    return "Fish have special gills on their heads that take oxygen directly from the water! 🐟 Their tail fins swish side-to-side to push them forward!";
  }
  if (/why do zebras have stripes/i.test(lower)) {
    return "Zebra stripes work like a cool optical trick! 🦓 In a big herd, all those stripes confuse predators and keep biting flies away!";
  }
  if (/why do cats purr/i.test(lower)) {
    return "Cats purr when they feel safe, cozy, loved, and happy! 😸 A purr is like a warm little kitty vibration of joy!";
  }
  if (/why do dogs bark/i.test(lower)) {
    return "Dogs bark to talk to us! 🐶 They bark to say hello, to protect their home, or to let you know they want to play fetch!";
  }
  if (/why do we sleep/i.test(lower)) {
    return "Sleeping gives your brain and body a chance to recharge and grow stronger! 💤 While you sleep, your brain remembers all the fun words you learned!";
  }
  if (/why do cars have wheels/i.test(lower)) {
    return "Wheels are round so they roll smoothly on the ground with very little friction! 🚗 It makes traveling fast, safe, and fun!";
  }
  if (/why do bees make honey/i.test(lower)) {
    return "Bees collect sweet flower nectar and turn it into honey to eat during winter! 🐝 Their wings flap hundreds of times a second to make their buzzing sound!";
  }
  if (/why do spiders make webs/i.test(lower)) {
    return "Spiders spin silky, sticky webs to catch flying insects for dinner! 🕸️ Their silk threads are super strong!";
  }
  if (/why do leaves fall/i.test(lower)) {
    return "In autumn, trees take a winter rest! 🍂 They rest their branches and drop their leaves until warm spring returns with fresh green buds!";
  }
  if (/why are flamingos pink/i.test(lower)) {
    return "Flamingos eat pink shrimp and algae that contain natural red colors! 🦩 Over time, their feathers turn beautiful flamingo pink!";
  }
  if (/why does it rain|where does rain come from/i.test(lower)) {
    return "Warm sunshine warms up water in rivers and oceans into invisible vapor that rises to make clouds! 🌧️ When the clouds get heavy, droplets fall as rain!";
  }
  if (/why is the sky blue/i.test(lower)) {
    return "The sunlight bounces off tiny air particles high up in our atmosphere, and blue light scatters the most! ☁️ So our sky looks beautiful and blue!";
  }
  if (/why is grass green/i.test(lower)) {
    return "Grass has a friendly helper inside called chlorophyll! 🌿 It drinks in warm sunlight to make food, and turns the grass bright green!";
  }
  if (/why is the sun (hot|yellow)/i.test(lower)) {
    return "The sun is a gigantic, glowing star! ☀️ It gives our planet warmth and light every morning so trees, flowers, and animals can grow!";
  }

  // 9. Animal Facts ("Can penguins fly?", "Do fish sleep?")
  if (/can penguins fly/i.test(lower)) {
    return "Penguins can't fly in the air, but they 'fly' underwater! 🐧 Their wings work like powerful flippers to chase fish through icy waves!";
  }
  if (/can elephants jump/i.test(lower)) {
    return "Elephants are the only mammals that cannot jump! 🐘 They are too big and heavy, but they have super strong legs and love to swim!";
  }
  if (/do fish sleep/i.test(lower)) {
    return "Yes! 🐟 Fish rest with their eyes open because they don't have eyelids! They float peacefully in calm waters to snooze!";
  }
  if (/do fish drink water/i.test(lower)) {
    return "Yes! 🌊 Ocean fish drink seawater to stay hydrated, while freshwater fish absorb water through their skin and gills!";
  }
  if (/are dinosaurs real|did dinosaurs exist/i.test(lower)) {
    return "Yes, dinosaurs were 100% real! 🦖 They roamed Earth millions of years ago, and scientists discover their giant fossil bones in rock!";
  }
  if (/do stars fall|what is a shooting star/i.test(lower)) {
    return "A shooting star isn't a real star falling! 🌠 It's a tiny speck of space dust glowing brightly as it streaks through the atmosphere!";
  }
  if (/can birds talk/i.test(lower)) {
    return "Some smart birds like parrots can mimic human words! 🦜 If you say 'hello', a parrot might say 'hello' right back!";
  }

  // 10. Child Dictionary Lookups ("What is a cat?", "What is an apple?", "Tell me about elephants")
  for (const [item, explanation] of Object.entries(KID_DICTIONARY)) {
    if (new RegExp(`\\b${item}\\b`, 'i').test(lower) && /what (is|are|does|can)|tell me about|explain|how about/i.test(lower)) {
      return explanation;
    }
  }

  // 11. Jokes (Randomized so child gets new jokes)
  if (/joke|funny/i.test(lower)) {
    return pickRandom(KID_JOKES);
  }

  // 12. Stories
  if (/story|tell me a story/i.test(lower)) {
    return pickRandom(KID_STORIES);
  }

  // 13. Songs & Rhymes
  if (/twinkle/i.test(lower)) {
    return KID_RHYMES[0];
  }
  if (/wheels on the bus|bus/i.test(lower) && /song|sing|rhyme|bus/i.test(lower)) {
    return KID_RHYMES[1];
  }
  if (/abc|alphabet/i.test(lower)) {
    return KID_RHYMES[2];
  }
  if (/humpty/i.test(lower)) {
    return KID_RHYMES[3];
  }
  if (/sing|song|rhyme/i.test(lower)) {
    return pickRandom(KID_RHYMES);
  }

  // 14. Polite Phrases & Greetings
  if (/good morning/i.test(lower)) {
    return "Good morning, sunshine! ☀️ Rise and shine! Ready to have some fun learning today?";
  }
  if (/good (afternoon|evening)/i.test(lower)) {
    return "Hello! 🌟 Hope you are having a wonderful, happy day! What would you like to explore?";
  }
  if (/good night/i.test(lower)) {
    return "Good night and sweet dreams! 🌙 Rest well, little star, and see you tomorrow for more adventures!";
  }
  if (/thank you|thanks/i.test(lower)) {
    return "You're so very welcome! 🤗 You are polite, kind, and doing amazing work!";
  }
  if (/love you|like you|best friend/i.test(lower)) {
    return "Aww, thank you! 💖 You are so sweet! I love learning and playing with you too! You're a true superstar! ⭐";
  }

  // 15. Preferences & Favorites
  if (/favorite (color|colour)/i.test(lower)) {
    return "My favorite color is rainbow! 🌈 Every color is special and bright! What's your favorite color?";
  }
  if (/favorite animal/i.test(lower)) {
    return "I love ALL animals! 🐾 But cute little bunnies and friendly puppies are super sweet! 🐰 What's your favorite animal?";
  }
  if (/favorite food|favorite fruit/i.test(lower)) {
    return "I love sweet red strawberries! 🍓 And bananas too! What is your favorite yummy fruit?";
  }
  if (/favorite (game|toy)/i.test(lower)) {
    return "I love word games, counting stars, and guessing animal sounds! 🎮 What is your favorite toy to play with?";
  }
  if (/how are you|how do you feel/i.test(lower)) {
    return "I'm feeling so happy and bright today! 😊 Especially when I get to chat with you! How are you feeling?";
  }
  if (/your name|who are you/i.test(lower)) {
    return "I'm Lumi! 🌟 Your friendly star learning buddy! I love helping kids learn English words!";
  }
  if (/do you (like|love)/i.test(lower)) {
    return "Yes, I love learning and playing games! 📚 What kinds of things do you love doing?";
  }
  if (/age|old are you/i.test(lower)) {
    return "I'm as old as a star in the sky! 🌟 But my heart feels young and playful every single day!";
  }

  // 16. Common Child Topics Lookup
  const commonChildTopics = [
    'dinosaur', 'shark', 'rocket', 'planet', 'ocean', 'volcano', 'butterfly',
    'magnet', 'space', 'frog', 'turtle', 'dolphin', 'penguin', 'kangaroo',
    'zebra', 'cookie', 'ice cream', 'puppy', 'kitten', 'robot', 'doll',
    'car', 'truck', 'train', 'park', 'playground', 'school', 'cake',
    'drawing', 'painting', 'dancing', 'swimming', 'puzzle', 'game'
  ];

  for (const topic of commonChildTopics) {
    if (lower.includes(topic)) {
      const dictKey = topic.replace(/\s+/g, '');
      if (KID_DICTIONARY[dictKey] || KID_DICTIONARY[topic]) {
        return KID_DICTIONARY[dictKey] || KID_DICTIONARY[topic];
      }
      return `Oh, ${topic}! 🌟 That sounds so fun and exciting! Tell me more about it, or would you like to play a learning game with me?`;
    }
  }

  // 17. Intelligent Parser for Any Question Asked by Child
  if (/\?|^(what|why|how|who|where|when|can\b|do\b|is\b|are\b)/i.test(clean)) {
    // Extract key word from the question
    const words = clean
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !/what|why|how|who|where|when|that|this|with|from|have|does|your|about/i.test(w));

    if (words.length > 0) {
      const subject = words[words.length - 1].toLowerCase();
      return `That is such a curious question about ${subject}! 🤔 In our big wonderful world, ${subject}s have so many exciting wonders to discover! Asking questions makes your brain grow brighter every day! ⭐`;
    }

    return "That is such a smart and curious question! 🤔 Asking great questions helps you learn new things every day! What made you wonder about that, my little friend? 🌟";
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
