# Phone schema

`app/lib/phones/schema.ts` defines the normalized `Phone` contract. Optional manufacturer facts remain absent/unknown; parsers never infer them. Sections cover identity and lifecycle, source record, quality status, design, dimensions, display, performance, memory, rear/front cameras, battery, connectivity, SIM, and software.

Important normalized fields have provenance with source URL, source section, a short internal evidence excerpt, and verification time. Evidence is retained for audit/debugging and is not rendered as copied public prose. Source metadata records manufacturer, region, retrieval/check/change timestamps, and hash.

Validation detects implausible display size, dimensions, weight, refresh rate, storage, and battery values. It flags records; it does not correct or invent values. Publication states are `verified`, `partial`, and `needs-review`; the repository excludes `needs-review` records.

