'use client';

import type { UploadState } from '@/types';

interface UploadProgressProps {
  uploads: Map<string, UploadState>;
}

export function UploadProgress({ uploads }: UploadProgressProps) {
  if (uploads.size === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">Uploads in progress:</h3>
      <div className="space-y-2">
        {Array.from(uploads.entries()).map(([id, upload]) => (
          <div key={id} className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 truncate flex-1">
                {upload.file.name}
              </span>
              <span className="text-sm text-gray-500 ml-2">
                {upload.status === 'ready' ? '✓' : `${upload.progress}%`}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  upload.status === 'failed' ? 'bg-red-500' : upload.status === 'ready' ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${upload.progress}%` }}
              />
            </div>
            {upload.error && (
              <p className="text-xs text-red-600 mt-1">{upload.error}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
