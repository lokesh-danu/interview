'use client';

import { useWorkspaceStore } from '@/stores/workspace-store';

export function Header() {
  const { currentUser } = useWorkspaceStore();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome back, {currentUser?.name || 'User'}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{currentUser?.email}</span>
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
            {currentUser?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
