import { doc, increment, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebaseClient';

export async function recordCookedRecipe(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('You must be signed in to save cooking progress.');
  }

  await setDoc(
    doc(db, 'users', user.uid),
    { cookedRecipeCount: increment(1) },
    { merge: true }
  );
}
