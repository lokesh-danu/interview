'use client';

import { create } from 'zustand';
import type { User, Org } from '@/types';

const defaultUser: User = {
  id: '1',
  email: 'alice@example.com',
  name: 'Alice Chen',
};

const defaultOrg: Org = {
  id: '1',
  name: 'Acme Corp',
  slug: 'acme',
};

interface WorkspaceStore {
  currentUser: User | null;
  currentOrg: Org | null;
  setCurrentUser: (user: User) => void;
  setCurrentOrg: (org: Org) => void;
  clearSession: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  currentUser: defaultUser,
  currentOrg: defaultOrg,

  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentOrg: (org) => set({ currentOrg: org }),
  clearSession: () => set({ currentUser: null, currentOrg: null }),
}));
