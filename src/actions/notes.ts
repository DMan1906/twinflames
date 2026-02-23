'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { decryptData, encryptData } from '@/lib/crypto';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

async function getPairContext(userId: string) {
  const { databases } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

  const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
  const partnerId = String(profile.partner_id || '');
  if (!partnerId) {
    throw new Error('You need to pair with a partner first.');
  }

  const chatId = [userId, partnerId].sort().join('_');
  return { DB_ID, partnerId, chatId, databases };
}

export async function sendNote(userId: string, content: string) {
  if (!userId || !content.trim()) {
    return { success: false, error: 'Message content is required.' };
  }

  try {
    const NOTES_ID = process.env.NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID!;
    if (!NOTES_ID) {
      return { success: false, error: 'Notes collection is not configured.' };
    }

    const { databases, DB_ID, partnerId, chatId } = await getPairContext(userId);

    await databases.createDocument(DB_ID, NOTES_ID, ID.unique(), {
      chat_id: chatId,
      sender_id: userId,
      receiver_id: partnerId,
      content: encryptData(content.trim()),
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getNotes(userId: string) {
  try {
    const NOTES_ID = process.env.NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID!;
    if (!NOTES_ID) {
      return { success: false, error: 'Notes collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    const result = await databases.listDocuments(DB_ID, NOTES_ID, [
      Query.equal('chat_id', chatId),
      Query.orderDesc('$createdAt'),
      Query.limit(200),
    ]);

    const notes = result.documents.map((doc) => ({
      id: doc.$id,
      senderId: String(doc.sender_id),
      receiverId: String(doc.receiver_id),
      content: decryptData(String(doc.content)),
      createdAt: String(doc.$createdAt),
    }));

    return { success: true, notes };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
