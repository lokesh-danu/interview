'use client';

import type { AgentRun } from '@/types';

interface RunCardProps {
  run: AgentRun;
  onViewFull: (run: AgentRun) => void;
}

export function RunCard({ run, onViewFull }: RunCardProps) {
  const statusConfig = {
    pending: { color: 'bg-gray-100 text-gray-700', icon: '⏳', label: 'Pending' },
    running: { color: 'bg-blue-100 text-blue-700', icon: '◐', label: 'Running' },
    completed: { color: 'bg-green-100 text-green-700', icon: '●', label: 'Completed' },
    failed: { color: 'bg-red-100 text-red-700', icon: '✕', label: 'Failed' },
  };

  const { color, icon, label } = statusConfig[run.status];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    return `${diffDays} days ago`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
          <span className={run.status === 'running' ? 'animate-spin' : ''}>{icon}</span>
          {label}
        </span>
        <span className="text-xs text-gray-500">
          {formatTime(run.startedAt)}
        </span>
      </div>

      {run.prompt && (
        <p className="text-sm text-gray-700 mb-3 line-clamp-2">
          <span className="font-medium">Prompt:</span> {run.prompt}
        </p>
      )}

      {run.output && (
        <div className="bg-gray-50 rounded-md p-3 mb-3">
          <p className="text-sm text-gray-700 line-clamp-3">{run.output}</p>
        </div>
      )}

      {run.error && (
        <div className="bg-red-50 rounded-md p-3 mb-3">
          <p className="text-sm text-red-700">{run.error}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Docs: {run.documentIds.length} document{run.documentIds.length !== 1 ? 's' : ''}
        </p>
        {run.output && (
          <button
            onClick={() => onViewFull(run)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            View Full
          </button>
        )}
      </div>
    </div>
  );
}
