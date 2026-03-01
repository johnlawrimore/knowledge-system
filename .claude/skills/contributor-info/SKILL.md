---
name: contributor-info
description: Research and populate contributor profiles with bio, avatar, and URL
---

# Contributor Info

## Purpose

Research contributors in the knowledge base and populate their profile fields: bio, URL, and avatar. Uses web search and source metadata to find accurate, up-to-date information about each contributor.

## When to Use

- User says "enrich contributors", "fill contributor profiles", "research contributor"
- During collection (via **collect** skill) after inserting a new contributor
- User says "get info for contributor #X" or "look up <name>"

## Database Connection

Use the `mysql` MCP tool for all database operations against the `knowledge` database.

## Workflow

### 1. Identify Target Contributors

**Single contributor:**

```sql
SELECT id, name, affiliation, role, bio, avatar, url
FROM contributors WHERE id = <id>;
```

**All contributors missing profile data:**

```sql
SELECT id, name, affiliation, role, bio, avatar, url
FROM contributors
WHERE bio IS NULL OR avatar IS NULL OR url IS NULL
ORDER BY id;
```

### 2. Gather Context from the Knowledge Base

Before searching externally, check what the knowledge base already knows:

```sql
SELECT s.title, s.source_type, s.url, sc.role AS contributor_role
FROM source_contributors sc
JOIN sources s ON sc.source_id = s.id
WHERE sc.contributor_id = <contributor_id>;
```

This tells you what role they played (author, speaker, host) and in what context. Use this to inform your search — a conference speaker needs different lookup than a book author.

### 3. Research the Contributor

Use web search to find the contributor's public profile. Search strategies in priority order:

**3a — Find their primary web presence:**

Search for: `"<Full Name>" <affiliation> <role>`

Look for:
- Personal website or blog
- LinkedIn profile
- GitHub profile (for tech contributors)
- Twitter/X profile
- Company bio page
- Conference speaker page

The **URL** field should be their most authoritative personal page — prefer personal site > LinkedIn > GitHub > Twitter.

**3b — Find their bio:**

Sources for bio text, in priority order:
1. Their personal website "About" page
2. Conference speaker bios (often the most concise and relevant)
3. Book jacket bios (for authors)
4. LinkedIn summary
5. Company team page

Write the bio as a **2-4 sentence summary** in third person. Include:
- Current role and organization
- Primary area of expertise or focus
- One notable credential or accomplishment (book, company founded, well-known project)

**Do NOT:**
- Copy bios verbatim from external sources — rewrite in a neutral, concise style
- Include social media metrics or follower counts
- Include personal details unrelated to their professional expertise
- Write more than 4 sentences — brevity is essential

**Example bio:**
> Kent Beck is a software engineer and the creator of Extreme Programming (XP) and test-driven development (TDD). He is the author of several influential books including "Test-Driven Development: By Example" and "Extreme Programming Explained." He currently works at Mechanical Orchard, focusing on legacy system modernization.

**3c — Find their avatar:**

Look for a professional headshot URL. Sources in priority order:
1. Their personal website or blog (often has a headshot in the header or about page)
2. GitHub avatar (`https://github.com/<username>.png`)
3. Gravatar (if email is known)
4. Conference speaker page photos
5. Company team page photos

The avatar URL must be:
- A direct link to an image file (ends in .jpg, .png, .webp, or is a known image endpoint like GitHub's `.png` URLs)
- Publicly accessible (no auth required)
- A reasonably permanent URL (prefer GitHub avatars and personal sites over social media)
- A headshot or professional photo (not a logo or icon)

**If no suitable avatar is found**, leave the field NULL rather than using a low-quality or inappropriate image.

### 4. Update the Database

```sql
UPDATE contributors
SET bio = '<bio text>',
    avatar = '<avatar URL>',
    url = '<primary URL>'
WHERE id = <contributor_id>;
```

Only update fields that were previously NULL or that the user explicitly asks to refresh. Do not overwrite existing values without confirmation.

If affiliation or role were NULL and you discovered them during research, update those too:

```sql
UPDATE contributors
SET affiliation = '<affiliation>',
    role = '<role>'
WHERE id = <contributor_id>
  AND affiliation IS NULL;
```

### 5. Report

```
✓ Updated: <contributor name>
  Bio: <first 80 chars>...
  URL: <url>
  Avatar: <avatar url or "not found">
  Affiliation: <updated | unchanged>
  Role: <updated | unchanged>
```

## Batch Enrichment

When enriching multiple contributors:

1. Process sequentially
2. Show progress: "Enriching 3 of 7..."
3. Skip contributors who already have all three fields populated (unless user says "refresh")
4. Summarize at the end:
   - X contributors enriched
   - X contributors skipped (already complete)
   - X contributors with missing avatar (could not find)

## Integration with Collect

When the **collect** skill inserts a new contributor, it should invoke this skill to populate the profile fields. The collect skill provides the contributor's name, affiliation, and role as starting context. This skill then searches for bio, avatar, and URL.

During collection, if contributor info lookup would significantly slow down the collection process (e.g., batch collecting 10+ sources), defer enrichment and report which contributors need profile data:

```
Note: 3 new contributors need profile enrichment.
Run "enrich contributors" to populate their profiles.
```

## Error Handling

- If web search returns no results for a contributor, leave fields NULL and note it
- If a contributor's name is very common, use affiliation and source context to disambiguate
- If the found information seems to be about a different person with the same name, do NOT update — leave NULL and flag for manual review
- If an avatar URL returns a 404 or redirect, do not use it
