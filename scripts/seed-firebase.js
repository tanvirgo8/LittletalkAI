// ============================================================
// LittleTalk AI - Firebase Firestore Data Migration & Seed Script
// Seeds all activities, questions, and dictionary into Firestore collections
// ============================================================
const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection } = require('firebase/firestore');

// Load environment config
const envContent = fs.readFileSync('.env.local', 'utf8');
const config = {};
for (const line of envContent.split(/\r?\n/)) {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
    config[key] = val;
  }
}

const firebaseConfig = {
  apiKey: config.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: config.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: config.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: config.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: config.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: config.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Seed Data
const ACTIVITIES_SEED = [
  {
    id: 'l1-colors-1',
    type: 'multiple_choice',
    topic: 'colors',
    level: 1,
    title: 'What Color Is It?',
    questions: [
      { id: 'l1-c1-q1', text: 'What color is the banana? 🍌', imageHint: '🍌', options: ['Yellow', 'Blue', 'Green'], correctAnswer: 'Yellow', hint: 'Bananas are bright and sunny!' },
      { id: 'l1-c1-q2', text: 'What color is the sky? ☁️', imageHint: '☁️', options: ['Red', 'Blue', 'Pink'], correctAnswer: 'Blue', hint: 'Look up at a clear day!' },
      { id: 'l1-c1-q3', text: 'What color is a strawberry? 🍓', imageHint: '🍓', options: ['Orange', 'Purple', 'Red'], correctAnswer: 'Red', hint: 'Strawberries are sweet and this color!' },
      { id: 'l1-c1-q4', text: 'What color is grass? 🌿', imageHint: '🌿', options: ['Yellow', 'Green', 'Brown'], correctAnswer: 'Green', hint: 'Grass grows in the garden!' },
      { id: 'l1-c1-q5', text: 'What color is an orange? 🍊', imageHint: '🍊', options: ['Orange', 'Yellow', 'Red'], correctAnswer: 'Orange', hint: 'This fruit shares its name with its color!' }
    ]
  },
  {
    id: 'l1-animals-1',
    type: 'multiple_choice',
    topic: 'animals',
    level: 1,
    title: 'Animal Friends',
    questions: [
      { id: 'l1-a1-q1', text: 'Which animal says "meow"? 😺', imageHint: '😺', options: ['Dog', 'Cat', 'Bird'], correctAnswer: 'Cat', hint: 'This animal loves to purr!' },
      { id: 'l1-a1-q2', text: 'Which animal has a long neck? 🦒', imageHint: '🦒', options: ['Elephant', 'Giraffe', 'Lion'], correctAnswer: 'Giraffe', hint: 'It eats leaves from tall trees!' },
      { id: 'l1-a1-q3', text: 'Which animal can fly? 🦅', imageHint: '🦅', options: ['Fish', 'Dog', 'Bird'], correctAnswer: 'Bird', hint: 'This animal has feathers and wings!' },
      { id: 'l1-a1-q4', text: 'Which animal hops and has big ears? 🐰', imageHint: '🐰', options: ['Cat', 'Rabbit', 'Bear'], correctAnswer: 'Rabbit', hint: 'It loves carrots!' },
      { id: 'l1-a1-q5', text: 'Which animal swims in the ocean? 🐟', imageHint: '🐟', options: ['Horse', 'Fish', 'Cow'], correctAnswer: 'Fish', hint: 'It has fins and gills!' }
    ]
  },
  {
    id: 'l1-numbers-1',
    type: 'multiple_choice',
    topic: 'numbers',
    level: 1,
    title: 'Count With Me!',
    questions: [
      { id: 'l1-n1-q1', text: 'How many stars? ⭐⭐⭐', imageHint: '⭐⭐⭐', options: ['Two', 'Three', 'Four'], correctAnswer: 'Three', hint: 'Count each star: one, two, ...' },
      { id: 'l1-n1-q2', text: 'How many apples? 🍎🍎', imageHint: '🍎🍎', options: ['One', 'Two', 'Three'], correctAnswer: 'Two', hint: 'Count the apples!' },
      { id: 'l1-n1-q3', text: 'How many balloons? 🎈🎈🎈🎈🎈', imageHint: '🎈🎈🎈🎈🎈', options: ['Four', 'Five', 'Six'], correctAnswer: 'Five', hint: 'Count carefully!' },
      { id: 'l1-n1-q4', text: 'What number comes after 3?', imageHint: '1️⃣2️⃣3️⃣❓', options: ['2', '4', '5'], correctAnswer: '4', hint: 'Count up from 3!' },
      { id: 'l1-n1-q5', text: 'How many fingers on one hand? 🖐️', imageHint: '🖐️', options: ['Four', 'Five', 'Six'], correctAnswer: 'Five', hint: 'Hold up your hand and count!' }
    ]
  },
  {
    id: 'l1-fruits-1',
    type: 'multiple_choice',
    topic: 'fruits',
    level: 1,
    title: 'Yummy Fruits!',
    questions: [
      { id: 'l1-f1-q1', text: 'What fruit is yellow and curved? 🍌', imageHint: '🍌', options: ['Apple', 'Banana', 'Grapes'], correctAnswer: 'Banana', hint: 'Monkeys love this fruit!' },
      { id: 'l1-f1-q2', text: 'What fruit is red and round? 🍎', imageHint: '🍎', options: ['Apple', 'Pear', 'Peach'], correctAnswer: 'Apple', hint: 'An apple a day keeps the doctor away!' },
      { id: 'l1-f1-q3', text: 'What fruit is purple and grows in bunches? 🍇', imageHint: '🍇', options: ['Plum', 'Grapes', 'Blueberries'], correctAnswer: 'Grapes', hint: 'You pick them bunch by bunch!' },
      { id: 'l1-f1-q4', text: 'What big green fruit has red inside? 🍉', imageHint: '🍉', options: ['Melon', 'Watermelon', 'Cucumber'], correctAnswer: 'Watermelon', hint: "It's a summer treat!" },
      { id: 'l1-f1-q5', text: 'What orange fruit is a citrus fruit? 🍊', imageHint: '🍊', options: ['Lemon', 'Orange', 'Tangerine'], correctAnswer: 'Orange', hint: 'Its name is also a color!' }
    ]
  },
  {
    id: 'l1-objects-1',
    type: 'multiple_choice',
    topic: 'objects',
    level: 1,
    title: 'Things Around Me',
    questions: [
      { id: 'l1-o1-q1', text: 'What do you use to write? ✏️', imageHint: '✏️', options: ['Pencil', 'Ruler', 'Eraser'], correctAnswer: 'Pencil', hint: 'You hold it and write with it!' },
      { id: 'l1-o1-q2', text: 'What do you read? 📚', imageHint: '📚', options: ['Chair', 'Book', 'Table'], correctAnswer: 'Book', hint: 'It has pages with words!' },
      { id: 'l1-o1-q3', text: 'What do you sleep on? 🛏️', imageHint: '🛏️', options: ['Floor', 'Chair', 'Bed'], correctAnswer: 'Bed', hint: 'You go here at night!' },
      { id: 'l1-o1-q4', text: 'What do you use to eat soup? 🥄', imageHint: '🥄', options: ['Fork', 'Knife', 'Spoon'], correctAnswer: 'Spoon', hint: 'It has a round bowl shape!' },
      { id: 'l1-o1-q5', text: 'What do you wear on your feet? 👟', imageHint: '👟', options: ['Hat', 'Gloves', 'Shoes'], correctAnswer: 'Shoes', hint: 'They protect your feet!' }
    ]
  },
  {
    id: 'l2-phrases-1',
    type: 'multiple_choice',
    topic: 'phrases',
    level: 2,
    title: 'I See...',
    questions: [
      { id: 'l2-p1-q1', text: 'Complete: "I see a ___." 🐱', imageHint: '🐱', options: ['I see a cat.', 'I see a dog.', 'I see a bird.'], correctAnswer: 'I see a cat.', hint: 'What animal is in the picture?' },
      { id: 'l2-p1-q2', text: 'Complete: "I like ___." 🍎', imageHint: '🍎', options: ['I like apples.', 'I like bananas.', 'I like grapes.'], correctAnswer: 'I like apples.', hint: 'The picture shows a red fruit!' },
      { id: 'l2-p1-q3', text: 'Which sentence is correct? 🔴', imageHint: '🔴', options: ['The ball is red.', 'The ball is blue.', 'The ball is green.'], correctAnswer: 'The ball is red.', hint: 'Look at the color of the ball!' },
      { id: 'l2-p1-q4', text: 'Complete: "This is my ___." 📖', imageHint: '📖', options: ['This is my book.', 'This is my cat.', 'This is my ball.'], correctAnswer: 'This is my book.', hint: 'What does the emoji show?' },
      { id: 'l2-p1-q5', text: 'Which phrase means you want something? 🙋', imageHint: '🙋', options: ['I want more!', 'I see a dog.', 'This is a chair.'], correctAnswer: 'I want more!', hint: 'Which says what you need?' }
    ]
  },
  {
    id: 'l3-sentences-1',
    type: 'multiple_choice',
    topic: 'sentences',
    level: 3,
    title: 'Describing Things',
    questions: [
      { id: 'l3-s1-q1', text: 'Which sentence best describes this? 🐱💤', imageHint: '🐱💤', options: ['The little cat is sleeping.', 'The big dog is running.', 'The bird is singing.'], correctAnswer: 'The little cat is sleeping.', hint: 'Look at what the cat is doing!' },
      { id: 'l3-s1-q2', text: 'What is a good question to ask a friend? 🤔', imageHint: '🤔', options: ['What do you like to play?', 'The sky is blue.', 'I have a cat.'], correctAnswer: 'What do you like to play?', hint: 'Questions have a question mark!' },
      { id: 'l3-s1-q3', text: 'Complete: "I like playing with my ___ ball."', imageHint: '🔴⚽', options: ['I like playing with my red ball.', 'I like playing with my big dog.', 'I like sleeping on my soft bed.'], correctAnswer: 'I like playing with my red ball.', hint: 'The red ball is in the picture!' },
      { id: 'l3-s1-q4', text: 'Which is a complete thought? 💭', imageHint: '💭', options: ['My favorite color is yellow.', 'The running fast dog', 'Big and happy'], correctAnswer: 'My favorite color is yellow.', hint: 'A sentence has a subject and verb!' },
      { id: 'l3-s1-q5', text: 'How do you reply to "How are you?" 👋', imageHint: '👋', options: ['I am doing great, thank you!', 'The cat is sleeping.', 'I have two apples.'], correctAnswer: 'I am doing great, thank you!', hint: 'Answer the question about yourself!' }
    ]
  }
];

async function seedFirebase() {
  console.log('Connecting to Firebase Project:', firebaseConfig.projectId);
  try {
    for (const act of ACTIVITIES_SEED) {
      const actRef = doc(db, 'activities', act.id);
      await setDoc(actRef, {
        id: act.id,
        type: act.type,
        topic: act.topic,
        level: act.level,
        title: act.title,
        questions: act.questions,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✓ Seeded activity in Firestore:', act.id, act.title);
    }
    console.log('\nSUCCESS: All activities seeded to Firebase Firestore successfully!');
  } catch (err) {
    console.error('\nFIRESTORE SEED NOTICE:', err.code, err.message);
    if (err.code === 'permission-denied') {
      console.log('\n→ HOW TO ENABLE: In Firebase Console -> Firestore Database -> Rules tab, change to:');
      console.log('rules_version = \'2\';');
      console.log('service cloud.firestore {');
      console.log('  match /databases/{database}/documents {');
      console.log('    match /{document=**} {');
      console.log('      allow read, write: if true;');
      console.log('    }');
      console.log('  }');
      console.log('}');
      console.log('Then click "Publish".');
    }
  }
}

seedFirebase();
