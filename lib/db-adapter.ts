// ============================================================
// LittleTalk AI - Database Adapter Interface & Implementations
// Supports SQLite Relational Tables & Firebase Firestore
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
import {
  saveProfileToDb,
  getProfileFromDb,
  deleteProfileFromDb,
  saveSessionToDb,
  getSessionFromDb,
  saveActivityProgressToDb,
  getActivityProgressFromDb,
} from './sqlite-db';

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
  getStorageType(): 'firestore' | 'sqlite';
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

// ─── SQLite Relational Database Adapter (Primary) ───────────
export class SqliteDatabaseAdapter implements DatabaseAdapter {
  isPersistent(): boolean {
    return true;
  }

  getStorageType(): 'firestore' | 'sqlite' {
    return 'sqlite';
  }

  async getProfile(profileId: string): Promise<ChildProfile | null> {
    return getProfileFromDb(profileId);
  }

  async saveProfile(profile: ChildProfile): Promise<void> {
    saveProfileToDb(profile);
  }

  async getSession(sessionId: string): Promise<SessionContext | null> {
    return getSessionFromDb(sessionId);
  }

  async saveSession(session: SessionContext): Promise<void> {
    saveSessionToDb(session);
  }

  async saveActivityProgress(
    profileId: string,
    activityId: string,
    data: ActivityProgressData
  ): Promise<void> {
    saveActivityProgressToDb(profileId, activityId, data);
  }

  async getActivityProgress(
    profileId: string,
    activityId: string
  ): Promise<ActivityProgressData | null> {
    return getActivityProgressFromDb(profileId, activityId);
  }

  async deleteProfileData(profileId: string): Promise<void> {
    deleteProfileFromDb(profileId);
  }
}

// ─── Firebase Firestore Adapter ────────────────────────────
export class FirestoreDatabaseAdapter implements DatabaseAdapter {
  private db: Firestore;
  private localSqlite = new SqliteDatabaseAdapter();

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

  getStorageType(): 'firestore' | 'sqlite' {
    return 'firestore';
  }

  async getProfile(profileId: string): Promise<ChildProfile | null> {
    try {
      const ref = doc(this.db, 'profiles', profileId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return this.localSqlite.getProfile(profileId);
      }
      const data = snap.data() as ChildProfile;
      await this.localSqlite.saveProfile(data);
      return data;
    } catch (e) {
      console.warn('Firestore getProfile fallback to SQLite:', e);
      return this.localSqlite.getProfile(profileId);
    }
  }

  async saveProfile(profile: ChildProfile): Promise<void> {
    await this.localSqlite.saveProfile(profile);
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
        return this.localSqlite.getSession(sessionId);
      }
      const data = snap.data() as SessionContext;
      await this.localSqlite.saveSession(data);
      return data;
    } catch (e) {
      console.warn('Firestore getSession fallback to SQLite:', e);
      return this.localSqlite.getSession(sessionId);
    }
  }

  async saveSession(session: SessionContext): Promise<void> {
    await this.localSqlite.saveSession(session);
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
    await this.localSqlite.saveActivityProgress(profileId, activityId, data);
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
        return this.localSqlite.getActivityProgress(profileId, activityId);
      }
      return snap.data() as ActivityProgressData;
    } catch (e) {
      return this.localSqlite.getActivityProgress(profileId, activityId);
    }
  }

  async deleteProfileData(profileId: string): Promise<void> {
    await this.localSqlite.deleteProfileData(profileId);
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
      console.warn('Failed to initialize Firestore adapter, falling back to SQLite', e);
      adapterInstance = new SqliteDatabaseAdapter();
      return adapterInstance;
    }
  }

  // Default to persistent relational SQLite
  adapterInstance = new SqliteDatabaseAdapter();
  return adapterInstance;
}

export function setDatabaseAdapterForTesting(adapter: DatabaseAdapter | null): void {
  adapterInstance = adapter;
}
