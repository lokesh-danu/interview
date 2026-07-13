'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Chat } from '@/types';
import { ChatList } from '@/components/chat/chat-list';

const mockChats: Chat[] = [
  { id: 'chat-1', title: 'Q4 revenue summary', createdAt: '2026-06-02T10:00:00Z', updatedAt: '2026-06-02T10:25:00Z', documentIds: ['doc-1'] },
  { id: 'chat-2', title: 'Roadmap priorities', createdAt: '2026-06-04T09:00:00Z', updatedAt: '2026-06-04T09:45:00Z', documentIds: ['doc-2', 'doc-3'] },
  { id: 'chat-3', title: 'Sprint retro action items', createdAt: '2026-06-08T14:00:00Z', updatedAt: '2026-06-08T14:30:00Z', documentIds: ['doc-4'] },
  { id: 'chat-4', title: 'Budget vs forecast', createdAt: '2026-06-12T11:00:00Z', updatedAt: '2026-06-12T11:20:00Z', documentIds: ['doc-1', 'doc-6'] },
];

let nextChatId = 5;

export default function ChatsPage() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>(mockChats);

  const handleNewChat = () => {
    const newChat: Chat = {
      id: `chat-${nextChatId++}`,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documentIds: [],
    };
    setChats((prev) => [newChat, ...prev]);
    router.push(`/workspace/chats/${newChat.id}`);
  };

  return (
    <div className="h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Chats</h1>
        <p className="text-gray-500 mt-1">Ask questions about your documents</p>
      </div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden" style={{ height: 'calc(100% - 100px)' }}>
        <ChatList chats={chats} isLoading={false} onNewChat={handleNewChat} />
      </div>
    </div>
  );
}
