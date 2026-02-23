'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { decryptData, encryptData } from '@/lib/crypto';
import { getUploadUrl } from '@/lib/minio';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected memories error';
}

function sanitizeMime(mime: string | undefined) {
  if (!mime || !mime.includes('/')) return 'image/jpeg';
  return mime;
}

function extensionFromMime(mime: string) {
  const [, ext] = mime.split('/');
  return (ext || 'jpg').replace('jpeg', 'jpg');
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

async function getPairContext(userId: string) {
  const { databases } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

  const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
  const partnerId = String(profile.partner_id || '');
  if (!partnerId) {
    throw new Error('You need a partner to save shared memories.');
  }

  const chatId = [userId, partnerId].sort().join('_');
  return { databases, DB_ID, chatId };
}

export async function createMemoryImageUploadUrl(userId: string, mimeType?: string) {
  if (!userId) {
    return { success: false, error: 'User is required.' };
  }

  try {
    const mime = sanitizeMime(mimeType);
    const key = `memories/${todayString()}/${userId}/${Date.now()}.${extensionFromMime(mime)}`;
    const upload = await getUploadUrl(key, mime);

    if (!upload.success) {
      return { success: false, error: upload.error || 'Could not create upload URL.' };
    }

    return {
      success: true,
      uploadUrl: upload.url!,
      objectKey: upload.objectKey!,
      mimeType: mime,
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function saveMemory(
  userId: string,
  title: string,
  date: string,
  description: string,
  imageObjectKey?: string,
) {
  if (!title.trim() || !date || !description.trim()) {
    return { success: false, error: 'Title, date, and description are required.' };
  }

  try {
    const MEMORIES_ID = process.env.NEXT_PUBLIC_APPWRITE_MEMORIES_COLLECTION_ID!;
    if (!MEMORIES_ID) {
      return { success: false, error: 'Memories collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    await databases.createDocument(DB_ID, MEMORIES_ID, ID.unique(), {
      chat_id: chatId,
      user_id: userId,
      title: encryptData(title.trim()),
      description: encryptData(description.trim()),
      date,
      image_url: imageObjectKey || '',
      created_at: todayString(),
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getMemories(userId: string) {
  try {
    const MEMORIES_ID = process.env.NEXT_PUBLIC_APPWRITE_MEMORIES_COLLECTION_ID!;
    if (!MEMORIES_ID) {
      return { success: false, error: 'Memories collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const docs = await databases.listDocuments(DB_ID, MEMORIES_ID, [
      Query.equal('chat_id', chatId),
      Query.orderDesc('date'),
      Query.orderDesc('$createdAt'),
      Query.limit(300),
    ]);

    const memories = docs.documents.map((doc) => ({
      id: String(doc.$id),
      userId: String(doc.user_id),
      title: decryptData(String(doc.title)),
      description: decryptData(String(doc.description)),
      date: String(doc.date),
      imageUrl: String(doc.image_url || ''),
      createdAt: String(doc.$createdAt),
    }));

    return { success: true, memories };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteMemory(userId: string, memoryId: string) {
  if (!memoryId) {
    return { success: false, error: 'Memory id is required.' };
  }

  try {
    const MEMORIES_ID = process.env.NEXT_PUBLIC_APPWRITE_MEMORIES_COLLECTION_ID!;
    if (!MEMORIES_ID) {
      return { success: false, error: 'Memories collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const doc = await databases.getDocument(DB_ID, MEMORIES_ID, memoryId);

    if (String(doc.chat_id) !== chatId) {
      return { success: false, error: 'Memory does not belong to this relationship.' };
    }

    await databases.deleteDocument(DB_ID, MEMORIES_ID, memoryId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
