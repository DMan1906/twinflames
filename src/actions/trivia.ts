'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { generateText } from '@/actions/ai';

type TriviaMode = 'general' | 'relationship';

type TriviaQuestion = {
  question: string;
  choices: string[];
  correctAnswer?: string;
};

type TriviaSessionState = {
  readyUserIds: string[];
  starterUserId: string;
  currentIndex: number;
  questions: TriviaQuestion[];
  answers: Record<string, Record<string, string>>;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseState(value: string | undefined): TriviaSessionState {
  if (!value) {
    return { readyUserIds: [], starterUserId: '', currentIndex: 0, questions: [], answers: {} };
  }

  const parsed = parseJson<Partial<TriviaSessionState>>(value, {});
  return {
    readyUserIds: Array.isArray(parsed.readyUserIds) ? parsed.readyUserIds.map(String) : [],
    starterUserId: String(parsed.starterUserId || ''),
    currentIndex: Number(parsed.currentIndex || 0),
    questions: Array.isArray(parsed.questions) ? parsed.questions : [],
    answers: typeof parsed.answers === 'object' && parsed.answers ? parsed.answers as Record<string, Record<string, string>> : {},
  };
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
    const state = parseState(String(doc.questions_json || ''));

    return {
      success: true,
      partnerId,
      state: {
        id: doc.$id,
        mode: String(doc.mode || 'general') as TriviaMode,
        status: String(doc.status || 'active'),
        readyUserIds: state.readyUserIds,
        starterUserId: state.starterUserId,
        currentIndex: state.currentIndex,
        questions: state.questions,
        answers: state.answers,
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
      const state: TriviaSessionState = {
        readyUserIds: [userId],
        starterUserId: '',
        currentIndex: 0,
        questions: [],
        answers: {},
      };
      const created = await databases.createDocument(DB_ID, SESSIONS_ID, ID.unique(), {
        chat_id: chatId,
        user1_id: userId,
        user2_id: partnerId,
        user1_score: 0,
        user2_score: 0,
        questions_json: JSON.stringify(state),
        status: 'active',
      });

      return { success: true, sessionId: created.$id };
    }

    const session = active.documents[0];

    const state = parseState(String(session.questions_json || ''));
    const ready = new Set(state.readyUserIds);
    ready.add(userId);

    const readyList = Array.from(ready);
    state.readyUserIds = readyList;
    state.questions = state.questions || [];

    if (readyList.includes(partnerId) && readyList.includes(userId) && state.questions.length === 0) {
      const questions = await generateTriviaQuestions(mode);
      const starter = Math.random() > 0.5 ? userId : partnerId;
      state.starterUserId = starter;
      state.currentIndex = 0;
      state.questions = questions;
      state.answers = {};
    }

    await databases.updateDocument(DB_ID, SESSIONS_ID, session.$id, {
      mode,
      questions_json: JSON.stringify(state),
      status: String(session.status || 'active'),
    });
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

    const state = parseState(String(session.questions_json || ''));
    const currentIndex = Number(state.currentIndex || 0);

    if (currentIndex >= state.questions.length) {
      return { success: false, error: 'Trivia is already complete.' };
    }

    const starterUserId = String(state.starterUserId || userId);
    const expectedFirst = currentIndex % 2 === 0 ? starterUserId : (starterUserId === userId ? partnerId : userId);

    const key = String(currentIndex);
    const currentAnswers = state.answers[key] || {};

    if (!currentAnswers[expectedFirst] && userId !== expectedFirst) {
      return { success: false, error: 'Wait for your partner to answer first this round.' };
    }

    currentAnswers[userId] = answer.trim();
    state.answers[key] = currentAnswers;

    let nextIndex = currentIndex;
    let status = String(session.status || 'active');
    let user1Score = Number(session.user1_score || 0);
    let user2Score = Number(session.user2_score || 0);

    if (currentAnswers[userId] && currentAnswers[partnerId]) {
      const currentQuestion = state.questions[currentIndex];
      if (currentQuestion?.correctAnswer) {
        const correct = String(currentQuestion.correctAnswer).trim();
        if (String(currentAnswers[String(session.user1_id)] || '').trim() === correct) {
          user1Score += 1;
        }
        if (String(currentAnswers[String(session.user2_id)] || '').trim() === correct) {
          user2Score += 1;
        }
      }

      nextIndex = currentIndex + 1;
      if (nextIndex >= state.questions.length) {
        status = 'completed';
      }
    }

    state.currentIndex = nextIndex;

    await databases.updateDocument(DB_ID, SESSIONS_ID, sessionId, {
      questions_json: JSON.stringify(state),
      user1_score: user1Score,
      user2_score: user2Score,
      status,
    });

    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: getErrorMessage(error) };
  }
}
