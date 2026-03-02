---
name: process
description: End-to-end pipeline that takes a URL through all stages — collect, distill, decompose, cluster, categorize, evaluate, status
---

# Process

## Purpose

Run a URL through the full knowledge pipeline using subagents. Each stage runs in a fresh context window with a cheaper model where possible, keeping costs low and avoiding context accumulation.

## When to Use

- User says "process", "process this URL", "run full pipeline", "take this through everything"
- User provides a URL and wants the complete pipeline, not just collection

## Pipeline

```
1. collect → 2. distill → 3. decompose → 4. cluster → [5. categorize || 6. evaluate] → 7. status
```

Stages 5 and 6 run in parallel (they write to disjoint tables).

## Architecture

Each stage is a self-contained agent prompt in `process/agents/`. The orchestrator:
1. Reads the agent prompt file
2. Substitutes `{{placeholders}}` with runtime values
3. Spawns a subagent with the appropriate model
4. Parses the JSON block from the agent's response
5. Passes extracted IDs to the next stage

## Profiling

Time every stage to identify bottlenecks. Before the pipeline starts, capture a start timestamp:

```bash
date +%s
```

Store this as `pipeline_start`. Before each stage, capture `stage_start` the same way. After each stage completes, capture `stage_end` and compute `duration = stage_end - stage_start`.

Include timing in each stage report line:

```
[1/7] Collected: "<title>" (source #<id>, <word_count> words) — 45s
```

## Baseline Counts

Before starting (can run in parallel with the start timestamp), capture current totals for the final report:

```sql
docker exec -i knowledge-db mysql -u claude -pclaude2026 knowledge -e "
SELECT
  (SELECT COUNT(*) FROM claims) AS claims_before,
  (SELECT COUNT(*) FROM evidence) AS evidence_before;"
```

## Stage Execution

### Stage 1: Collect

**Agent prompt:** Choose based on URL:
- YouTube (`youtube.com`, `youtu.be`) → `process/agents/collect-youtube.md`
- All other URLs → `process/agents/collect-web.md`

**Model:** sonnet
**Substitutions:** `{{url}}` → the input URL
**Extract from result:** `source_id`, `contributor_ids`, `title`, `source_type`, `word_count`

Report to user:
```
[1/7] Collected: "<title>" (source #<id>, <word_count> words) — <duration>s
```

If status is "error", report and abort.

### Stage 2: Distill

**Agent prompt:** `process/agents/distill.md`
**Model:** sonnet
**Substitutions:** `{{source_id}}` → from stage 1
**Extract from result:** `artifact_id`, `title`, `word_count`

Report to user:
```
[2/7] Distilled: "<title>" (artifact #<id>, <word_count> words) — <duration>s
```

### Stage 3: Decompose

**Agent prompt:** `process/agents/decompose.md`
**Model:** sonnet
**Substitutions:** `{{artifact_id}}` → from stage 2, `{{source_id}}` → from stage 1
**Extract from result:** `claim_ids`, `evidence_ids`, `tags_applied`

Report to user:
```
[3/7] Decomposed: <N> claims, <N> evidence records — <duration>s
```

### Stage 4: Cluster

**Agent prompt:** `process/agents/cluster.md`
**Model:** haiku
**Substitutions:** `{{claim_ids}}` → comma-separated list from stage 3
**Extract from result:** `clusters_created`, `relationships_created`, `claims_merged`

Report to user:
```
[4/7] Clustered: <N> clusters, <N> relationships — <duration>s
```

### Stages 5 + 6: Categorize and Evaluate (parallel)

Launch BOTH agents simultaneously using parallel Agent tool calls. Capture a single `stage_start` before launching both; capture `stage_end` when BOTH have returned. Report the wall-clock duration for the parallel pair.

**Stage 5 — Categorize:**
- **Agent prompt:** `process/agents/categorize.md`
- **Model:** sonnet
- **Substitutions:** `{{claim_ids}}` → from stage 3, `{{source_id}}` → from stage 1
- **Extract:** `topics_assigned`, `themes_assigned`, `tags_applied`

**Stage 6 — Evaluate:**
- **Agent prompt:** `process/agents/evaluate.md`
- **Model:** haiku
- **Substitutions:** `{{source_id}}` → from stage 1, `{{artifact_id}}` → from stage 2, `{{evidence_ids}}` → comma-separated list from stage 3
- **Extract:** `source_credibility`, `artifact_quality`, `evidence_evaluated`, `avg_evidence_credibility`

Report both results:
```
[5/7] Categorized: <N> topics, <N> themes, <N> tags ┐
[6/7] Evaluated: source credibility <N>, avg evidence credibility <N> ┘ — <duration>s (parallel)
```

### Stage 7: Status

**Agent prompt:** `process/agents/status.md`
**Model:** haiku
**Substitutions:** `{{source_id}}` → from stage 1
**Extract:** `report`

Report to user:
```
[7/7] Status report generated — <duration>s
```

Display the full report text.

## Final Summary

After all stages, compute `total_duration = now - pipeline_start`. Present:

```
PIPELINE COMPLETE
━━━━━━━━━━━━━━━━

Source: "<title>" (ID: <source_id>)
URL: <url>

Stage Results:
  ✓ Collected — <source_type>, <word_count> words          <duration>s
  ✓ Distilled — Artifact #<id>, <word_count> words         <duration>s
  ✓ Decomposed — <N> claims, <N> evidence records          <duration>s
  ✓ Clustered — <N> clusters, <N> relationships            <duration>s
  ✓ Categorized — <N> topics, <N> themes, <N> tags    ┐
  ✓ Evaluated — Source credibility: <score>, Avg: <score>  ┘ <duration>s
  ✓ Status report                                          <duration>s
                                                      ─────────
                                                Total: <total>s

Knowledge Base Impact:
  Claims: <before> → <after>
  Evidence: <before> → <after>
```

## How to Spawn Subagents

For each stage, follow this pattern:

1. Read the agent prompt file using the Read tool
2. If the prompt contains `{{markdown_rules}}` or `{{contributor_enrichment}}`, read `process/agents/collect-shared.md` and substitute each placeholder with the content under its matching `##` heading (everything from the heading to the next `##` or end of file)
3. Replace all remaining `{{placeholder}}` strings with actual runtime values
4. Call the Agent tool with:
   - `subagent_type`: `"general-purpose"`
   - `model`: as specified per stage (sonnet or haiku)
   - `prompt`: the substituted agent prompt text
   - `description`: short label like "Collect web source"
5. Parse the JSON block from the last ```json ... ``` fence in the agent's response
6. Extract the needed IDs and pass them to the next stage

For the parallel stages (5+6), make BOTH Agent tool calls in a single message.

## Error Handling

- If any stage returns `"status": "error"`, report to the user and ask: retry, skip, or abort
- If a subagent times out or returns no JSON block, report the raw response and ask user how to proceed
- Never silently skip a stage

## Batch Processing

When the user provides multiple URLs:
1. Process each URL through the full pipeline sequentially
2. Show per-URL progress: "Processing 2 of 5: <title>"
3. If one URL fails, report and continue to the next
4. Show aggregate summary at the end

## Pausing and Resuming

If the user says "stop" or "pause":
```
Pipeline paused after Stage <N>.
  Source ID: <id>
  Artifact ID: <id>
  Remaining: <remaining stages>
Resume by saying "continue processing source #<id>"
```
