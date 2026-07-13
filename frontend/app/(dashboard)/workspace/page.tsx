'use client';

import { useWorkspaceStore } from '@/stores/workspace-store';

const mockStats = [
  { label: 'Documents', value: 8, icon: '📄' },
  { label: 'Chats', value: 4, icon: '💬' },
  { label: 'Agent Runs', value: 3, icon: '🤖' },
];

const mockActivity = [
  { id: 1, user: 'Bob Smith', action: 'uploaded', target: 'Q4 Revenue Report.pdf', time: '2 min ago' },
  { id: 2, user: 'Alice Chen', action: 'started chat', target: 'Revenue Analysis', time: '1 hr ago' },
  { id: 3, user: 'Agent', action: 'completed run on', target: 'Q4 Revenue Report.pdf', time: '3 hr ago' },
];

export default function WorkspacePage() {
  const { currentUser } = useWorkspaceStore();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {currentUser?.name || 'User'}
        </h1>
        <p className="text-gray-500 mt-1">Here&apos;s what&apos;s happening in your workspace</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {mockStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <span className="text-3xl">{stat.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {mockActivity.map((item) => (
            <div key={item.id} className="flex items-center gap-3 text-sm">
              <span className="text-gray-400">•</span>
              <span className="text-gray-700">
                <span className="font-medium">{item.user}</span>
                {' '}{item.action}{' '}
                <span className="font-medium">{item.target}</span>
              </span>
              <span className="text-gray-400 ml-auto">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
