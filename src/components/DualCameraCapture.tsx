'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createDailyPhotoUploadUrls, submitDailyPhotos } from '@/actions/photos';

type CaptureSide = 'back' | 'front';

async function blobToFile(blob: Blob, fileName: string) {
	return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
}

export default function DualCameraCapture({
	userId,
	onComplete,
}: {
	userId: string;
	onComplete?: () => void;
}) {
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);
	const [activeSide, setActiveSide] = useState<CaptureSide>('back');
	const [countdown, setCountdown] = useState<number | null>(null);
	const [capturing, setCapturing] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState('');
	const [frontBlob, setFrontBlob] = useState<Blob | null>(null);
	const [backBlob, setBackBlob] = useState<Blob | null>(null);

	const isDone = useMemo(() => !!frontBlob && !!backBlob, [frontBlob, backBlob]);

	useEffect(() => {
		let cancelled = false;

		async function startCamera(facingMode: 'environment' | 'user') {
			try {
				setError('');
				const media = await navigator.mediaDevices.getUserMedia({
					video: { facingMode },
					audio: false,
				});

				if (cancelled) {
					media.getTracks().forEach((track) => track.stop());
					return;
				}

				setStream((prev) => {
					prev?.getTracks().forEach((track) => track.stop());
					return media;
				});
			} catch {
				if (facingMode === 'environment') {
					await startCamera('user');
				} else {
					setError('Camera access was denied or unavailable.');
				}
			}
		}

		const facingMode = activeSide === 'back' ? 'environment' : 'user';
		startCamera(facingMode);

		return () => {
			cancelled = true;
		};
	}, [activeSide]);

	useEffect(() => {
		if (videoRef.current && stream) {
			videoRef.current.srcObject = stream;
		}
	}, [stream]);

	useEffect(() => {
		return () => {
			stream?.getTracks().forEach((track) => track.stop());
		};
	}, [stream]);

	const captureCurrentFrame = () => {
		const video = videoRef.current;
		const canvas = canvasRef.current;
		if (!video || !canvas) return null;

		const width = video.videoWidth || 1080;
		const height = video.videoHeight || 1920;
		canvas.width = width;
		canvas.height = height;

		const ctx = canvas.getContext('2d');
		if (!ctx) return null;
		ctx.drawImage(video, 0, 0, width, height);

		return new Promise<Blob | null>((resolve) => {
			canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
		});
	};

	const startCapture = async () => {
		if (capturing) return;

		setCapturing(true);
		setError('');
		setCountdown(3);

		for (let value = 3; value > 0; value -= 1) {
			setCountdown(value);
			await new Promise((resolve) => setTimeout(resolve, 1000));
		}

		setCountdown(null);
		const blob = await captureCurrentFrame();
		if (!blob) {
			setCapturing(false);
			setError('Could not capture photo.');
			return;
		}

		if (activeSide === 'back') {
			setBackBlob(blob);
			setActiveSide('front');
		} else {
			setFrontBlob(blob);
		}

		setCapturing(false);
	};

	const uploadPhotos = async () => {
		if (!frontBlob || !backBlob) return;

		setUploading(true);
		setError('');

		const frontFile = await blobToFile(frontBlob, 'front.jpg');
		const backFile = await blobToFile(backBlob, 'back.jpg');

		const urls = await createDailyPhotoUploadUrls(userId, frontFile.type, backFile.type);
		if (!urls.success || !urls.front || !urls.back) {
			setUploading(false);
			setError(urls.error || 'Could not prepare upload.');
			return;
		}

		const [frontRes, backRes] = await Promise.all([
			fetch(urls.front.uploadUrl, {
				method: 'PUT',
				body: frontFile,
				headers: { 'Content-Type': urls.front.mimeType },
			}),
			fetch(urls.back.uploadUrl, {
				method: 'PUT',
				body: backFile,
				headers: { 'Content-Type': urls.back.mimeType },
			}),
		]);

		if (!frontRes.ok || !backRes.ok) {
			setUploading(false);
			setError('Upload failed. Please try again.');
			return;
		}

		const result = await submitDailyPhotos(userId, urls.front.objectKey, urls.back.objectKey);
		setUploading(false);

		if (!result.success) {
			setError(result.error || 'Could not save today\'s photos.');
			return;
		}

		onComplete?.();
	};

	return (
		<div className="space-y-4 rounded-2xl border border-purple-800/40 bg-[#1a1525] p-4">
			<p className="text-sm font-medium text-purple-100">Pic of the Day (dual capture)</p>
			<p className="text-xs text-purple-300/60">Capture both back and front camera shots with a 3-second interval.</p>

			<div className="relative overflow-hidden rounded-xl border border-purple-900/40 bg-black">
				<video ref={videoRef} autoPlay playsInline muted className="aspect-[3/4] w-full object-cover" />
				{countdown ? (
					<div className="absolute inset-0 flex items-center justify-center bg-black/30 text-6xl font-bold text-white">
						{countdown}
					</div>
				) : null}
			</div>

			<canvas ref={canvasRef} className="hidden" />

			<div className="grid grid-cols-2 gap-3 text-xs">
				<StatusChip label="Back camera" done={!!backBlob} />
				<StatusChip label="Front camera" done={!!frontBlob} />
			</div>

			{error ? <p className="text-xs text-red-400">{error}</p> : null}

			{!isDone ? (
				<button
					type="button"
					disabled={capturing}
					onClick={startCapture}
					className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-500 disabled:opacity-50"
				>
					{capturing
						? 'Capturing...'
						: activeSide === 'back'
							? 'Capture Back Camera'
							: 'Capture Front Camera'}
				</button>
			) : (
				<button
					type="button"
					disabled={uploading}
					onClick={uploadPhotos}
					className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
				>
					{uploading ? 'Uploading...' : 'Submit Pic of the Day'}
				</button>
			)}
		</div>
	);
}

function StatusChip({ label, done }: { label: string; done: boolean }) {
	return (
		<div
			className={`rounded-lg border px-3 py-2 text-center ${
				done ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-purple-900/40 bg-[#0d0a14] text-purple-300/70'
			}`}
		>
			{done ? '✓ ' : ''}
			{label}
		</div>
	);
}
