// Types for content/demo.json (keep in sync with schema/demo.schema.json) and pure selectors.

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

export const STONE_STYLES = ['solid', 'engraving', 'outline'] as const;
export type StoneStyle = (typeof STONE_STYLES)[number];

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

export type World = {
  readonly id: string;
  readonly title: string;
  readonly period: string;
  readonly voice: Voice;
  readonly certainty: Certainty;
  readonly audio: { readonly src: string; readonly caption: string; readonly synthetic: boolean };
  readonly stone: { readonly style: StoneStyle };
  readonly claims: readonly Claim[];
};

export type Content = {
  readonly object: { readonly id: string; readonly title: string };
  readonly worlds: readonly World[];
};

export type ClaimInWorld = { readonly claim: Claim; readonly world: World; readonly worldIndex: number };

export const allClaims = (content: Content): ClaimInWorld[] =>
  content.worlds.flatMap((world, worldIndex) => world.claims.map((claim) => ({ claim, world, worldIndex })));

export const findClaim = (content: Content, claimId: string): ClaimInWorld | undefined =>
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
