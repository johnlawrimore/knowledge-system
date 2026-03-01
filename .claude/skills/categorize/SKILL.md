---
name: categorize
description: Assign topics, themes, and tags to claims after decomposition and clustering
---

# Categorize

## Purpose

Assign topics, themes, and tags to newly created or uncategorized claims. This is the organizational step that makes claims discoverable and composable. Runs after **cluster** so you categorize deduplicated claims, not duplicates about to be merged.

## When to Use

- User says "categorize", "categorize claims", "assign topics", "tag new claims"
- After running **decompose** and **cluster** on new material
- Called as a stage in the **process** pipeline
- User says "categorize uncategorized" to sweep all unassigned claims

## Database Connection

Use the `mysql` MCP tool for all database operations against the `knowledge` database.

## Core Principles

1. **Every claim should have at least one topic.** Topics are the primary organizational axis — uncategorized claims are invisible to coverage analysis.
2. **Themes are selective.** Not every claim advances a theme. Only assign claims that genuinely support or challenge a thesis.
3. **Tags are liberal.** Apply freely — they're lightweight and freeform. When in doubt, tag it.
4. **Propose new topics and themes; don't create silently.** If a claim doesn't fit existing categories, present the gap to the user for approval before creating new ones.

## Workflow

### 1. Identify Target Claims

**After a pipeline run** (specific source):
```sql
SELECT c.id, c.statement, c.claim_type, c.cluster_id
FROM claims c
JOIN claim_evidence ce ON c.id = ce.claim_id
JOIN evidence e ON ce.evidence_id = e.id
WHERE e.source_id = <source_id>
ORDER BY c.id;
```

**Sweep all uncategorized:**
```sql
SELECT c.id, c.statement, c.claim_type
FROM claims c
LEFT JOIN claim_topics ct ON c.id = ct.claim_id
WHERE ct.topic_id IS NULL
ORDER BY c.id;
```

### 2. Load Existing Categories

```sql
SELECT id, name, description, parent_topic_id FROM topics ORDER BY parent_topic_id IS NULL DESC, parent_topic_id, sort_order;

SELECT id, name, thesis FROM themes ORDER BY name;

SELECT tag, COUNT(*) AS usage_count FROM claim_tags GROUP BY tag ORDER BY usage_count DESC;
```

### 3. Assign Topics

For each claim, determine which topic(s) it belongs to. A claim can belong to multiple topics.

```sql
INSERT IGNORE INTO claim_topics (claim_id, topic_id) VALUES (<claim_id>, <topic_id>);
```

**If no existing topic fits:**
- Note the claim and suggest a new topic name + description
- Collect all orphan claims that would fit the proposed topic
- Present to the user:
  ```
  PROPOSED TOPIC: "<name>"
    Description: <description>
    Parent: <parent topic or top-level>
    Claims that would fit: #X, #Y, #Z
  ```
- Wait for approval before creating

### 4. Assign Themes

Review each claim against existing themes. Only assign if the claim genuinely supports or challenges the theme's thesis.

```sql
INSERT IGNORE INTO claim_themes (claim_id, theme_id) VALUES (<claim_id>, <theme_id>);
```

**If claims suggest a new theme:**
- A theme needs a thesis — the core argument it advances
- Present to the user:
  ```
  PROPOSED THEME: "<name>"
    Thesis: <thesis statement>
    Description: <description>
    Supporting claims: #X, #Y, #Z
  ```
- Wait for approval before creating

### 5. Apply Tags

Apply domain tags, editorial flags, and provenance tags. Follow tag conventions from the **manage** skill:

| Prefix | Purpose | Examples |
|---|---|---|
| `source:<id>` | Provenance (should already exist from decompose) | `source:12` |
| `book-ch-<n>` | Composition targeting | `book-ch-1` |
| (no prefix) | Domain labels | `tdd`, `code-review`, `ai-agents` |
| (no prefix) | Editorial flags | `strong-opener`, `quotable`, `controversial` |

```sql
INSERT IGNORE INTO claim_tags (claim_id, tag) VALUES (<claim_id>, '<tag>');
```

Prefer reusing existing tags over creating new near-duplicates. Check the tag list from Step 2 before inventing new tags.

### 6. Present Summary for Approval

Before committing, show the user the full categorization plan:

```
CATEGORIZATION PLAN
━━━━━━━━━━━━━━━━━━

Claim #12: "AI code generation shifts the developer's primary task..."
  Topics: Code Generation, Developer Workflow
  Themes: Human-AI Collaboration
  Tags: ai-code-gen, developer-experience

Claim #13: "TDD provides a natural verification loop for AI output..."
  Topics: Test-Driven Development
  Themes: TDD in the AI Era
  Tags: tdd, ai-verification, strong-opener

NEW TOPICS PROPOSED:
  (none)

NEW THEMES PROPOSED:
  (none)
```

Wait for user approval. The user may adjust assignments, reject proposals, or approve as-is.

### 7. Execute

After approval, run all the INSERT statements. Then report:

```
✓ Categorized: <N> claims
  Topics assigned: <N> assignments across <N> topics
  Themes assigned: <N> assignments across <N> themes
  Tags applied: <N> tags (<N> new, <N> existing)
  New topics created: <N>
  New themes created: <N>
  Still uncategorized: <N>
```

## Batch Categorization

When categorizing many claims at once:

1. Group claims by similarity before presenting — don't interleave unrelated claims
2. Propose topic/theme assignments in batches by topic area
3. Let the user approve in batches rather than one at a time
4. Track and report aggregate stats at the end

## Clustered Claims

If a claim belongs to a cluster:
- Check whether the cluster's other claims are already categorized
- Apply the same topic/theme assignments for consistency
- Flag any mismatches: "Claim #12 is in cluster #3, but other claims in that cluster are under topic X — should this one match?"

## Error Handling

- If no topics or themes exist yet, inform the user and propose initial categories based on the claims at hand
- If a claim is too vague to categorize, flag it: "Claim #X may need to be rewritten before categorization — too broad to assign a specific topic"
- Never silently skip a claim — report every claim's disposition
