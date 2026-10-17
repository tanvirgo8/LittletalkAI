// ============================================================
// LittleTalk AI - Database Adapter Interface & Implementations
// Supports Firebase Firestore & In-Memory Demo Fallback
// ============================================================
import type { ChildProfile, SessionContext } from './types';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
  type Firestore,
} from 'firebase/firestore';

export interface ActivityProgressData {
  activityId: string;
  topic: string;
  level: number;
  attempts: number;
  correctCount: number;
  status: 'pending' | 'completed' | 'review';
  updatedAt: string;
}

export interface DatabaseAdapter {
  isPersistent(): boolean;
  getStorageType(): 'firestore' | 'in-memory-demo';
  getProfile(profileId: string): Promise<ChildProfile | null>;
  saveProfile(profile: ChildProfile): Promise<void>;
  getSession(sessionId: string): Promise<SessionContext | null>;
  saveSession(session: SessionContext): Promise<void>;
  saveActivityProgress(
    profileId: string,
    activityId: string,
    data: ActivityProgressData
  ): Promise<void>;
  getActivityProgress(
    profileId: string,
    activityId: string
  ): Promise<ActivityProgressData | null>;
  deleteProfileData(profileId: string): Promise<void>;
}

// ─── In-Memory Demo Adapter ────────────────────────────────
export class MemoryDatabaseAdapter implements DatabaseAdapter {
  private profiles = new Map<string, ChildProfile>();
  private sessions = new Map<string, SessionContext>();
  private activities = new Map<string, Map<string, ActivityProgressData>>();

  isPersistent(): boolean {
    return false;
  }

  getStorageType(): 'firestore' | 'in-memory-demo' {
    return 'in-memory-demo';
  }

  async getProfile(profileId: string): Promise<ChildProfile | null> {
    return this.profiles.get(profileId) ?? null;
  }

  async saveProfile(profile: ChildProfile): Promise<void> {
    this.profiles.set(profile.profileId, { ...profile });
  }

  async getSession(sessionId: string): Promise<SessionContext | null> {
    return this.sessions.get(sessionId) ?? null;
  }

  async saveSession(session: SessionContext): Promise<void> {
    this.sessions.set(session.sessionId, { ...session });
  }

  async saveActivityProgress(
    profileId: string,
    activityId: string,
    data: ActivityProgressData
  ): Promise<void> {
    let userActivities = this.activities.get(profileId);
    if (!userActivities) {
      userActivities = new Map<string, ActivityProgressData>();
      this.activities.set(profileId, userActivities);
    }
    userActivities.set(activityId, { ...data });
  }

  async getActivityProgress(
    profileId: string,
    activityId: string
  ): Promise<ActivityProgressData | null> {
    return this.activities.get(profileId)?.get(activityId) ?? null;
  }

  async deleteProfileData(profileId: string): Promise<void> {
    this.profiles.delete(profileId);
    this.activities.delete(profileId);
    // Remove all associated sessions
    for (const [sId, sess] of this.sessions.entries()) {
      if (sess.profileId === profileId) {
        this.sessions.delete(sId);
      }
    }
  }

  // Helper for test reset
  clearAll(): void {
    this.profiles.clear();
    this.sessions.clear();
    this.activities.clear();
  }
}

// ─── Firebase Firestore Adapter ────────────────────────────
export class FirestoreDatabaseAdapter implements DatabaseAdapter {
  private db: Firestore;
  private memoryFallback = new MemoryDatabaseAdapter();

  constructor() {
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    };

    let app: FirebaseApp;
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }

    this.db = getFirestore(app);
  }

  isPersistent(): boolean {
    return true;
  }

  getStorageType(): 'firestore' | 'in-memory-demo' {
    return 'firestore';
  }

  async getProfile(profileId: string): Promise<ChildProfile | null> {
    try {
      const ref = doc(this.db, 'profiles', profileId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return this.memoryFallback.getProfile(profileId);
      }
      const data = snap.data() as ChildProfile;
      await this.memoryFallback.saveProfile(data);
      return data;
    } catch (e) {
      console.warn('Firestore getProfile fallback to memory:', e);
      return this.memoryFallback.getProfile(profileId);
    }
  }

  async saveProfile(profile: ChildProfile): Promise<void> {
    await this.memoryFallback.saveProfile(profile);
    try {
      const ref = doc(this.db, 'profiles', profile.profileId);
      await setDoc(ref, profile, { merge: true });
    } catch (e) {
      console.warn('Firestore saveProfile sync notice (check Firestore rules):', e);
    }
  }

  async getSession(sessionId: string): Promise<SessionContext | null> {
    try {
      const ref = doc(this.db, 'sessions', sessionId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return this.memoryFallback.getSession(sessionId);
      }
      const data = snap.data() as SessionContext;
      await this.memoryFallback.saveSession(data);
      return data;
    } catch (e) {
      console.warn('Firestore getSession fallback to memory:', e);
      return this.memoryFallback.getSession(sessionId);
    }
  }

  async saveSession(session: SessionContext): Promise<void> {
    await this.memoryFallback.saveSession(session);
    try {
      const ref = doc(this.db, 'sessions', session.sessionId);
      await setDoc(ref, session, { merge: true });
    } catch (e) {
      console.warn('Firestore saveSession sync notice (check Firestore rules):', e);
    }
  }

  async saveActivityProgress(
    profileId: string,
    activityId: string,
    data: ActivityProgressData
  ): Promise<void> {
    await this.memoryFallback.saveActivityProgress(profileId, activityId, data);
    try {
      const ref = doc(this.db, 'profiles', profileId, 'activities', activityId);
      await setDoc(ref, data, { merge: true });
    } catch (e) {
      console.warn('Firestore saveActivityProgress sync notice:', e);
    }
  }

  async getActivityProgress(
    profileId: string,
    activityId: string
  ): Promise<ActivityProgressData | null> {
    try {
      const ref = doc(this.db, 'profiles', profileId, 'activities', activityId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return this.memoryFallback.getActivityProgress(profileId, activityId);
      }
      return snap.data() as ActivityProgressData;
    } catch (e) {
      return this.memoryFallback.getActivityProgress(profileId, activityId);
    }
  }

  async deleteProfileData(profileId: string): Promise<void> {
    await this.memoryFallback.deleteProfileData(profileId);
    try {
      await deleteDoc(doc(this.db, 'profiles', profileId));
      const actRef = collection(this.db, 'profiles', profileId, 'activities');
      const actSnap = await getDocs(actRef);
      for (const d of actSnap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.warn('Firestore deleteProfileData notice:', e);
    }
  }
}

// ─── Database Factory ───────────────────────────────────────
let adapterInstance: DatabaseAdapter | null = null;

export function getDatabaseAdapter(): DatabaseAdapter {
  if (adapterInstance) return adapterInstance;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const hasFirebase = Boolean(
    projectId &&
      projectId.trim().length > 0 &&
      projectId !== 'demo-project' &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'demo-api-key'
  );

  if (hasFirebase) {
    try {
      adapterInstance = new FirestoreDatabaseAdapter();
      return adapterInstance;
    } catch (e) {
      console.warn('Failed to initialize Firestore adapter, falling back to MemoryDbAdapter', e);
      adapterInstance = new MemoryDatabaseAdapter();
      return adapterInstance;
    }
  }

  adapterInstance = new MemoryDatabaseAdapter();
  return adapterInstance;
}

export function setDatabaseAdapterForTesting(adapter: DatabaseAdapter | null): void {
  adapterInstance = adapter;
}
