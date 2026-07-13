'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

const mockDocuments = [
  { id: 'doc-1', name: 'Q4 Revenue Report.pdf', status: 'ready' },
  { id: 'doc-2', name: 'Product Roadmap 2026.pptx', status: 'ready' },
  { id: 'doc-3', name: 'Customer Survey Results.xlsx', status: 'ready' },
  { id: 'doc-4', name: 'Engineering Sprint Retro.pdf', status: 'ready' },
  { id: 'doc-6', name: 'Budget Forecast 2026.xlsx', status: 'ready' },
];

interface RunTriggerProps {
  onRunTriggered: (documentIds: string[], prompt?: string) => void;
}

export function RunTrigger({ onRunTriggered }: RunTriggerProps) {
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');

  const toggleDoc = (docId: string) => {
    setSelectedDocs((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleRun = () => {
    if (selectedDocs.length === 0) return;
    onRunTriggered(selectedDocs, prompt || undefined);
    setPrompt('');
    setSelectedDocs([]);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Trigger New Run</h3>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select documents (required):</label>
        <div className="flex flex-wrap gap-2">
          {mockDocuments.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => toggleDoc(doc.id)}
              className={`
                inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer
                ${selectedDocs.includes(doc.id)
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                }
              `}
            >
              {selectedDocs.includes(doc.id) ? '☑' : '☐'} {doc.name}
            </button>
          ))}
        </div>
        {selectedDocs.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">Click on documents above to select them</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Prompt (optional):</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Summarize key financial metrics and projections..."
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <Button
        onClick={handleRun}
        disabled={selectedDocs.length === 0}
      >
        Run Agent {selectedDocs.length > 0 && `(${selectedDocs.length} doc${selectedDocs.length > 1 ? 's' : ''} selected)`}
      </Button>
    </div>
  );
}
