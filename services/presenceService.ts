// services/presenceService.ts
//
// Admin online/offline status using Firestore (no extra setup needed).
// While the app is open and in the foreground, each admin writes a heartbeat to
// users/{uid} (`online: true`, `lastActive`) every 45s. An admin counts as
// online only if their last heartbeat is under 2 minutes old, so a crashed or
// force-closed app drops to offline on its own.
import { AppState } from 'react-native';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../lib/firebaseClient';

const HEARTBEAT_MS = 45_000;
export const ONLINE_WINDOW_MS = 2 * 60_000;

export type AdminPresence = {
  uid: string;
  name: string;
  email: string;
  online: boolean;
  lastActiveMs: number | null;
};

const beat = (uid: string, online: boolean) =>
  setDoc(doc(db, 'users', uid), { online, lastActive: serverTimestamp() }, { merge: true });

const warn = (err: unknown) => console.warn('[presence]', err);

/** Call before signing out (while still authenticated). */
export const setAdminOffline = (uid: string) => beat(uid, false);

/** Starts the heartbeat. Returns a cleanup function. */
export function startAdminPresence(uid: string): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;

  const stopTimer = () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
  const start = () => {
    stopTimer();
    beat(uid, true).catch(warn);
    timer = setInterval(() => beat(uid, true).catch(warn), HEARTBEAT_MS);
  };

  if (AppState.currentState === 'active') start();

  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      start();
    } else {
      stopTimer();
      beat(uid, false).catch(warn);
    }
  });

  return () => {
    stopTimer();
    sub.remove();
  };
}

export function subscribeToAdmins(cb: (admins: AdminPresence[]) => void): () => void {
  return onSnapshot(
    query(collection(db, 'users'), where('role', '==', 'admin')),
    (snap) =>
      cb(
        snap.docs.map((d) => {
          const data = d.data() as any;
          const email: string = data.email ?? '';
          return {
            uid: d.id,
            name: data.name ?? data.displayName ?? (email ? email.split('@')[0] : 'Admin'),
            email,
            online: data.online === true,
            lastActiveMs: data.lastActive?.toMillis?.() ?? null,
          };
        })
      ),
    (err) => {
      warn(err);
      cb([]);
    }
  );
}

/** A null lastActive means our own heartbeat write is still pending, so treat it as fresh. */
export const isAdminOnline = (a: AdminPresence, now: number) =>
  a.online && (a.lastActiveMs === null || now - a.lastActiveMs < ONLINE_WINDOW_MS);

export function lastSeenLabel(a: AdminPresence, now: number): string {
  if (isAdminOnline(a, now)) return 'Online';
  if (a.lastActiveMs === null) return 'Offline';
  const mins = Math.floor((now - a.lastActiveMs) / 60_000);
  if (mins < 1) return 'Offline · just now';
  if (mins < 60) return `Offline · ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Offline · ${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `Offline · ${days} day${days === 1 ? '' : 's'} ago`;
}