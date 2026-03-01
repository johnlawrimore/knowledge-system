---
name: cluster
description: Group equivalent claims that express the same assertion in different words
---

# Cluster

## Purpose

Identify and group equivalent claims that express the same fundamental assertion in different words. This is a periodic maintenance skill — run it after decomposing new artifacts to keep the knowledge base organized.

## When to Use

- User says "cluster", "find duplicate claims", "group similar claims"
- After a batch decomposition to clean up potential equivalences
- User says "cluster check" for a scan without modifying anything

## Database Connection

Use the `mysql` MCP tool for all database operations against the `knowledge` database.

## Core Principles

1. **Clustering is a proposal, not an automatic action.** Present candidates to the user for approval before creating clusters.
2. **Similar is not equivalent.** Only cluster claims that assert the same thing in different words.
3. **Clusters are reversible.** Set `cluster_id = NULL` to undo. No data is lost.
4. **Don't cluster across claim types.** An `assertion` and a `recommendation` about the same topic are different kinds of claims.

## Workflow

### 1. Find Candidate Pairs

**Strategy A: Fulltext similarity scan**

```sql
SELECT a.id AS claim_a_id, a.statement AS claim_a,
       b.id AS claim_b_id, b.statement AS claim_b, a.claim_type
FROM claims a
JOIN claims b ON a.id < b.id
WHERE a.cluster_id IS NULL AND b.cluster_id IS NULL
  AND a.claim_type = b.claim_type
  AND MATCH(b.statement) AGAINST('<key phrases from claim a>' IN NATURAL LANGUAGE MODE);
```

**Strategy B: Topic-based narrowing**

```sql
SELECT a.id AS claim_a_id, a.statement AS claim_a,
       b.id AS claim_b_id, b.statement AS claim_b
FROM claim_topics ct_a
JOIN claim_topics ct_b ON ct_a.topic_id = ct_b.topic_id AND ct_a.claim_id < ct_b.claim_id
JOIN claims a ON ct_a.claim_id = a.id
JOIN claims b ON ct_b.claim_id = b.id
WHERE a.cluster_id IS NULL AND b.cluster_id IS NULL
  AND a.claim_type = b.claim_type;
```

**Strategy C: Flagged candidates from decompose**

```sql
SELECT id, statement, notes FROM claims
WHERE notes LIKE '%Related to claim%' AND cluster_id IS NULL;
```

### 2. Evaluate Candidates

For each pair, assess:
- Do they make the same fundamental assertion? (Ignore surface wording.)
- Would combining their evidence make sense?
- Are the nuances meaningfully different? If so, this may be a `refines` relationship, not a cluster.

### 3. Present Candidates

```
CLUSTER CANDIDATE 1:
  Claim #12: "Developers should author tests; AI should write implementation"
  Claim #47: "The human role in TDD is writing the test; the AI role is making it pass"
  Claim #63: "Test authorship should remain a human responsibility in AI-assisted workflows"
  Recommendation: CLUSTER — all three assert the same division of responsibility.

RELATIONSHIP CANDIDATE 1:
  Claim #12: "Developers should author tests; AI should write implementation"
  Claim #88: "TDD provides more value in AI-assisted development than in traditional development"
  Recommendation: RELATIONSHIP (depends_on) — #88 assumes #12 is true but makes a broader claim.
```

Wait for user approval.

### 4. Create Clusters (On Approval)

```sql
INSERT INTO claim_clusters (notes) VALUES ('Clustered from claims: #12, #47, #63');
UPDATE claims SET cluster_id = <cluster_id> WHERE id IN (12, 47, 63);
```

Leave `summary` and `reviewer_notes` as NULL — the user writes those when ready.

### 5. Create Relationships (On Approval)

```sql
INSERT INTO claim_relationships (claim_id_a, claim_id_b, relationship, notes)
VALUES (<claim_a>, <claim_b>, '<relationship_type>', '<explanation>');
```

### 6. Report

```
Clustering complete:
  Claims scanned: <N>
  Cluster candidates found: <N>
  Clusters created: <N> (containing <N> claims total)
  Relationships created: <N>
  Skipped (user rejected): <N>
```

## Cluster Maintenance

**Review existing clusters:**
```sql
SELECT cc.id AS cluster_id, cc.summary, c.id AS claim_id, c.statement
FROM claim_clusters cc JOIN claims c ON cc.id = c.cluster_id
ORDER BY cc.id, c.id;
```

**Add a claim to a cluster:**
```sql
UPDATE claims SET cluster_id = <cluster_id> WHERE id = <claim_id>;
```

**Remove a claim from a cluster:**
```sql
UPDATE claims SET cluster_id = NULL WHERE id = <claim_id>;
```

Then check if the cluster still has 2+ claims. If only 1 remains, dissolve:
```sql
SELECT COUNT(*) FROM claims WHERE cluster_id = <cluster_id>;
-- If < 2:
UPDATE claims SET cluster_id = NULL WHERE cluster_id = <cluster_id>;
DELETE FROM claim_clusters WHERE id = <cluster_id>;
```

**Write cluster summaries:**
```sql
UPDATE claim_clusters
SET summary = '<synthesis>', reviewer_notes = '<editorial position>'
WHERE id = <cluster_id>;
```

## Cluster Check Mode

When the user says "cluster check" — scan and report candidates without modifying anything.
