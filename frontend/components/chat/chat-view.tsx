'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatViewProps {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  onSend: (content: string) => void;
}

export function ChatView({ messages, isLoading, isStreaming, onSend }: ChatViewProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-2/3 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No messages yet</p>
            <p className="text-sm mt-1">Ask a question about your documents</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        {isStreaming && (
          <MessageBubble
            message={{
              id: 'streaming',
              chatId: '',
              role: 'assistant',
              content: '',
              createdAt: new Date().toISOString(),
            }}
            isStreaming
          />
        )}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput onSend={onSend} disabled={isStreaming} />
    </div>
  );
}
