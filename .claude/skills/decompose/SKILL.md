---
name: decompose
description: Extract claims and evidence from artifacts into structured, queryable knowledge
---

# Decompose

## Purpose

Break an artifact into structured knowledge: claims and evidence stored in the database. This is the most important skill in the pipeline — it transforms readable prose into queryable, scoreable, composable knowledge.

## When to Use

- User says "decompose", "decompose artifact #X", "extract claims from..."
- An artifact has status `draft` or `reviewed` and is ready for decomposition
- User says "decompose next" (pick the oldest un-decomposed artifact)

## Database Connection

Use the `mysql` MCP tool for all database operations against the `knowledge` database.

## Core Principles

1. **Claims are assertions in the user's voice.** Not quotes, not source language. Each claim should be a clear, standalone statement that could appear in a book or article.

2. **Evidence traces to the original source, not the artifact.** Even though you're reading an artifact, every evidence record must have `source_id` pointing to the original source. Use `artifact_sources` to find the source IDs.

3. **One piece of evidence can support multiple claims.** Don't duplicate evidence — link it to each relevant claim via `claim_evidence`.

4. **Capture stance honestly.** If evidence contradicts a claim, record it as `contradicts`. If it partially supports with caveats, use `qualifies`. Don't force everything into `supports`.

5. **Write reasoning for every evidence-claim link.** The `reasoning` field on `claim_evidence` explains WHY this evidence matters to this claim. Without it, the link is just an assertion.

## Workflow

### 1. Load the Artifact and Its Sources

```sql
SELECT id, title, content_md FROM artifacts WHERE id = <id>;

SELECT s.id AS source_id, s.title, s.source_type
FROM artifact_sources ars
JOIN sources s ON ars.source_id = s.id
WHERE ars.artifact_id = <artifact_id>;
```

For multi-source artifacts, note which `source_id` maps to which content so evidence can be attributed correctly.

### 2. Update Statuses

```sql
UPDATE artifacts SET status = 'decomposed' WHERE id = <artifact_id>;
UPDATE sources SET status = 'decomposing' WHERE id IN (<source_ids>);
```

### 3. Identify Claims

Read the artifact and extract every distinct assertion. For each potential claim, ask:

- **Is this actually a claim?** "TDD was invented in the 1990s" is a historical fact, not a useful claim. "TDD is more valuable in AI-assisted development than in traditional development" is a claim.
- **Is this specific enough?** "AI is changing software development" is too vague. "AI code generation shifts the developer's primary task from writing code to reviewing code" is specific.
- **What type is this?** Classify using the `claim_type` enum:
  - `assertion` — "X is true"
  - `principle` — "always/never do X"
  - `framework` — "there are N types of X"
  - `recommendation` — "teams should do X"
  - `prediction` — "X will happen"
  - `definition` — "X means Y"
  - `observation` — "we see X happening"
  - `other` — doesn't fit the above

### 4. Check for Existing Claims

**This step is critical for preventing duplicates and building cluster candidates.**

For each claim you've identified, search for similar existing claims:

```sql
SELECT id, statement, claim_type, cluster_id
FROM claims
WHERE MATCH(statement) AGAINST('<key phrases from your claim>' IN NATURAL LANGUAGE MODE)
LIMIT 10;
```

If fulltext doesn't find good matches, try keyword search:

```sql
SELECT id, statement, claim_type, cluster_id
FROM claims WHERE statement LIKE '%<key_phrase>%' LIMIT 10;
```

**If a strong match exists:**
- Do NOT create a duplicate claim
- Create evidence from this artifact and link it to the EXISTING claim
- This is how claims accumulate evidence from multiple sources

**If a partial match exists (similar but not the same):**
- Create the new claim as standalone
- Note the similar claim ID in `notes`: "Related to claim #X — candidate for clustering"
- The cluster skill handles grouping later

**If no match exists:**
- Create a new standalone claim

### 5. Insert Claims

```sql
INSERT INTO claims (statement, claim_type, notes)
VALUES ('<claim statement in your voice>', '<claim_type>', '<notes including related claim IDs>');
```

### 6. Tag Claims

Apply tags for workflow and composition context. Tags are lightweight labels — use them freely.

```sql
INSERT IGNORE INTO claim_tags (claim_id, tag) VALUES (<claim_id>, '<tag>');
```

**Tag conventions:**
- Source-derived: `source:<source_id>` (auto-apply, tracks provenance)
- Composition targets: `book-ch-1`, `keynote-draft`, `blog-post-tdd`
- Editorial flags: `strong-opener`, `needs-evidence`, `controversial`, `quotable`
- Domain: `tdd`, `code-review`, `agent-architecture`, `context-engineering`

At minimum, always apply the `source:<source_id>` tag so claims are traceable to their origin even without querying through evidence.

### 7. Extract and Insert Evidence

For each claim (new or existing), identify the specific evidence from the artifact. Evidence is:

- A data point: "Google's internal study found 40% more defects..."
- A case study: "At Spotify, teams that adopted this practice saw..."
- An expert opinion: "Fowler argues that..."
- A statistical finding: "In a survey of 500 developers, 73% reported..."
- A theoretical argument: "Based on Conway's Law, we would expect..."
- An anecdotal account: "In my experience leading a team of 12..."

```sql
INSERT INTO evidence (content, source_id, artifact_id, evidence_type, verbatim_quote, notes)
VALUES (
    '<evidence rewritten in your voice>',
    <source_id>,  -- ALWAYS the original source, not the artifact
    <artifact_id>,
    '<evidence_type>',
    '<exact quote if attribution matters, NULL otherwise>',
    '<notes>'
);
```

**evidence_type:**
- `empirical` — measured data, experimental results
- `case_study` — specific real-world implementation story
- `expert_opinion` — authoritative person making an assertion
- `anecdotal` — personal experience, informal observation
- `theoretical` — derived from established theory or model
- `statistical` — quantitative data, surveys, benchmarks
- `other`

**verbatim_quote:** Only populate when the exact words matter — typically when a recognized expert says something quotable. Most evidence should be rewritten with `verbatim_quote = NULL`.

### 8. Link Evidence to Claims

```sql
INSERT INTO claim_evidence (claim_id, evidence_id, stance, strength, reasoning, notes)
VALUES (<claim_id>, <evidence_id>, '<stance>', '<strength>', '<reasoning>', '<notes>');
```

**stance:**
- `supports` — makes the claim more believable
- `contradicts` — undermines the claim
- `qualifies` — "yes, but only when..." or "yes, but with caveats"

**strength:**
- `strong` — direct, specific, credible (rigorous study data)
- `moderate` — good but with limitations (expert opinion, single case study)
- `weak` — suggestive but not conclusive (anecdotal, theoretical without empirical backing)

**reasoning:** The logical glue. Examples:
- "This empirical data directly measures the outcome the claim predicts, with a large enough sample to be statistically significant."
- "Fowler's expertise in refactoring gives this opinion substantial weight, though it's based on observation rather than controlled study."
- "This case study demonstrates the claim in practice at a single company — generalizability is uncertain."

### 9. Assign Topics

```sql
SELECT id, name FROM topics ORDER BY name;

INSERT IGNORE INTO claim_topics (claim_id, topic_id) VALUES (<claim_id>, <topic_id>);
```

If the claim doesn't fit any existing topic, note it: "This claim may need a new topic: '<suggested name>'. Run the status skill to review uncategorized claims."

Do NOT create topics during decomposition — that's a curation decision for the user.

### 10. Check for Derived Evidence

If the source is citing another source already in the knowledge base (e.g., "As Fowler wrote..."):

```sql
SELECT e.id, e.content, s.title
FROM evidence e JOIN sources s ON e.source_id = s.id
WHERE s.title LIKE '%<cited source>%' LIMIT 5;
```

If found:

```sql
UPDATE evidence SET derived_from_evidence_id = <original_evidence_id> WHERE id = <new_evidence_id>;
```

### 11. Update Source Status

```sql
UPDATE sources SET status = 'decomposed' WHERE id IN (<source_ids>);
```

### 12. Report

```
✓ Decomposed: "<artifact_title>"
  Artifact ID: <id>
  Claims created: <N new> | Claims linked: <N existing>
  Evidence created: <N>
  Evidence links: <N> (supports: X, contradicts: Y, qualifies: Z)
  Tags applied: <N>
  Derived evidence flagged: <N>
  Topics assigned: <N>
  Uncategorized claims: <N>
```

## Claim Granularity Guidelines

**Too broad:** "AI is transforming software development"
→ This is a theme, not a claim. Break it into specific assertions.

**Too narrow:** "GPT-4 generates correct Python list comprehensions 87% of the time"
→ This is evidence, not a claim. The claim might be "AI code generators are highly accurate for common language patterns."

**Right level:** "AI code generation shifts the developer's primary task from writing code to evaluating code, requiring a different skill set."
→ Specific enough to be arguable, broad enough to be supported by multiple pieces of evidence from different sources.

## Batch Decomposition

When the user says "decompose all" or "decompose next 5":

1. Process sequentially, oldest first
2. The duplicate-checking step becomes MORE important in batch mode
3. Summarize at the end with aggregate stats

## Error Handling

- If an artifact has no linked sources in `artifact_sources`, report the data integrity issue and skip
- If an artifact is already `decomposed`, warn the user — re-decomposition would create duplicates
- If the artifact produces zero claims, report it and suggest re-distilling
