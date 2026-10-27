# Paradata export and mapping note

`npm run export` writes one `export/<context>.glb` per context and `export/demo.jsonld`. The deployed site
publishes them under `/export/`.

## In the glTF (`extras`)

| Node                                        | `extras`                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `context-a` (root)                          | the context: id, title, period, voice, certainty, style; the object; the voice caption and whether it is synthetic |
| `claim-a-1`, … (empty nodes at each anchor) | the whole claim: title, text, voice, certainty, evidence, approval                                                 |
| `demo-stone`                                | the baetyl and its look and certainty in this context (`baetyl`)                                                   |
| `ground`, `hills`, `structures`, …          | style and certainty                                                                                                |

The materials are flat colours. The stylised look comes from runtime shaders that a glTF viewer cannot run.

## In the JSON-LD: an indicative mapping

This mapping is a starting point for discussion with the heritage partner, not a validated EDM or
CIDOC-CRM profile.

| Our term                            | JSON-LD                                          | Europeana EDM            | CIDOC-CRM                        |
| ----------------------------------- | ------------------------------------------------ | ------------------------ | -------------------------------- |
| Object (the baetyl)                 | `edm:ProvidedCHO`, `crm:E22_Human-Made_Object`   | `edm:ProvidedCHO`        | E22 Human-Made Object            |
| Voice                               | `crm:E39_Actor`                                  | `edm:Agent`              | E39 Actor                        |
| Claim                               | `crm:E13_Attribute_Assignment`                   | —                        | E13 Attribute Assignment         |
| Claim → object                      | `crm:P140_assigned_attribute_to`                 | —                        | P140 assigned attribute to       |
| Claim → voice                       | `crm:P14_carried_out_by`                         | —                        | P14 carried out by               |
| Claim text                          | `crm:P3_has_note`                                | —                        | P3 has note                      |
| Evidence                            | `crm:P70i_is_documented_in` → `crm:E31_Document` | `dc:source` (simplified) | P70i is documented in            |
| Context asset                       | `edm:hasView` → `.glb`                           | `edm:hasView`            | —                                |
| Context, certainty, style, approval | `lpx:` (project terms)                           | —                        | candidates in CRMinf (I2 Belief) |

Certainty and approval have no direct core-CRM property. CRMinf (argumentation) or the Extended Matrix
vocabulary are possible targets, to be chosen with the heritage partner.

Pending contexts (slots still to be co-designed) appear in the JSON-LD as `lpx:Context` nodes with
`lpx:status: "Pending heritage co-design"` and no claims. They have no `.glb`.
