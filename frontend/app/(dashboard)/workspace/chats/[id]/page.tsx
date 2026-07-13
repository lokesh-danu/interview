'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import type { ChatMessage, Source } from '@/types';
import { ChatView } from '@/components/chat/chat-view';

const mockMessagesByChat: Record<string, ChatMessage[]> = {
  'chat-1': [
    {
      id: 'msg-1',
      chatId: 'chat-1',
      role: 'user',
      content: 'Summarise the Q4 revenue highlights.',
      createdAt: '2026-06-02T10:00:00Z',
    },
    {
      id: 'msg-2',
      chatId: 'chat-1',
      role: 'assistant',
      content: 'Q4 revenue grew 18% YoY to $14.2 M, driven primarily by the enterprise segment (+27%). ARR closed at $52 M. Key risks flagged in the report include slower SMB growth and increased churn in the APAC region.',
      sources: [
        { documentId: 'doc-1', documentName: 'Q4 Revenue Report.pdf', page: 3, excerpt: 'Total revenue for Q4 reached $14.2M, an 18% increase year-over-year...' },
        { documentId: 'doc-1', documentName: 'Q4 Revenue Report.pdf', page: 7, excerpt: 'ARR stood at $52M at the close of Q4, up from $44M at the end of Q3...' },
      ],
      createdAt: '2026-06-02T10:01:00Z',
    },
  ],
  'chat-2': [
    {
      id: 'msg-3',
      chatId: 'chat-2',
      role: 'user',
      content: 'What are the top three priorities on the 2026 roadmap?',
      createdAt: '2026-06-04T09:00:00Z',
    },
    {
      id: 'msg-4',
      chatId: 'chat-2',
      role: 'assistant',
      content: 'The top three priorities are: (1) real-time collaboration features, (2) AI-powered document insights, and (3) enterprise SSO and compliance tooling. These align closely with the customer survey feedback showing 72% demand for collaboration and 64% for AI features.',
      sources: [
        { documentId: 'doc-2', documentName: 'Product Roadmap 2026.pptx', page: 4, excerpt: 'Priority 1: Real-time collaboration — Q1-Q2 2026...' },
        { documentId: 'doc-3', documentName: 'Customer Survey Results.xlsx', excerpt: '72% of respondents rated real-time collaboration as "very important"...' },
      ],
      createdAt: '2026-06-04T09:02:00Z',
    },
  ],
};

let nextMsgId = 100;

export default function ChatViewPage() {
  const params = useParams();
  const chatId = params.id as string;
  const [messages, setMessages] = useState<ChatMessage[]>(mockMessagesByChat[chatId] || []);
  const [isStreaming, setIsStreaming] = useState(false);
  const streamingRef = useRef(false);

  const handleSend = (content: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${nextMsgId++}`,
      chatId,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);
    streamingRef.current = true;

    const sources: Source[] = [
      { documentId: 'doc-1', documentName: 'Q4 Revenue Report.pdf', page: 3, excerpt: 'Relevant excerpt from the document...' },
    ];

    const fullResponse = `Based on your documents, here is my analysis of "${content}":\n\nThis is a simulated response. In production, this would connect to a real AI backend that analyzes your uploaded documents.\n\nKey findings:\n1. Document analysis complete\n2. Relevant sections identified\n3. Summary generated`;

    const words = fullResponse.split(' ');
    let wordIndex = 0;
    let streamedContent = '';

    const streamInterval = setInterval(() => {
      if (!streamingRef.current || wordIndex >= words.length) {
        clearInterval(streamInterval);
        if (streamingRef.current) {
          setIsStreaming(false);
          streamingRef.current = false;
          setMessages((prev) => {
            const withoutStreaming = prev.filter((m) => m.id !== 'streaming');
            return [
              ...withoutStreaming,
              {
                id: `msg-${nextMsgId++}`,
                chatId,
                role: 'assistant' as const,
                content: streamedContent,
                sources,
                createdAt: new Date().toISOString(),
              },
            ];
          });
        }
        return;
      }

      streamedContent += words[wordIndex] + (wordIndex < words.length - 1 ? ' ' : '');
      wordIndex++;

      setMessages((prev) => {
        const withoutStreaming = prev.filter((m) => m.id !== 'streaming');
        return [
          ...withoutStreaming,
          {
            id: 'streaming',
            chatId,
            role: 'assistant' as const,
            content: streamedContent,
            sources,
            createdAt: new Date().toISOString(),
          },
        ];
      });
    }, 40);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900">Chat</h1>
      </div>
      <div className="flex-1 bg-white border border-gray-200 rounded-lg overflow-hidden">
        <ChatView
          messages={messages}
          isLoading={false}
          isStreaming={isStreaming}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
