'use client';

import { useEffect, useState } from 'react';
import { submitMoodCheckin, getTodayMood } from '@/actions/mood';

const MOODS = [
	{ value: 1, label: 'Low', emoji: '😞' },
	{ value: 2, label: 'Meh', emoji: '😕' },
	{ value: 3, label: 'Okay', emoji: '🙂' },
	{ value: 4, label: 'Good', emoji: '😊' },
	{ value: 5, label: 'Amazing', emoji: '😍' },
];

export default function MoodCheckin({
	userId,
	onComplete,
}: {
	userId: string;
	onComplete?: () => void;
}) {
	const [moodLevel, setMoodLevel] = useState<number>(3);
	const [note, setNote] = useState('');
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		async function loadTodayMood() {
			const result = await getTodayMood(userId);
			if (result.success && result.mood) {
				setMoodLevel(Number(result.mood.level || 3));
				setNote(result.mood.note || '');
				setSaved(true);
			}
		}
		loadTodayMood();
	}, [userId]);

	const handleSave = async () => {
		setSaving(true);
		setError('');
		const result = await submitMoodCheckin(userId, moodLevel, note);
		if (!result.success) {
			setError(result.error || 'Could not save mood check-in.');
			setSaving(false);
			return;
		}

		setSaving(false);
		setSaved(true);
		onComplete?.();
	};

	return (
		<div className="space-y-4 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
			<div className="space-y-1">
				<p className="text-sm font-medium text-purple-100">How are you feeling?</p>
				<p className="text-xs text-purple-300/60">Mood + optional note are part of today&apos;s trinity.</p>
			</div>

			<div className="grid grid-cols-5 gap-2">
				{MOODS.map((mood) => (
					<button
						key={mood.value}
						type="button"
						onClick={() => {
							setMoodLevel(mood.value);
							setSaved(false);
						}}
						className={`rounded-xl border p-2 text-center transition ${
							moodLevel === mood.value
								? 'border-purple-500 bg-purple-500/20'
								: 'border-purple-900/40 bg-[#0d0a14] hover:border-purple-700'
						}`}
					>
						<div className="text-xl">{mood.emoji}</div>
						<div className="text-[10px] text-purple-200/80">{mood.label}</div>
					</button>
				))}
			</div>

			<textarea
				value={note}
				onChange={(event) => {
					setNote(event.target.value);
					setSaved(false);
				}}
				placeholder="Optional note for your partner..."
				className="min-h-20 w-full resize-none rounded-xl border border-purple-900/40 bg-[#0d0a14] p-3 text-sm text-white focus:border-purple-500 focus:outline-none"
			/>

			{error ? <p className="text-xs text-red-400">{error}</p> : null}

			<button
				type="button"
				disabled={saving}
				onClick={handleSave}
				className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
			>
				{saving ? 'Saving...' : saved ? 'Update Mood Check-in' : 'Save Mood Check-in'}
			</button>
		</div>
	);
}
