// services/adminRecipeService.ts
// Write access for admin/CMS use. These calls only succeed for users whose
// profile role is 'admin' — that is enforced by Row Level Security in the
// database, not by this file.

import { supabase } from '../lib/supabase';
import { toRecipe, fromRecipe, type RichRecipe } from '../lib/recipeMapper';
import type { Recipe } from '../types';
import * as Crypto from 'expo-crypto';
import { File } from 'expo-file-system';

// Admins need to see drafts too, so this does NOT filter by status.
export async function getAllRecipesForAdmin(): Promise<RichRecipe[]> {
  const { data, error } = await supabase
    .from('recipes')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toRecipe);
}

export async function getRecipeForAdmin(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase.from('recipes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? toRecipe(data) : null;
}

export async function createRecipe(data: Partial<RichRecipe>): Promise<string> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const session = sessionData.session;
  if (!session) {
    throw new Error('Your admin session has expired. Please sign in again, then add the recipe.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (profile?.role !== 'admin') {
    throw new Error('Your account does not have admin permission to add recipes.');
  }

  const row = fromRecipe(data);
  if (row.created_by_admin_id === undefined) {
    row.created_by_admin_id = session.user.id;
  }
  const { data: created, error } = await supabase.from('recipes').insert(row).select('id').single();
  if (error) {
    if (error.message?.toLowerCase().includes('column') && error.message?.toLowerCase().includes('does not exist')) {
      throw new Error('The recipe database is missing a required column. Run the SQL migrations in supabase/002_extras.sql.');
    }
    throw error;
  }
  return created.id as string;
}

export async function updateRecipe(id: string, data: Partial<RichRecipe>): Promise<void> {
  // updated_at is set by a database trigger.
  const { data: rows, error } = await supabase
    .from('recipes')
    .update(fromRecipe(data))
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!rows || rows.length === 0) {
    throw new Error('Recipe not found, or you do not have permission to edit it.');
  }
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadRecipeImage(localUri: string, selectedMimeType?: string): Promise<string> {
  const mimeType = selectedMimeType ?? 'image/jpeg';
  if (!mimeType.startsWith('image/')) {
    throw new Error('The selected file is not an image.');
  }

  const file = new File(localUri);
  if (!file.exists) {
    throw new Error('Could not read the selected photo from the device.');
  }

  const image = await file.arrayBuffer();
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${Crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('recipe-images')
    .upload(path, image, { contentType: mimeType, upsert: false });
  if (error) throw error;

  return supabase.storage.from('recipe-images').getPublicUrl(path).data.publicUrl;
}
