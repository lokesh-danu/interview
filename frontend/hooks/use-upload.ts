'use client';

import { useState, useCallback } from 'react';
import type { UploadState, Document } from '@/types';
import { api } from '@/lib/api';

interface UseUploadReturn {
  uploads: Map<string, UploadState>;
  uploadFiles: (files: File[]) => void;
  removeUpload: (fileId: string) => void;
}

export function useUpload(onUploadComplete?: (doc: Document) => void): UseUploadReturn {
  const [uploads, setUploads] = useState<Map<string, UploadState>>(new Map());

  const uploadFiles = useCallback(
    (files: File[]) => {
      files.forEach((file) => {
        const fileId = `${file.name}-${Date.now()}`;

        setUploads((prev) => {
          const next = new Map(prev);
          next.set(fileId, {
            file,
            progress: 0,
            status: 'uploading',
          });
          return next;
        });

        api.uploadDocument(file, (progress) => {
          setUploads((prev) => {
            const next = new Map(prev);
            const existing = next.get(fileId);
            if (existing) {
              next.set(fileId, {
                ...existing,
                progress,
                status: progress >= 100 ? 'ready' : 'uploading',
              });
            }
            return next;
          });
        }).then((doc) => {
          setUploads((prev) => {
            const next = new Map(prev);
            next.set(fileId, {
              file,
              progress: 100,
              status: 'ready',
              documentId: doc.id,
            });
            return next;
          });
          onUploadComplete?.(doc);

          setTimeout(() => {
            setUploads((prev) => {
              const next = new Map(prev);
              next.delete(fileId);
              return next;
            });
          }, 3000);
        }).catch((err) => {
          setUploads((prev) => {
            const next = new Map(prev);
            const existing = next.get(fileId);
            if (existing) {
              next.set(fileId, {
                ...existing,
                status: 'failed',
                error: err instanceof Error ? err.message : 'Upload failed',
              });
            }
            return next;
          });
        });
      });
    },
    [onUploadComplete]
  );

  const removeUpload = useCallback((fileId: string) => {
    setUploads((prev) => {
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
  }, []);

  return { uploads, uploadFiles, removeUpload };
}
