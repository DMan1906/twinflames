'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';

type Position = {
  x: number;
  y: number;
  updatedAt: string;
};

type CountEntry = {
  sent: number;
  received: number;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected thumb-kiss error';
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function clamp01(value: number) {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

async function getPairContext(userId: string) {
  const { databases } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

  const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
  const partnerId = String(profile.partner_id || '');
  if (!partnerId) {
    throw new Error('You need a partner for thumb kiss.');
  }

  const chatId = [userId, partnerId].sort().join('_');
  return { databases, DB_ID, partnerId, chatId };
}

async function getOrCreateDailyDoc(userId: string) {
  const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_THUMBKISS_COLLECTION_ID!;
  if (!COL_ID) {
    throw new Error('Thumb-kiss collection is not configured.');
  }

  const { databases, DB_ID, chatId, partnerId } = await getPairContext(userId);
  const today = todayString();

  const existing = await databases.listDocuments(DB_ID, COL_ID, [
    Query.equal('chat_id', chatId),
    Query.equal('date', today),
    Query.limit(1),
  ]);

  if (existing.total > 0) {
    return { doc: existing.documents[0], databases, DB_ID, COL_ID, partnerId };
  }

  const counts: Record<string, CountEntry> = {
    [userId]: { sent: 0, received: 0 },
    [partnerId]: { sent: 0, received: 0 },
  };

  const created = await databases.createDocument(DB_ID, COL_ID, ID.unique(), {
    chat_id: chatId,
    date: today,
    positions_json: JSON.stringify({}),
    counts_json: JSON.stringify(counts),
    last_kiss_by: '',
    last_kiss_at: '',
  });

  return { doc: created, databases, DB_ID, COL_ID, partnerId };
}

export async function getThumbKissState(userId: string) {
  try {
    const { doc, partnerId } = await getOrCreateDailyDoc(userId);
    const positions = parseJson<Record<string, Position>>(String(doc.positions_json || '{}'), {});
    const counts = parseJson<Record<string, CountEntry>>(String(doc.counts_json || '{}'), {});

    return {
      success: true,
      state: {
        id: String(doc.$id),
        date: String(doc.date || todayString()),
        me: {
          position: positions[userId] || null,
          sent: Number(counts[userId]?.sent || 0),
          received: Number(counts[userId]?.received || 0),
        },
        partner: {
          id: partnerId,
          position: positions[partnerId] || null,
          sent: Number(counts[partnerId]?.sent || 0),
          received: Number(counts[partnerId]?.received || 0),
        },
        lastKissBy: String(doc.last_kiss_by || ''),
        lastKissAt: String(doc.last_kiss_at || ''),
      },
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateThumbPosition(userId: string, x: number, y: number) {
  try {
    const { doc, databases, DB_ID, COL_ID } = await getOrCreateDailyDoc(userId);
    const positions = parseJson<Record<string, Position>>(String(doc.positions_json || '{}'), {});

    positions[userId] = {
      x: clamp01(x),
      y: clamp01(y),
      updatedAt: new Date().toISOString(),
    };

    await databases.updateDocument(DB_ID, COL_ID, doc.$id, {
      positions_json: JSON.stringify(positions),
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function sendThumbKiss(userId: string, x: number, y: number) {
  try {
    const { doc, databases, DB_ID, COL_ID, partnerId } = await getOrCreateDailyDoc(userId);

    const positions = parseJson<Record<string, Position>>(String(doc.positions_json || '{}'), {});
    const counts = parseJson<Record<string, CountEntry>>(String(doc.counts_json || '{}'), {});

    const myCount = counts[userId] || { sent: 0, received: 0 };
    const partnerCount = counts[partnerId] || { sent: 0, received: 0 };

    counts[userId] = { sent: Number(myCount.sent || 0) + 1, received: Number(myCount.received || 0) };
    counts[partnerId] = { sent: Number(partnerCount.sent || 0), received: Number(partnerCount.received || 0) + 1 };

    positions[userId] = {
      x: clamp01(x),
      y: clamp01(y),
      updatedAt: new Date().toISOString(),
    };

    await databases.updateDocument(DB_ID, COL_ID, doc.$id, {
      positions_json: JSON.stringify(positions),
      counts_json: JSON.stringify(counts),
      last_kiss_by: userId,
      last_kiss_at: new Date().toISOString(),
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
