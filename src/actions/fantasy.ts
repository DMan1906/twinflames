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

type FantasyPayload = {
  text: string;
  votes: Record<string, SwipeChoice>;
  matched: boolean;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected fantasy error';
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

function parsePayload(raw: string | undefined, fallbackText = ''): FantasyPayload {
  if (!raw) {
    return { text: fallbackText, votes: {}, matched: false };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<FantasyPayload>;
    return {
      text: String(parsed.text || fallbackText),
      votes: typeof parsed.votes === 'object' && parsed.votes ? parsed.votes as Record<string, SwipeChoice> : {},
      matched: Boolean(parsed.matched),
    };
  } catch {
    return { text: fallbackText, votes: {}, matched: false };
  }
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
      Query.equal('status', 'saved'),
      Query.orderAsc('$createdAt'),
      Query.limit(500),
    ]);

    const remainingForUser = docs.documents.filter((doc) => {
      const payload = parsePayload(decryptData(String(doc.content || '')), String(doc.title || ''));
      return !payload.votes[userId];
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
          created_by: userId,
          title: text.slice(0, 60),
          content: encryptData(JSON.stringify({ text, votes: {}, matched: false })),
          category: '',
          status: 'saved',
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
      Query.equal('status', 'saved'),
      Query.orderAsc('$createdAt'),
      Query.limit(500),
    ]);

    const queue: FantasyCard[] = [];
    for (const doc of docs.documents) {
      const payload = parsePayload(decryptData(String(doc.content || '')), String(doc.title || ''));
      if (payload.votes[userId]) continue;

      queue.push({
        id: String(doc.$id),
        text: payload.text,
        isMatched: payload.matched,
        createdAt: String(doc.$createdAt),
      });

      if (queue.length >= 10) break;
    }

    const matchedDocs = await databases.listDocuments(DB_ID, FANTASY_ID, [
      Query.equal('chat_id', chatId),
      Query.equal('status', 'explored'),
      Query.orderDesc('$updatedAt'),
      Query.limit(50),
    ]);

    const matched = matchedDocs.documents
      .map((doc) => {
        const payload = parsePayload(decryptData(String(doc.content || '')), String(doc.title || ''));
        return {
          id: String(doc.$id),
          text: payload.text,
          isMatched: payload.matched,
          createdAt: String(doc.$createdAt),
        };
      })
      .filter((item) => item.isMatched);

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

    const payload = parsePayload(decryptData(String(fantasy.content || '')), String(fantasy.title || ''));
    payload.votes[userId] = choice;

    const bothVoted = Boolean(payload.votes[userId] && payload.votes[partnerId]);
    const matched = bothVoted && payload.votes[userId] === 'right' && payload.votes[partnerId] === 'right';
    payload.matched = matched;

    await databases.updateDocument(DB_ID, FANTASY_ID, fantasyId, {
      content: encryptData(JSON.stringify(payload)),
      status: bothVoted ? 'explored' : 'saved',
    });

    return { success: true, matched };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
