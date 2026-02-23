'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { decryptData, encryptData } from '@/lib/crypto';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
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
    throw new Error('You need to pair with a partner first.');
  }

  const chatId = [userId, partnerId].sort().join('_');
  return { databases, DB_ID, chatId };
}

export async function addBucketItem(userId: string, title: string, description = '') {
  if (!title.trim()) {
    return { success: false, error: 'Bucket list item text is required.' };
  }

  try {
    const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_LIST_COLLECTION_ID!;
    if (!BUCKET_ID) {
      return { success: false, error: 'Bucket list collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    await databases.createDocument(DB_ID, BUCKET_ID, ID.unique(), {
      chat_id: chatId,
      created_by: userId,
      title: title.trim(),
      description: description.trim() ? encryptData(description.trim()) : '',
      completed: false,
      completed_at: '',
      priority: 'medium',
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getBucketItems(userId: string) {
  try {
    const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_LIST_COLLECTION_ID!;
    if (!BUCKET_ID) {
      return { success: false, error: 'Bucket list collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    const result = await databases.listDocuments(DB_ID, BUCKET_ID, [
      Query.equal('chat_id', chatId),
      Query.orderDesc('$createdAt'),
      Query.limit(300),
    ]);

    const items = result.documents.map((doc) => ({
      id: doc.$id,
      createdBy: String(doc.created_by),
      title: String(doc.title),
      description: doc.description ? decryptData(String(doc.description)) : '',
      completed: Boolean(doc.completed),
      completedAt: String(doc.completed_at || ''),
      priority: String(doc.priority || 'medium'),
      createdAt: String(doc.$createdAt),
    }));

    return {
      success: true,
      items,
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function setBucketItemCompleted(userId: string, itemId: string, completed: boolean) {
  if (!itemId) return { success: false, error: 'Item id is required.' };

  try {
    const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_LIST_COLLECTION_ID!;
    if (!BUCKET_ID) {
      return { success: false, error: 'Bucket list collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const item = await databases.getDocument(DB_ID, BUCKET_ID, itemId);

    if (String(item.chat_id) !== chatId) {
      return { success: false, error: 'Item does not belong to this relationship.' };
    }

    await databases.updateDocument(DB_ID, BUCKET_ID, itemId, {
      completed: completed,
      completed_at: completed ? todayString() : '',
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteBucketItem(userId: string, itemId: string) {
  if (!itemId) return { success: false, error: 'Item id is required.' };

  try {
    const BUCKET_ID = process.env.NEXT_PUBLIC_APPWRITE_BUCKET_LIST_COLLECTION_ID!;
    if (!BUCKET_ID) {
      return { success: false, error: 'Bucket list collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const item = await databases.getDocument(DB_ID, BUCKET_ID, itemId);

    if (String(item.chat_id) !== chatId) {
      return { success: false, error: 'Item does not belong to this relationship.' };
    }

    await databases.deleteDocument(DB_ID, BUCKET_ID, itemId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
