'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected thumb-kiss error';
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

export async function getThumbKissFeed(userId: string) {
  try {
    const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_THUMBKISS_COLLECTION_ID!;
    if (!COL_ID) {
      return { success: false, error: 'Thumb-kiss collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const docs = await databases.listDocuments(DB_ID, COL_ID, [
      Query.equal('chat_id', chatId),
      Query.orderDesc('$createdAt'),
      Query.limit(100),
    ]);

    const kisses = docs.documents.map((doc) => ({
      id: String(doc.$id),
      senderId: String(doc.sender_id),
      message: String(doc.message || ''),
      emoji: String(doc.emoji || '👍'),
      createdAt: String(doc.$createdAt),
    }));

    return { success: true, kisses };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function sendThumbKiss(userId: string, message = '', emoji = '👍') {
  try {
    const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_THUMBKISS_COLLECTION_ID!;
    if (!COL_ID) {
      return { success: false, error: 'Thumb-kiss collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    await databases.createDocument(DB_ID, COL_ID, ID.unique(), {
      chat_id: chatId,
      sender_id: userId,
      message: message.trim(),
      emoji: emoji || '👍',
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
