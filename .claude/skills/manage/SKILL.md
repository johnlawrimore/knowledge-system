---
name: manage
description: Create, update, and organize topics, themes, tags, and editorial content
---

# Manage

## Purpose

Create, update, and organize topics, themes, tags, and editorial content. This is the curation skill — it handles the structural and editorial work that shapes how the knowledge base is organized.

## When to Use

- User says "create topic", "add theme", "manage topics", "organize"
- User wants to assign claims to topics or themes
- User wants to add, remove, or clean up tags
- User wants to create or modify claim relationships
- User wants to edit or merge contributors

## Database Connection

Use the `mysql` MCP tool for all database operations against the `knowledge` database.

## Tag Management

Tags are freeform string labels on claims. No separate tag table — just strings in `claim_tags`.

### Add Tags

```sql
INSERT IGNORE INTO claim_tags (claim_id, tag) VALUES (<claim_id>, '<tag>');
```

Bulk-tag by query:
```sql
-- Tag all claims in a topic
INSERT IGNORE INTO claim_tags (claim_id, tag)
SELECT ct.claim_id, 'book-ch-3'
FROM claim_topics ct WHERE ct.topic_id = <topic_id>;

-- Tag all claims from a specific source
INSERT IGNORE INTO claim_tags (claim_id, tag)
SELECT ce.claim_id, 'keynote-draft'
FROM claim_evidence ce
JOIN evidence e ON ce.evidence_id = e.id
WHERE e.source_id = <source_id>;
```

### Remove Tags

```sql
-- Single claim
DELETE FROM claim_tags WHERE claim_id = <claim_id> AND tag = '<tag>';

-- Remove a tag from all claims
DELETE FROM claim_tags WHERE tag = '<tag>';
```

### List All Tags

```sql
SELECT tag, COUNT(*) AS claim_count
FROM claim_tags GROUP BY tag ORDER BY claim_count DESC;
```

### Find Claims by Tag

```sql
SELECT c.id, c.statement, c.claim_type
FROM claims c
JOIN claim_tags ct ON c.id = ct.claim_id
WHERE ct.tag = '<tag>'
ORDER BY c.id;
```

### Find Claims by Multiple Tags (AND)

```sql
SELECT c.id, c.statement
FROM claims c
JOIN claim_tags ct ON c.id = ct.claim_id
WHERE ct.tag IN ('<tag1>', '<tag2>')
GROUP BY c.id, c.statement
HAVING COUNT(DISTINCT ct.tag) = 2;
```

### Rename a Tag

```sql
UPDATE claim_tags SET tag = '<new_tag>' WHERE tag = '<old_tag>';
```

### Tag Cleanup

Find near-duplicate tags:
```sql
SELECT tag, COUNT(*) AS claim_count FROM claim_tags GROUP BY tag ORDER BY tag;
```

Review the list for inconsistencies (e.g., `book-ch-3` vs `book-chapter-3`) and rename as needed.

### Tag Conventions

| Prefix | Purpose | Examples |
|---|---|---|
| `book-ch-<n>` | Composition targeting | `book-ch-1`, `book-ch-5` |
| (no prefix) | Domain labels | `tdd`, `code-review`, `agent-architecture` |
| (no prefix) | Editorial flags | `strong-opener`, `quotable`, `controversial`, `needs-evidence` |
| (no prefix) | Workflow | `revisit-later`, `discuss-with-editor` |

## Topic Management

### Create a Topic

```sql
INSERT INTO topics (name, description, parent_topic_id, sort_order)
VALUES ('<n>', '<description>', <parent_id or NULL>, <sort_order>);
```

Topics support hierarchy:
- "AI-Assisted Development" (top-level)
  - "Code Generation" (parent = AI-Assisted Development)
  - "Test Generation" (parent = AI-Assisted Development)

### List Topics

```sql
SELECT t.id, t.name, t.description, p.name AS parent_topic,
       COUNT(ct.claim_id) AS claim_count
FROM topics t
LEFT JOIN topics p ON t.parent_topic_id = p.id
LEFT JOIN claim_topics ct ON t.id = ct.topic_id
GROUP BY t.id, t.name, t.description, p.name
ORDER BY t.parent_topic_id IS NULL DESC, t.parent_topic_id, t.sort_order;
```

### Update / Delete a Topic

Before deleting, check for claims and subtopics. Ask user whether to reassign or unlink.

### Assign Claims to Topics

```sql
INSERT IGNORE INTO claim_topics (claim_id, topic_id) VALUES (<claim_id>, <topic_id>);
```

Bulk — assign all uncategorized claims interactively:
```sql
SELECT c.id, c.statement, c.claim_type
FROM claims c LEFT JOIN claim_topics ct ON c.id = ct.claim_id
WHERE ct.topic_id IS NULL ORDER BY c.id;
```

## Theme Management

### Create a Theme

```sql
INSERT INTO themes (name, thesis, description)
VALUES ('<n>', '<thesis statement>', '<description>');
```

A theme needs a thesis — the core argument it advances.

### List Themes

```sql
SELECT * FROM v_theme_strength;
```

### Assign Claims to Themes

```sql
INSERT IGNORE INTO claim_themes (claim_id, theme_id) VALUES (<claim_id>, <theme_id>);
```

### Discover Potential Themes

When 50+ claims exist, help discover themes by looking for patterns across topics and presenting suggestions.

## Reviewer Notes

```sql
UPDATE claims SET reviewer_notes = '<position>' WHERE id = <id>;
```

## Claim Relationship Management

### Create

```sql
INSERT INTO claim_relationships (claim_id_a, claim_id_b, relationship, notes)
VALUES (<id_a>, <id_b>, '<type>', '<explanation>');
```

### View for a Claim

```sql
SELECT cr.relationship,
    CASE WHEN cr.claim_id_a = <id> THEN cb.statement ELSE ca.statement END AS related_claim,
    CASE WHEN cr.claim_id_a = <id> THEN cr.claim_id_b ELSE cr.claim_id_a END AS related_id,
    cr.notes
FROM claim_relationships cr
JOIN claims ca ON cr.claim_id_a = ca.id
JOIN claims cb ON cr.claim_id_b = cb.id
WHERE cr.claim_id_a = <id> OR cr.claim_id_b = <id>;
```

## Contributor Management

### Merge Duplicates

```sql
UPDATE source_contributors SET contributor_id = <canonical_id>
WHERE contributor_id = <duplicate_id>;
DELETE FROM contributors WHERE id = <duplicate_id>;
```

### Update Info

```sql
UPDATE contributors SET affiliation = '<new>', role = '<new>' WHERE id = <id>;
```
