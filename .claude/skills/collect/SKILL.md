---
name: collect
description: Ingest raw source material into the knowledge base from URLs, uploads, or YouTube videos
---

# Collect

## Purpose

Ingest raw source material into the knowledge base. Accepts URLs (web pages, blog posts), YouTube videos, podcast episodes, and uploaded files (PDF, DOCX, etc.). Outputs a markdown representation stored in the `sources` table.

This skill is responsible for ALL database storage. Content retrieval for specific formats may be delegated to specialized skills.

## When to Use

- User says "collect", "ingest", "add source", "add this article/video/paper"
- User provides a URL and wants it in the knowledge base
- User uploads a file to be added as a source
- User wants to batch-collect multiple URLs

## Dependencies

- **markdown-formatting** skill: All `content_md` must follow its rules.
- **video-retriever** skill: Delegates YouTube retrieval (metadata, transcript, speaker attribution). Collect receives the output and handles storage.
- **contributor-info** skill: After inserting new contributors, invoke to populate their bio, avatar, and URL fields.

## Database Connection

Use the `mysql` MCP tool for all database operations against the `knowledge` database.

## Workflow

### 1. Route by Input Type

**YouTube URLs** (`youtube.com`, `youtu.be`):
1. Invoke the **video-retriever** skill to retrieve metadata, transcript, and speaker attribution
2. Receive its output (metadata fields, speaker roster, attribution notes, transcript)
3. Continue at Step 4 below to compose `content_md` and store in the database

**All other inputs:** Continue with Step 2.

### 2. Determine Source Type

| Input Pattern | source_type |
|---|---|
| URL ending in .pdf | `academic_paper` or `report` (ask user) |
| URL to known blog platforms (medium, substack, dev.to, personal blogs) | `blog_post` |
| URL to documentation sites | `documentation` |
| URL to news/newsletter | `newsletter` |
| Uploaded PDF | `academic_paper`, `report`, or `book_chapter` (ask user) |
| Uploaded DOCX/TXT/MD | Determine from content (ask user if ambiguous) |
| Podcast RSS/episode URL | `podcast` |
| Other URL | `website` |

If ambiguous, ask the user. Always confirm `source_type` before inserting.

### 3. Extract Content

**For web URLs (blog posts, articles, documentation):**
- Use `curl` or `web_fetch` to retrieve the page
- Extract the main content, stripping navigation, ads, sidebars, footers
- Convert to clean markdown following **markdown-formatting** rules
- Preserve headings, lists, code blocks, links
- Extract author name and publication date from page metadata

**For uploaded PDFs:**
- Use `pdftotext` or `pymupdf` to extract text:
  ```bash
  pdftotext -layout /path/to/file.pdf -
  ```
- If that produces poor results (scanned PDF), try OCR:
  ```bash
  pip install pymupdf --break-system-packages
  python3 -c "
  import fitz
  doc = fitz.open('/path/to/file.pdf')
  for page in doc:
      print(page.get_text())
  "
  ```
- Convert to clean markdown following **markdown-formatting** rules

**For uploaded DOCX:**
- Use pandoc:
  ```bash
  pandoc /path/to/file.docx -t markdown
  ```
- Clean the output to follow **markdown-formatting** rules

**For podcasts:**
- If a transcript URL is available, fetch and convert
- If only audio, inform the user that manual transcript is needed
- If the user pastes a transcript, clean and format it

### 4. Compose Source Markdown

Structure the `content_md` following **markdown-formatting** rules. The format depends on source type.

**For YouTube videos** (using video-retriever output):

```markdown
# <Video Title>

## Metadata

- **Channel:** <channel name>
- **Published:** <YYYY-MM-DD>
- **Duration:** <duration>
- **URL:** <url>
- **Captions:** <manual | auto-generated>

## Speaker Roster

- **<ROLE>:** <Full Name> — <identifier>
- **<ROLE>:** <Full Name> — <identifier>

## Attribution Notes

<3-8 sentence summary from video-retriever>

## Transcript

<Full speaker-attributed transcript from video-retriever>
```

**For all other sources:**

```markdown
# <Source Title>

<Main content converted to clean markdown.
Preserve the source's structure but normalize formatting.
Keep all headings, code blocks, data, quotes intact.>
```

The H1 is the source title. The body is the source content. No frontmatter — metadata lives in database columns.

### 5. Extract Metadata

From the content and URL (or video-retriever output), extract:

- **title**: The article/video/paper title
- **url**: The source URL (NULL for uploads)
- **publication_date**: When the original was published (NULL if unknown)
- **source_type**: Classified in Step 2 (or `youtube_video` for YouTube)
- **contributors**: Author(s), speaker(s), host(s) — names, roles, and affiliations

For YouTube videos, map the speaker roster roles to `source_contributors.role`:
- Host → `host`
- Guest in an interview → `interviewee`
- Interviewer → `interviewer`
- Panelist → `panelist`
- Solo speaker (lecture, talk) → `speaker`

Present the extracted metadata to the user for confirmation before inserting.

### 6. Check for Duplicates

```sql
SELECT id, title, url, status FROM sources
WHERE url = '<source_url>'
   OR title LIKE '%<key_words_from_title>%'
LIMIT 5;
```

If a match is found, inform the user and ask whether to skip, update, or add as new.

### 7. Insert into Database

**Insert contributors** (if not already present):

```sql
SELECT id FROM contributors WHERE name = '<n>';

-- If not found:
INSERT INTO contributors (name, affiliation, role)
VALUES ('<n>', '<affiliation>', '<role>');
```

**Insert the source:**

```sql
INSERT INTO sources (title, source_type, url, publication_date, content_md, status, notes)
VALUES (
    '<title>',
    '<source_type>',
    '<url>',
    '<publication_date>',
    '<full_markdown_content>',
    'collected',
    '<any_notes>'
);
```

For YouTube videos, include caption type and attribution confidence in `notes`.

**Link contributors to source:**

```sql
INSERT INTO source_contributors (source_id, contributor_id, role)
VALUES (<source_id>, <contributor_id>, '<role>');
```

**Enrich new contributor profiles:**

For each newly inserted contributor (not pre-existing), invoke the **contributor-info** skill to populate their `bio`, `avatar`, and `url` fields. For batch collections with many new contributors, defer enrichment and note it in the confirmation output instead.

### 8. Confirm

```
✓ Collected: "<title>"
  Source ID: <id>
  Type: <source_type>
  Words: <word_count>
  Contributors: <name(s)>
  Status: collected
```

## Batch Collection

When the user provides multiple URLs:

1. Route YouTube URLs through video-retriever, process others directly
2. Process sequentially, show progress: "Collecting 3 of 7..."
3. Skip duplicates automatically (report which were skipped)
4. Summarize at the end:
   - X sources collected successfully
   - X sources skipped (duplicates)
   - X sources failed (with reasons)

## Error Handling

- If a URL is unreachable, report the error and skip (don't fail the batch)
- If content extraction produces very little text (<100 words), warn the user — extraction may have failed
- If video-retriever reports no transcript available, inform the user and ask whether to collect the video metadata without transcript content
- Never insert empty or near-empty `content_md` — ask user to provide content manually if extraction fails
