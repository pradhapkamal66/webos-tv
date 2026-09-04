/**
 * StreamGlass TV - Firebase Realtime Database & Authentication Service
 * Target: Google Email ID Auth, Cloud Firestore Realtime Sync, and Poster Storage.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { MovieRecord } from '../types/media';
import { isDemoVideo } from './mediaService';

// Initialize Firebase App instance safely
export const firebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

// Initialize Auth
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
export { onAuthStateChanged };

// Initialize Firestore using the specified databaseId
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
  : getFirestore(firebaseApp);

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

/**
 * Sign in using Google Account with popup (and fallback if blocked)
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Upsert user doc in firestore
    if (result.user) {
      await recordUserLogin(result.user);
    }
    return result.user;
  } catch (err: any) {
    console.warn('Google popup error, attempting redirect fallback:', err);
    if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        throw new Error('Google Sign-In popup was blocked. Please allow popups or use Email sign-in.');
      }
    }
    throw err;
  }
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  if (result.user) {
    await recordUserLogin(result.user);
  }
  return result.user;
}

/**
 * Register with Email and Password
 */
export async function signUpWithEmail(email: string, pass: string, name?: string): Promise<FirebaseUser> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (result.user && name) {
    await updateProfile(result.user, { displayName: name });
  }
  if (result.user) {
    await recordUserLogin(result.user);
  }
  return result.user;
}

/**
 * Sign out of current Firebase session
 */
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * Record user profile in users collection
 */
async function recordUserLogin(user: FirebaseUser) {
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(
      userDocRef,
      {
        id: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email?.split('@')[0] || 'TV Viewer',
        photoURL: user.photoURL || '',
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Failed to update user profile in Firestore:', err);
  }
}

/**
 * Realtime subscription to videos in Firestore
 * Listens for remote updates, additions, and deletions.
 */
export function subscribeToRealtimeVideos(
  user: AppUser | null,
  onUpdate: (videos: MovieRecord[]) => void,
  onError?: (err: Error) => void
): () => void {
  try {
    const videosCol = collection(db, 'videos');
    
    // Subscribe to all videos
    const unsubscribe = onSnapshot(
      videosCol,
      (snapshot) => {
        const list: MovieRecord[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MovieRecord;
          const video: MovieRecord = {
            ...data,
            id: docSnap.id,
          };
          // If a demo/test video is encountered, automatically purge it from Firestore
          if (isDemoVideo(video)) {
            deleteVideoFromFirestore(docSnap.id).catch(() => {});
          } else {
            list.push(video);
          }
        });

        // If videos found, sort by updatedAt or createdAt descending
        list.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        });

        onUpdate(list);
      },
      (err) => {
        console.warn('Firestore realtime subscription error:', err);
        if (onError) onError(err);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.warn('Unable to subscribe to Firestore realtime videos:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Purge any demo or test videos from Firestore collection
 */
export async function purgeDemoVideosFromFirestore(): Promise<void> {
  try {
    const videosCol = collection(db, 'videos');
    const snap = await getDocs(videosCol);
    for (const docSnap of snap.docs) {
      const data = docSnap.data() as MovieRecord;
      if (isDemoVideo({ ...data, id: docSnap.id })) {
        await deleteDoc(doc(db, 'videos', docSnap.id));
      }
    }
  } catch (err) {
    console.warn('Skipping demo video purge from Firestore:', err);
  }
}

/**
 * Save / Create a new video in Firestore Realtime Database
 */
export async function saveVideoToFirestore(video: MovieRecord, user?: AppUser | null): Promise<void> {
  // Prevent saving demo videos
  if (isDemoVideo(video)) return;

  const videoId = video.id || `video_${Date.now()}`;
  const videoRef = doc(db, 'videos', videoId);

  const payload: any = {
    ...video,
    id: videoId,
    userId: user?.uid || video.userId || 'user',
    userEmail: user?.email || '',
    updatedAt: new Date().toISOString(),
    createdAt: video.createdAt || new Date().toISOString(),
  };

  // Ensure no undefined values are written to Firestore
  const cleanPayload = JSON.parse(JSON.stringify(payload));

  await setDoc(videoRef, cleanPayload, { merge: true });
}

/**
 * Update existing video in Firestore
 */
export async function updateVideoInFirestore(video: MovieRecord): Promise<void> {
  if (!video.id || isDemoVideo(video)) return;
  const videoRef = doc(db, 'videos', video.id);
  const cleanPayload = JSON.parse(JSON.stringify({
    ...video,
    updatedAt: new Date().toISOString(),
  }));
  await updateDoc(videoRef, cleanPayload);
}

/**
 * Delete a video from Firestore
 */
export async function deleteVideoFromFirestore(videoId: string): Promise<void> {
  if (!videoId) return;
  const videoRef = doc(db, 'videos', videoId);
  await deleteDoc(videoRef);
}

/**
 * Seeding demo videos is disabled - library starts empty
 */
export async function seedFirestoreVideosIfEmpty(): Promise<boolean> {
  return false;
}
