// scripts/migrate-firestore-to-supabase.mjs
//
// ONE-TIME data copy: Firebase (Auth users + Firestore) -> Supabase.
// Run it on your own computer. It only READS from Firebase.
//
// Setup:
//   1. Firebase Console -> Project settings -> Service accounts -> Generate new
//      private key. Save as  scripts/serviceAccountKey.json  (never commit it).
//   2. In a terminal at the project root:
//        npm install --no-save firebase-admin
//        SUPABASE_URL=https://YOUR-ID.supabase.co \
//        SUPABASE_SECRET_KEY=sb_secret_... \
//        node scripts/migrate-firestore-to-supabase.mjs
//      (On Windows PowerShell set the two variables first with $env:NAME="value".)
//   The SECRET key is only for this script. Never put it in .env or the app.
//
// What it does:
//   - creates each Firebase user in Supabase Auth (same email, email marked
//     confirmed). Passwords can't be copied, so everyone signs in once with
//     "Forgot password" to set a new one.
//   - copies users -> profiles (role, favorites, cooked count), recipes,
//     feedback, notifications, keeping recipe ids and rewriting user ids.
// Safe to re-run: existing rows are updated, not duplicated.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY first (see the comments at the top).');
  process.exit(1);
}

const keyPath = new URL('./serviceAccountKey.json', import.meta.url);
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
const fs = admin.firestore();
const sb = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const iso = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate().toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const must = ({ error }, what) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};
const insertInChunks = async (table, rows, onConflict) => {
  for (let i = 0; i < rows.length; i += 200) {
    must(await sb.from(table).upsert(rows.slice(i, i + 200), { onConflict }), `upsert ${table}`);
  }
};

// --- 1. Users: Firebase uid -> Supabase uuid (matched by email) ---------------
const existing = new Map();
for (let page = 1; ; page++) {
  const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  data.users.forEach((u) => existing.set((u.email ?? '').toLowerCase(), u.id));
  if (data.users.length < 1000) break;
}

const uidMap = new Map(); // firebase uid -> supabase uuid
let next;
let createdUsers = 0;
do {
  const page = await admin.auth().listUsers(1000, next);
  for (const u of page.users) {
    const email = (u.email ?? '').toLowerCase();
    if (!email) continue;
    let id = existing.get(email);
    if (!id) {
      const { data, error } = await sb.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: u.displayName ? { display_name: u.displayName } : {},
      });
      if (error) {
        console.warn(`skip user ${email}: ${error.message}`);
        continue;
      }
      id = data.user.id;
      createdUsers++;
    }
    uidMap.set(u.uid, id);
  }
  next = page.pageToken;
} while (next);
console.log(`Users: ${uidMap.size} mapped (${createdUsers} newly created)`);

// --- 2. users -> profiles ---------------------------------------------------
const userDocs = await fs.collection('users').get();
const profiles = [];
for (const d of userDocs.docs) {
  const id = uidMap.get(d.id);
  if (!id) continue;
  const x = d.data();
  profiles.push({
    id,
    email: x.email ?? null,
    display_name: x.displayName ?? null,
    role: x.role === 'admin' ? 'admin' : 'user',
    favorite_recipe_ids: x.favoriteRecipeIds ?? [],
    cooked_recipe_count: Number.isFinite(x.cookedRecipeCount) ? x.cookedRecipeCount : 0,
    created_at: iso(x.createdAt) ?? new Date().toISOString(),
  });
}
await insertInChunks('profiles', profiles, 'id');
console.log(`Profiles: ${profiles.length}`);

// --- 3. recipes (ids preserved) ---------------------------------------------
const recipeDocs = await fs.collection('recipes').get();
const recipes = recipeDocs.docs.map((d) => {
  const x = d.data();
  return {
    id: d.id,
    title: x.title ?? '(untitled)',
    slug: x.slug ?? null,
    description: x.description ?? null,
    hero_image_url: typeof x.heroImageUrl === 'string' ? x.heroImageUrl : '',
    video_loop_url: x.videoLoopUrl ?? null,
    region: x.region ?? null,
    meal_types: x.mealTypes ?? [],
    dietary_tags: x.dietaryTags ?? [],
    source_tags: x.sourceTags ?? [],
    prep_time_minutes: x.prepTimeMinutes ?? null,
    cook_time_minutes: x.cookTimeMinutes ?? null,
    base_servings: x.baseServings ?? null,
    difficulty: x.difficulty ?? null,
    ingredients: x.ingredients ?? [],
    steps: x.steps ?? [],
    key_ingredient_names: x.keyIngredientNames ?? [],
    is_featured: !!x.isFeatured,
    is_trending: !!x.isTrending,
    created_by_admin_id: uidMap.get(x.createdByAdminId) ?? x.createdByAdminId ?? null,
    status: ['draft', 'published', 'archived'].includes(x.status) ? x.status : 'draft',
    published_at: iso(x.publishedAt),
    created_at: iso(x.createdAt) ?? iso(x.updatedAt) ?? new Date().toISOString(),
    updated_at: iso(x.updatedAt) ?? new Date().toISOString(),
    food_type: x.foodType ?? null,
    pronunciation: x.pronunciation ?? null,
  };
});
await insertInChunks('recipes', recipes, 'id');
console.log(`Recipes: ${recipes.length}`);

// --- 4. feedback (new uuids, remembered so notifications can link to them) --
const fbIdMap = new Map();
const feedbackDocs = await fs.collection('feedback').get();
const feedbackRows = [];
for (const d of feedbackDocs.docs) {
  const x = d.data();
  const userId = uidMap.get(x.userId);
  if (!userId) continue;
  const id = crypto.randomUUID();
  fbIdMap.set(d.id, id);
  feedbackRows.push({
    id,
    user_id: userId,
    user_email: x.userEmail ?? null,
    user_name: x.userName ?? null,
    category: x.category ?? 'other',
    message: x.message ?? '',
    status: x.status ?? 'new',
    admin_reply: x.adminReply ?? null,
    replied_at: iso(x.repliedAt),
    created_at: iso(x.createdAt) ?? new Date().toISOString(),
  });
}
await insertInChunks('feedback', feedbackRows, 'id');
console.log(`Feedback: ${feedbackRows.length}`);

// --- 5. notifications -------------------------------------------------------
const noteDocs = await fs.collection('notifications').get();
const notes = [];
for (const d of noteDocs.docs) {
  const x = d.data();
  const userId = uidMap.get(x.userId);
  if (!userId) continue;
  notes.push({
    id: crypto.randomUUID(),
    user_id: userId,
    title: x.title ?? '',
    body: x.body ?? '',
    feedback_id: fbIdMap.get(x.feedbackId) ?? null,
    read: !!x.read,
    created_at: iso(x.createdAt) ?? new Date().toISOString(),
  });
}
await insertInChunks('notifications', notes, 'id');
console.log(`Notifications: ${notes.length}`);
console.log('Done.');
