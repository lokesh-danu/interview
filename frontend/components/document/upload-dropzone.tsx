'use client';

import { useCallback, useState } from 'react';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxSizeBytes?: number;
  accept?: string[];
}

const DEFAULT_ACCEPT = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function UploadDropzone({
  onFilesSelected,
  maxSizeBytes = 50 * 1024 * 1024, // 50MB
  accept = DEFAULT_ACCEPT,
}: UploadDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: File[]) => {
      const valid: File[] = [];
      const errors: string[] = [];

      files.forEach((file) => {
        if (!accept.includes(file.type)) {
          errors.push(`${file.name}: Invalid file type`);
        } else if (file.size > maxSizeBytes) {
          errors.push(`${file.name}: File too large (max ${maxSizeBytes / (1024 * 1024)}MB)`);
        } else {
          valid.push(file);
        }
      });

      if (errors.length > 0) {
        setError(errors.join(', '));
        setTimeout(() => setError(null), 5000);
      }

      return valid;
    },
    [accept, maxSizeBytes]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
    },
    [onFilesSelected, validateFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const validFiles = validateFiles(files);
      if (validFiles.length > 0) {
        onFilesSelected(validFiles);
      }
      e.target.value = '';
    },
    [onFilesSelected, validateFiles]
  );

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
        `}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <div className="text-4xl mb-3">📁</div>
        <p className="text-sm font-medium text-gray-700">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PDF, PPTX, XLSX — Max {maxSizeBytes / (1024 * 1024)}MB
        </p>
        <input
          id="file-input"
          type="file"
          multiple
          accept={accept.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
