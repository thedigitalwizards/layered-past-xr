import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyOverrides, approve, markReviewed, parseOverrides, today } from '../src/approvals.ts';
import { approvalLabel, findClaim, type Content } from '../src/content.ts';
import { validateContent } from '../src/validate.ts';

const demo = () => JSON.parse(readFileSync(new URL('../content/demo.json', import.meta.url), 'utf8'));
const errors = (data: unknown) => {
  const result = validateContent(data, (path) => existsSync(new URL(`../public/${path}`, import.meta.url)));
  return result.ok ? [] : result.errors;
};

describe('content validation', () => {
  it('accepts the shipped demo content, including its audio files', () => {
    expect(errors(demo())).toEqual([]);
  });

  it('rejects unknown voices, certainties and approval states', () => {
    const data = demo();
    data.contexts[0].voice = 'narrator';
    data.contexts[0].claims[0].certainty = 'probable';
    data.contexts[1].claims[0].approval.status = 'signed';
    expect(errors(data)).toHaveLength(3);
  });

  it('rejects a context whose certainty has no context style yet', () => {
    const data = demo();
    data.contexts[1].certainty = 'hypothesis';
    expect(errors(data)).toEqual(['context "context-b": there is no context style for certainty "hypothesis" yet']);
  });

  it('rejects missing audio, duplicate ids and approvals without a reviewer', () => {
    const data = demo();
    data.contexts[0].audio.src = 'audio/missing.m4a';
    data.contexts[1].claims[0].id = 'a-1';
    data.contexts[2].claims[0].approval = { status: 'approved', by: null, date: null };
    expect(errors(data)).toEqual([
      'duplicate claim id "a-1"',
      'context "context-a": audio file public/audio/missing.m4a not found',
      'claim "c-1": a approved claim needs "by" and "date"',
    ]);
  });

  it('keeps every demo text a placeholder and every voice labelled synthetic', () => {
    const content = demo() as Content;
    content.contexts.forEach((context) => {
      expect(context.audio.synthetic).toBe(true);
      expect(context.claims.length).toBeGreaterThanOrEqual(2);
      context.claims.forEach((c) => expect(c.text).toContain('[Placeholder — pending heritage expert validation]'));
    });
    expect(JSON.stringify(content)).not.toMatch(/aphrodite|paphos/i);
  });
});

describe('pending contexts', () => {
  it('are empty, generic slots: no claims, no voices, no historical periods', () => {
    const data = demo();
    expect(data.pendingContexts).toHaveLength(6);
    data.pendingContexts.forEach((p: Record<string, unknown>) =>
      expect(Object.keys(p).sort()).toEqual(['id', 'title']),
    );
    expect(JSON.stringify(data)).not.toMatch(/bronze|hellenistic|roman|ottoman|british|medieval|byzantine/i);
  });
});

describe('expert approvals', () => {
  it('apply as overrides without changing the content file', () => {
    const content = demo() as Content;
    const overrides = approve(markReviewed({}, 'a-1', 'R. Expert', '2026-10-22'), 'b-2', 'R. Expert', '2026-10-23');
    const merged = applyOverrides(content, overrides);
    expect(findClaim(merged, 'a-1')?.claim.approval.status).toBe('reviewed');
    expect(findClaim(merged, 'b-2')?.claim.approval).toEqual({
      status: 'approved',
      by: 'R. Expert',
      date: '2026-10-23',
    });
    expect(findClaim(content, 'a-1')?.claim.approval.status).toBe('draft');
  });

  it('drop malformed stored entries', () => {
    expect(parseOverrides('not json')).toEqual({});
    expect(parseOverrides('{"x":{"status":"hacked"},"y":{"status":"draft","by":null,"date":null}}')).toEqual({
      y: { status: 'draft', by: null, date: null },
    });
  });

  it('are always written out', () => {
    expect(approvalLabel({ status: 'draft', by: null, date: null })).toBe('Draft – not yet validated');
    expect(approvalLabel({ status: 'approved', by: 'R. Expert', date: '2026-10-22' })).toBe(
      'Approved by R. Expert (2026-10-22)',
    );
    expect(today(new Date('2026-10-25T12:00:00Z'))).toBe('2026-10-25');
  });
});
