// A minimal JSON-LD description of the object, its contexts and their claims, mapped where possible
// to Europeana EDM and CIDOC-CRM (see docs/paradata-mapping.md). Our own terms use the `lpx:` prefix.
import { CERTAINTY_LABELS, WORLD_STYLES } from './certainty.ts';
import { VOICE_LABELS, type Content } from './content.ts';

const BASE = 'urn:layered-past-xr';

export const toJsonLd = (content: Content, assetFor: (worldId: string) => string) => {
  const object = `${BASE}:object:${content.object.id}`;
  const voices = [...new Set(content.contexts.flatMap((w) => [w.voice, ...w.claims.map((c) => c.voice)]))];
  return {
    '@context': {
      dc: 'http://purl.org/dc/elements/1.1/',
      edm: 'http://www.europeana.eu/schemas/edm/',
      crm: 'http://www.cidoc-crm.org/cidoc-crm/',
      lpx: 'https://github.com/thedigitalwizards/layered-past-xr/blob/master/docs/paradata-mapping.md#',
    },
    '@graph': [
      { '@id': object, '@type': ['edm:ProvidedCHO', 'crm:E22_Human-Made_Object'], 'dc:title': content.object.title },
      ...voices.map((voice) => ({
        '@id': `${BASE}:voice:${voice}`,
        '@type': 'crm:E39_Actor',
        'dc:title': VOICE_LABELS[voice],
      })),
      ...content.contexts.map((context) => ({
        '@id': `${BASE}:context:${context.id}`,
        '@type': 'lpx:Context',
        'dc:title': context.title,
        'lpx:period': context.period,
        'lpx:voice': { '@id': `${BASE}:voice:${context.voice}` },
        'lpx:certainty': CERTAINTY_LABELS[context.certainty],
        'lpx:style': WORLD_STYLES[context.certainty],
        'lpx:baetylCertainty': CERTAINTY_LABELS[context.baetyl.certainty],
        'lpx:syntheticVoice': context.audio.synthetic,
        'lpx:about': { '@id': object },
        'edm:hasView': assetFor(context.id),
      })),
      ...(content.pendingContexts ?? []).map((pending) => ({
        '@id': `${BASE}:context:${pending.id}`,
        '@type': 'lpx:Context',
        'dc:title': pending.title,
        'lpx:status': 'Pending heritage co-design',
        'lpx:about': { '@id': object },
      })),
      ...content.contexts.flatMap((context) =>
        context.claims.map((claim) => ({
          '@id': `${BASE}:claim:${claim.id}`,
          '@type': 'crm:E13_Attribute_Assignment',
          'dc:title': claim.title,
          'crm:P140_assigned_attribute_to': { '@id': object },
          'crm:P14_carried_out_by': { '@id': `${BASE}:voice:${claim.voice}` },
          'crm:P3_has_note': claim.text,
          'crm:P70i_is_documented_in': claim.evidence.map((e) => ({
            '@type': 'crm:E31_Document',
            'dc:title': e.citation,
            ...(e.url ? { 'dc:identifier': e.url } : {}),
            ...(e.licence ? { 'dc:rights': e.licence } : {}),
          })),
          'lpx:certainty': CERTAINTY_LABELS[claim.certainty],
          'lpx:inWorld': { '@id': `${BASE}:context:${context.id}` },
          'lpx:approval': claim.approval.status,
          ...(claim.approval.by ? { 'lpx:approvedBy': claim.approval.by, 'dc:date': claim.approval.date } : {}),
        })),
      ),
    ],
  };
};
