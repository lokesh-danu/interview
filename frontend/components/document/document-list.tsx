'use client';

import type { Document } from '@/types';
import { DocumentCard } from './document-card';
import { Skeleton } from '@/components/ui/skeleton';

interface DocumentListProps {
  documents: Document[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  onChat: (id: string) => void;
}

export function DocumentList({ documents, isLoading, onDelete, onChat }: DocumentListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No documents yet</p>
        <p className="text-sm mt-1">Upload your first document to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.id}
          document={doc}
          onDelete={onDelete}
          onChat={onChat}
        />
      ))}
    </div>
  );
}
