// services/presenceService.ts
//
// Admin online/offline status. While the app is open and in the foreground, each
// admin writes a heartbeat to their profiles row (`online: true`, `last_active`)
// every 45s. An admin counts as online only if their last heartbeat is under
// 2 minutes old, so a crashed or force-closed app drops to offline on its own.
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';

const HEARTBEAT_MS = 45_000;
export const ONLINE_WINDOW_MS = 2 * 60_000;

export type AdminPresence = {
  uid: string;
  name: string;
  email: string;
  online: boolean;
  lastActiveMs: number | null;
};

async function beat(uid: string, online: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ online, last_active: new Date().toISOString() })
    .eq('id', uid);
  if (error) throw error;
}

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
  let active = true;

  const load = async () => {
    const { data, error } = await supabase.from('profiles').select('*').eq('role', 'admin');
    if (!active) return;
    if (error) {
      warn(error);
      cb([]);
      return;
    }
    cb(
      (data ?? []).map((row: any) => {
        const email: string = row.email ?? '';
        return {
          uid: row.id,
          name: row.display_name ?? (email ? email.split('@')[0] : 'Admin'),
          email,
          online: row.online === true,
          lastActiveMs: row.last_active ? Date.parse(row.last_active) : null,
        };
      })
    );
  };
  load();

  const channel = supabase
    .channel(`admins:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

/** A null lastActive means no heartbeat has landed yet, so treat it as fresh. */
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
