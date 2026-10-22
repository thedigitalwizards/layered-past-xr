# Paradata export and mapping note

`npm run export` writes one `export/<world>.glb` per world and `export/demo.jsonld`. The deployed site
publishes them under `/export/`.

## In the glTF (`extras`)

| Node                                        | `extras`                                                                                                         |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `world-a` (root)                            | the world: id, title, period, voice, certainty, style; the object; the voice caption and whether it is synthetic |
| `claim-a-1`, … (empty nodes at each anchor) | the whole claim: title, text, voice, certainty, evidence, approval                                               |
| `demo-stone`                                | the object and its `stone.style` in this world                                                                   |
| `ground`, `hills`, `structures`, …          | style and certainty                                                                                              |

The materials are flat colours. The stylised look comes from runtime shaders that a glTF viewer cannot run.

## In the JSON-LD: an indicative mapping

This mapping is a starting point for discussion with the heritage partner, not a validated EDM or
CIDOC-CRM profile.

| Our term                          | JSON-LD                                          | Europeana EDM            | CIDOC-CRM                        |
| --------------------------------- | ------------------------------------------------ | ------------------------ | -------------------------------- |
| Object                            | `edm:ProvidedCHO`, `crm:E22_Human-Made_Object`   | `edm:ProvidedCHO`        | E22 Human-Made Object            |
| Voice                             | `crm:E39_Actor`                                  | `edm:Agent`              | E39 Actor                        |
| Claim                             | `crm:E13_Attribute_Assignment`                   | —                        | E13 Attribute Assignment         |
| Claim → object                    | `crm:P140_assigned_attribute_to`                 | —                        | P140 assigned attribute to       |
| Claim → voice                     | `crm:P14_carried_out_by`                         | —                        | P14 carried out by               |
| Claim text                        | `crm:P3_has_note`                                | —                        | P3 has note                      |
| Evidence                          | `crm:P70i_is_documented_in` → `crm:E31_Document` | `dc:source` (simplified) | P70i is documented in            |
| World asset                       | `edm:hasView` → `.glb`                           | `edm:hasView`            | —                                |
| World, certainty, style, approval | `lpx:` (project terms)                           | —                        | candidates in CRMinf (I2 Belief) |

Certainty and approval have no direct core-CRM property. CRMinf (argumentation) or the Extended Matrix
vocabulary are possible targets, to be chosen with the heritage partner.
