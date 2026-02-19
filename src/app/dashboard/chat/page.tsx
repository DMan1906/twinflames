// src/app/dashboard/chat/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { appwriteClient } from '@/lib/appwrite/client';
import { sendMessage, decryptMessagePayload } from '@/actions/chat';
import { getCurrentProfile } from '@/actions/auth';
import { Send, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';

type Message = {
  $id: string;
  sender_id: string;
  content: string; // Plaintext after decryption
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [userId, setUserId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch Auth & Subscribe to WebSockets
// 1. Fetch Auth, History & Subscribe to WebSockets
useEffect(() => {
  async function initChat() {
    // A. Auth & Setup
    const auth = await getCurrentProfile();
    if (!auth.success || !auth.profile) return;
    
    setUserId(auth.userId!);
    setPartnerId(auth.profile.partner_id);

    const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const MSG_ID = process.env.NEXT_PUBLIC_APPWRITE_MESSAGES_COLLECTION_ID!;
    
    // B. Generate Chat ID (predictable unique ID for this couple)
    const chatId = [auth.userId, auth.profile.partner_id].sort().join('_');

    // C. Fetch History from Database
    const { databases } = await import('@/lib/appwrite/client');
    const { Query } = await import('appwrite');
    
    try {
      const history = await databases.listDocuments(DB_ID, MSG_ID, [
        Query.equal('chat_id', chatId),
        Query.orderAsc('$createdAt'),
        Query.limit(50)
      ]);

      // D. Decrypt history on the server side
      const decryptedMessages = await Promise.all(
        history.documents.map(async (doc) => {
          const res = await decryptMessagePayload(doc.content);
          return { 
            $id: doc.$id, 
            sender_id: doc.sender_id, 
            content: res.success ? res.plaintext! : '[Encrypted Message]' 
          };
        })
      );
      setMessages(decryptedMessages);
    } catch (e) {
      console.error("Could not load history. Check Appwrite permissions.", e);
    }

    // E. Real-time Subscription (Updated to filter by chat_id)
    const unsubscribe = appwriteClient.subscribe(
      `databases.${DB_ID}.collections.${MSG_ID}.documents`,
      async (response) => {
        if (response.events.includes('databases.*.collections.*.documents.*.create')) {
          const doc = response.payload as any;

          // Only process if it belongs to this specific chat_id
          if (doc.chat_id === chatId) {
            const decrypted = await decryptMessagePayload(doc.content);
            if (decrypted.success) {
              setMessages((prev) => [
                ...prev, 
                { $id: doc.$id, sender_id: doc.sender_id, content: decrypted.plaintext! }
              ]);
            }
          }
        }
      }
    );

    return () => unsubscribe();
  }
  initChat();
}, []);
  // 2. Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Handle Sending
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId || !partnerId) return;

    const contentToSend = newMessage;
    setNewMessage(''); // Optimistically clear input

    // Pass plaintext to the Server Action, where it is encrypted and saved
    await sendMessage(userId, partnerId, contentToSend, 'text');
  };

  return (
    <main className="flex flex-col h-screen bg-[#0d0a14] pt-4 pb-20">
      <header className="px-6 py-4 border-b border-purple-900/50 bg-[#0d0a14]/90 backdrop-blur-md sticky top-0 z-10">
        <h1 className="text-xl font-serif text-white">Private Space</h1>
      </header>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender_id === userId;
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
                {msg.content}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#1a1525] border-t border-purple-900/50">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button type="button" className="p-3 text-purple-400 hover:text-purple-300 transition-colors bg-[#0d0a14] rounded-full">
            <ImageIcon size={20} />
          </button>
          
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Whisper something..."
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