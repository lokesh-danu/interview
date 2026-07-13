'use client';

import { useState, useCallback, useRef } from 'react';
import type { ChatMessage } from '@/types';
import { api } from '@/lib/api';
import { createSSEConnection } from '@/lib/sse';

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  loadMessages: (chatId: string) => Promise<void>;
  sendMessage: (chatId: string, content: string) => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const sseRef = useRef<{ close: () => void } | null>(null);

  const loadMessages = useCallback(async (chatId: string) => {
    setIsLoading(true);
    try {
      const msgs = await api.getChatMessages(chatId);
      setMessages(msgs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendMessage = useCallback(
    (chatId: string, content: string) => {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        chatId,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsStreaming(true);

      let streamedContent = '';

      sseRef.current = createSSEConnection(chatId, content, {
        onDelta: (delta) => {
          streamedContent += delta;
          setMessages((prev) => {
            const withoutStreaming = prev.filter((m) => m.id !== 'streaming');
            return [
              ...withoutStreaming,
              {
                id: 'streaming',
                chatId,
                role: 'assistant' as const,
                content: streamedContent,
                createdAt: new Date().toISOString(),
              },
            ];
          });
        },
        onSources: (sources) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === 'streaming' ? { ...m, sources } : m
            )
          );
        },
        onDone: (messageId) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === 'streaming' ? { ...m, id: messageId } : m
            )
          );
          setIsStreaming(false);
        },
        onError: () => {
          setIsStreaming(false);
        },
      });
    },
    []
  );

  return { messages, isLoading, isStreaming, loadMessages, sendMessage };
}
