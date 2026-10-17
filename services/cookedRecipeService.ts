import { supabase } from '../lib/supabase';

export async function recordCookedRecipe(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw new Error('You must be signed in to save cooking progress.');
  }
  // Server-side function so the counter can only ever go up by one.
  const { error } = await supabase.rpc('increment_cooked');
  if (error) throw error;
}

/**
 * Live "recipes cooked" counter for the profile screen.
 * Loads once, then reloads whenever this user's profile row changes.
 */
export function subscribeToCookedCount(
  uid: string,
  cb: (count: number) => void,
  onError?: (err: unknown) => void
): () => void {
  let active = true;

  const load = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('cooked_recipe_count')
      .eq('id', uid)
      .maybeSingle();
    if (!active) return;
    if (error) {
      onError?.(error);
      return;
    }
    const n = data?.cooked_recipe_count;
    cb(typeof n === 'number' && Number.isFinite(n) ? n : 0);
  };
  load();

  const channel = supabase
    .channel(`cooked:${uid}:${Math.random().toString(36).slice(2)}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${uid}` },
      load
    )
    .subscribe();

  return () => {
    active = false;
    supabase.removeChannel(channel);
  };
}
