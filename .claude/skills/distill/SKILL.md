---
name: distill
description: Transform raw sources into distilled artifacts in a uniform editorial voice
---

# Distill

## Purpose

Transform raw source material into a distilled artifact — a knowledge-focused rewrite in a uniform voice that filters noise, normalizes terminology, and preserves only what matters for the knowledge base. Each artifact draws from one or more sources.

## When to Use

- User says "distill", "distill source #X", "create artifact from..."
- User wants to combine multiple sources on the same topic into one artifact
- A source has status `collected` and is ready for processing
- User says "distill next" (pick the oldest `collected` source)

## Dependencies

- **markdown-formatting** skill: All `content_md` output must follow its rules.

## Database Connection

Use the `mysql` MCP tool for all database operations against the `knowledge` database.

## Workflow

### 1. Select Source(s)

**Single-source distillation** (default):

```sql
-- Specific source
SELECT id, title, source_type, content_md FROM sources WHERE id = <id>;

-- Next unprocessed source
SELECT id, title, source_type, content_md FROM sources
WHERE status = 'collected' ORDER BY created_at ASC LIMIT 1;
```

**Multi-source distillation** (user requests combining sources):

```sql
SELECT id, title, source_type, content_md FROM sources
WHERE id IN (<id1>, <id2>, <id3>);
```

Only combine sources that cover substantially the same topic. If the user asks to combine unrelated sources, push back — suggest separate artifacts instead.

### 2. Update Source Status

```sql
UPDATE sources SET status = 'distilling' WHERE id IN (<source_ids>);
```

### 3. Distill the Content

Read the full source content and produce a rewritten artifact.

**DOES:**
- Rewrite ALL content in a uniform editorial voice — direct, precise, practitioner-oriented
- Focus on knowledge that supports claims, evidence, reasoning, and actionable insight
- Normalize terminology (e.g., if the source says "AI pair programmer" and the knowledge base uses "AI coding assistant," use the latter)
- Preserve specific data points, statistics, study results, benchmarks — these become evidence later
- Preserve notable quotes ONLY when the attribution adds credibility or rhetorical power
- Flag assertions that seem unverifiable or unsupported in the source
- Note where the source's argument is particularly strong or weak
- Organize content by knowledge themes, not by the source's original structure

**DOES NOT:**
- Copy the source's structure or organization
- Include biographical preamble, self-promotion, or filler
- Preserve conversational artifacts from podcasts/interviews ("great question", "you know", "um")
- Include content that is purely contextual to the source's audience but irrelevant to the knowledge base
- Add your own analysis or claims — the artifact distills what the SOURCE says

**Artifact structure** (follow **markdown-formatting** rules for all output):

```markdown
# <Descriptive Title — What This Artifact Is About>

## Key Assertions

<The main claims this source makes, rewritten in uniform voice.
Each assertion should be a clear, standalone statement.>

## Supporting Evidence

<Specific data, examples, case studies, statistics from the source.
Preserve precision — exact numbers, dates, company names.>

## Notable Perspectives

<Unique framings, analogies, or arguments the source offers.
Include verbatim quotes only when attribution adds value.>

## Methodological Notes

<If the source describes a process, framework, or technique,
capture it here with enough detail to be actionable.>

## Gaps and Caveats

<Where the source's argument is weak, unsupported, or
contradicts other material in the knowledge base.
Be specific about what's missing.>
```

Not every section will be present for every source. Omit sections that don't apply — don't force empty sections.

### 4. Quality Check

Before inserting, verify the artifact:

- **Minimum length**: At least 300 words. If shorter, the source may not have enough knowledge content — warn the user.
- **Maximum length**: If over 3,000 words, consider whether the artifact is trying to cover too much. Suggest splitting.
- **No plagiarism**: No long passages copied verbatim from the source (except preserved quotes marked as such).
- **Completeness**: All significant claims from the source should be represented. Even weak or disagreeable claims should be captured (note them in Gaps and Caveats).
- **Formatting**: Verify compliance with **markdown-formatting** rules — one H1, proper heading hierarchy, no skipped levels, no HTML, no bold-as-headings.

### 5. Insert into Database

```sql
INSERT INTO artifacts (title, content_md, source_strategy, status, notes)
VALUES (
    '<title>',
    '<distilled_markdown>',
    '<single_source|multi_source>',
    'draft',
    '<any_notes>'
);
```

**Link artifact to source(s):**

```sql
INSERT INTO artifact_sources (artifact_id, source_id, contribution_note)
VALUES (<artifact_id>, <source_id>, '<what this source contributed>');
```

**Update source status:**

```sql
UPDATE sources SET status = 'distilled' WHERE id IN (<source_ids>);
```

### 6. Report

```
✓ Distilled: "<artifact_title>"
  Artifact ID: <id>
  Strategy: <single_source|multi_source>
  Source(s): <source_title(s)>
  Words: <word_count>
  Status: draft
```

## Multi-Source Distillation Guidelines

- Each source should contribute something the others don't.
- Contribution Notes should be specific: "Source A provided the empirical data. Source B provided the practitioner framework."
- If sources contradict each other, capture BOTH positions. Don't resolve the conflict — decomposition handles that.
- Keep traceability clear: when a data point comes from a specific source, note it parenthetically, e.g., "(per Google's 2024 internal study)" so the decompose skill can assign evidence to the right `source_id`.

## Batch Distillation

When the user says "distill all collected sources" or "distill next 5":

1. Process sequentially, oldest first
2. Show progress
3. Each artifact is independent — don't combine sources unless the user explicitly asks
4. Summarize at the end

## Error Handling

- If a source's `content_md` is empty or corrupted, skip and report
- If a source has status other than `collected`, warn the user
- If distillation produces a very short artifact (<200 words), flag it and ask whether to proceed or skip
