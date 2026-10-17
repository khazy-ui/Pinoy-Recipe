// services/feedbackService.ts
//
// Postgres tables used:
//   feedback       -> what users send in, plus the admin's reply/status
//   notifications  -> what admins send back to a specific user
import { supabase } from '../lib/supabase';

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

type Unsubscribe = () => void;

const toMs = (v: string | null | undefined): number => (v ? Date.parse(v) : Date.now());

const mapFeedback = (row: any): Feedback => ({
  id: row.id,
  userId: row.user_id,
  userEmail: row.user_email ?? '',
  userName: row.user_name ?? 'Chef',
  category: row.category,
  message: row.message,
  status: row.status ?? 'new',
  createdAt: toMs(row.created_at),
  adminReply: row.admin_reply ?? undefined,
  repliedAt: row.replied_at ? toMs(row.replied_at) : undefined,
});

const mapNotification = (row: any): AppNotification => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  body: row.body,
  feedbackId: row.feedback_id ?? null,
  read: !!row.read,
  createdAt: toMs(row.created_at),
});

export function formatWhen(ms: number): string {
  const d = new Date(ms);
  return (
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  );
}

const logErr = (label: string) => (err: unknown) => console.warn(`[${label}]`, err);

// Supabase calls return { error } instead of throwing; this keeps the old throw-on-failure behavior.
function check(error: { message: string } | null) {
  if (error) throw error;
}

// Large id lists are sent in chunks so the request URL stays short.
const CHUNK = 100;
const chunks = <T,>(items: T[], size = CHUNK): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

/**
 * Replaces Firestore's onSnapshot: loads the list once, then reloads it whenever
 * the table changes. Row Level Security still filters every reload, so each user
 * only ever receives rows they're allowed to see.
 *
 * Each subscription gets a unique channel name, because several screens can
 * listen to the same table at the same time.
 */
function subscribeToTable<T>(
  table: 'feedback' | 'notifications',
  fetchList: () => Promise<T[]>,
  cb: (list: T[]) => void,
  label: string
): Unsubscribe {
  let active = true;

  const load = async () => {
    try {
      const list = await fetchList();
      if (active) cb(list);
    } catch (err) {
      logErr(label)(err);
    }
  };
  load();

  // No row filter on purpose: Supabase can't filter DELETE events, so a filter
  // would leave the list stale after a delete. The reload below is filtered by RLS.
  const channel = supabase
    .channel(`${table}:${label}:${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, load)
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}

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
  const { error } = await supabase.from('feedback').insert({
    user_id: input.userId,
    user_email: input.userEmail,
    user_name: input.userName,
    category: input.category,
    message: input.message.trim(),
    status: 'new',
  });
  check(error);
}

export function subscribeToMyFeedback(uid: string, cb: (list: Feedback[]) => void): Unsubscribe {
  return subscribeToTable(
    'feedback',
    async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      check(error);
      return (data ?? []).map(mapFeedback);
    },
    cb,
    'subscribeToMyFeedback'
  );
}

export function subscribeToMyNotifications(
  uid: string,
  cb: (list: AppNotification[]) => void
): Unsubscribe {
  return subscribeToTable(
    'notifications',
    async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      check(error);
      return (data ?? []).map(mapNotification);
    },
    cb,
    'subscribeToMyNotifications'
  );
}

export async function markNotificationRead(id: string) {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  check(error);
}

export async function deleteNotification(id: string) {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  check(error);
}

export async function deleteAllNotifications(ids: string[]) {
  for (const part of chunks(ids)) {
    const { error } = await supabase.from('notifications').delete().in('id', part);
    check(error);
  }
}

export async function markAllNotificationsRead(ids: string[]) {
  for (const part of chunks(ids)) {
    const { error } = await supabase.from('notifications').update({ read: true }).in('id', part);
    check(error);
  }
}

/* ------------------------------------------------------------------ */
/* Admin side                                                          */
/* ------------------------------------------------------------------ */

export function subscribeToAllFeedback(cb: (list: Feedback[]) => void): Unsubscribe {
  return subscribeToTable(
    'feedback',
    async () => {
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });
      check(error);
      return (data ?? []).map(mapFeedback);
    },
    cb,
    'subscribeToAllFeedback'
  );
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  const { error } = await supabase.from('feedback').update({ status }).eq('id', id);
  check(error);
}

/**
 * Saves the admin's reply on the feedback AND creates a notification for the
 * user. Done by one database function (reply_to_feedback) so both happen
 * together or not at all, and only admins are allowed to call it.
 */
export async function replyToFeedback(feedback: Feedback, reply: string, status: FeedbackStatus) {
  const { error } = await supabase.rpc('reply_to_feedback', {
    p_id: feedback.id,
    p_reply: reply,
    p_status: status,
  });
  check(error);
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
  const { data, error } = await supabase.from('profiles').select('id, email, display_name, role');
  check(error);
  return (data ?? [])
    .map((row: any) => {
      const email: string = row.email ?? '';
      return {
        uid: row.id,
        email,
        name: row.display_name || email.split('@')[0] || 'User',
        role: row.role ?? 'user',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Sends the same notification to one or many users. Each user gets their own
 * notification row, so read/unread is tracked per person.
 */
export async function sendNotificationToUsers(uids: string[], title: string, body: string) {
  for (const part of chunks(uids, 500)) {
    const { error } = await supabase.from('notifications').insert(
      part.map((uid) => ({ user_id: uid, title, body, feedback_id: null, read: false }))
    );
    check(error);
  }
}
