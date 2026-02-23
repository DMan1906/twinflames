'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { decryptData, encryptData } from '@/lib/crypto';
import { generateText } from '@/actions/ai';

type TriviaMode = 'general' | 'relationship';

type TriviaQuestion = {
  question: string;
  choices: string[];
  correctAnswer?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function parseJson<T>(value: string, fallback: T): T {
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
  if (!partnerId) throw new Error('You need a partner to play trivia.');

  const chatId = [userId, partnerId].sort().join('_');
  return { databases, DB_ID, partnerId, chatId };
}

async function generateTriviaQuestions(mode: TriviaMode) {
  const prompt = mode === 'general'
    ? `Generate 5 multiple-choice general knowledge trivia questions. Return strict JSON array where each item is {"question": string, "choices": [4 options], "correctAnswer": string}.`
    : `Generate 5 multiple-choice getting-to-know-your-partner trivia prompts. Return strict JSON array where each item is {"question": string, "choices": [4 playful options], "correctAnswer": string}.`;

  const generated = await generateText(prompt);
  if (!generated.success || !generated.plaintext) {
    return [] as TriviaQuestion[];
  }

  const raw = generated.plaintext;
  const parsed = parseJson<TriviaQuestion[]>(raw, []);
  return parsed.filter((q) => q.question && Array.isArray(q.choices) && q.choices.length >= 2).slice(0, 5);
}

export async function getTriviaState(userId: string) {
  try {
    const SESSIONS_ID = process.env.NEXT_PUBLIC_APPWRITE_TRIVIA_SESSIONS_COLLECTION_ID!;
    if (!SESSIONS_ID) return { success: false, error: 'Trivia sessions collection is not configured.' };

    const { databases, DB_ID, chatId, partnerId } = await getPairContext(userId);

    const result = await databases.listDocuments(DB_ID, SESSIONS_ID, [
      Query.equal('chat_id', chatId),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ]);

    if (result.total === 0) {
      return { success: true, state: null, partnerId };
    }

    const doc = result.documents[0];
    const readyUserIds = parseJson<string[]>(String(doc.ready_user_ids || '[]'), []);
    const questions = doc.questions_json ? parseJson<TriviaQuestion[]>(decryptData(String(doc.questions_json)), []) : [];
    const answers = doc.answers_json ? parseJson<Record<string, Record<string, string>>>(decryptData(String(doc.answers_json)), {}) : {};

    return {
      success: true,
      partnerId,
      state: {
        id: doc.$id,
        mode: String(doc.mode || 'general') as TriviaMode,
        status: String(doc.status || 'waiting'),
        readyUserIds,
        starterUserId: String(doc.starter_user_id || ''),
        currentIndex: Number(doc.current_index || 0),
        questions,
        answers,
      },
    };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function setTriviaReady(userId: string, mode: TriviaMode) {
  try {
    const SESSIONS_ID = process.env.NEXT_PUBLIC_APPWRITE_TRIVIA_SESSIONS_COLLECTION_ID!;
    if (!SESSIONS_ID) return { success: false, error: 'Trivia sessions collection is not configured.' };

    const { databases, DB_ID, chatId, partnerId } = await getPairContext(userId);

    const active = await databases.listDocuments(DB_ID, SESSIONS_ID, [
      Query.equal('chat_id', chatId),
      Query.notEqual('status', 'completed'),
      Query.orderDesc('$createdAt'),
      Query.limit(1),
    ]);

    if (active.total === 0) {
      const created = await databases.createDocument(DB_ID, SESSIONS_ID, ID.unique(), {
        chat_id: chatId,
        mode,
        status: 'waiting',
        ready_user_ids: JSON.stringify([userId]),
        starter_user_id: '',
        questions_json: '',
        answers_json: '',
        current_index: 0,
        created_at: todayString(),
      });

      return { success: true, sessionId: created.$id };
    }

    const session = active.documents[0];

    const ready = new Set(parseJson<string[]>(String(session.ready_user_ids || '[]'), []));
    ready.add(userId);

    const readyList = Array.from(ready);
    let payload: Record<string, unknown> = {
      ready_user_ids: JSON.stringify(readyList),
      mode,
    };

    if (readyList.includes(partnerId) && readyList.includes(userId)) {
      const questions = await generateTriviaQuestions(mode);
      const starter = Math.random() > 0.5 ? userId : partnerId;
      payload = {
        ...payload,
        status: 'active',
        starter_user_id: starter,
        current_index: 0,
        questions_json: encryptData(JSON.stringify(questions)),
        answers_json: encryptData(JSON.stringify({})),
      };
    }

    await databases.updateDocument(DB_ID, SESSIONS_ID, session.$id, payload);
    return { success: true, sessionId: session.$id };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}

export async function submitTriviaAnswer(userId: string, sessionId: string, answer: string) {
  if (!sessionId || !answer.trim()) {
    return { success: false, error: 'Session and answer are required.' };
  }

  try {
    const SESSIONS_ID = process.env.NEXT_PUBLIC_APPWRITE_TRIVIA_SESSIONS_COLLECTION_ID!;
    if (!SESSIONS_ID) return { success: false, error: 'Trivia sessions collection is not configured.' };

    const { databases, DB_ID, partnerId, chatId } = await getPairContext(userId);
    const session = await databases.getDocument(DB_ID, SESSIONS_ID, sessionId);

    if (String(session.chat_id) !== chatId) {
      return { success: false, error: 'Trivia session does not belong to this relationship.' };
    }

    if (String(session.status) !== 'active') {
      return { success: false, error: 'Trivia session is not active.' };
    }

    const currentIndex = Number(session.current_index || 0);
    const questions = session.questions_json ? parseJson<TriviaQuestion[]>(decryptData(String(session.questions_json)), []) : [];
    const answers = session.answers_json ? parseJson<Record<string, Record<string, string>>>(decryptData(String(session.answers_json)), {}) : {};

    if (currentIndex >= questions.length) {
      return { success: false, error: 'Trivia is already complete.' };
    }

    const starterUserId = String(session.starter_user_id || userId);
    const expectedFirst = currentIndex % 2 === 0 ? starterUserId : (starterUserId === userId ? partnerId : userId);

    const key = String(currentIndex);
    const currentAnswers = answers[key] || {};

    if (!currentAnswers[expectedFirst] && userId !== expectedFirst) {
      return { success: false, error: 'Wait for your partner to answer first this round.' };
    }

    currentAnswers[userId] = answer.trim();
    answers[key] = currentAnswers;

    let nextIndex = currentIndex;
    let status = String(session.status);

    if (currentAnswers[userId] && currentAnswers[partnerId]) {
      nextIndex = currentIndex + 1;
      if (nextIndex >= questions.length) {
        status = 'completed';
      }
    }

    await databases.updateDocument(DB_ID, SESSIONS_ID, sessionId, {
      answers_json: encryptData(JSON.stringify(answers)),
      current_index: nextIndex,
      status,
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
