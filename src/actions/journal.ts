// src/actions/journal.ts
'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { encryptData, decryptData } from '@/lib/crypto';

export async function submitEntry(chatId: string, userId: string, prompt: string, text: string) {
  const { databases } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID!;

  const encrypted = encryptData(text);

  await databases.createDocument(DB_ID, COL_ID, ID.unique(), {
    chat_id: chatId,
    user_id: userId,
    prompt,
    content: encrypted,
    is_revealed: false
  });

  // Check if partner has also answered today's prompt
  const others = await databases.listDocuments(DB_ID, COL_ID, [
    Query.equal('chat_id', chatId),
    Query.equal('prompt', prompt),
    Query.notEqual('user_id', userId)
  ]);

  if (others.total > 0) {
    // Both have answered! Reveal both documents.
    // (You would loop through and update is_revealed to true)
    return { success: true, revealed: true };
  }

  return { success: true, revealed: false };
}
/**
 * Fetches all revealed journal entries for the current couple.
 */
export async function getVaultEntries(chatId: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const COL_ID = process.env.NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID!;

    const result = await databases.listDocuments(DB_ID, COL_ID, [
      Query.equal('chat_id', chatId),
      Query.equal('is_revealed', true),
      Query.orderDesc('$createdAt')
    ]);

    // Decrypt all entries before sending to the client
    const decryptedEntries = result.documents.map((doc) => ({
      id: doc.$id,
      userId: doc.user_id,
      prompt: doc.prompt,
      content: decryptData(doc.content),
      date: doc.$createdAt
    }));

    return { success: true, entries: decryptedEntries };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}