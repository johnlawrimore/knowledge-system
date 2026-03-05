---
name: process
description: End-to-end pipeline that takes a URL through all stages — collect, distill, decompose, categorize, evaluate
---

# Process

## Purpose

Run a URL through the full knowledge pipeline using subagents. Each stage runs in a fresh context window with a cheaper model where possible, keeping costs low and avoiding context accumulation.

## When to Use

- User says "process", "process this URL", "run full pipeline", "take this through everything"
- User provides a URL and wants the complete pipeline, not just collection

## Pipeline

```
1. collect → 2. distill → 3. decompose → [4. categorize || 5. evaluate]
```

Stages 4 and 5 run in parallel (they write to disjoint tables).

## Architecture

Each stage is a self-contained agent prompt in `process/agents/`. The orchestrator:
1. Reads the agent prompt file
2. Substitutes `{{placeholders}}` with runtime values
3. Spawns a subagent with the appropriate model
4. Parses the JSON block from the agent's response
5. Passes extracted IDs to the next stage

## Logging

Persist pipeline performance data to the `pipeline_runs` and `pipeline_stages` tables so it survives context compression and session boundaries.

**Display rule (mandatory):** Every Bash call the orchestrator makes MUST use a short, non-technical `description`. Never let raw SQL, docker commands, or file paths display to the user. Descriptions should read like status updates a non-technical person would understand.

### Before pipeline starts

Capture start timestamp and create the run record. Run as two Bash calls:

1. `date +%s` — description: `"Capture start time"`
2. Create run row — description: `"Starting pipeline run"`

```sql
docker exec -i knowledge-db mysql knowledge -e "
INSERT INTO pipeline_runs (url, status) VALUES ('<url>', 'running');
SELECT LAST_INSERT_ID() AS run_id;"
```

Capture the returned `run_id` — use it for all stage inserts.

### After collect completes

Update the run row with the source_id. Description: `"Linking source to pipeline run"`

```sql
docker exec -i knowledge-db mysql knowledge -e "
UPDATE pipeline_runs SET source_id = <source_id> WHERE id = <run_id>;"
```

### Before each stage

Capture `stage_start` via `date +%s` (description: `"Capture stage start time"`), then insert a stage row (description: `"Recording <stage_name> stage start"`):

```sql
docker exec -i knowledge-db mysql knowledge -e "
INSERT INTO pipeline_stages (run_id, stage, status) VALUES (<run_id>, '<stage_name>', 'running');
SELECT LAST_INSERT_ID() AS stage_id;"
```

Capture the returned `stage_id`.

### After each stage

Capture `stage_end` via `date +%s` (description: `"Capture stage end time"`), compute `duration = stage_end - stage_start`. Parse the agent's JSON result. Extract the `tool_calls` array from the result, then remove it before storing `result_json` (keep the log separate from stage metrics). Then update the stage row (description: `"Saving <stage_name> results"`):

```sql
docker exec -i knowledge-db mysql knowledge -e "
UPDATE pipeline_stages SET
  status = '<success|error|skipped>',
  duration_s = <duration>,
  total_tokens = <from agent metadata>,
  tool_uses = <from agent metadata>,
  tool_call_log = '<tool_calls array from agent JSON>',
  result_json = '<agent JSON output minus tool_calls>',
  completed_at = NOW()
WHERE id = <stage_id>;"
```

For parallel stages (4+5): insert both stage rows before launching, update each when its agent returns.

### After pipeline completes

Description: `"Finishing pipeline run"`

```sql
docker exec -i knowledge-db mysql knowledge -e "
UPDATE pipeline_runs SET
  status = 'completed',
  total_duration_s = <now - pipeline_start>,
  completed_at = NOW()
WHERE id = <run_id>;"
```

### On error

Description: `"Recording pipeline error"`

```sql
docker exec -i knowledge-db mysql knowledge -e "
UPDATE pipeline_stages SET status = 'error', completed_at = NOW() WHERE id = <stage_id>;
UPDATE pipeline_runs SET status = 'failed', completed_at = NOW() WHERE id = <run_id>;"
```

### What to log

- **duration_s**: Wall-clock seconds from `date +%s` before/after
- **total_tokens**: From the Agent tool's result metadata
- **tool_uses**: From the Agent tool's result metadata
- **tool_call_log**: The `tool_calls` array from the agent's JSON output (extracted and stored separately)
- **result_json**: The agent's JSON block minus `tool_calls` (includes `process_notes` for anything unusual)

Include timing in each stage report line:

```
[1/5] Collected: "<title>" (source #<id>, <word_count> words) — 45s
```

## Baseline Counts

Before starting (can run in parallel with the start timestamp), capture current totals for the final report. Description: `"Counting existing claims and evidence"`

```sql
docker exec -i knowledge-db mysql knowledge -e "
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
[1/5] Collected: "<title>" (source #<id>, <word_count> words) — <duration>s
```

If status is "error", report and abort.

### Stage 2: Distill

**Before spawning**, query active content filters. Description: `"Checking for active content filters"`

```sql
docker exec -i knowledge-db mysql knowledge -e "
SELECT id, name, description FROM content_filters WHERE is_active = TRUE ORDER BY name;"
```

- If **no active filters**: set `filter_id = NULL`, proceed without asking.
- If **one or more** active filters: ask the user to pick one (or "None"), then use their selection.

**Agent prompt:** `process/agents/distill.md`
**Model:** sonnet
**Substitutions:** `{{source_id}}` → from stage 1, `{{filter_id}}` → selected filter ID or `NULL`
**Extract from result:** `source_id`, `title`, `word_count`

Report to user:
```
[2/5] Distilled: "<title>" (<word_count> words) — <duration>s
```

### Stage 3: Decompose

**Agent prompt:** `process/agents/decompose.md`
**Model:** sonnet
**Substitutions:** `{{source_id}}` → from stage 1
**Extract from result:** `claim_ids`, `evidence_ids`, `tags_applied`

Report to user:
```
[3/5] Decomposed: <N> claims, <N> evidence records — <duration>s
```

### Stages 4 + 5: Categorize and Evaluate (parallel)

Launch BOTH agents simultaneously using parallel Agent tool calls. Capture a single `stage_start` before launching both; capture `stage_end` when BOTH have returned. Report the wall-clock duration for the parallel pair.

**Stage 4 — Categorize:**
- **Agent prompt:** `process/agents/categorize.md`
- **Model:** sonnet
- **Substitutions:** `{{claim_ids}}` → from stage 3, `{{source_id}}` → from stage 1
- **Extract:** `topics_assigned`, `themes_assigned`, `tags_applied`

**Stage 5 — Evaluate:**
- **Agent prompt:** `process/agents/evaluate.md`
- **Model:** sonnet
- **Substitutions:** `{{source_id}}` → from stage 1, `{{claim_ids}}` → comma-separated list from stage 3, `{{evidence_ids}}` → comma-separated list from stage 3
- **Extract:** `source_grade`, `claims_evaluated`, `evidence_evaluated`, `avg_evidence_credibility`

Report both results:
```
[4/5] Categorized: <N> topics, <N> themes, <N> tags ┐
[5/5] Evaluated: grade <A-F>, <N> claims, avg evidence credibility <N> ┘ — <duration>s (parallel)
```

## Final Summary

After all stages, compute `total_duration = now - pipeline_start`. Present:

```
PIPELINE COMPLETE
━━━━━━━━━━━━━━━━

Source: "<title>" (ID: <source_id>)
URL: <url>

Stage Results:
  ✓ Collected — <source_type>, <word_count> words          <duration>s
  ✓ Distilled — <word_count> words                          <duration>s
  ✓ Decomposed — <N> claims, <N> evidence records          <duration>s
  ✓ Categorized — <N> topics, <N> themes, <N> tags    ┐
  ✓ Evaluated — Grade: <A-F>, <N> claims, Avg evidence: <score>  ┘ <duration>s
                                                      ─────────
                                                Total: <total>s

Knowledge Base Impact:
  Claims: <before> → <after>
  Evidence: <before> → <after>
```

## How to Spawn Subagents

For each stage, follow this pattern:

1. Read the agent prompt file using the Read tool (no description needed — Read tool doesn't display)
2. If the prompt contains `{{markdown_rules}}`, `{{contributor_enrichment}}`, or `{{source_summary}}`, read `process/agents/collect-shared.md` and substitute each placeholder with the content under its matching `##` heading (everything from the heading to the next `##` or end of file)
3. Replace all remaining `{{placeholder}}` strings with actual runtime values
4. Append these rules to every agent prompt (after all substitutions):
   > **Encoding (mandatory):** All text written to the database must use clean Unicode. Fix mojibake on sight — never store double-encoded sequences like `â€"`, `â€™`, `â€œ`, `Ã©`. Use proper em dashes `—`, en dashes `–`, curly quotes `""''`, ellipsis `…`. This applies to every field in every table.
   >
   > **Tool call tracking (mandatory):** Track every tool call you make. In your final JSON output, include a `"tool_calls"` array listing each call in order. Each entry: `{"tool": "<tool_name>", "action": "<brief description>"}`. Use short, specific descriptions (e.g., `{"tool": "Bash", "action": "SELECT source content"}`, `{"tool": "WebFetch", "action": "fetch article URL"}`, `{"tool": "Bash", "action": "INSERT 5 claims"}`). The tool name should match exactly what you called (Bash, WebFetch, WebSearch, Read, Grep, Glob, etc.).
5. Call the Agent tool with:
   - `subagent_type`: `"general-purpose"`
   - `model`: as specified per stage (sonnet or haiku)
   - `prompt`: the substituted agent prompt text
   - `description`: short label like "Collect web source"
6. Parse the JSON block from the last ```json ... ``` fence in the agent's response
7. Extract the needed IDs and pass them to the next stage

For the parallel stages (4+5), make BOTH Agent tool calls in a single message.

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
  Remaining: <remaining stages>
Resume by saying "continue processing source #<id>"
```
