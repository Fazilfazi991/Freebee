# Phone schema

`app/lib/phones/schema.ts` defines the normalized `Phone` contract. Optional manufacturer facts remain absent/unknown; parsers never infer them. Records carry parser version and publication state: `draft`, `verified`, `partial`, `needs-review`, or `published`. Only `published` records are returned to public routes and indexed.

Important normalized fields have provenance with source URL, source section, a short internal evidence excerpt, and verification time. Evidence is retained for audit/debugging and is not rendered as copied public prose. Source metadata records manufacturer, region, retrieval/check/change timestamps, and hash.

Auditable ingestion models cover `PhoneSource`, `PhoneFieldProvenance`, `IngestionRun`, and `IngestionChange`. A future `PhonePrice` model stores regional, storage-specific values only from manufacturer MSRP, approved feeds, or retailer APIs; it does not authorize crawling.

Critical validation ranges: display 3–9 inches, weight 80–400 g, refresh 30–240 Hz, height 100–220 mm, width 45–120 mm, depth 3–30 mm, battery 500–12,000 mAh, and storage 1 GB–8 TB. Charging ranges are warnings. Validators flag; they never correct.
