'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Document } from '@/types';
import { UploadDropzone } from '@/components/document/upload-dropzone';
import { UploadProgress } from '@/components/document/upload-progress';
import { DocumentList } from '@/components/document/document-list';
import { useUpload } from '@/hooks/use-upload';

const mockDocuments: Document[] = [
  { id: 'doc-1', name: 'Q4 Revenue Report.pdf', type: 'pdf', size: 2450000, status: 'ready', uploadedBy: '1', uploadedAt: '2026-06-01T09:15:00Z' },
  { id: 'doc-2', name: 'Product Roadmap 2026.pptx', type: 'pptx', size: 5120000, status: 'ready', uploadedBy: '2', uploadedAt: '2026-06-03T14:30:00Z' },
  { id: 'doc-3', name: 'Customer Survey Results.xlsx', type: 'xlsx', size: 890000, status: 'ready', uploadedBy: '1', uploadedAt: '2026-06-05T11:00:00Z' },
  { id: 'doc-4', name: 'Engineering Sprint Retro.pdf', type: 'pdf', size: 1340000, status: 'ready', uploadedBy: '3', uploadedAt: '2026-06-07T16:45:00Z' },
  { id: 'doc-5', name: 'Investor Deck Q3.pptx', type: 'pptx', size: 8900000, status: 'processing', uploadedBy: '2', uploadedAt: '2026-06-10T08:20:00Z' },
  { id: 'doc-6', name: 'Budget Forecast 2026.xlsx', type: 'xlsx', size: 1100000, status: 'ready', uploadedBy: '1', uploadedAt: '2026-06-12T10:00:00Z' },
  { id: 'doc-7', name: 'Design System Guidelines.pdf', type: 'pdf', size: 4200000, status: 'uploaded', uploadedBy: '3', uploadedAt: '2026-06-13T09:00:00Z' },
  { id: 'doc-8', name: 'Competitive Analysis.xlsx', type: 'xlsx', size: 670000, status: 'failed', uploadedBy: '2', uploadedAt: '2026-06-14T13:10:00Z', error: 'Unsupported formula engine detected' },
];

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>(mockDocuments);

  const handleUploadComplete = useCallback((doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
  }, []);

  const { uploads, uploadFiles } = useUpload(handleUploadComplete);

  const handleDelete = async (id: string) => {
    await api.deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleChat = (docId: string) => {
    router.push(`/workspace/chats?docId=${docId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-500 mt-1">Upload and manage your workspace documents</p>
      </div>

      <UploadDropzone onFilesSelected={uploadFiles} />

      <UploadProgress uploads={uploads} />

      <DocumentList
        documents={documents}
        isLoading={false}
        onDelete={handleDelete}
        onChat={handleChat}
      />
    </div>
  );
}
