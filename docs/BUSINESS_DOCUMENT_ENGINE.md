# Business document engine

Invoice and quotation tools share the model and renderer in `app/lib/tools/business-documents`. Customer and business data stays in memory for the current browser session; there is no automatic persistence, telemetry content, server upload, or cloud save.

Each line is calculated as `quantity × rate`, followed by its percentage discount, then tax on the discounted amount. Document totals sum the rounded line subtotal, discount, tax, and grand total. Tax is always user-provided and no jurisdictional rate is assumed.

Supported currencies are AED, USD, EUR, GBP, INR, SAR, QAR, OMR, KWD, and BHD, formatted through `Intl.NumberFormat`. Invoice and quotation share the same fields and line-item model but use distinct terminology, numbering, dates, and deterministic filenames.

PDFs use the existing `pdf-lib` dependency and A4 pages. The renderer creates continuation pages when line items approach the printable bottom margin and keeps totals together where possible. Classic, Minimal, and Modern templates share the data model and differ only in presentation tokens. Optional PNG/JPG logos are limited to 2 MB and embedded directly in the generated PDF.

To add another document type, extend the document-type union, reuse line calculations and currency formatting, provide its terminology/date semantics, and keep layout changes inside the shared renderer rather than React components.
