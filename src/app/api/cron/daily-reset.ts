import { NextRequest, NextResponse } from 'next/server';
import { Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { resetStreakIfMissedDay } from '@/actions/streak';

export async function GET(request: NextRequest) {
	const authHeader = request.headers.get('authorization');
	const expected = process.env.CRON_SECRET;

	if (!expected || authHeader !== `Bearer ${expected}`) {
		return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { databases } = await createAdminClient();
		const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
		const PROFILES_ID = process.env.NEXT_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID!;

		const profiles = await databases.listDocuments(DB_ID, PROFILES_ID, [Query.limit(200)]);
		let resets = 0;

		for (const profile of profiles.documents) {
			if (!profile.partner_id) continue;
			const result = await resetStreakIfMissedDay(String(profile.user_id));
			if (result.success && result.reset) {
				resets += 1;
			}
		}

		return NextResponse.json({ success: true, processed: profiles.documents.length, resets });
	} catch (error: unknown) {
		const errorMessage = error instanceof Error ? error.message : 'Daily reset failed';
		return NextResponse.json(
			{ success: false, error: errorMessage },
			{ status: 500 },
		);
	}
}
