---
name: status
description: Pipeline reporting, gap analysis, and knowledge base health dashboard
---

# Status

## Purpose

Report on the state of the knowledge base — pipeline progress, claim coverage, scoring, gaps, and health metrics.

## When to Use

- User says "status", "dashboard", "how's the knowledge base", "what needs work"
- User wants to see pipeline progress
- User wants to find weak claims, thin topics, or uncategorized content
- User asks "what should I work on next"

## Database Connection

Use the `mysql` MCP tool for all database operations against the `knowledge` database.

## Reports

### 1. Pipeline Overview (Default)

```sql
SELECT * FROM v_pipeline_status;
```

```sql
SELECT
    (SELECT COUNT(*) FROM sources) AS total_sources,
    (SELECT COUNT(*) FROM compositions) AS total_compositions,
    (SELECT COUNT(*) FROM claims) AS total_claims,
    (SELECT COUNT(*) FROM claim_clusters) AS total_clusters,
    (SELECT COUNT(*) FROM evidence) AS total_evidence,
    (SELECT COUNT(*) FROM contributors) AS total_contributors,
    (SELECT COUNT(*) FROM topics) AS total_topics,
    (SELECT COUNT(*) FROM themes) AS total_themes,
    (SELECT COUNT(DISTINCT tag) FROM claim_tags) AS total_tags;
```

Format:
```
Knowledge Base Status
━━━━━━━━━━━━━━━━━━━
Pipeline:
  Sources: X collected, X distilled, X decomposed
  Compositions: X draft, X reviewed, X published

Knowledge:
  Claims: X (in Y clusters + Z standalone)
  Evidence: X records
  Contributors: X | Topics: X | Themes: X | Tags: X
```

### 2. Topic Coverage

```sql
SELECT * FROM v_topic_coverage ORDER BY claim_count DESC;
```

### 3. Theme Strength

```sql
SELECT * FROM v_theme_strength ORDER BY avg_claim_score DESC;
```

### 4. Strongest Claims

```sql
SELECT ref_id, display_text, computed_confidence, score,
       supporting_sources, contradicting_sources
FROM v_all_scored ORDER BY score DESC LIMIT 20;
```

### 5. Weakest Claims (Gap Analysis)

```sql
SELECT * FROM v_thin_claims LIMIT 20;
```

### 6. Contested Claims

```sql
SELECT ref_id, display_text, score, supporting_sources, contradicting_sources
FROM v_all_scored WHERE computed_confidence = 'contested' ORDER BY score DESC;
```

### 7. Unsupported Claims

```sql
SELECT ref_id, display_text FROM v_all_scored WHERE computed_confidence = 'unsupported';
```

### 8. Uncategorized Claims

```sql
SELECT c.id, c.statement, c.claim_type
FROM claims c LEFT JOIN claim_topics ct ON c.id = ct.claim_id
WHERE ct.topic_id IS NULL ORDER BY c.created_at DESC;
```

### 9. Unevaluated Entities

```sql
SELECT 'sources' AS entity, COUNT(*) AS count FROM sources WHERE evaluation_results IS NULL
UNION ALL SELECT 'evidence', COUNT(*) FROM evidence WHERE evaluation_results IS NULL;
```

### 10. Source Contributions

```sql
SELECT * FROM v_source_contributions ORDER BY evidence_count DESC LIMIT 20;
```

### 11. Expert Positions Summary

```sql
SELECT p.name, p.affiliation,
    COUNT(DISTINCT ce.claim_id) AS claims_touched,
    SUM(CASE WHEN ce.stance = 'supports' THEN 1 ELSE 0 END) AS supporting,
    SUM(CASE WHEN ce.stance = 'contradicts' THEN 1 ELSE 0 END) AS contradicting
FROM contributors p
JOIN source_contributors sc ON p.id = sc.contributor_id
JOIN sources s ON sc.source_id = s.id
JOIN evidence e ON s.id = e.source_id
JOIN claim_evidence ce ON e.id = ce.evidence_id
GROUP BY p.id, p.name, p.affiliation ORDER BY claims_touched DESC;
```

### 12. Cluster Health

```sql
SELECT cc.id, COUNT(c.id) AS claim_count,
       GROUP_CONCAT(c.statement SEPARATOR ' | ') AS claims
FROM claim_clusters cc JOIN claims c ON cc.id = c.cluster_id
WHERE cc.summary IS NULL GROUP BY cc.id;
```

### 13. Stale Sources

```sql
SELECT id, title, source_type, date_collected FROM sources
WHERE status = 'collected' AND date_collected < DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY date_collected ASC;
```

### 14. Tag Overview

```sql
SELECT tag, COUNT(*) AS claim_count
FROM claim_tags GROUP BY tag ORDER BY claim_count DESC;
```

### 15. Claims by Tag

```sql
SELECT c.id, c.statement, sc.computed_confidence, sc.score
FROM claims c
JOIN claim_tags ct ON c.id = ct.claim_id
JOIN v_claim_scoring_inputs sc ON c.id = sc.claim_id
WHERE ct.tag = '<tag>'
ORDER BY sc.score DESC;
```

### 16. Untagged Claims

```sql
SELECT c.id, c.statement, c.claim_type
FROM claims c LEFT JOIN claim_tags ct ON c.id = ct.claim_id
WHERE ct.tag IS NULL ORDER BY c.created_at DESC;
```

## "What Should I Work On Next"

Prioritize:

1. **Sources stuck in `collected`** — distill them
2. **Distilled sources** — decompose them
3. **Unevaluated sources** — evaluate before distilling
4. **Uncategorized claims** — assign topics
5. **Untagged claims** — apply at least domain tags
6. **Thin claims** — find more sources to strengthen them
7. **Unsummarized clusters** — write summaries
8. **Contested claims** — review and write reviewer_notes

```
Recommended next actions:
  1. Distill 12 collected sources (oldest: "Fowler on TDD" from Jan 15)
  2. Decompose 5 distilled sources
  3. Evaluate 8 unevaluated sources
  4. Categorize 23 uncategorized claims
  5. Strengthen 14 thin claims (< 2 supporting sources)
```

## Ad-Hoc Queries

**"What do we know about [topic]?"**
```sql
SELECT c.id, c.statement, sc.computed_confidence, sc.score
FROM claims c
JOIN claim_topics ct ON c.id = ct.claim_id
JOIN topics t ON ct.topic_id = t.id
JOIN v_claim_scoring_inputs sc ON c.id = sc.claim_id
WHERE t.name LIKE '%<topic>%' ORDER BY sc.score DESC;
```

**"What does [person] say?"**
```sql
SELECT * FROM v_expert_positions WHERE name LIKE '%<person>%';
```

**"Show me everything about claim #X"**
```sql
SELECT * FROM v_claim_evidence WHERE claim_id = <X>;
SELECT tag FROM claim_tags WHERE claim_id = <X>;
```

**"What claims are tagged [tag]?"**
```sql
SELECT c.id, c.statement FROM claims c
JOIN claim_tags ct ON c.id = ct.claim_id WHERE ct.tag = '<tag>';
```

**"What claims are in cluster #X?"**
```sql
SELECT c.id, c.statement FROM claims c WHERE c.cluster_id = <X>;
SELECT * FROM v_cluster_scores WHERE cluster_id = <X>;
```
