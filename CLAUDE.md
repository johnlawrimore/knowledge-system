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

### Tables (28)

**Collection**: `contributors`, `publications`, `sources` (includes `distillation` column), `source_contributors`
**Composition**: `compositions`, `composition_sources`
**Decomposition**: `topics`, `themes`, `claims`, `claim_sources`, `claim_relationships`, `claim_topics`, `claim_themes`, `claim_tags`
**Decomposition Entities**: `devices`, `device_claims`, `contexts`, `context_claims`, `methods`, `method_claims`, `reasonings`, `reasoning_claims`
**Evidence**: `evidence`, `claim_evidence`
**Pipeline Logging**: `pipeline_runs`, `pipeline_stages`

### Claim Sources

`claim_sources` provides a direct link between claims and the sources that assert them. This is distinct from the evidence chain (`claim_evidence` → `evidence` → `sources`): a source can assert a claim directly and separately provide evidence for it.

### Decomposition Entity Types

Four entity types are extracted during decomposition alongside claims and evidence:

| Entity | Table | Junction | Purpose |
|--------|-------|----------|---------|
| **Devices** | `devices` | `device_claims` | Rhetorical devices — analogies, metaphors, narratives, examples, thought experiments, visuals |
| **Contexts** | `contexts` | `context_claims` | Boundary conditions — historical, industry, technical, organizational, regulatory, cultural, scope |
| **Methods** | `methods` | `method_claims` | Application methods — processes, frameworks, techniques, tools, practices, metrics |
| **Reasonings** | `reasonings` | `reasoning_claims` | Logical connections — deductive, inductive, analogical, causal, abductive |

Each entity has a `source_id` tracing to the originating source and links to one or more claims through its junction table. These entities do not affect claim scoring — scoring remains based on evidence strength, source independence, and contradiction analysis.

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
- Evidence strength (strong=1.0, moderate=0.5, weak=0.25)
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
