'use client';

import { useState } from 'react';
import type { AgentRun } from '@/types';
import { RunTrigger } from '@/components/agent/run-trigger';
import { RunCard } from '@/components/agent/run-card';
import { RunOutput } from '@/components/agent/run-output';

const mockRuns: AgentRun[] = [
  {
    id: 'run-1',
    status: 'completed',
    documentIds: ['doc-1', 'doc-6'],
    prompt: 'Compare Q4 actuals against the budget forecast and flag variances > 10%.',
    output: 'Three line items exceeded the 10% variance threshold: Marketing spend (+14%), Cloud infrastructure (+12%), and Contractor costs (+18%). Under-spending was observed in Travel (-22%) and Hiring (-15%).',
    startedAt: '2026-06-12T12:00:00Z',
    completedAt: '2026-06-12T12:03:45Z',
  },
  {
    id: 'run-2',
    status: 'completed',
    documentIds: ['doc-4'],
    prompt: 'Extract all action items from the sprint retro and assign owners.',
    output: 'Found 5 action items: (1) Improve PR review turnaround — Owner: Eng Lead, (2) Add staging smoke tests — Owner: QA, (3) Reduce meeting load to < 10 hrs/wk — Owner: PM, (4) Document onboarding checklist — Owner: DevRel, (5) Schedule incident drill — Owner: SRE.',
    startedAt: '2026-06-08T15:00:00Z',
    completedAt: '2026-06-08T15:02:10Z',
  },
  {
    id: 'run-3',
    status: 'failed',
    documentIds: ['doc-8'],
    prompt: 'Identify the top 5 competitors and summarize their positioning.',
    error: 'Document processing failed: unsupported formula engine.',
    startedAt: '2026-06-14T13:20:00Z',
    completedAt: '2026-06-14T13:20:05Z',
  },
];

let nextRunId = 4;

export default function AgentPage() {
  const [runs, setRuns] = useState<AgentRun[]>(mockRuns);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);

  const handleRunTriggered = (documentIds: string[], prompt?: string) => {
    const newRun: AgentRun = {
      id: `run-${nextRunId++}`,
      status: 'running',
      documentIds,
      prompt,
      startedAt: new Date().toISOString(),
    };
    setRuns((prev) => [newRun, ...prev]);

    setTimeout(() => {
      setRuns((prev) =>
        prev.map((r) =>
          r.id === newRun.id
            ? {
                ...r,
                status: 'completed' as const,
                completedAt: new Date().toISOString(),
                output: `Agent processed ${documentIds.length} document(s). Analysis complete. ${prompt ? `Prompt: "${prompt}"` : ''}`,
              }
            : r
        )
      );
    }, 2000 + Math.random() * 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agent Runs</h1>
        <p className="text-gray-500 mt-1">Run AI agents against your documents</p>
      </div>

      <RunTrigger onRunTriggered={handleRunTriggered} />

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Runs</h2>
        {runs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No runs yet</p>
            <p className="text-sm mt-1">Trigger your first agent run above</p>
          </div>
        ) : (
          <div className="space-y-3">
            {runs.map((run) => (
              <RunCard key={run.id} run={run} onViewFull={setSelectedRun} />
            ))}
          </div>
        )}
      </div>

      <RunOutput run={selectedRun} onClose={() => setSelectedRun(null)} />
    </div>
  );
}
