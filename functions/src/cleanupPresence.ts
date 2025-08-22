import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getDatabase } from 'firebase-admin/database';
import { initializeApp, getApps } from 'firebase-admin/app';

if (!getApps().length) {
  initializeApp();
}

const rtdb = getDatabase();

export const cleanupPresence = onSchedule('every 2 minutes', async () => {
  const cutoff = Date.now() - 120000; // 2 minutes
  const presenceRef = rtdb.ref('presence');
  const snapshot = await presenceRef.get();

  if (!snapshot.exists()) {
    return;
  }

  const updates: Record<string, null> = {};

  snapshot.forEach(noteSnap => {
    noteSnap.forEach(userSnap => {
      const data = userSnap.val();
      const updatedAt = data.updatedAt;
      const time = typeof updatedAt === 'number' ? updatedAt : new Date(updatedAt).getTime();
      if (time < cutoff) {
        updates[`${noteSnap.key}/${userSnap.key}`] = null;
      }
    });
  });

  if (Object.keys(updates).length > 0) {
    await presenceRef.update(updates);
  }
});
