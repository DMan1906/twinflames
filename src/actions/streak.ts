'use server';

import { createAdminClient } from '@/lib/appwrite';
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

export async function updateStreakIfCompletedToday(userId: string) {
	try {
		const todayStatus = await getCompletionStateForDate(userId, getDayString());
		if (!todayStatus.success || !todayStatus.bothComplete) {
			return { success: true, updated: false, reason: 'not_complete_today' };
		}

		const yesterdayStatus = await getCompletionStateForDate(userId, getYesterdayString());
		const continuedFromYesterday = !!(yesterdayStatus.success && yesterdayStatus.bothComplete);

		const { databases } = await createAdminClient();
		const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
		const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

		const myProfile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
		const partnerId = String(myProfile.partner_id || '');
		if (!partnerId) {
			return { success: false, updated: false, error: 'User is not paired.' };
		}

		const partnerProfile = await databases.getDocument(DB_ID, PROFILES_ID, partnerId);
		const current = Math.max(toSafeStreak(myProfile.streak_count), toSafeStreak(partnerProfile.streak_count));
		const nextStreak = continuedFromYesterday ? current + 1 : 1;

		await Promise.all([
			databases.updateDocument(DB_ID, PROFILES_ID, userId, { streak_count: nextStreak }),
			databases.updateDocument(DB_ID, PROFILES_ID, partnerId, { streak_count: nextStreak }),
		]);

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

		const { databases } = await createAdminClient();
		const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
		const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

		const profile = await databases.getDocument(DB_ID, PROFILES_ID, userId);
		const partnerId = String(profile.partner_id || '');
		if (!partnerId) {
			return { success: true, reset: false };
		}

		await Promise.all([
			databases.updateDocument(DB_ID, PROFILES_ID, userId, { streak_count: 0 }),
			databases.updateDocument(DB_ID, PROFILES_ID, partnerId, { streak_count: 0 }),
		]);

		return { success: true, reset: true };
	} catch (error: unknown) {
		console.error('resetStreakIfMissedDay failed:', error);
		return { success: false, reset: false, error: getErrorMessage(error) || 'Failed to reset streak.' };
	}
}
