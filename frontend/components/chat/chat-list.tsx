'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Chat } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface ChatListProps {
  chats: Chat[];
  isLoading: boolean;
  onNewChat: () => void;
}

export function ChatList({ chats, isLoading, onNewChat }: ChatListProps) {
  const pathname = usePathname();

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <Button variant="secondary" className="w-full" onClick={onNewChat}>
          + New Chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chats.map((chat) => {
          const isActive = pathname === `/workspace/chats/${chat.id}`;
          return (
            <Link
              key={chat.id}
              href={`/workspace/chats/${chat.id}`}
              className={`
                block px-3 py-2 rounded-lg text-sm transition-colors
                ${isActive
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <div className="truncate">{chat.title}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {new Date(chat.updatedAt).toLocaleDateString()}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
