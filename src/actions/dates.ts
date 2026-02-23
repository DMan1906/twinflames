// src/actions/dates.ts
'use server';

import { generateText } from '@/actions/ai';
import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'node-appwrite';

type DateCategory = 'cozy' | 'adventurous' | 'romantic' | 'food' | 'random';
type DateBudget = 'free' | 'low' | 'medium' | 'high';

type GeneratedDateIdea = {
  title: string;
  summary: string;
  plan: string[];
  category: DateCategory;
  budget: DateBudget;
  source: 'quick' | 'ai';
};

const QUICK_PRESETS: Record<Exclude<DateCategory, 'random'>, Array<{ title: string; summary: string }>> = {
  cozy: [
    { title: 'Blanket Fort Cinema', summary: 'Turn your living room into a cozy fort and watch one comfort movie.' },
    { title: 'Tea & Story Night', summary: 'Brew tea, light a candle, and take turns telling favorite memories.' },
    { title: 'Cozy Puzzle Date', summary: 'Complete a puzzle together with lo-fi music and warm snacks.' },
  ],
  adventurous: [
    { title: 'Sunrise Walk Quest', summary: 'Take a new route and complete a tiny challenge list together.' },
    { title: 'Mini Road Mystery', summary: 'Drive to a random nearby stop and explore for one hour.' },
    { title: 'Two-Person Photo Hunt', summary: 'Find and capture 10 themed photos around your city.' },
  ],
  romantic: [
    { title: 'Golden Hour Picnic', summary: 'Pack simple snacks and watch sunset while sharing appreciation notes.' },
    { title: 'Love Letter Swap', summary: 'Write letters, then read them aloud in a calm setting.' },
    { title: 'Dance in the Living Room', summary: 'Create a playlist and slow dance at home.' },
  ],
  food: [
    { title: 'Two-Course Cook-Off', summary: 'Each partner leads one dish, then rate both for fun.' },
    { title: 'Street Food Walk', summary: 'Try two new spots and pick a favorite together.' },
    { title: 'Dessert Crawl', summary: 'Visit 2-3 dessert places and split every order.' },
  ],
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected date ideas error';
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
    throw new Error('You need a partner to create shared date ideas.');
  }

  const chatId = [userId, partnerId].sort().join('_');
  return { databases, DB_ID, chatId };
}

function pickCategory(category: DateCategory): Exclude<DateCategory, 'random'> {
  if (category !== 'random') return category;
  const keys = Object.keys(QUICK_PRESETS) as Array<Exclude<DateCategory, 'random'>>;
  return keys[Math.floor(Math.random() * keys.length)];
}

export async function generateDateIdea(options: {
  category: DateCategory;
  budget: DateBudget;
  source: 'quick' | 'ai';
}) {
  const category = pickCategory(options.category);

  if (options.source === 'quick') {
    const pool = QUICK_PRESETS[category];
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return {
      success: true,
      idea: {
        title: pick.title,
        summary: pick.summary,
        plan: [],
        category,
        budget: options.budget,
        source: 'quick',
      } satisfies GeneratedDateIdea,
    };
  }

  const prompt = `
Generate one romantic date idea as strict JSON object.
Input:
- category: ${category}
- budget: ${options.budget}

Output schema exactly:
{
  "title": "string",
  "summary": "string under 28 words",
  "plan": ["step1", "step2", "step3"]
}

No markdown, no extra keys.
`;

  const result = await generateText(prompt);
  if (!result.success || !result.plaintext) {
    return { success: false, error: 'AI is resting. Try again soon!' };
  }

  const parsed = parseJson<{ title?: string; summary?: string; plan?: string[] }>(result.plaintext, {});
  const title = (parsed.title || '').trim();
  const summary = (parsed.summary || '').trim();
  const plan = Array.isArray(parsed.plan) ? parsed.plan.map((item) => String(item).trim()).filter(Boolean).slice(0, 5) : [];

  if (!title || !summary) {
    return { success: false, error: 'Could not format AI date idea. Try again.' };
  }

  return {
    success: true,
    idea: {
      title,
      summary,
      plan,
      category,
      budget: options.budget,
      source: 'ai',
    } satisfies GeneratedDateIdea,
  };
}

export async function saveDateIdea(userId: string, idea: GeneratedDateIdea) {
  try {
    const DATES_ID = process.env.NEXT_PUBLIC_APPWRITE_DATES_COLLECTION_ID!;
    if (!DATES_ID) {
      return { success: false, error: 'Dates collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    await databases.createDocument(DB_ID, DATES_ID, ID.unique(), {
      chat_id: chatId,
      title: idea.title,
      summary: idea.summary,
      plan: JSON.stringify(idea.plan),
      category: idea.category,
      budget: idea.budget,
      source: idea.source,
      completed: false,
      completed_at: '',
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function getSavedDateIdeas(userId: string) {
  try {
    const DATES_ID = process.env.NEXT_PUBLIC_APPWRITE_DATES_COLLECTION_ID!;
    if (!DATES_ID) {
      return { success: false, error: 'Dates collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const docs = await databases.listDocuments(DB_ID, DATES_ID, [
      Query.equal('chat_id', chatId),
      Query.orderDesc('$createdAt'),
      Query.limit(300),
    ]);

    const ideas = docs.documents.map((doc) => ({
      id: String(doc.$id),
      title: String(doc.title),
      summary: String(doc.summary),
      plan: parseJson<string[]>(String(doc.plan || '[]'), []),
      category: String(doc.category),
      budget: String(doc.budget),
      source: String(doc.source),
      isCompleted: Boolean(doc.completed),
      completedAt: String(doc.completed_at || ''),
      createdAt: String(doc.$createdAt),
    }));

    return { success: true, ideas };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function toggleDateCompleted(userId: string, dateIdeaId: string, nextCompleted: boolean) {
  try {
    const DATES_ID = process.env.NEXT_PUBLIC_APPWRITE_DATES_COLLECTION_ID!;
    if (!DATES_ID) {
      return { success: false, error: 'Dates collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const doc = await databases.getDocument(DB_ID, DATES_ID, dateIdeaId);
    if (String(doc.chat_id) !== chatId) {
      return { success: false, error: 'Date idea does not belong to this relationship.' };
    }

    await databases.updateDocument(DB_ID, DATES_ID, dateIdeaId, {
      completed: nextCompleted,
      completed_at: nextCompleted ? todayString() : '',
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function deleteDateIdea(userId: string, dateIdeaId: string) {
  try {
    const DATES_ID = process.env.NEXT_PUBLIC_APPWRITE_DATES_COLLECTION_ID!;
    if (!DATES_ID) {
      return { success: false, error: 'Dates collection is not configured.' };
    }

    const { databases, DB_ID, chatId } = await getPairContext(userId);
    const doc = await databases.getDocument(DB_ID, DATES_ID, dateIdeaId);
    if (String(doc.chat_id) !== chatId) {
      return { success: false, error: 'Date idea does not belong to this relationship.' };
    }

    await databases.deleteDocument(DB_ID, DATES_ID, dateIdeaId);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}