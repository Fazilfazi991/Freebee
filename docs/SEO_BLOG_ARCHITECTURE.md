# Blog architecture

The planned `/blog` section should remain lightweight: an index route, article route keyed by a stable slug, a small reviewed article registry, and optional tags only when they support real navigation. Each article should define `publishedAt`, `updatedAt`, `reviewedAt`, author/editor, title, description, related tools, and related articles. Use Article JSON-LD only for genuine articles; do not publish an empty or filler index. The first five articles come from `SEO_CONTENT_PLAN.md` and require review before publication.
