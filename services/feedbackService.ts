// services/feedbackService.ts
//
// Firestore collections used:
//   feedback/{id}       -> what users send in, plus the admin's reply/status
//   notifications/{id}  -> what admins send back to a specific user
//
// NOTE: assumes `db` (getFirestore) is exported from lib/firebaseClient.
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebaseClient';

/* ------------------------------------------------------------------ */
/* Types & labels                                                      */
/* ------------------------------------------------------------------ */

export type FeedbackCategory = 'suggestion' | 'bug' | 'recipe_request' | 'other';
export type FeedbackStatus = 'new' | 'in_progress' | 'resolved';

export interface Feedback {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  category: FeedbackCategory;
  message: string;
  status: FeedbackStatus;
  createdAt: number; // ms
  adminReply?: string;
  repliedAt?: number; // ms
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  feedbackId: string | null;
  read: boolean;
  createdAt: number; // ms
}

export const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  suggestion: 'Suggestion',
  bug: 'Problem',
  recipe_request: 'Recipe request',
  other: 'Other',
};

export const STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: 'Received',
  in_progress: 'In progress',
  resolved: 'Resolved',
};

export const STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: '#D97706',
  in_progress: '#2563EB',
  resolved: '#3A8A5A',
};

export const MAX_FEEDBACK_LENGTH = 1000;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

// serverTimestamp() is null in local snapshots until the server confirms it.
const toMs = (v: any): number => (v?.toMillis ? v.toMillis() : Date.now());

const mapFeedback = (d: QueryDocumentSnapshot): Feedback => {
  const data = d.data();
  return {
    id: d.id,
    userId: data.userId,
    userEmail: data.userEmail ?? '',
    userName: data.userName ?? 'Chef',
    category: data.category,
    message: data.message,
    status: data.status ?? 'new',
    createdAt: toMs(data.createdAt),
    adminReply: data.adminReply ?? undefined,
    repliedAt: data.repliedAt ? toMs(data.repliedAt) : undefined,
  };
};

const mapNotification = (d: QueryDocumentSnapshot): AppNotification => {
  const data = d.data();
  return {
    id: d.id,
    userId: data.userId,
    title: data.title,
    body: data.body,
    feedbackId: data.feedbackId ?? null,
    read: !!data.read,
    createdAt: toMs(data.createdAt),
  };
};

export function formatWhen(ms: number): string {
  const d = new Date(ms);
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  );
}

const logErr = (label: string) => (err: unknown) => console.warn(`[${label}]`, err);

/* ------------------------------------------------------------------ */
/* User side                                                           */
/* ------------------------------------------------------------------ */

export async function submitFeedback(input: {
  userId: string;
  userEmail: string;
  userName: string;
  category: FeedbackCategory;
  message: string;
}) {
  await addDoc(collection(db, 'feedback'), {
    ...input,
    message: input.message.trim(),
    status: 'new' as FeedbackStatus,
    createdAt: serverTimestamp(),
  });
}

// Sorted client-side so no composite Firestore index is required.
export function subscribeToMyFeedback(uid: string, cb: (list: Feedback[]) => void): Unsubscribe {
  const q = query(collection(db, 'feedback'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(mapFeedback).sort((a, b) => b.createdAt - a.createdAt)),
    logErr('subscribeToMyFeedback')
  );
}

export function subscribeToMyNotifications(
  uid: string,
  cb: (list: AppNotification[]) => void
): Unsubscribe {
  const q = query(collection(db, 'notifications'), where('userId', '==', uid));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map(mapNotification).sort((a, b) => b.createdAt - a.createdAt)),
    logErr('subscribeToMyNotifications')
  );
}

export async function markNotificationRead(id: string) {
  await updateDoc(doc(db, 'notifications', id), { read: true });
}

export async function deleteNotification(id: string) {
  await deleteDoc(doc(db, 'notifications', id));
}

export async function deleteAllNotifications(ids: string[]) {
  const CHUNK = 400; // a Firestore batch is limited to 500 operations
  for (let i = 0; i < ids.length; i += CHUNK) {
    const batch = writeBatch(db);
    ids.slice(i, i + CHUNK).forEach((id) => batch.delete(doc(db, 'notifications', id)));
    await batch.commit();
  }
}

export async function markAllNotificationsRead(ids: string[]) {
  if (ids.length === 0) return;
  const batch = writeBatch(db);
  ids.forEach((id) => batch.update(doc(db, 'notifications', id), { read: true }));
  await batch.commit();
}

/* ------------------------------------------------------------------ */
/* Admin side                                                          */
/* ------------------------------------------------------------------ */

export function subscribeToAllFeedback(cb: (list: Feedback[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'feedback'),
    (snap) => cb(snap.docs.map(mapFeedback).sort((a, b) => b.createdAt - a.createdAt)),
    logErr('subscribeToAllFeedback')
  );
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  await updateDoc(doc(db, 'feedback', id), { status });
}

/**
 * Saves the admin's reply on the feedback AND creates a notification for the
 * user, in one atomic batch so they can never get out of sync.
 */
export async function replyToFeedback(feedback: Feedback, reply: string, status: FeedbackStatus) {
  const batch = writeBatch(db);

  batch.update(doc(db, 'feedback', feedback.id), {
    adminReply: reply,
    repliedAt: serverTimestamp(),
    status,
  });

  batch.set(doc(collection(db, 'notifications')), {
    userId: feedback.userId,
    title: status === 'resolved' ? 'Your feedback was resolved' : 'Update on your feedback',
    body: reply,
    feedbackId: feedback.id,
    read: false,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

/* ------------------------------------------------------------------ */
/* Admin: notify users directly (no feedback needed)                    */
/* ------------------------------------------------------------------ */

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: string;
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map((d) => {
      const x = d.data();
      const email: string = x.email ?? '';
      return {
        uid: d.id,
        email,
        name: x.displayName || x.name || email.split('@')[0] || 'User',
        role: x.role ?? 'user',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sends the same notification to one or many users. Each user gets their own
 * notification document, so read/unread is tracked per person. Writes are
 * chunked because a Firestore batch is limited to 500 operations.
 */
export async function sendNotificationToUsers(uids: string[], title: string, body: string) {
  const CHUNK = 400;
  for (let i = 0; i < uids.length; i += CHUNK) {
    const batch = writeBatch(db);
    uids.slice(i, i + CHUNK).forEach((uid) => {
      batch.set(doc(collection(db, 'notifications')), {
        userId: uid,
        title,
        body,
        feedbackId: null,
        read: false,
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
  }
}