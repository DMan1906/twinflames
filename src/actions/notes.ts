'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { decryptData, encryptData } from '@/lib/crypto';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

export async function createNote(
  userId: string,
  title: string,
  content: string,
  color: string = '#FFFFFF',
  pinned: boolean = false
) {
  if (!userId || !title.trim() || !content.trim()) {
    return { success: false, error: 'Title and content are required.' };
  }

  try {
    const NOTES_ID = process.env.NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID!;
    if (!NOTES_ID) {
      return { success: false, error: 'Notes collection is not configured.' };
    }

    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

    await databases.createDocument(DB_ID, NOTES_ID, ID.unique(), {
      user_id: userId,
      title: title.trim(),
      content: encryptData(content.trim()),
      color: color,
      pinned: pinned,
    });

    return { success: true, message: 'Note created successfully.' };
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

    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

    const result = await databases.listDocuments(DB_ID, NOTES_ID, [
      Query.equal('user_id', userId),
      Query.orderDesc('$createdAt'),
      Query.limit(200),
    ]);

    const notes = result.documents.map((doc) => ({
      id: doc.$id,
      userId: String(doc.user_id),
      title: String(doc.title),
      content: decryptData(String(doc.content)),
      color: String(doc.color || '#FFFFFF'),
      pinned: Boolean(doc.pinned || false),
      createdAt: String(doc.$createdAt),
    }));

    return { success: true, notes };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function updateNote(
  userId: string,
  noteId: string,
  title?: string,
  content?: string,
  color?: string,
  pinned?: boolean
) {
  try {
    const NOTES_ID = process.env.NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID!;
    if (!NOTES_ID) {
      return { success: false, error: 'Notes collection is not configured.' };
    }

    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

    // Verify ownership
    const doc = await databases.getDocument(DB_ID, NOTES_ID, noteId);
    if (String(doc.user_id) !== userId) {
      return { success: false, error: 'Cannot update another user\'s note.' };
    }

    const updateData: Record<string, any> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = encryptData(content.trim());
    if (color !== undefined) updateData.color = color;
    if (pinned !== undefined) updateData.pinned = pinned;

    await databases.updateDocument(DB_ID, NOTES_ID, noteId, updateData);
    return { success: true, message: 'Note updated successfully.' };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteNote(userId: string, noteId: string) {
  try {
    const NOTES_ID = process.env.NEXT_PUBLIC_APPWRITE_NOTES_COLLECTION_ID!;
    if (!NOTES_ID) {
      return { success: false, error: 'Notes collection is not configured.' };
    }

    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

    // Verify ownership
    const doc = await databases.getDocument(DB_ID, NOTES_ID, noteId);
    if (String(doc.user_id) !== userId) {
      return { success: false, error: 'Cannot delete another user\'s note.' };
    }

    await databases.deleteDocument(DB_ID, NOTES_ID, noteId);
    return { success: true, message: 'Note deleted successfully.' };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

// Export sendNote for backwards compatibility
export async function sendNote(userId: string, content: string) {
  // Legacy function - redirects to createNote with generic title
  const now = new Date();
  const timestamp = now.toLocaleString();
  return createNote(userId, `Note from ${timestamp}`, content);
}
