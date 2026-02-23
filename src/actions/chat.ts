// src/actions/chat.ts
'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { decryptData, encryptData } from '@/lib/crypto';

export type ChatDeliveryMode = 'keep' | 'view_once' | 'replay';
export type ChatDeletePeriod = 'never' | 'immediate' | '10m' | '1h' | '1d';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected chat error';
}

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function getAllowedViews(mode: ChatDeliveryMode) {
  if (mode === 'view_once') return 1;
  if (mode === 'replay') return 2;
  return 0;
}

function deletePeriodToMs(period: ChatDeletePeriod) {
  if (period === 'immediate') return 0;
  if (period === '10m') return 10 * 60 * 1000;
  if (period === '1h') return 60 * 60 * 1000;
  if (period === '1d') return 24 * 60 * 60 * 1000;
  return null;
}

// Helper to reliably generate the same chat ID for a couple
function generateChatId(userA: string, userB: string) {
  return [userA, userB].sort().join('_');
}

export async function loadChatHistory(userId: string, chatId: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const MSG_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;

    if (!MSG_ID) {
      return { success: false, error: 'Messages collection not configured' };
    }

    const result = await databases.listDocuments(DB_ID, MSG_ID, [
      Query.equal('chat_id', chatId),
      Query.orderAsc('$createdAt'),
      Query.limit(150),
    ]);

    const messages = await Promise.all(
      result.documents.map(async (doc) => {
        const decrypted = await decryptMessagePayload(String(doc.content));
        return {
          $id: String(doc.$id),
          sender_id: String(doc.sender_id || ''),
          content: decrypted.success ? decrypted.plaintext! : '[Encrypted Message]',
          message_type: String(doc.message_type || 'text') as 'text' | 'image' | 'video',
          delivery_mode: (String(doc.delivery_mode || 'keep') as ChatDeliveryMode),
          delete_period: (String(doc.delete_period || 'never') as ChatDeletePeriod),
          expires_at: String(doc.expires_at || ''),
          seen_by_json: String(doc.seen_by_json || '[]'),
        };
      })
    );

    return { success: true, messages };
  } catch (error: unknown) {
    console.error('Failed to load chat history:', error);
    return { success: false, error: getErrorMessage(error), messages: [] };
  }
}

export async function getChatDeletePeriod(userId: string, partnerId: string) {
  try {
    const SETTINGS_ID = process.env.NEXT_PUBLIC_APPWRITE_CHAT_SETTINGS_COLLECTION_ID!;
    if (!SETTINGS_ID) {
      return { success: true, period: 'never' as ChatDeletePeriod };
    }

    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const chatId = generateChatId(userId, partnerId);

    const settings = await databases.listDocuments(DB_ID, SETTINGS_ID, [
      Query.equal('chat_id', chatId),
      Query.limit(1),
    ]);

    if (settings.total === 0) {
      return { success: true, period: 'never' as ChatDeletePeriod };
    }

    return { success: true, period: String(settings.documents[0].delete_period || 'never') as ChatDeletePeriod };
  } catch {
    return { success: true, period: 'never' as ChatDeletePeriod };
  }
}

export async function setChatDeletePeriod(userId: string, partnerId: string, period: ChatDeletePeriod) {
  try {
    const SETTINGS_ID = process.env.NEXT_PUBLIC_APPWRITE_CHAT_SETTINGS_COLLECTION_ID!;
    if (!SETTINGS_ID) {
      return { success: false, error: 'Chat settings collection is not configured.' };
    }

    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const chatId = generateChatId(userId, partnerId);

    const settings = await databases.listDocuments(DB_ID, SETTINGS_ID, [
      Query.equal('chat_id', chatId),
      Query.limit(1),
    ]);

    if (settings.total === 0) {
      await databases.createDocument(DB_ID, SETTINGS_ID, ID.unique(), {
        chat_id: chatId,
        delete_period: period,
      });
    } else {
      await databases.updateDocument(DB_ID, SETTINGS_ID, settings.documents[0].$id, {
        delete_period: period,
      });
    }

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function sendMessage(
  senderId: string, 
  receiverId: string, 
  rawContent: string, 
  type: 'text' | 'image' | 'video' = 'text',
  deliveryMode: ChatDeliveryMode = 'keep',
  deletePeriod?: ChatDeletePeriod,
) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const MSG_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;

    const encryptedContent = encryptData(rawContent);
    const chatId = generateChatId(senderId, receiverId);
    const period = deletePeriod || (await getChatDeletePeriod(senderId, receiverId)).period;
    const allowedViews = getAllowedViews(deliveryMode);

    // Save the document using the new chat_id structure
    await databases.createDocument(DB_ID, MSG_ID, ID.unique(), {
      chat_id: chatId,
      sender_id: senderId,
      content: encryptedContent,
      message_type: type,
      delivery_mode: deliveryMode,
      allowed_views: allowedViews,
      view_count: 0,
      opened_by_json: JSON.stringify({}),
      seen_by_json: JSON.stringify([senderId]),
      delete_period: period,
      expires_at: '',
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('Save failed:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
/**
 * Decrypts a payload received by the client via WebSocket.
 */
export async function decryptMessagePayload(encryptedContent: string) {
  try {
    const plaintext = decryptData(encryptedContent);
    return { success: true, plaintext };
  } catch {
    return { success: false, error: 'Decryption failed' };
  }
}

/**
 * Marks a message as seen in chat.
 * If both partners have seen it and period != never, sets expires_at.
 */
export async function markMessageSeen(messageId: string, userId: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const MSG_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;
    const message = await databases.getDocument(DB_ID, MSG_ID, messageId);

    const seenBy = new Set(parseJson<string[]>(String(message.seen_by_json || '[]'), []));
    seenBy.add(userId);

    const senderId = String(message.sender_id);
    const partnerSeen = Array.from(seenBy).some((id) => id !== senderId);
    const bothSeen = seenBy.has(senderId) && partnerSeen;

    const period = String(message.delete_period || 'never') as ChatDeletePeriod;
    const alreadyHasExpiry = !!String(message.expires_at || '');
    const ttlMs = deletePeriodToMs(period);

    let expiresAt = String(message.expires_at || '');
    if (bothSeen && !alreadyHasExpiry && ttlMs !== null) {
      expiresAt = new Date(Date.now() + ttlMs).toISOString();
    }

    await databases.updateDocument(DB_ID, MSG_ID, messageId, {
      seen_by_json: JSON.stringify(Array.from(seenBy)),
      expires_at: expiresAt,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error('Failed to mark seen:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Consumes one open for ephemeral messages (view_once / replay).
 */
export async function consumeMessageView(messageId: string, userId: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const MSG_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;
    const message = await databases.getDocument(DB_ID, MSG_ID, messageId);

    const mode = String(message.delivery_mode || 'keep') as ChatDeliveryMode;
    const allowedViews = Number(message.allowed_views || 0);

    if (mode === 'keep' || allowedViews <= 0) {
      return { success: true, remainingViews: Infinity };
    }

    const senderId = String(message.sender_id);
    if (userId === senderId) {
      return { success: true, remainingViews: allowedViews };
    }

    const openedBy = parseJson<Record<string, number>>(String(message.opened_by_json || '{}'), {});
    const userOpened = Number(openedBy[userId] || 0);

    if (userOpened >= allowedViews) {
      return { success: false, error: 'No remaining views.', remainingViews: 0 };
    }

    const nextOpened = userOpened + 1;
    openedBy[userId] = nextOpened;

    await databases.updateDocument(DB_ID, MSG_ID, messageId, {
      opened_by_json: JSON.stringify(openedBy),
      view_count: Number(message.view_count || 0) + 1,
    });

    return { success: true, remainingViews: Math.max(allowedViews - nextOpened, 0) };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getMessageRemainingViews(messageId: string, userId: string) {
  try {
    const { databases } = await createAdminClient();
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const MSG_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;
    const message = await databases.getDocument(DB_ID, MSG_ID, messageId);

    const mode = String(message.delivery_mode || 'keep') as ChatDeliveryMode;
    const allowedViews = Number(message.allowed_views || 0);
    if (mode === 'keep' || allowedViews <= 0 || userId === String(message.sender_id)) {
      return { success: true, remainingViews: Infinity };
    }

    const openedBy = parseJson<Record<string, number>>(String(message.opened_by_json || '{}'), {});
    const used = Number(openedBy[userId] || 0);
    return { success: true, remainingViews: Math.max(allowedViews - used, 0) };
  } catch {
    return { success: true, remainingViews: 0 };
  }
}