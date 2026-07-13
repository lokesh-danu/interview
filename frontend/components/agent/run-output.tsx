'use client';

import type { AgentRun } from '@/types';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface RunOutputProps {
  run: AgentRun | null;
  onClose: () => void;
}

export function RunOutput({ run, onClose }: RunOutputProps) {
  if (!run) return null;

  return (
    <Dialog open={!!run} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Agent Run Output</DialogTitle>
        <DialogDescription>
          Run ID: {run.id} &bull; {new Date(run.startedAt).toLocaleString()}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 space-y-4">
        {run.prompt && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Prompt</h4>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-md p-3">{run.prompt}</p>
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-1">Documents</h4>
          <p className="text-sm text-gray-600">{run.documentIds.length} document(s) processed</p>
        </div>

        {run.output && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Output</h4>
            <div className="text-sm text-gray-600 bg-gray-50 rounded-md p-4 whitespace-pre-wrap">
              {run.output}
            </div>
          </div>
        )}

        {run.error && (
          <div>
            <h4 className="text-sm font-medium text-red-700 mb-1">Error</h4>
            <p className="text-sm text-red-600 bg-red-50 rounded-md p-3">{run.error}</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
