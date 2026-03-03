# Knowledge Management System

## Overview

A structured knowledge management pipeline for AI-assisted software development research. Processes source material through four stages:

1. **Collection** — Ingest raw sources (URLs, YouTube, uploads) into the `sources` table
2. **Distillation** — Rewrite sources into uniform-voice distillations stored in `sources.distillation`
3. **Decomposition** — Extract claims, evidence, devices, contexts, methods, and reasonings into structured, queryable tables
4. **Composition** — Draft thought leadership content from selected sources (on-demand, not part of the pipeline)

The database is MySQL 8.0, accessed via the `mysql` MCP tool.

## Skills

| Skill | Trigger Phrases | Purpose |
|-------|----------------|---------|
| **process** | "process", "process this URL", "run full pipeline" | End-to-end pipeline: collect → distill → decompose → categorize → evaluate → status |
| **collect** | "collect", "ingest", "add source", URL pasted | Ingest raw sources. Delegates YouTube retrieval to video-retriever. Handles all DB storage. |
| **video-retriever** | "retrieve video", "get transcript", YouTube URL | Extract metadata, transcript, speaker attribution from YouTube (retrieval only — no DB) |
| **distill** | "distill", "distill source #X", "distill next" | Distill sources (writes to `sources.distillation`) |
| **decompose** | "decompose", "extract claims", "decompose next" | Extract claims, evidence, devices, contexts, methods, and reasonings from distillations |
| **categorize** | "categorize", "assign topics", "tag new claims" | Assign topics, themes, and tags to claims |
| **evaluate** | "evaluate", "assess", "score", "rate" | Score credibility and quality |
| **manage** | "create topic", "add theme", "tag", "organize" | CRUD for topics, themes, tags, editorial |
| **status** | "status", "dashboard", "what needs work" | Pipeline reporting and gap analysis |
| **contributor-info** | "enrich contributors", "research contributor" | Populate contributor bio, avatar, URL |
| **markdown-formatting** | (referenced by other skills, not invoked directly) | Formatting rules for all markdown content |

## Pipeline Flow

```
URL/Upload
    │
    ├─ YouTube ──▶ video-retriever ──┐
    │                                │
    └─ Other ───▶ collect ◀──────────┘
                    │
                    ▼
                 distill
                    │
                    ▼
                decompose
                    │
                    ▼
               categorize
                    │
                    ▼
                evaluate
                    │
                    ▼
                 status

         manage ── manual curation at any stage
```

The **process** skill runs all stages in sequence. Each stage can also be invoked independently.

All markdown content (sources, distillations, compositions) follows **markdown-formatting** rules.

## Database

- **Engine**: MySQL 8.0 in Docker container (`knowledge-db`)
- **Database**: `knowledge`
- **User**: `claude` / `claude2026`
- **MCP**: `mysql` MCP server with full CRUD access

### Tables (25)

**Collection**: `contributors`, `publications`, `sources` (includes `distillation` column), `source_contributors`
**Composition**: `compositions`, `composition_sources`
**Decomposition**: `topics`, `themes`, `claims`, `claim_sources`, `claim_relationships`, `claim_topics`, `claim_themes`, `claim_tags`
**Decomposition Entities**: `devices`, `claim_devices`, `contexts`, `claim_contexts`, `methods`, `claim_methods`
**Evidence & Reasoning**: `evidence`, `claim_evidence`, `reasonings`
**Pipeline Logging**: `pipeline_runs`, `pipeline_stages`

### Claim Sources

`claim_sources` provides a direct link between claims and the sources that assert them. This is distinct from the evidence chain (`claim_evidence` → `evidence` → `sources`): a source can assert a claim directly and separately provide evidence for it.

### Claim Types

`claim_type` enum: `assertion`, `recommendation`, `prediction`, `definition`, `observation`, `mechanism`, `distinction`, `other`

| Type | Pattern | Example |
|------|---------|---------|
| assertion | declarative: "X is true" | "AI code generation fundamentally changes what developers do" |
| recommendation | prescriptive: "teams should do X" | "Teams should restructure around evaluation skills" |
| prediction | forward-looking: "X will happen" | "AI pair programming will replace solo coding within 5 years" |
| definition | conceptual: "X means Y" | "Context engineering is the practice of shaping the information AI uses" |
| observation | descriptive: "we see X happening" | "Most teams adopt AI tools before restructuring workflows" |
| mechanism | causal: "X works by doing Y" | "The shift happens because generation is cheap but verification remains expensive" |
| distinction | comparative: "X and Y differ because..." | "AI-assisted productivity gains are real but mismeasured" |
| other | does not fit the above | — |

### Parent-Child Claims

Claims support hierarchical grouping via `parent_claim_id` (nullable self-referencing FK, ON DELETE SET NULL). A parent claim is the thesis; children are the supporting pieces that together make the parent's point. Both parent and child claims are real claims — evaluated, scored, tagged, themed, and linked to sources and evidence independently. A claim can only have one parent. Nesting can go multiple levels deep.

When to create parent-child relationships during decomposition:
- A compound argument — "what" (assertion/observation) + "why" (mechanism) + "so what" (recommendation) — the overarching point is the parent
- A model claim followed by claims describing its parts — model is parent, parts are children
- A set of claims where removing any one breaks the logic

Do NOT use parent-child for claims that simply share a topic (use topics), are loosely related (use `claim_relationships`), or happen to support the same theme from different sources (use themes).

Scoring: parent and child claims each score independently. The parent's score does not aggregate from its children.

### Decomposition Entity Types

Three entity types are extracted during decomposition alongside claims and evidence:

| Entity | Table | Junction | Purpose |
|--------|-------|----------|---------|
| **Devices** | `devices` | `claim_devices` | Rhetorical devices — analogies, metaphors, narratives, examples, thought experiments, visuals |
| **Contexts** | `contexts` | `claim_contexts` | Boundary conditions — historical, industry, technical, organizational, regulatory, cultural, scope |
| **Methods** | `methods` | `claim_methods` | Application methods — processes, frameworks, techniques, tools, practices, metrics |

Each entity has a `source_id` tracing to the originating source and links to one or more claims through its junction table. These entities do not affect claim scoring — scoring remains based on evidence strength, source independence, and contradiction analysis.

### Reasonings

Reasonings explain why a specific piece of evidence supports a specific claim. They live in the `reasonings` table with direct `evidence_id` and `claim_id` foreign keys (no junction table). A single evidence-claim link can have multiple reasoning records — different logical arguments for the same connection.

`reasoning_type` enum: `deductive`, `inductive`, `analogical`, `causal`, `abductive`

### Key Views

| View | Purpose |
|------|---------|
| `v_pipeline_status` | Pipeline dashboard |
| `v_all_scored` | All claims with dynamic confidence scores |
| `v_claim_evidence` | Full evidence chain for composition |
| `v_thin_claims` | Claims needing more evidence |
| `v_topic_coverage` | Topic depth |
| `v_theme_strength` | Theme support |
| `v_expert_positions` | Who says what |
| `v_source_contributions` | Source productivity |

### Dynamic Scoring

Claim scores are never stored — computed from evidence at query time. Formula weights:

- Independent source count (3x) — primary signal
- Evidence strength tiers 1–2 (1.0), tier 3 (0.5), tiers 4–5 (0.25) — from `claim_evidence.evaluation_results.strength` (1=Definitive … 5=Speculative)
- Reasoning presence (0.5 bonus, capped at 3)
- Derived evidence discount (-0.5)
- Contradicting sources (-2.0)

Confidence labels: `strong`, `moderate`, `developing`, `contested`, `unsupported`

Credibility read from `evidence.evaluation_results` JSON via `JSON_EXTRACT(e.evaluation_results, '$.credibility')`, defaulting to 2 when not yet evaluated.

## Conventions

- Claims are written in the user's voice, not source language
- Evidence always traces to original `source_id`, even when extracted from distillations
- `claim_sources` records which sources assert which claims; populated during decomposition alongside evidence
- `evaluation_results` is JSON — use `JSON_EXTRACT()` to query
- Topics organize content (what the book covers); Themes advance arguments (what the book is about)
- Tags are freeform strings on claims — no tag registry, just `claim_tags(claim_id, tag)`
- All type enums include `other` as an escape valve
- All markdown follows the **markdown-formatting** skill rules
