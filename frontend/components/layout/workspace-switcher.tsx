'use client';

import { useWorkspaceStore } from '@/stores/workspace-store';

export function WorkspaceSwitcher() {
  const { currentOrg } = useWorkspaceStore();

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 cursor-pointer hover:bg-gray-100">
      <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
        {currentOrg?.name?.charAt(0) || 'W'}
      </div>
      <span className="text-sm font-medium text-gray-900 flex-1 truncate">
        {currentOrg?.name || 'Select Workspace'}
      </span>
      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
