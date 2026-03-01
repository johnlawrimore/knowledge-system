---
name: evaluate
description: Assess quality and credibility of sources, artifacts, and evidence
---

# Evaluate

## Purpose

Assess quality and credibility of sources, artifacts, and evidence. Populates the `evaluation_results` JSON fields used by the scoring views. Can be run at any pipeline stage.

## When to Use

- User says "evaluate", "assess", "score", "rate"
- After collecting a source — evaluate credibility before distillation
- After distilling — evaluate artifact quality before decomposition
- After decomposing — evaluate evidence credibility
- User says "evaluate all unevaluated" for batch processing

## Database Connection

Use the `mysql` MCP tool for all database operations against the `knowledge` database.

## Evaluation Schemas

### Source Evaluation

```json
{
    "credibility": <1-3>,
    "relevance": <1-5>,
    "depth": <1-5>,
    "recency_relevant": <true|false>,
    "bias_notes": "<any detected bias or null>",
    "evaluated_at": "<ISO timestamp>"
}
```

**credibility** (1-3, used by scoring views):
- `1` — Highest: peer-reviewed research, seminal works, recognized authorities with demonstrated expertise
- `2` — Established: known experts, major publications, reputable conference talks, well-regarded industry blogs
- `3` — General: personal blogs, anecdotal accounts, social media, opinion pieces without rigorous support

**relevance** (1-5): How directly relevant to the knowledge base's focus areas.

**depth** (1-5): How deeply the source explores its topic.

**recency_relevant**: Does timeliness matter? A 2020 article on Copilot usage is outdated; a 2020 article on test design principles is not.

**bias_notes**: Vendor marketing, competitive positioning, ideological leaning. NULL if none.

### Artifact Evaluation

```json
{
    "quality": <1-5>,
    "completeness": <1-5>,
    "voice_consistency": <1-5>,
    "decomposition_readiness": <1-5>,
    "notes": "<notes or null>",
    "evaluated_at": "<ISO timestamp>"
}
```

If `decomposition_readiness` < 3, recommend re-distilling before decomposing.

### Evidence Evaluation

```json
{
    "credibility": <1-3>,
    "independence": "<original|derivative|unknown>",
    "verifiability": "<verified|verifiable|unverifiable>",
    "notes": "<notes or null>",
    "evaluated_at": "<ISO timestamp>"
}
```

**credibility** (1-3): Same scale as sources, but assessed at the individual evidence level. A high-credibility source can produce low-credibility evidence if the specific claim is poorly supported.

**independence**: Is this original to this source, or citing/echoing another?
- `original` — independently produced
- `derivative` — citing another source (should also set `derived_from_evidence_id`)
- `unknown` — can't determine

**verifiability**: Can this be independently verified?
- `verified` — independently confirmed
- `verifiable` — could be verified but hasn't been
- `unverifiable` — personal experience, opinion, uncheckable claim

## Workflow

### Evaluate a Source

```sql
SELECT id, title, source_type, content_md, evaluation_results FROM sources WHERE id = <id>;
```

Read the content. Assess. Then:

```sql
UPDATE sources SET evaluation_results = JSON_OBJECT(
    'credibility', <1-3>, 'relevance', <1-5>, 'depth', <1-5>,
    'recency_relevant', <true|false>, 'bias_notes', '<notes or null>',
    'evaluated_at', NOW()
) WHERE id = <id>;
```

### Evaluate an Artifact

```sql
SELECT id, title, content_md, evaluation_results FROM artifacts WHERE id = <id>;
```

```sql
UPDATE artifacts SET evaluation_results = JSON_OBJECT(
    'quality', <1-5>, 'completeness', <1-5>, 'voice_consistency', <1-5>,
    'decomposition_readiness', <1-5>, 'notes', '<notes or null>',
    'evaluated_at', NOW()
) WHERE id = <id>;
```

### Evaluate Evidence

```sql
SELECT e.id, e.content, e.evidence_type, e.verbatim_quote,
       e.evaluation_results, e.derived_from_evidence_id,
       s.title AS source_title, s.evaluation_results AS source_eval
FROM evidence e JOIN sources s ON e.source_id = s.id
WHERE e.id = <id>;
```

```sql
UPDATE evidence SET evaluation_results = JSON_OBJECT(
    'credibility', <1-3>, 'independence', '<original|derivative|unknown>',
    'verifiability', '<verified|verifiable|unverifiable>',
    'notes', '<notes or null>', 'evaluated_at', NOW()
) WHERE id = <id>;
```

If independence is `derivative` and `derived_from_evidence_id` is NULL, search for the original and set the linkage.

## Batch Evaluation

```sql
-- Unevaluated sources
SELECT id, title, source_type, content_md FROM sources
WHERE evaluation_results IS NULL ORDER BY created_at ASC;

-- Unevaluated evidence for a specific claim
SELECT e.id, e.content, e.evidence_type, e.evaluation_results
FROM evidence e JOIN claim_evidence ce ON e.id = ce.evidence_id
WHERE ce.claim_id = <claim_id> AND e.evaluation_results IS NULL;
```

## Report

```
✓ Evaluated: <entity type> #<id> — "<title or excerpt>"
  Credibility: <score>
  <other fields as relevant>
```

Batch:
```
Evaluation complete:
  Sources evaluated: <N>
  Artifacts evaluated: <N>
  Evidence evaluated: <N>
  Avg source credibility: <X>
  Derivative evidence flagged: <N>
```
