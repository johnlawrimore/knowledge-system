---
name: markdown-formatting
description: Markdown formatting rules for knowledge base content
---

# Markdown Formatting

All markdown content stored in the knowledge base — sources, artifacts, and any generated output — must follow these rules.

## YAML Frontmatter

- Files with metadata begin with a `---` frontmatter block.
- Source URLs go in `sources:` as a YAML list. Do not put source URLs in the body.
- Topic tags go in `tags:` as a YAML list.
- No other content belongs in the frontmatter block.

```yaml
---
sources:
  - url: https://example.com/source-url
    description: Title of Page
    author: John Doe
    date: 2026-01-01
tags:
  - testing
  - design-patterns
---
```

**Note:** Frontmatter is only used for standalone markdown files. Content stored in the database (`sources.content_md`, `artifacts.content_md`) does not use frontmatter — metadata lives in the database columns.

## Headings

- Every file or content block has exactly one `#` (H1) heading. It is the title and appears first.
- Use `##` for major sections, `###` for subsections, `####` for sub-subsections.
- Never skip heading levels (e.g., do not go from `##` to `####`).
- Numbered sections map to heading levels: `1.` → `##`, `1.1` → `###`, `1.1.1` → `####`.
- Always leave a blank line before and after a heading.
- Never wrap headings in bold. Write `## Title`, not `**## Title**` or `## **Title**`.
- Never use bold text on its own line as a substitute for a heading. Use a proper `#` heading.
- Never use a URL as a heading.

## Paragraphs and Spacing

- Separate paragraphs with exactly one blank line.
- Never have more than one consecutive blank line.
- No trailing whitespace at the end of lines.
- No non-breaking space characters.

## Lists

- Use `-` for unordered list items. Do not use `•` or `*`.
- Indent nested list items with two spaces.

## HTML

- Do not use HTML tags. Use native markdown syntax only.

## Tables

- Do not use a single-row table to format a blockquote. Use `>` instead.
- Do not use bold in table header rows. Markdown renders headers bold by default.
- Do not wrap entire table cell values in bold.

## Inline Formatting

- Do not leave empty bold markers (`****`) in the text.
- Bold markers must be flush against the text: `**word**`, not `** word **`.
- Use bold (`**text**`) for emphasis within a sentence, not as a structural element.
- Bold text ending with a colon (`**Label:**`) is acceptable for inline labels within a paragraph or list item.

## Blockquotes

- Use `>` for blockquotes.
- Leave a blank line before and after a blockquote.
