// services/recipeNotifications.ts
import { getAllUsers, sendNotificationToUsers } from './feedbackService';

/** Sends a "new recipe" notification to every regular user. Returns how many were notified. */
export async function notifyAllUsersNewRecipe(recipeTitle: string): Promise<number> {
  const users = await getAllUsers();
  const uids = users.filter((u) => u.role !== 'admin').map((u) => u.uid);
  await sendNotificationToUsers(
    uids,
    'New recipe added',
    `"${recipeTitle}" is now in Pinoy Recipes. Check it out on the Home tab.`
  );
  return uids.length;
}