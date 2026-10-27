// Expert approvals are kept as overrides on top of an example's content.json, so the content file stays
// the source of truth and the editor's changes can be exported or thrown away.
import type { Approval, Content } from './content.ts';

export type Overrides = Readonly<Record<string, Approval>>;

export const applyOverrides = (content: Content, overrides: Overrides): Content => ({
  ...content,
  contexts: content.contexts.map((context) => ({
    ...context,
    claims: context.claims.map((claim) => (overrides[claim.id] ? { ...claim, approval: overrides[claim.id]! } : claim)),
  })),
});

export const markReviewed = (overrides: Overrides, claimId: string, by: string, date: string): Overrides => ({
  ...overrides,
  [claimId]: { status: 'reviewed', by, date },
});

export const approve = (overrides: Overrides, claimId: string, by: string, date: string): Overrides => ({
  ...overrides,
  [claimId]: { status: 'approved', by, date },
});

/** localStorage is editable by anyone with dev tools, so keep only well-formed entries. */
export const parseOverrides = (raw: string | null): Overrides => {
  try {
    const data: unknown = JSON.parse(raw ?? '{}');
    if (typeof data !== 'object' || data === null) return {};
    return Object.fromEntries(
      Object.entries(data).filter(([, value]) => {
        const a = value as Partial<Approval> | null;
        return (
          !!a &&
          ['draft', 'reviewed', 'approved'].includes(a.status ?? '') &&
          (a.by === null || typeof a.by === 'string') &&
          (a.date === null || typeof a.date === 'string')
        );
      }),
    ) as Overrides;
  } catch {
    return {};
  }
};

export const STORAGE_KEY = 'layered-past-xr:approvals';

export const loadOverrides = (): Overrides => {
  try {
    return parseOverrides(localStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
};

export const saveOverrides = (overrides: Overrides): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    return true;
  } catch {
    return false;
  }
};

export const today = (now = new Date()): string => now.toISOString().slice(0, 10);
