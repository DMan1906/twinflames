'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';

async function getPairContext(userId: string) {
  const { databases } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

  const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
  const partnerId = String(profile.partner_id || '');
  if (!partnerId) {
    throw new Error('You need a partner for canvas.');
  }

  const chatId = [userId, partnerId].sort().join('_');
  return { databases, DB_ID, partnerId, chatId };
}

export async function loadCanvasHistory(userId: string) {
  try {
    const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_CANVAS_COLLECTION_ID!;
    if (!COL_ID) {
      return { success: false, error: 'Canvas collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const docs = await databases.listDocuments(DB_ID, COL_ID, [
      Query.equal('chat_id', chatId),
      Query.limit(100),
    ]);

    return {
      success: true,
      strokes: docs.documents.map((doc) => ({
        id: String(doc.$id),
        points: JSON.parse(String(doc.points || '[]')),
        color: String(doc.color || '#a855f7'),
        width: Number(doc.width || 5),
      })),
    };
  } catch (error: unknown) {
    console.error('Failed to load canvas history:', error);
    return { success: false, error: 'Could not load canvas.' };
  }
}

export async function saveCanvasStroke(userId: string, points: Array<{ x: number; y: number }>, color: string, width: number) {
  try {
    const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_CANVAS_COLLECTION_ID!;
    if (!COL_ID) {
      return { success: false, error: 'Canvas collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    await databases.createDocument(DB_ID, COL_ID, ID.unique(), {
      chat_id: chatId,
      sender_id: userId,
      points: JSON.stringify(points),
      color: color,
      width: width,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to save canvas stroke:', error);
    return { success: false, error: 'Could not save stroke.' };
  }
}
