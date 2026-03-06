# Knowledge Management System

## Schema Changes — Mandatory Checklist

Every schema modification (ALTER TABLE, new columns, enum changes) is a **three-file atomic operation**:
1. Live DB
2. `knowledge-system-schema.sql`
3. `knowledge-system.dbml`

Never mark a schema change as complete until all three are done.

## Overview

A domain-agnostic research synthesis engine optimized for thought leadership and educational material. It takes source material — articles, talks, videos, papers — and breaks them into atomic intellectual components (claims, evidence, reasoning, rhetorical devices, contexts, methods), scores everything for credibility, cross-references across sources, and identifies where evidence is strong, thin, or contested. The composition side assembles scored building blocks into original content with traceable evidence chains. Processes source material through four stages:

1. **Collection** — Ingest raw sources (URLs, YouTube, uploads) into the `sources` table
2. **Distillation** — Rewrite sources into uniform-voice distillations stored in `sources.distillation`
3. **Decomposition** — Extract claims, evidence, devices, contexts, methods, and reasonings into structured, queryable tables
4. **Composition** — Draft thought leadership content from selected sources (on-demand, not part of the pipeline)

The database is MySQL 8.0, accessed via the `mysql` MCP tool.

## Skills

| Skill | Trigger Phrases | Purpose |
|-------|----------------|---------|
| **process** | "process", "process this URL", "run full pipeline" | End-to-end pipeline: collect → distill → decompose → categorize → evaluate |

The **process** skill orchestrates 6 internal agents: collect-web, collect-youtube, distill, decompose, categorize, evaluate. Contributor enrichment and markdown formatting are handled automatically within those agents.

## Pipeline Flow

```
URL/Upload → process skill
  ├─ collect (web or YouTube)
  ├─ distill
  ├─ decompose
  ├─ categorize
  └─ evaluate
```

## Database

- **Engine**: MySQL 8.0 in Docker container (`knowledge-db`)
- **Database**: `knowledge`
- **User**: `claude` / `claude2026`
- **MCP**: `mysql` MCP server with full CRUD access

### Tables (27)

**Curation Rules**: `curation_rules`, `curation_rule_versions`
**Collection**: `contributors`, `publications`, `sources` (includes `distillation`, `distillation_notes`, and `curation_rule_version_id` columns), `source_contributors`
**Composition**: `compositions`, `composition_sources`
**Decomposition**: `topics`, `themes`, `claims`, `claim_sources`, `claim_links`, `claim_topics`, `claim_themes`, `claim_tags`
**Decomposition Entities**: `devices`, `claim_devices`, `contexts`, `claim_contexts`, `methods`, `claim_methods`
**Evidence & Reasoning**: `evidence`, `claim_evidence`, `reasonings`
**Pipeline Logging**: `pipeline_runs`, `pipeline_stages`

### Curation Rules

`curation_rules` stores user-defined rules that control what material survives the distillation process. Each rule has a `name`, `description`, and an `is_active` flag. Rules are versioned — every time a rule's `content_filter` or `preferred_terminology` is edited, a new record is created in `curation_rule_versions` (immutable; previous versions are never modified). The `version` field is an integer incrementing from 1. `content_filter` contains the filtering instructions. `preferred_terminology` is a comma-separated list of favored vocabulary used during distillation.

`sources.curation_rule_version_id` records which version of which rule was applied when this source was distilled. NULL means no curation rule was applied (only built-in filtering). This field is set during the distillation step and never changes afterward, preserving a stable audit trail of exactly what rules shaped the distilled content.

### Claim Sources

`claim_sources` provides a direct link between claims and the sources that assert them. The `is_key` flag marks 3–7 central claims per source — the claims the source was written to make. Set during decomposition. This is distinct from the evidence chain (`claim_evidence` → `evidence` → `sources`): a source can assert a claim directly and separately provide evidence for it.

### Source Classification

Sources have two classification fields:

- **`format`** — delivery medium: `transcript` (video/audio that was transcribed), `text` (originally written)
- **`source_type`** — content classification: `interview`, `lecture`, `panel`, `essay`, `research`, `tutorial`, `news`, `review`, `documentation`, `report`, `other`

### Claim Types

`claim_type` enum: `assertion` (declarative), `recommendation` (prescriptive), `prediction` (forward-looking), `definition` (conceptual), `observation` (descriptive), `mechanism` (causal), `distinction` (comparative), `other`

### Parent-Child Claims

Claims support hierarchy via `parent_claim_id`. Parent is the thesis; children are supporting pieces. Both score independently. A claim can only have one parent. Detailed grouping rules live in the decompose agent.

### Decomposition Entity Types

| Entity | Table | Junction | Purpose |
|--------|-------|----------|---------|
| **Devices** | `devices` | `claim_devices` | Rhetorical devices — analogies, metaphors, narratives, examples, thought experiments, visuals |
| **Contexts** | `contexts` | `claim_contexts` | Boundary conditions — historical, industry, technical, organizational, regulatory, cultural, scope |
| **Methods** | `methods` | `claim_methods` | Application methods — processes, frameworks, techniques, tools, practices, metrics |

### Reasonings

Reasonings explain why evidence supports a claim (`reasoning_type`: `deductive`, `inductive`, `analogical`, `causal`, `abductive`). Direct `evidence_id` and `claim_id` foreign keys — no junction table.

### Key Views

| View | Purpose |
|------|---------|
| `v_pipeline_status` | Pipeline dashboard |
| `v_all_scored` | All claims with dynamic confidence scores |
| `v_claim_scoring_inputs` | Raw scoring inputs per claim |
| `v_standalone_claim_scores` | Scores without parent-child rollup |
| `v_contributor_scores` | Contributor evaluation scores |
| `v_claim_evidence` | Full evidence chain for composition |
| `v_thin_claims` | Claims needing more evidence |
| `v_topic_coverage` | Topic depth |
| `v_theme_strength` | Theme support |
| `v_expert_positions` | Who says what |
| `v_source_contributions` | Source productivity |
### Dynamic Scoring

Claim scores are never stored — computed from evidence at query time via scoring views (`v_all_scored`, `v_claim_scoring_inputs`, `v_standalone_claim_scores`). Primary signal is independent source count (3x weight). Evidence strength, reasoning presence, and contradictions adjust the score. Confidence labels: `strong`, `moderate`, `developing`, `contested`, `unsupported`.

## UI

- **Stack**: Next.js App Router, SCSS Modules, no UI framework
- **Shared styles**: `ui/src/app/shared.module.scss` has reusable layout classes (`.box`, `.boxGrid`, `.splitLayout`, `.chipRow`, etc.) — use these before creating page-local styles
- **Components**: Extract anything reusable, complex, or independently testable into `ui/src/components/`. Component files should only define props interfaces — domain interfaces and enums belong in `ui/src/lib/types.ts`.
- **CSS**: Use `@extend` for SCSS inheritance. Define styles in SCSS classes, not inline Tailwind utility classes. Use `@apply` in css as needed.

## Conventions

- Claims are written in a consistent, neutral voice — not source language
- Evidence always traces to original `source_id`, even when extracted from distillations
- `claim_sources` records which sources assert which claims; populated during decomposition alongside evidence
- `evaluation_results` is JSON — use `JSON_EXTRACT()` to query
- Topics organize content by subject area; Themes advance arguments across that content
- Tags are freeform strings on claims — no tag registry, just `claim_tags(claim_id, tag)`
- All type enums include `other` as an escape valve
- All markdown follows shared formatting rules (embedded in agent prompts)
- **Encoding**: All text written to the database must use clean Unicode. Fix mojibake on sight — never store double-encoded sequences like `â€"`, `â€™`, `â€œ`, `Ã©`. Use proper em dashes `—`, en dashes `–`, curly quotes `""''`, ellipsis `…`. This applies to every field in every table, with no exceptions.
