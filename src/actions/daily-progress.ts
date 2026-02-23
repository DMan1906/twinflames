'use server';

import { Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';

export type TrinityCompletion = {
	question: boolean;
	mood: boolean;
	photo: boolean;
	complete: boolean;
};

export type DailyTrinityStatus = {
	success: boolean;
	date: string;
	chatId?: string;
	you?: TrinityCompletion;
	partner?: TrinityCompletion;
	bothComplete?: boolean;
	error?: string;
};

function getErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	return 'Failed to fetch daily progress';
}

type PairContext = {
	userId: string;
	partnerId: string;
	chatId: string;
};

function getDayString(date = new Date()) {
	return date.toISOString().split('T')[0];
}

function getDayBounds(day: string) {
	return {
		start: `${day}T00:00:00.000Z`,
		end: `${day}T23:59:59.999Z`,
	};
}

async function getPairContext(userId: string): Promise<PairContext> {
	const { databases } = await createAdminClient();
	const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
	const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

	const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
	if (!profile.partner_id) {
		throw new Error('User is not paired');
	}

	const partnerId = String(profile.partner_id);
	const chatId = [userId, partnerId].sort().join('_');

	return { userId, partnerId, chatId };
}

async function hasQuestionForDay(chatId: string, userId: string, day: string) {
	const { databases } = await createAdminClient();
	const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
	const JOUR_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_JOURNAL_COLLECTION_ID!;
	const { start, end } = getDayBounds(day);

	const docs = await databases.listDocuments(DB_ID, JOUR_COL_ID, [
		Query.equal('chat_id', chatId),
		Query.equal('user_id', userId),
		Query.greaterThanEqual('$createdAt', start),
		Query.lessThanEqual('$createdAt', end),
		Query.limit(1),
	]);

	return docs.total > 0;
}

async function hasMoodForDay(chatId: string, userId: string, day: string) {
	const { databases } = await createAdminClient();
	const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
	const MOOD_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_MOODS_COLLECTION_ID!;

	if (!MOOD_COL_ID) return false;

	const docs = await databases.listDocuments(DB_ID, MOOD_COL_ID, [
		Query.equal('chat_id', chatId),
		Query.equal('user_id', userId),
		Query.equal('created_at', day),
		Query.limit(1),
	]);

	return docs.total > 0;
}

async function hasPhotoForDay(chatId: string, userId: string, day: string) {
	const { databases } = await createAdminClient();
	const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
	const PHOTO_COL_ID = process.env.NEXT_PUBLIC_APPWRITE_PHOTOS_COLLECTION_ID!;

	if (!PHOTO_COL_ID) return false;

	const docs = await databases.listDocuments(DB_ID, PHOTO_COL_ID, [
		Query.equal('chat_id', chatId),
		Query.equal('user_id', userId),
		Query.equal('created_at', day),
		Query.limit(1),
	]);

	return docs.total > 0;
}

export async function getCompletionStateForDate(userId: string, day?: string): Promise<DailyTrinityStatus> {
	try {
		const date = day || getDayString();
		const { userId: me, partnerId, chatId } = await getPairContext(userId);

		const [myQuestion, myMood, myPhoto, partnerQuestion, partnerMood, partnerPhoto] = await Promise.all([
			hasQuestionForDay(chatId, me, date),
			hasMoodForDay(chatId, me, date),
			hasPhotoForDay(chatId, me, date),
			hasQuestionForDay(chatId, partnerId, date),
			hasMoodForDay(chatId, partnerId, date),
			hasPhotoForDay(chatId, partnerId, date),
		]);

		const you: TrinityCompletion = {
			question: myQuestion,
			mood: myMood,
			photo: myPhoto,
			complete: myQuestion && myMood && myPhoto,
		};

		const partner: TrinityCompletion = {
			question: partnerQuestion,
			mood: partnerMood,
			photo: partnerPhoto,
			complete: partnerQuestion && partnerMood && partnerPhoto,
		};

		return {
			success: true,
			date,
			chatId,
			you,
			partner,
			bothComplete: you.complete && partner.complete,
		};
	} catch (error: unknown) {
		return {
			success: false,
			date: day || getDayString(),
			error: getErrorMessage(error),
		};
	}
}

export async function getDailyTrinityStatus(userId: string) {
	return getCompletionStateForDate(userId);
}
