// Types for content/demo.json (keep in sync with schema/demo.schema.json) and pure selectors.
// A context is one historical or reception context the baetyl is seen in.

export const VOICES = [
  'archaeology',
  'ancient-self-depiction',
  'european-imagination',
  'excavators',
  'community-gc',
  'community-tc',
  'institution',
  'tourism',
] as const;
export type Voice = (typeof VOICES)[number];

export const CERTAINTIES = ['documented', 'interpreted', 'hypothesis', 'imagined', 'unknown', 'absent-voice'] as const;
export type Certainty = (typeof CERTAINTIES)[number];

export const BAETYL_STYLES = ['solid', 'engraving', 'outline'] as const;
export type BaetylStyle = (typeof BAETYL_STYLES)[number];

export type ApprovalStatus = 'draft' | 'reviewed' | 'approved';
export type Approval = { readonly status: ApprovalStatus; readonly by: string | null; readonly date: string | null };

export type Evidence = { readonly citation: string; readonly url: string | null; readonly licence: string | null };

export type Claim = {
  readonly id: string;
  readonly title: string;
  readonly anchor: readonly [number, number, number];
  readonly text: string;
  readonly voice: Voice;
  readonly certainty: Certainty;
  readonly evidence: readonly Evidence[];
  readonly approval: Approval;
};

export type Context = {
  readonly id: string;
  readonly title: string;
  readonly period: string;
  readonly voice: Voice;
  readonly certainty: Certainty;
  readonly audio: { readonly src: string; readonly caption: string; readonly synthetic: boolean };
  /** The baetyl's own look and certainty can differ from the context's (e.g. unknown where it is not attested). */
  readonly baetyl: { readonly style: BaetylStyle; readonly certainty: Certainty };
  readonly claims: readonly Claim[];
};

export type PendingContext = { readonly id: string; readonly title: string };

export type Content = {
  readonly object: { readonly id: string; readonly title: string };
  readonly contexts: readonly Context[];
  /** Planned contexts with no content yet (see schema). */
  readonly pendingContexts?: readonly PendingContext[];
};

export type ClaimInContext = { readonly claim: Claim; readonly context: Context; readonly contextIndex: number };

export const allClaims = (content: Content): ClaimInContext[] =>
  content.contexts.flatMap((context, contextIndex) =>
    context.claims.map((claim) => ({ claim, context, contextIndex })),
  );

export const findClaim = (content: Content, claimId: string): ClaimInContext | undefined =>
  allClaims(content).find((c) => c.claim.id === claimId);

export const isApproved = (approval: Approval): boolean => approval.status === 'approved';

export const approvalLabel = (approval: Approval): string => {
  const by = approval.by ? ` by ${approval.by}` : '';
  const date = approval.date ? ` (${approval.date})` : '';
  switch (approval.status) {
    case 'draft':
      return 'Draft – not yet validated';
    case 'reviewed':
      return `Reviewed${by}${date} – not yet approved`;
    case 'approved':
      return `Approved${by}${date}`;
  }
};

export const VOICE_LABELS: Readonly<Record<Voice, string>> = {
  archaeology: 'Archaeology',
  'ancient-self-depiction': 'Ancient self-depiction',
  'european-imagination': 'European imagination',
  excavators: 'Excavators',
  'community-gc': 'Greek Cypriot community',
  'community-tc': 'Turkish Cypriot community',
  institution: 'Institution',
  tourism: 'Tourism',
};
