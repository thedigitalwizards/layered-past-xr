import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Content } from '../src/core/content.ts';
import { toJsonLd } from '../src/core/jsonld.ts';

const content = JSON.parse(readFileSync(new URL('../examples/demo/content.json', import.meta.url), 'utf8')) as Content;

describe('JSON-LD paradata', () => {
  const graph = toJsonLd(content, (id) => `${id}.glb`)['@graph'] as Record<string, unknown>[];

  it('describes the object, every context and every claim', () => {
    expect(graph[0]).toMatchObject({
      '@type': ['edm:ProvidedCHO', 'crm:E22_Human-Made_Object'],
      'dc:title': 'Demo Baetyl',
    });
    const contexts = graph.filter((n) => n['@type'] === 'lpx:Context');
    expect(contexts.filter((n) => !n['lpx:status'])).toHaveLength(3);
    expect(contexts.filter((n) => n['lpx:status'] === 'Pending heritage co-design')).toHaveLength(6);
    expect(graph.filter((n) => n['@type'] === 'crm:E13_Attribute_Assignment')).toHaveLength(8);
  });

  it('links each claim to its voice, evidence and approval', () => {
    const claim = graph.find((n) => n['@id'] === 'urn:layered-past-xr:claim:b-1')!;
    expect(claim['crm:P14_carried_out_by']).toEqual({ '@id': 'urn:layered-past-xr:voice:european-imagination' });
    expect(claim['crm:P70i_is_documented_in']).toHaveLength(1);
    expect(claim['lpx:approval']).toBe('draft');
    expect(claim['lpx:certainty']).toBe('Imagined');
  });
});
