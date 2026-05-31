import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { SetupTemplate, useSetupTemplates } from '../lib/queries';
import { cls } from '../lib/format';

const PENDING_KEY = 'ft_onboarding_pending_v1';

export function markOnboardingPending() {
  localStorage.setItem(PENDING_KEY, '1');
}

export function clearOnboardingPending() {
  localStorage.removeItem(PENDING_KEY);
}

export function isOnboardingPending() {
  return localStorage.getItem(PENDING_KEY) === '1';
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const templates = useSetupTemplates();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const items = templates.data?.items ?? [];
  const selected = useMemo(
    () => items.find((template) => template.id === selectedId) ?? items[0],
    [items, selectedId],
  );

  const apply = useMutation({
    mutationFn: (templateId: string) =>
      api.post<{ created: Record<string, number> }>('/api/setup/apply-template', { templateId }),
    onSuccess: async () => {
      clearOnboardingPending();
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['accounts'] }),
        qc.invalidateQueries({ queryKey: ['categories'] }),
        qc.invalidateQueries({ queryKey: ['tags'] }),
        qc.invalidateQueries({ queryKey: ['recurring'] }),
      ]);
      toast.success('Setup applied');
      navigate('/');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const skip = () => {
    clearOnboardingPending();
    navigate('/');
  };

  if (templates.isLoading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="card">
        <div className="font-semibold">Setup unavailable</div>
        <button className="btn-secondary mt-3" onClick={skip}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Setup workspace</h1>
          <p className="text-sm text-muted mt-1">
            Choose a starter setup, review what will be created, then apply it.
          </p>
        </div>
        <button className="btn-secondary self-start sm:self-auto" onClick={skip}>
          Skip
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-2">
          {items.map((template) => (
            <button
              key={template.id}
              onClick={() => setSelectedId(template.id)}
              className={cls(
                'card w-full text-left transition',
                selected.id === template.id ? 'ring-2 ring-primary' : 'hover:border-primary',
              )}
            >
              <div className="font-semibold">{template.name.id}</div>
              <div className="text-sm text-muted mt-1">{template.description.id}</div>
            </button>
          ))}
        </div>

        <TemplateReview template={selected} applying={apply.isPending} onApply={() => apply.mutate(selected.id)} />
      </div>
    </div>
  );
}

function TemplateReview({
  template,
  applying,
  onApply,
}: {
  template: SetupTemplate;
  applying: boolean;
  onApply: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{template.name.id}</h2>
            <p className="text-sm text-muted mt-1">{template.description.id}</p>
          </div>
          <button className="btn-primary self-start sm:self-auto" disabled={applying} onClick={onApply}>
            {applying ? 'Applying...' : 'Apply setup'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <PreviewBlock title="Accounts" items={template.accounts.map((item) => `${item.name.id} · ${item.type}`)} />
        <PreviewBlock
          title="Income categories"
          items={template.categories
            .filter((item) => item.type === 'INCOME')
            .map((item) => item.name.id)}
        />
        <PreviewBlock
          title="Expense categories"
          items={template.categories
            .filter((item) => item.type === 'EXPENSE')
            .map((item) => item.name.id)}
        />
        <PreviewBlock title="Tags" items={template.tags.map((item) => item.name)} />
        <PreviewBlock
          title="Recurring suggestions"
          items={
            template.recurringRules.length
              ? template.recurringRules.map((item) => item.note.id)
              : ['No recurring suggestions']
          }
        />
        <PreviewBlock title="Insight priorities" items={template.insightPriorities} />
      </div>
    </div>
  );
}

function PreviewBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="card">
      <h3 className="font-semibold mb-3">{title}</h3>
      <ul className="space-y-2 text-sm">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
