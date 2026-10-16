// hooks/useMyNotifications.ts
import { useEffect, useState } from 'react';
import { subscribeToMyNotifications, type AppNotification } from '../services/feedbackService';

export function useMyNotifications(uid: string | null | undefined) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    return subscribeToMyNotifications(uid, (list) => {
      setItems(list);
      setLoading(false);
    });
  }, [uid]);

  return { items, loading, unreadCount: items.filter((n) => !n.read).length };
}