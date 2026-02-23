'use client';

import { useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { consumeMessageView, getMessageRemainingViews } from '@/actions/chat';

type EphemeralMessageProps = {
  messageId: string;
  content: string;
  isMe: boolean;
  messageType: 'text' | 'image' | 'video';
  mode: 'view_once' | 'replay';
  userId: string;
  onViewed?: () => void;
};

export default function EphemeralMessage({
  messageId,
  content,
  isMe,
  messageType,
  mode,
  userId,
  onViewed,
}: EphemeralMessageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [remainingViews, setRemainingViews] = useState<number>(isMe ? Number.POSITIVE_INFINITY : 0);
  const [loading, setLoading] = useState(!isMe);

  useEffect(() => {
    if (isMe) return;

    async function loadRemaining() {
      const result = await getMessageRemainingViews(messageId, userId);
      if (result.success) {
        setRemainingViews(Number(result.remainingViews));
      }
      setLoading(false);
    }

    loadRemaining();
  }, [isMe, messageId, userId]);

  useEffect(() => {
    if (messageType === 'video') return;
    if (!isOpen) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsOpen(false);
          setSecondsLeft(10);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, messageType]);

  const closeOpenedContent = () => {
    setIsOpen(false);
    setSecondsLeft(10);
  };

  const handleOpen = async () => {
    if (isMe) {
      setIsOpen(true);
      return;
    }

    const result = await consumeMessageView(messageId, userId);
    if (!result.success) {
      setRemainingViews(0);
      return;
    }

    if (typeof result.remainingViews === 'number') {
      setRemainingViews(result.remainingViews);
    }

    setIsOpen(true);
    onViewed?.();
  };

  if (loading) {
    return <div className="text-xs text-purple-300/60">Loading...</div>;
  }

  if (!isMe && remainingViews <= 0 && !isOpen) {
    return (
      <div className="flex items-center gap-2 text-sm italic text-purple-500/60">
        <EyeOff size={14} />
        <span>Opened</span>
      </div>
    );
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-2xl border border-purple-500/40 border-dashed bg-[#0d0a14] p-3"
      >
        <Eye size={16} className="text-purple-300" />
        <span className="text-sm text-purple-200">
          {mode === 'view_once' ? 'Tap to view once' : `Tap to view (${isMe ? 'sender' : `${remainingViews} left`})`}
        </span>
      </button>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-700/40 bg-[#1a1525] p-3 text-purple-100">
      {messageType === 'image' ? (
        <img src={content} alt="Ephemeral" className="max-h-72 w-full rounded-lg object-cover" />
      ) : messageType === 'video' ? (
        <video
          src={content}
          controls
          autoPlay
          className="max-h-72 w-full rounded-lg"
          onEnded={closeOpenedContent}
        />
      ) : (
        <p>{content}</p>
      )}

      {messageType !== 'video' ? (
        <>
          <span className="absolute right-2 top-1 text-[10px] opacity-60">{secondsLeft}s</span>
          <div
            className="absolute bottom-0 left-0 h-1 bg-red-500/80"
            style={{ width: `${(secondsLeft / 10) * 100}%`, transition: 'width 1s linear' }}
          />
        </>
      ) : null}
    </div>
  );
}
