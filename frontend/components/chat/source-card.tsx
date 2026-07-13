'use client';

import type { Source } from '@/types';

interface SourceCardProps {
  source: Source;
}

export function SourceCard({ source }: SourceCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs">
      <div className="flex items-center gap-2 mb-1">
        <span>📄</span>
        <span className="font-medium text-gray-900">{source.documentName}</span>
        {source.page && <span className="text-gray-500">— Page {source.page}</span>}
      </div>
      <p className="text-gray-600 italic">"{source.excerpt}"</p>
    </div>
  );
}
