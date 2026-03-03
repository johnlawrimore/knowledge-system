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

**Contributor scoring** — Using the same web research, assess four dimensions (1–5 each). Score conservatively: **3 is normal**, 5 requires specific evidence of excellence. Use the decision questions to resolve ambiguity between adjacent scores.

| Dimension | 1 | 2 | 3 | 4 | 5 |
|-----------|---|---|---|---|---|
| **Expertise** | Generalist; no evidence of domain depth | Working knowledge but no evidence of deep specialization | Experienced practitioner; multiple years in domain | Deep specialist with demonstrated mastery (published, spoke at conferences, built notable systems) | World-leading domain expert; created frameworks or methodologies adopted by others |
| **Authority** | Unknown in the field; no public presence | Known within their organization; no external recognition | Recognized contributor (conference talks, notable blog, community presence) | Sought-after expert (keynotes, published books, consulted by industry) | Industry-defining leader; their name is synonymous with the topic |
| **Reach** | No public audience; internal only | Small but engaged following (personal blog, niche community) | Moderate following; publishes regularly to an established audience | Large audience (popular blog, significant social following, conference circuit) | Massive global audience; household name in the industry |
| **Reputation** | Unestablished; no track record to evaluate | Respected within their team/org but limited external validation | Respected and generally trusted in their community | Widely trusted; track record of being right over time | Gold-standard trusted voice; peers defer to their judgment |

Decision questions:
- **Expertise**: Have they created frameworks, methodologies, or tools in the domain? No → ≤ 3, minor → 3-4, major/adopted by others → 5. Do other experts cite their work? No → ≤ 3, occasionally → 4, frequently → 5.
- **Authority**: Do they speak at major conferences? No → ≤ 2, regional/niche → 3, major conferences → 4, keynotes → 5. Have they published books or foundational papers? No → ≤ 3, one → 4, multiple influential → 5.
- **Reach**: What's their publishing frequency? Never/rarely → 1, occasionally → 2, regularly → 3, prolifically → ≥ 4. What platform? Personal blog only → ≤ 3, industry publications → 4, bestselling books → 5. Social following (combined)? < 1k → 1, 1-5k → 2, 5-25k → 3, 25-100k → 4, > 100k → 5.
- **Reputation**: How long have they been publicly sharing expertise? < 2y → ≤ 2, 2-5y → 3, 5-10y → 4, 10+ with consistent record → 5. Are past recommendations vindicated? Unknown → ≤ 3, mostly → 4, consistently → 5.

Compute **tier** from the average of the four scores:
- Tier 1 "Leading Voice": avg ≥ 4.0
- Tier 2 "Established Expert": avg ≥ 3.0
- Tier 3 "Notable Contributor": avg ≥ 2.0
- Tier 4 "Emerging Voice": avg < 2.0

Store as JSON (only if not already evaluated):
```sql
UPDATE contributors
SET evaluation_results = COALESCE(evaluation_results, JSON_OBJECT(
    'expertise', <1-5>,
    'authority', <1-5>,
    'reach', <1-5>,
    'reputation', <1-5>,
    'tier', <1-4>,
    'notes', '<1-2 sentence reasoning for the tier>',
    'evaluated_at', NOW()
))
WHERE id = @contrib_id;
```

Scoring guidance:
- Base scores on evidence found during web research, not assumptions
- A Stanford professor with 50k citations = Expertise 5, Authority 4-5
- A senior engineer blogging on their personal site = Expertise 3-4, Reach 2
- A McKinsey partner publishing via their firm = Authority 4, Reach 3-4
- If insufficient information to score, leave `evaluation_results` NULL and add a note: "Contributor scoring deferred — insufficient public information"
