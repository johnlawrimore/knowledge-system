---
name: process
description: End-to-end pipeline that takes a URL through all stages — collect, distill, decompose, cluster, categorize, evaluate, status
---

# Process

## Purpose

Run a URL through the full knowledge pipeline in a single session. This skill orchestrates the individual stage skills in sequence, pausing for user review at key checkpoints.

## When to Use

- User says "process", "process this URL", "run full pipeline", "take this through everything"
- User provides a URL and wants the complete pipeline, not just collection

## Pipeline Stages

```
1. collect  →  2. distill  →  3. decompose  →  4. cluster  →  5. categorize  →  6. evaluate  →  7. status
```

Each stage is a separate skill. Execute them in order, passing context forward.

## Workflow

### Stage 1: Collect

Execute the **collect** skill with the provided URL.

- Collect handles input routing (YouTube → video-retriever, etc.)
- Collect handles contributor insertion and enrichment
- Note the `source_id` from the confirmation output — it's needed for all subsequent stages

**Checkpoint:** Confirm the source was collected successfully before proceeding.

### Stage 2: Distill

Execute the **distill** skill on the newly collected source.

- Say: "Distill source #`<source_id>`"
- Distill creates an artifact from the source
- Note the `artifact_id` from the confirmation output

**Checkpoint:** Present the artifact summary to the user. Ask:
```
Artifact created. Review the distillation before proceeding?
  [Continue] — proceed to decompose
  [Review]  — show the full artifact for feedback
  [Stop]    — pause the pipeline here
```

If the user chooses Review and requests changes, re-distill before continuing.

### Stage 3: Decompose

Execute the **decompose** skill on the artifact.

- Say: "Decompose artifact #`<artifact_id>`"
- Decompose extracts claims and evidence
- Note the claim IDs and evidence IDs from the confirmation output

**Checkpoint:** Present the decomposition summary to the user. Ask:
```
Decomposition complete. Review before clustering?
  [Continue] — proceed to cluster
  [Review]  — show all extracted claims and evidence
  [Stop]    — pause the pipeline here
```

### Stage 4: Cluster

Execute the **cluster** skill to check new claims against existing claims.

- Focus the scan on the newly created claims from Stage 3
- Cluster will present any candidates for user approval
- If no cluster candidates are found, report that and move on

**Checkpoint:** Cluster always pauses for approval on candidates. If no candidates, proceed automatically.

### Stage 5: Categorize

Execute the **categorize** skill on the new claims.

- Focus on claims created in Stage 3 (post-clustering, so any merged claims are excluded)
- Categorize assigns topics, themes, and tags
- Categorize presents its plan for user approval before executing

**Checkpoint:** Categorize always pauses for approval. After the user approves, proceed.

### Stage 6: Evaluate

Execute the **evaluate** skill on the source, artifact, and evidence.

- Evaluate the source (credibility, relevance, depth)
- Evaluate the artifact (quality, completeness, decomposition readiness)
- Evaluate all new evidence (credibility, independence, verifiability)
- Present the evaluation summary

**Checkpoint:** Report evaluations. No approval needed — evaluations are assessments, not structural changes.

### Stage 7: Status

Execute the **status** skill to show the updated pipeline state.

- Run the pipeline overview report
- Highlight what changed: new source, artifact, claims, evidence, categories
- Show any new gaps or recommended next actions

## Final Report

After all stages complete, present a consolidated summary:

```
PIPELINE COMPLETE
━━━━━━━━━━━━━━━━

Source: "<title>" (ID: <source_id>)
URL: <url>

Stage Results:
  ✓ Collected — <source_type>, <word_count> words
  ✓ Distilled — Artifact #<id>, <section_count> sections
  ✓ Decomposed — <N> claims, <N> evidence records
  ✓ Clustered — <N> clusters found, <N> merged
  ✓ Categorized — <N> topics, <N> themes, <N> tags
  ✓ Evaluated — Source credibility: <score>, Avg evidence credibility: <score>

Knowledge Base Impact:
  Claims: <before> → <after>
  Evidence: <before> → <after>
  Topics touched: <list>
  Themes touched: <list>
```

## Pausing and Resuming

The pipeline can be stopped at any checkpoint. If the user says "stop" or "pause":

- Note the current stage and all IDs collected so far
- Report what's been completed and what remains:
  ```
  Pipeline paused after Stage 3 (decompose).
    Source ID: <id>
    Artifact ID: <id>
    Remaining: cluster → categorize → evaluate → status
  Resume by saying "continue processing source #<id>"
  ```

To resume, pick up from the next incomplete stage using the IDs from prior stages.

## Batch Processing

When the user provides multiple URLs:

1. Process each URL through the full pipeline sequentially
2. Show per-URL progress: "Processing 2 of 5: <title>"
3. If one URL fails at any stage, report the error and continue to the next URL
4. At the end, show an aggregate summary across all URLs

## Error Handling

- If any stage fails, report the error with context and ask whether to retry, skip that stage, or abort
- If a source is a duplicate (detected in collect), skip it and report
- If distillation produces a low-quality artifact, flag it and ask whether to proceed or re-distill
- If decomposition produces zero claims, flag it and suggest the artifact may need revision
- Never silently skip a stage — always report what happened
