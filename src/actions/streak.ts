'use server';

import { createAdminClient } from '@/lib/appwrite';
import { Query } from 'node-appwrite';
import { getCompletionStateForDate } from '@/actions/daily-progress';

function getDayString(date = new Date()) {
	return date.toISOString().split('T')[0];
}

function getYesterdayString() {
	const now = new Date();
	now.setUTCDate(now.getUTCDate() - 1);
	return getDayString(now);
}

function toSafeStreak(value: unknown) {
	const num = Number(value || 0);
	return Number.isFinite(num) && num >= 0 ? num : 0;
}

function getErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	return 'Unexpected error';
}

async function getPairContext(userId: string) {
	const { databases } = await createAdminClient();
	const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
	const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

	const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
	const partnerId = String(profile.partner_id || '');
	if (!partnerId) {
		throw new Error('User is not paired.');
	}

	const chatId = [userId, partnerId].sort().join('_');
	return { databases, DB_ID, chatId };
}

async function getOrCreateStreakDoc(userId: string) {
	const STREAKS_ID = process.env.NEXT_PUBLIC_APPWRITE_STREAKS_COLLECTION_ID!;
	if (!STREAKS_ID) {
		throw new Error('Streaks collection is not configured.');
	}

	const { databases, DB_ID, chatId } = await getPairContext(userId);
	const existing = await databases.listDocuments(DB_ID, STREAKS_ID, [
		Query.equal('chat_id', chatId),
		Query.limit(1),
	]);

	if (existing.total > 0) {
		return { databases, DB_ID, STREAKS_ID, doc: existing.documents[0], chatId };
	}

	const created = await databases.createDocument(DB_ID, STREAKS_ID, chatId, {
		chat_id: chatId,
		current_count: 0,
		best_count: 0,
		last_completed_date: '',
	});

	return { databases, DB_ID, STREAKS_ID, doc: created, chatId };
}

export async function updateStreakIfCompletedToday(userId: string) {
	try {
		const todayStatus = await getCompletionStateForDate(userId, getDayString());
		if (!todayStatus.success || !todayStatus.bothComplete) {
			return { success: true, updated: false, reason: 'not_complete_today' };
		}

		const yesterdayStatus = await getCompletionStateForDate(userId, getYesterdayString());
		const continuedFromYesterday = !!(yesterdayStatus.success && yesterdayStatus.bothComplete);

		const { databases, DB_ID, STREAKS_ID, doc } = await getOrCreateStreakDoc(userId);
		const current = toSafeStreak(doc.current_count);
		const best = toSafeStreak(doc.best_count);
		const nextStreak = continuedFromYesterday ? current + 1 : 1;
		const nextBest = Math.max(best, nextStreak);

		await databases.updateDocument(DB_ID, STREAKS_ID, doc.$id, {
			current_count: nextStreak,
			best_count: nextBest,
			last_completed_date: getDayString(),
		});

		return { success: true, updated: true, streakCount: nextStreak };
	} catch (error: unknown) {
		console.error('updateStreakIfCompletedToday failed:', error);
		return { success: false, updated: false, error: getErrorMessage(error) || 'Failed to update streak.' };
	}
}

export async function resetStreakIfMissedDay(userId: string) {
	try {
		const yesterdayStatus = await getCompletionStateForDate(userId, getYesterdayString());
		if (!yesterdayStatus.success || yesterdayStatus.bothComplete) {
			return { success: true, reset: false };
		}

		const { databases, DB_ID, STREAKS_ID, doc } = await getOrCreateStreakDoc(userId);
		await databases.updateDocument(DB_ID, STREAKS_ID, doc.$id, {
			current_count: 0,
		});

		return { success: true, reset: true };
	} catch (error: unknown) {
		console.error('resetStreakIfMissedDay failed:', error);
		return { success: false, reset: false, error: getErrorMessage(error) || 'Failed to reset streak.' };
	}
}
