'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Dropdown, type DropdownOption } from '@/components/ui/dropdown';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { User } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  }, []);

  const userOptions: DropdownOption[] = users.map((u) => ({
    label: `${u.name} <${u.email}>`,
    value: u.id,
  }));

  const handleContinue = () => {
    const user = users.find((u) => u.id === selectedUserId);
    if (!user) return;

    setSubmitting(true);

    useWorkspaceStore.getState().setCurrentUser(user);
    useWorkspaceStore.getState().setCurrentOrg({
      id: '1',
      name: 'Acme Corp',
      slug: 'acme',
    });
    document.cookie = `userId=${user.id};path=/`;

    router.push('/workspace');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      {/* Subtle grain overlay */}
      <div className="pointer-events-none fixed inset-0 opacity-[0.03] [background-image:url('data:image/svg+xml;charset=utf-8,%3Csvg%20viewBox%3D%220%200%20256%20256%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noise%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.85%22%20numOctaves%3D%224%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noise)%22%2F%3E%3C%2Fsvg%3E')]" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl border border-[var(--foreground)]/[0.06] bg-white/[0.6] p-10 shadow-[0_1px_3px_rgba(0,0,0,0.04)] backdrop-blur-sm dark:bg-[var(--background)]/60">
          {/* Logo / brand mark */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--foreground)]/[0.05]">
              <svg
                className="h-5 w-5 text-[var(--foreground)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18 18.72a9.094 9.094 0 003.741-3.741M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.008H9.375V9.75zm3.375 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.008h-.008V9.75z"
                />
              </svg>
            </div>
            <h1 className="font-[family-name:var(--font-geist-sans)] text-xl font-semibold tracking-[-0.02em] text-[var(--foreground)]">
              Collaborative Workspace
            </h1>
            <p className="mt-1.5 text-sm text-[var(--foreground)]/50">
              Upload, chat, and run agents on your documents
            </p>
          </div>

          {/* Content */}
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          ) : (
            <div className="space-y-5">
              <Dropdown
                label="Select user to continue"
                options={userOptions}
                placeholder="Choose an account..."
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              />

              <Button
                className="w-full"
                size="lg"
                disabled={!selectedUserId}
                isLoading={submitting}
                onClick={handleContinue}
              >
                Continue
              </Button>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p className="mt-6 text-center text-xs text-[var(--foreground)]/30">
          No account needed &middot; pick any user to explore
        </p>
      </div>
    </div>
  );
}
