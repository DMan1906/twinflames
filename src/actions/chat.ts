// src/actions/chat.ts
'use server';

import { ID } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { decryptData, encryptData } from '@/lib/crypto';

// Helper to reliably generate the same chat ID for a couple
function generateChatId(userA: string, userB: string) {
  return [userA, userB].sort().join('_');
}

export async function sendMessage(
  senderId: string, 
  receiverId: string, 
  rawContent: string, 
  type: 'text' | 'image' | 'view_once' = 'text'
) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const MSG_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;

    const encryptedContent = encryptData(rawContent);
    const chatId = generateChatId(senderId, receiverId);

    // Save the document using the new chat_id structure
    await databases.createDocument(DB_ID, MSG_ID, ID.unique(), {
      chat_id: chatId,
      sender_id: senderId,
      content: encryptedContent,
      message_type: type,
      view_count: 0,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Save failed:', error);
    return { success: false, error: error.message };
  }
}
/**
 * Decrypts a payload received by the client via WebSocket.
 */
export async function decryptMessagePayload(encryptedContent: string) {
  try {
    const plaintext = decryptData(encryptedContent);
    return { success: true, plaintext };
  } catch (error) {
    return { success: false, error: 'Decryption failed' };
  }
}

// src/actions/chat.ts

/**
 * Marks a message as viewed in the database without deleting it.
 * This preserves the encrypted record for compliance.
 */
export async function markMessageAsViewed(messageId: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const MSG_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;

    await databases.updateDocument(DB_ID, MSG_ID, messageId, {
      view_count: 1 // Locks the message from being viewed again
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Failed to update message:', error);
    return { success: false, error: error.message };
  }
}