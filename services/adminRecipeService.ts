// services/adminRecipeService.ts
// Write access for admin/CMS use. These calls only succeed for users whose
// profile role is 'admin' — that is enforced by Row Level Security in the
// database, not by this file.

import { supabase } from '../lib/supabase';
import { toRecipe, fromRecipe, type RichRecipe } from '../lib/recipeMapper';
import type { Recipe } from '../types';
import * as Crypto from 'expo-crypto';

// Admins need to see drafts too, so this does NOT filter by status.
export async function getAllRecipesForAdmin(): Promise<Recipe[]> {
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
  const { data: session } = await supabase.auth.getSession();
  const row = fromRecipe(data);
  if (row.created_by_admin_id === undefined && session.session) {
    row.created_by_admin_id = session.session.user.id;
  }
  const { data: created, error } = await supabase.from('recipes').insert(row).select('id').single();
  if (error) throw error;
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
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error(`Could not read the selected photo (${response.status}).`);
  }

  const image = await response.arrayBuffer();
  const mimeType =
    selectedMimeType ?? response.headers.get('content-type')?.split(';')[0] ?? 'image/jpeg';
  if (!mimeType.startsWith('image/')) {
    throw new Error('The selected file is not an image.');
  }

  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${Crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('recipe-images')
    .upload(path, image, { contentType: mimeType, upsert: false });
  if (error) throw error;

  return supabase.storage.from('recipe-images').getPublicUrl(path).data.publicUrl;
}
