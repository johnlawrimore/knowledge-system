# Shared Blocks for Collect Agents

## markdown_rules

**Markdown rules (mandatory for all content_md output):**

Headings:
- Exactly one H1 (the title), always first
- Use ## for sections, ### for subsections, #### for sub-subsections
- Never skip levels (## → #### is wrong)
- Numbered sections map to levels: 1. → ##, 1.1 → ###, 1.1.1 → ####
- Blank line before and after every heading
- Never wrap headings in bold (not `**## Title**` or `## **Title**`)
- Never use bold on its own line as a heading substitute
- Never use a URL as a heading

Paragraphs and spacing:
- One blank line between paragraphs — never more than one consecutive blank line
- No trailing whitespace; no non-breaking space characters

Lists:
- Use `-` for unordered lists (not `•` or `*`)
- Indent nested items with two spaces

HTML: Do not use HTML tags. Native markdown only.

Tables:
- Do not use a single-row table for a blockquote (use `>`)
- Do not use bold in table headers (markdown renders them bold by default)
- Do not wrap entire cell values in bold

Inline formatting:
- No empty bold markers (`****`)
- Bold markers flush against text: `**word**`, not `** word **`
- Bold for emphasis within sentences, not as structural elements
- `**Label:**` acceptable for inline labels

Blockquotes: Use `>` with a blank line before and after.

No YAML frontmatter — metadata lives in database columns.

Character encoding:
- All text must use clean Unicode — no mojibake (garbled encoding artifacts)
- Replace double-encoded sequences on sight: `â€"` → `—`, `â€"` → `–`, `â€™` → `'`, `â€˜` → `'`, `â€œ` → `"`, `â€` → `"`, `â€¢` → `•`, `Ã©` → `é`, `Ã±` → `ñ`
- Use proper Unicode punctuation: em dash `—`, en dash `–`, curly quotes `""''`, ellipsis `…`
- If source material contains mojibake, fix it before storing — never propagate encoding artifacts into the database

## contributor_enrichment

For each NEW contributor (not pre-existing), gather context and research their profile.

**Gather context first** — check what the KB already knows:
```sql
SELECT s.title, s.source_type, s.url, sc.role AS contributor_role
FROM source_contributors sc JOIN sources s ON sc.source_id = s.id
WHERE sc.contributor_id = @contrib_id;
```

**Search:** `"<Full Name>" <affiliation> <role>` — look for personal website, LinkedIn, GitHub, Twitter/X, company bio page, conference speaker page.

**Website field** — their most authoritative personal page. Priority: personal site > LinkedIn > GitHub > Twitter. Strip trailing slashes from all URLs before storing.

**Bio** — write a 2-4 sentence summary in third person. Include: current role/org, primary expertise, one notable credential.

Bio source priority: personal site "About" > conference speaker bios > book jacket bios > LinkedIn summary > company team page.

Do NOT: copy bios verbatim, include social media metrics or follower counts, include personal details unrelated to expertise, write more than 4 sentences.

Example bio:
> Kent Beck is a software engineer and the creator of Extreme Programming (XP) and test-driven development (TDD). He is the author of several influential books including "Test-Driven Development: By Example" and "Extreme Programming Explained." He currently works at Mechanical Orchard, focusing on legacy system modernization.

**Avatar** — look for a professional headshot. Priority: personal site/blog > GitHub avatar (`https://github.com/<username>.png`) > Gravatar > conference photos > company team page.

Avatar URL must be: a direct link to an image file (.jpg/.png/.webp or known endpoint like GitHub `.png`), publicly accessible, a reasonably permanent URL (prefer GitHub/personal sites over social media), a headshot or professional photo (not a logo or icon).

If no suitable avatar found, leave NULL.

**Error handling:**
- If no web search results are found for the contributor, leave all fields NULL
- If name is very common, use affiliation and source context to disambiguate
- If found info seems to be about a different person with the same name, do NOT update — leave NULL and flag for manual review
- If an avatar URL returns a 404 or redirect, do not use it

**Only update NULL fields** — do not overwrite existing bio/avatar/website:
```sql
UPDATE contributors
SET bio = COALESCE(bio, '<bio>'),
    avatar = COALESCE(avatar, '<avatar_url>'),
    website = COALESCE(website, '<website>'),
    sort_name = COALESCE(sort_name, '<LastName, FirstName>')
WHERE id = @contrib_id;
```

If affiliation or role were NULL and you discovered them, update those too:
```sql
UPDATE contributors SET affiliation = COALESCE(affiliation, '<affiliation>') WHERE id = @contrib_id;
```
