// services/adminRecipeService.ts
// Write access for admin/CMS use. These calls only succeed for users whose
// profile role is 'admin' — that is enforced by Row Level Security in the
// database, not by this file.

import { supabase } from '../lib/supabase';
import { toRecipe, fromRecipe, type RichRecipe } from '../lib/recipeMapper';
import type { Recipe } from '../types';
import { MOCK_RECIPES } from '../constants/mockRecipes';

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

/**
 * Picks up a local image URI (from expo-image-picker) and uploads it to
 * Cloudinary via an unsigned upload preset — no server/API key needed on the
 * client, and Cloudinary's free tier is generous enough for this app's needs
 * (this project doesn't use a separate storage service for images).
 *
 * NOTE: this deliberately uses XMLHttpRequest instead of fetch(). React
 * Native's FormData accepts a special { uri, type, name } object to describe
 * a local file part, but on some RN/Expo versions global fetch() is backed
 * by a spec-compliant polyfill that doesn't understand that shape and throws
 * "Unsupported FormDataPart implementation". XMLHttpRequest still goes
 * through RN's native networking module, which handles it correctly.
 */
export async function uploadRecipeImage(localUri: string): Promise<string> {
  const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary is not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET in .env.'
    );
  }

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    type: 'image/jpeg',
    name: `recipe-${Date.now()}.jpg`,
  } as any);
  formData.append('upload_preset', uploadPreset);

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data.secure_url as string);
        } catch (err) {
          reject(new Error('Cloudinary upload succeeded but returned an unexpected response.'));
        }
      } else {
        reject(new Error(`Cloudinary upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error('Cloudinary upload failed: network error.'));
    xhr.send(formData);
  });
}

/**
 * One-time helper: copies the bundled MOCK_RECIPES into real database rows so
 * they become visible/editable in the admin panel, and so the user-facing app
 * is reading live data instead of the mock fallback.
 *
 * Each recipe keeps its own MOCK_RECIPES id as its row id, so there is a single
 * stable id per recipe across both data sources — a favorite saved while
 * offline/on mock data still resolves to the exact same row once it's seeded.
 *
 * Running this again is safe: existing rows are left untouched (no
 * duplicates), only missing ones are created.
 *
 * Note: any recipe whose heroImageUrl is a local require() (not a plain
 * string URL) can't be carried over as-is — the database needs a string, not a
 * bundler asset reference. Those recipes are created with an empty photo;
 * re-add the photo afterward via the normal Edit Recipe screen.
 */
export async function seedMockRecipes(): Promise<{ created: number; skippedImages: number; alreadyExisted: number }> {
  const ids = MOCK_RECIPES.map((r) => r.id);
  const { data: existing, error: existingError } = await supabase
    .from('recipes')
    .select('id')
    .in('id', ids);
  if (existingError) throw existingError;

  const existingIds = new Set((existing ?? []).map((r: { id: string }) => r.id));
  let skippedImages = 0;

  const rows = MOCK_RECIPES.filter((r) => !existingIds.has(r.id)).map((recipe) => {
    const isLocalAsset = typeof recipe.heroImageUrl !== 'string';
    if (isLocalAsset) skippedImages++;
    return {
      ...fromRecipe({ ...recipe, heroImageUrl: isLocalAsset ? '' : recipe.heroImageUrl }),
      id: recipe.id,
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase.from('recipes').insert(rows);
    if (error) throw error;
  }

  return { created: rows.length, skippedImages, alreadyExisted: existingIds.size };
}
