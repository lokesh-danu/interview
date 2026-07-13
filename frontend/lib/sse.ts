'use client';

import type { Source } from '@/types';

interface SSEOptions {
  onDelta?: (content: string) => void;
  onSources?: (sources: Source[]) => void;
  onDone?: (messageId: string) => void;
  onError?: (error: string) => void;
  onOpen?: () => void;
}

export function createSSEConnection(
  _chatId: string,
  content: string,
  options: SSEOptions
): { close: () => void } {
  const { onDelta, onSources, onDone, onError, onOpen } = options;

  let cancelled = false;

  const simulate = async () => {
    onOpen?.();

    await new Promise((r) => setTimeout(r, 200));
    if (cancelled) return;

    const fullResponse = `Based on your documents, here is my analysis of "${content}":\n\nThis is a simulated streaming response. In production, this would connect to a real SSE endpoint that streams AI-generated content based on your uploaded documents.\n\nKey findings:\n1. Document analysis complete\n2. Relevant sections identified\n3. Summary generated`;

    const words = fullResponse.split(' ');

    for (let i = 0; i < words.length; i++) {
      if (cancelled) return;
      const word = words[i] + (i < words.length - 1 ? ' ' : '');
      onDelta?.(word);
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 50));
    }

    if (cancelled) return;

    onSources?.([
      {
        documentId: 'doc-1',
        documentName: 'Q4 Revenue Report.pdf',
        page: 3,
        excerpt: 'Relevant excerpt from the document...',
      },
    ]);

    await new Promise((r) => setTimeout(r, 200));
    if (cancelled) return;

    onDone?.(`msg-${Date.now()}`);
  };

  simulate().catch((err) => {
    if (!cancelled) {
      onError?.(err instanceof Error ? err.message : 'Stream failed');
    }
  });

  return {
    close: () => {
      cancelled = true;
    },
  };
}
