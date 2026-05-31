import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { AssistantProposal, useAssistantProposals } from '../lib/queries';
import { cls } from '../lib/format';

type Filter = 'PENDING' | 'APPROVED' | 'EXECUTED' | 'REJECTED' | 'FAILED' | '';

export function ReviewQueuePage() {
  const [filter, setFilter] = useState<Filter>('PENDING');
  const proposals = useAssistantProposals(filter ? { status: filter } : {});

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Review queue</h1>
          <p className="text-sm text-muted mt-1">Inspect assistant proposals before they change your data.</p>
        </div>
        <select className="input w-full sm:w-48" value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="EXECUTED">Executed</option>
          <option value="REJECTED">Rejected</option>
          <option value="FAILED">Failed</option>
          <option value="">All</option>
        </select>
      </div>

      {proposals.isLoading && (
        <div className="space-y-3">
          <div className="skeleton h-32 w-full" />
          <div className="skeleton h-32 w-full" />
        </div>
      )}

      {!proposals.isLoading && (proposals.data?.items.length ?? 0) === 0 && (
        <div className="card">
          <div className="font-semibold">No proposals</div>
          <div className="text-sm text-muted mt-1">There is nothing waiting for review in this filter.</div>
        </div>
      )}

      <div className="space-y-3">
        {(proposals.data?.items ?? []).map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} />
        ))}
      </div>
    </div>
  );
}

function ProposalCard({ proposal }: { proposal: AssistantProposal }) {
  const qc = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['assistant', 'proposals'] }),
      qc.invalidateQueries({ queryKey: ['transactions'] }),
      qc.invalidateQueries({ queryKey: ['accounts'] }),
      qc.invalidateQueries({ queryKey: ['reports'] }),
    ]);
  };

  const approve = useMutation({
    mutationFn: () => api.post(`/api/assistant/proposals/${proposal.id}/approve`),
    onSuccess: async () => {
      toast.success('Proposal approved');
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: () => api.post(`/api/assistant/proposals/${proposal.id}/reject`),
    onSuccess: async () => {
      toast.success('Proposal rejected');
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const execute = useMutation({
    mutationFn: () => api.post(`/api/assistant/proposals/${proposal.id}/execute`),
    onSuccess: async () => {
      toast.success('Proposal executed');
      await refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="card space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge label={proposal.status} tone={proposal.status === 'PENDING' ? 'primary' : 'muted'} />
            <Badge label={proposal.riskLevel} tone={proposal.riskLevel === 'HIGH' ? 'danger' : 'muted'} />
            <Badge label={proposal.sourceChannel} tone="muted" />
            {proposal.clawMode !== 'NONE' && <Badge label={proposal.clawMode} tone="muted" />}
          </div>
          <h2 className="font-semibold">{proposal.summary}</h2>
          <div className="text-xs text-muted mt-1">
            {proposal.actionType} · {new Date(proposal.createdAt).toLocaleString()}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {proposal.status === 'PENDING' && (
            <>
              <button className="btn-primary" disabled={approve.isPending} onClick={() => approve.mutate()}>
                Approve
              </button>
              <button className="btn-secondary" disabled={reject.isPending} onClick={() => reject.mutate()}>
                Reject
              </button>
            </>
          )}
          {proposal.status === 'APPROVED' && (
            <button className="btn-primary" disabled={execute.isPending} onClick={() => execute.mutate()}>
              Execute
            </button>
          )}
        </div>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-muted">Proposal payload</summary>
        <pre className="mt-2 overflow-auto rounded-md bg-bg p-3 text-xs">
          {JSON.stringify(proposal.payload, null, 2)}
        </pre>
      </details>

      {proposal.failureReason && <div className="text-sm text-danger">{proposal.failureReason}</div>}
      {proposal.resultEntityId && (
        <div className="text-sm text-muted">
          Result: {proposal.resultEntity} {proposal.resultEntityId}
        </div>
      )}
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: 'primary' | 'muted' | 'danger' }) {
  return (
    <span
      className={cls(
        'rounded-md px-2 py-1 text-xs font-medium',
        tone === 'primary' && 'bg-primary text-primary-fg',
        tone === 'muted' && 'bg-bg text-muted',
        tone === 'danger' && 'bg-danger text-white',
      )}
    >
      {label}
    </span>
  );
}
