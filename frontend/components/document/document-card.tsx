'use client';

import type { Document } from '@/types';
import { StatusBadge } from './status-badge';
import { Button } from '@/components/ui/button';

interface DocumentCardProps {
  document: Document;
  onDelete: (id: string) => void;
  onChat: (id: string) => void;
}

export function DocumentCard({ document: doc, onDelete, onChat }: DocumentCardProps) {
  const typeIcons: Record<Document['type'], string> = {
    pdf: '📄',
    pptx: '📊',
    xlsx: '📈',
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <span className="text-2xl">{typeIcons[doc.type]}</span>
        <div>
          <h3 className="text-sm font-medium text-gray-900">{doc.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {doc.type.toUpperCase()} • {formatSize(doc.size)} • {new Date(doc.uploadedAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <StatusBadge status={doc.status} />
        {doc.status === 'ready' && (
          <Button variant="ghost" size="sm" onClick={() => onChat(doc.id)}>
            Chat
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onDelete(doc.id)} className="text-red-600 hover:text-red-700">
          Delete
        </Button>
      </div>
    </div>
  );
}
