'use client';

interface StatusBadgeProps {
  status: 'uploaded' | 'processing' | 'ready' | 'failed';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    uploaded: { color: 'bg-blue-100 text-blue-700', label: 'Uploaded' },
    processing: { color: 'bg-yellow-100 text-yellow-700', label: 'Processing' },
    ready: { color: 'bg-green-100 text-green-700', label: 'Ready' },
    failed: { color: 'bg-red-100 text-red-700', label: 'Failed' },
  };

  const { color, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'processing' ? 'animate-pulse' : ''} ${
        status === 'ready' ? 'bg-green-500' : status === 'failed' ? 'bg-red-500' : status === 'processing' ? 'bg-yellow-500' : 'bg-blue-500'
      }`} />
      {label}
    </span>
  );
}
