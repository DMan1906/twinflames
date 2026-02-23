// src/app/dashboard/chat/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { appwriteClient } from '@/lib/appwrite/client';
import {
  sendMessage,
  decryptMessagePayload,
  markMessageSeen,
  getChatDeletePeriod,
  setChatDeletePeriod,
  type ChatDeletePeriod,
  type ChatDeliveryMode,
} from '@/actions/chat';
import { getCurrentProfile } from '@/actions/auth';
import { Send, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import EphemeralMessage from '@/components/EphemeralMessage';

type Message = {
  $id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'video';
  delivery_mode: ChatDeliveryMode;
  delete_period: ChatDeletePeriod;
  expires_at: string;
  seen_by_json: string;
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video'>('text');
  const [userId, setUserId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [chatId, setChatId] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<ChatDeliveryMode>('keep');
  const [deletePeriod, setDeletePeriodState] = useState<ChatDeletePeriod>('never');
  const [savingPeriod, setSavingPeriod] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  async function loadHistory(currentUserId: string, currentChatId: string) {
    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const MSG_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;
    const { databases } = await import('@/lib/appwrite/client');
    const { Query } = await import('appwrite');

    try {
      const history = await databases.listDocuments(DB_ID, MSG_ID, [
        Query.equal('chat_id', currentChatId),
        Query.orderAsc('$createdAt'),
        Query.limit(150)
      ]);

      const decryptedMessages = await Promise.all(
        history.documents.map(async (doc) => {
          const res = await decryptMessagePayload(String(doc.content));
          return {
            $id: String(doc.$id),
            sender_id: String(doc.sender_id),
            content: res.success ? res.plaintext! : '[Encrypted Message]',
            message_type: String(doc.message_type || 'text') as 'text' | 'image' | 'video',
            delivery_mode: (String(doc.delivery_mode || 'keep') as ChatDeliveryMode),
            delete_period: (String(doc.delete_period || 'never') as ChatDeletePeriod),
            expires_at: String(doc.expires_at || ''),
            seen_by_json: String(doc.seen_by_json || '[]'),
          } satisfies Message;
        })
      );

      setMessages(decryptedMessages);

      const unseenPartnerMessages = history.documents.filter((doc) => String(doc.sender_id) !== currentUserId);
      await Promise.all(unseenPartnerMessages.map((doc) => markMessageSeen(String(doc.$id), currentUserId)));
    } catch (e) {
      console.error("Could not load history. Check Appwrite permissions.", e);
    }
  }

  useEffect(() => {
    async function initChat() {
      const auth = await getCurrentProfile();
      if (!auth.success || !auth.profile) return;

      const currentUserId = auth.userId!;
      const currentPartnerId = String(auth.profile.partner_id || '');
      const currentChatId = [currentUserId, currentPartnerId].sort().join('_');

      setUserId(currentUserId);
      setPartnerId(currentPartnerId);
      setChatId(currentChatId);

      const period = await getChatDeletePeriod(currentUserId, currentPartnerId);
      if (period.success) {
        setDeletePeriodState(period.period);
      }

      await loadHistory(currentUserId, currentChatId);

      const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
      const MSG_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;

      const unsubscribe = appwriteClient.subscribe(
        `databases.${DB_ID}.collections.${MSG_ID}.documents`,
        async (response) => {
          const payload = response.payload as { chat_id?: string; $id?: string; sender_id?: string };
          if (payload.chat_id !== currentChatId) return;

          await loadHistory(currentUserId, currentChatId);

          if (payload.$id && payload.sender_id && String(payload.sender_id) !== currentUserId) {
            await markMessageSeen(String(payload.$id), currentUserId);
            await loadHistory(currentUserId, currentChatId);
          }
        }
      );

      return () => unsubscribe();
    }

    initChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !partnerId) return;

    const contentToSend = newMessage.trim();
    setNewMessage('');
    await sendMessage(userId, partnerId, contentToSend, messageType, deliveryMode, deletePeriod);
    await loadHistory(userId, chatId);
  };

  const handleDeletePeriodChange = async (period: ChatDeletePeriod) => {
    if (!userId || !partnerId) return;
    setDeletePeriodState(period);
    setSavingPeriod(true);
    await setChatDeletePeriod(userId, partnerId, period);
    setSavingPeriod(false);
  };

  const shouldHideInChat = (message: Message) => {
    if (!message.expires_at) return false;
    const expiresAt = new Date(message.expires_at).getTime();
    if (!Number.isFinite(expiresAt)) return false;
    return Date.now() >= expiresAt;
  };

  return (
    <main className="flex flex-col h-screen bg-[#0d0a14] pt-4 pb-20">
      <header className="px-6 py-4 border-b border-purple-900/50 bg-[#0d0a14]/90 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-xl font-serif text-white">Private Space</h1>
        <p className="text-xs text-purple-300/60 mt-1">Delete period applies to new messages only</p>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === userId;
          const hidden = shouldHideInChat(msg);

          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.$id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] p-3 rounded-2xl ${
                  isMe 
                    ? 'bg-purple-600 text-white rounded-br-sm' 
                    : 'bg-[#1a1525] border border-purple-900/50 text-purple-100 rounded-bl-sm'
                }`}
              >
                {hidden ? (
                  <span className="text-xs italic opacity-70">Message expired in chat</span>
                ) : msg.delivery_mode === 'keep' ? (
                  msg.message_type === 'image' ? (
                    <img src={msg.content} alt="Shared" className="max-h-80 w-full rounded-lg object-cover" />
                  ) : msg.message_type === 'video' ? (
                    <video src={msg.content} controls className="max-h-80 w-full rounded-lg" />
                  ) : (
                    msg.content
                  )
                ) : (
                  <EphemeralMessage
                    messageId={msg.$id}
                    content={msg.content}
                    isMe={isMe}
                    messageType={msg.message_type}
                    mode={msg.delivery_mode === 'view_once' ? 'view_once' : 'replay'}
                    userId={userId}
                    onViewed={async () => {
                      await markMessageSeen(msg.$id, userId);
                      await loadHistory(userId, chatId);
                    }}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#1a1525] border-t border-purple-900/50">
        <div className="grid grid-cols-2 gap-2 mb-3">
          <select
            value={messageType}
            onChange={(event) => setMessageType(event.target.value as 'text' | 'image' | 'video')}
            className="rounded-lg border border-purple-900/40 bg-[#0d0a14] px-3 py-2 text-xs text-purple-100"
          >
            <option value="text">Type: Text</option>
            <option value="image">Type: Image URL</option>
            <option value="video">Type: Video URL</option>
          </select>

          <select
            value={deliveryMode}
            onChange={(event) => setDeliveryMode(event.target.value as ChatDeliveryMode)}
            className="rounded-lg border border-purple-900/40 bg-[#0d0a14] px-3 py-2 text-xs text-purple-100"
          >
            <option value="keep">Keep in chat</option>
            <option value="view_once">View once</option>
            <option value="replay">Allow replay (2x)</option>
          </select>

          <select
            value={deletePeriod}
            onChange={(event) => handleDeletePeriodChange(event.target.value as ChatDeletePeriod)}
            disabled={savingPeriod}
            className="rounded-lg border border-purple-900/40 bg-[#0d0a14] px-3 py-2 text-xs text-purple-100 disabled:opacity-50"
          >
            <option value="never">Delete: Never</option>
            <option value="immediate">Delete: Immediate</option>
            <option value="10m">Delete: 10 min</option>
            <option value="1h">Delete: 1 hour</option>
            <option value="1d">Delete: 1 day</option>
          </select>
        </div>

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" className="p-3 text-purple-400 hover:text-purple-300 transition-colors bg-[#0d0a14] rounded-full">
            <ImageIcon size={20} />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={messageType === 'text' ? 'Whisper something...' : messageType === 'image' ? 'Paste image URL...' : 'Paste video URL...'}
            className="flex-1 p-3 bg-[#0d0a14] text-white rounded-full border border-purple-800/50 focus:border-purple-500 focus:outline-none transition-colors"
          />
          
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-500 disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </main>
  );
}