// services/adminRecipeService.ts
// Write access for admin/CMS use only. Firestore Security Rules must restrict
// these operations to authenticated admin users — this file does not enforce that.

import {
  collection,
  doc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebaseClient';
import type { Recipe } from '../types';
import { MOCK_RECIPES } from '../constants/mockRecipes';

const RECIPES_COLLECTION = 'recipes';

// Admins need to see drafts too, so this does NOT filter by status.
export async function getAllRecipesForAdmin(): Promise<Recipe[]> {
  const q = query(collection(db, RECIPES_COLLECTION), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Recipe));
}

export async function getRecipeForAdmin(id: string): Promise<Recipe | null> {
  const snap = await getDoc(doc(db, RECIPES_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Recipe;
}

export async function createRecipe(data: Omit<Recipe, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, RECIPES_COLLECTION), {
    ...data,
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateRecipe(id: string, data: Partial<Recipe>): Promise<void> {
  await updateDoc(doc(db, RECIPES_COLLECTION, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteRecipe(id: string): Promise<void> {
  await deleteDoc(doc(db, RECIPES_COLLECTION, id));
}

/**
 * Picks up a local image URI (from expo-image-picker) and uploads it to
 * Cloudinary via an unsigned upload preset — no server/API key needed on the
 * client, and Cloudinary's free tier is generous enough for this app's needs
 * (this project intentionally does NOT use Firebase Storage, which is billed
 * separately and isn't part of the free Spark plan).
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
 * One-time helper: copies the bundled MOCK_RECIPES into real Firestore
 * documents so they become visible/editable in the admin panel, and so the
 * user-facing app is reading live data instead of the mock fallback.
 *
 * IMPORTANT: this writes each recipe using its own MOCK_RECIPES id as the
 * Firestore document ID (via setDoc), rather than letting Firestore
 * auto-generate a new one. This keeps a single, stable id per recipe across
 * both data sources — so a favorite saved while offline/on mock data still
 * resolves to the exact same Firestore document once it's seeded, instead of
 * getRecipeById() silently falling back to the mock copy (which is what
 * caused seeded recipes to display their bundled local image in Favorites
 * but a blank image on Home/Search, since those were actually two different
 * records under two different ids).
 *
 * Running this again is safe: existing docs are left untouched (no
 * duplicates), only missing ones are created.
 *
 * Note: any recipe whose heroImageUrl is a local require() (not a plain
 * string URL) can't be carried over as-is — Firestore needs a string, not a
 * bundler asset reference. Those recipes are created with an empty photo;
 * re-add the photo afterward via the normal Edit Recipe screen.
 */
export async function seedMockRecipes(): Promise<{ created: number; skippedImages: number; alreadyExisted: number }> {
  let created = 0;
  let skippedImages = 0;
  let alreadyExisted = 0;

  for (const recipe of MOCK_RECIPES) {
    const { id, heroImageUrl, ...rest } = recipe;
    const ref = doc(db, RECIPES_COLLECTION, id);

    const existing = await getDoc(ref);
    if (existing.exists()) {
      alreadyExisted++;
      continue;
    }

    const isLocalAsset = typeof heroImageUrl !== 'string';
    if (isLocalAsset) skippedImages++;

    await setDoc(ref, {
      ...rest,
      heroImageUrl: isLocalAsset ? '' : heroImageUrl,
      updatedAt: serverTimestamp(),
    });
    created++;
  }

  return { created, skippedImages, alreadyExisted };
}