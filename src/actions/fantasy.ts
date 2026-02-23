'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { generateText } from '@/actions/ai';
import { decryptData, encryptData } from '@/lib/crypto';

type SwipeChoice = 'left' | 'right';

type FantasyCard = {
  id: string;
  text: string;
  isMatched: boolean;
  createdAt: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected fantasy error';
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

async function getPairContext(userId: string) {
  const { databases } = await createAdminClient();
  const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

  const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
  const partnerId = String(profile.partner_id || '');
  if (!partnerId) {
    throw new Error('You need a partner to use fantasy matcher.');
  }

  const chatId = [userId, partnerId].sort().join('_');
  return { databases, DB_ID, partnerId, chatId };
}

async function generateFantasyBatch(count = 10) {
  const prompt = `
Generate ${count} short adult, playful, consensual fantasy prompts for a committed couple.
Rules:
- Keep each under 18 words.
- Include a mix of romantic, teasing, and spicy ideas.
- No coercion, no violence, no non-consensual content.
- Return strict JSON array of strings, no markdown, no commentary.
`;

  const result = await generateText(prompt);
  if (!result.success || !result.plaintext) {
    return [] as string[];
  }

  const parsed = parseJson<string[]>(result.plaintext, []);
  return parsed
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, count);
}

export async function ensureFantasyBuffer(userId: string) {
  try {
    const FANTASY_ID = process.env.NEXT_PUBLIC_APPWRITE_FANTASY_COLLECTION_ID!;
    if (!FANTASY_ID) {
      return { success: false, error: 'Fantasy collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    const docs = await databases.listDocuments(DB_ID, FANTASY_ID, [
      Query.equal('chat_id', chatId),
      Query.equal('is_archived', false),
      Query.orderAsc('$createdAt'),
      Query.limit(500),
    ]);

    const remainingForUser = docs.documents.filter((doc) => {
      const votes = parseJson<Record<string, SwipeChoice>>(String(doc.votes_json || '{}'), {});
      return !votes[userId];
    }).length;

    if (remainingForUser > 3) {
      return { success: true, generated: 0 };
    }

    const generated = await generateFantasyBatch(10);
    if (generated.length === 0) {
      return { success: true, generated: 0 };
    }

    await Promise.all(
      generated.map((text) =>
        databases.createDocument(DB_ID, FANTASY_ID, ID.unique(), {
          chat_id: chatId,
          text: encryptData(text),
          votes_json: JSON.stringify({}),
          is_matched: false,
          is_archived: false,
          created_at: todayString(),
        })
      )
    );

    return { success: true, generated: generated.length };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getFantasyQueue(userId: string) {
  try {
    const FANTASY_ID = process.env.NEXT_PUBLIC_APPWRITE_FANTASY_COLLECTION_ID!;
    if (!FANTASY_ID) {
      return { success: false, error: 'Fantasy collection is not configured.' };
    }

    const refill = await ensureFantasyBuffer(userId);
    if (!refill.success) {
      return refill;
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);

    const docs = await databases.listDocuments(DB_ID, FANTASY_ID, [
      Query.equal('chat_id', chatId),
      Query.equal('is_archived', false),
      Query.orderAsc('$createdAt'),
      Query.limit(500),
    ]);

    const queue: FantasyCard[] = [];
    for (const doc of docs.documents) {
      const votes = parseJson<Record<string, SwipeChoice>>(String(doc.votes_json || '{}'), {});
      if (votes[userId]) continue;

      queue.push({
        id: String(doc.$id),
        text: decryptData(String(doc.text)),
        isMatched: Boolean(doc.is_matched),
        createdAt: String(doc.$createdAt),
      });

      if (queue.length >= 10) break;
    }

    const matchedDocs = await databases.listDocuments(DB_ID, FANTASY_ID, [
      Query.equal('chat_id', chatId),
      Query.equal('is_matched', true),
      Query.orderDesc('$updatedAt'),
      Query.limit(50),
    ]);

    const matched = matchedDocs.documents.map((doc) => ({
      id: String(doc.$id),
      text: decryptData(String(doc.text)),
      isMatched: true,
      createdAt: String(doc.$createdAt),
    }));

    return { success: true, queue, matched };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function swipeFantasy(userId: string, fantasyId: string, choice: SwipeChoice) {
  if (!fantasyId) {
    return { success: false, error: 'Fantasy id is required.' };
  }

  try {
    const FANTASY_ID = process.env.NEXT_PUBLIC_APPWRITE_FANTASY_COLLECTION_ID!;
    if (!FANTASY_ID) {
      return { success: false, error: 'Fantasy collection is not configured.' };
    }

    const { databases, DB_ID, chatId, partnerId } = await getPairContext(userId);
    const fantasy = await databases.getDocument(DB_ID, FANTASY_ID, fantasyId);

    if (String(fantasy.chat_id) !== chatId) {
      return { success: false, error: 'Fantasy card does not belong to this relationship.' };
    }

    const votes = parseJson<Record<string, SwipeChoice>>(String(fantasy.votes_json || '{}'), {});
    votes[userId] = choice;

    const bothVoted = Boolean(votes[userId] && votes[partnerId]);
    const matched = bothVoted && votes[userId] === 'right' && votes[partnerId] === 'right';

    await databases.updateDocument(DB_ID, FANTASY_ID, fantasyId, {
      votes_json: JSON.stringify(votes),
      is_matched: matched,
      is_archived: bothVoted,
    });

    return { success: true, matched };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
