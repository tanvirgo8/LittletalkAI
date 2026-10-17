const fs = require('fs');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc } = require('firebase/firestore');

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

console.log('Firebase Configuration:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  hasApiKey: Boolean(firebaseConfig.apiKey)
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  try {
    const testRef = doc(db, 'profiles', 'connection_probe');
    await setDoc(testRef, { connected: true, timestamp: new Date().toISOString() });
    console.log('WRITE SUCCESSFUL! Firestore is writable!');
    const snap = await getDoc(testRef);
    console.log('READ SUCCESSFUL! Data:', snap.data());
  } catch (e) {
    console.log('PERMISSION STATUS:', e.code, e.message);
  }
}
check();
