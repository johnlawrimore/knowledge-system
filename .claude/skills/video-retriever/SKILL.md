---
name: video-retriever
description: Retrieve metadata, transcript, and speaker-attributed transcript from a YouTube video
---
# Video Retriever

## Purpose

Retrieve metadata and transcript/captions from a YouTube video given its URL.

## Input

The user provides a YouTube video URL. Accepted formats:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/live/VIDEO_ID`

If the user provides a video ID without a full URL, construct the URL as
`https://www.youtube.com/watch?v=VIDEO_ID`.

## Prerequisites

This skill requires `yt-dlp`. Before running any retrieval commands, check whether
`yt-dlp` is available:

```bash
which yt-dlp
```

If it is not installed, install it with:

```bash
brew install yt-dlp
```

If `brew` is not available, fall back to:

```bash
pip3 install yt-dlp
```

## Step 1 — Retrieve Metadata

Use `yt-dlp` to extract video metadata as JSON:

```bash
yt-dlp --dump-json --no-download "VIDEO_URL"
```

From the JSON output, extract and present the following fields:

| Field         | JSON key            |
|---------------|---------------------|
| Title         | `title`             |
| Channel       | `channel`           |
| Upload date   | `upload_date`       |
| Duration      | `duration_string`   |
| Description   | `description`       |
| Thumbnail     | `thumbnail`         |
| View count    | `view_count`        |
| URL           | `webpage_url`       |

Format `upload_date` from `YYYYMMDD` to `YYYY-MM-DD`.

## Step 2 — Retrieve Transcript

Use `yt-dlp` to download captions. Prefer manual (human-written) subtitles over
auto-generated ones, and prefer English:

```bash
yt-dlp --write-sub --write-auto-sub --sub-lang en --sub-format vtt --skip-download \
  -o "%(id)s" "VIDEO_URL"
```

This writes a `.vtt` file. After downloading:

1. Read the `.vtt` file.
2. Strip VTT headers, timestamps, and formatting tags to produce clean plain text.
3. Collapse duplicate lines (VTT files repeat lines across overlapping cue windows).
4. Present the cleaned transcript as a continuous text block.
5. Delete the `.vtt` file after reading it.

If no captions are available (manual or auto-generated), inform the user that the
video has no retrievable transcript.

## Step 3 — Attribute Speaker Turns

After retrieving the transcript, identify who is speaking and label each turn. This step
uses the metadata from Step 1 as context — it does not require any external API or audio
processing.

### 3a — Identify Speakers

Before touching the transcript, identify all speakers from the metadata.

**Extract from Description:** Video descriptions for interview and podcast content
frequently name all participants and their roles (e.g., "Ezra Klein sits down with
economist Tyler Cowen to discuss..."). Extract each speaker's full name, their role in
the video (host, guest, panelist, moderator, narrator), and a one-clause identifier
(job title or affiliation).

**Extract from Title:** If the description is sparse, read the title. Interview titles
frequently follow patterns like "[Guest Name] on [Topic] | [Show Name]" or
"[Show Name] with [Guest Name]". Use the channel name to infer the host when the host
is not named explicitly.

**Produce a Speaker Roster** before proceeding to attribution:

```
SPEAKER ROSTER
──────────────
HOST:   [Full Name] — [one-clause role identifier]
GUEST:  [Full Name] — [one-clause role identifier]
```

For panels or roundtables, list all identified speakers. If fewer than two speakers can
be identified from the metadata, ask the user for the speaker names before continuing.

**Single-speaker videos:** If only one speaker is identified and the transcript reads as
a monologue (lecture, solo narration), skip attribution. Label the entire transcript with
the single speaker and note that no speaker transitions were detected.

### 3b — Attribute Turns

Work through the transcript and assign a speaker label to each turn. A "turn" is a block
of continuous speech from one speaker before another speaker responds.

Use the following signals in combination. No single signal is definitive.

**Strong signals (weight heavily):**
- Explicit introductions ("My guest today is...", "I'm here with...")
- Direct address by name ("So, Jack, what do you think...") — the named person is being
  spoken TO; the responding text is that person
- First-person framing consistent with a known speaker's identity ("As someone who
  co-founded Anthropic..." → likely the Anthropic co-founder)
- References to the speaker's own published work, show, or previous statements

**Moderate signals (useful but not conclusive alone):**
- Question vs. answer patterns — hosts typically ask questions, guests give extended answers
- Turn length — hosts tend toward shorter framing turns, guests toward longer exposition
- Topic expertise — turns that go deep on the guest's domain are likely the guest
- Hedging and invitation language ("What do you make of that?", "Tell me more about...")
  typically indicates the host

**Weak signals (tie-breakers only):**
- Conversational acknowledgments ("Right", "Mm-hmm", "Exactly")
- First-person pronoun density

### Confidence Markers

- **High confidence (>90%):** Label normally.
- **Moderate confidence (70–90%):** Label with `[?]` after the name: `EZRA KLEIN [?]: ...`
- **Low confidence (<70%):** Label as `UNCLEAR: ...` — do not guess.

It is better to mark a turn as UNCLEAR than to mislabel it. Downstream consumers
rely on attribution accuracy.

### Edge Cases

- **Monologue sections:** Some videos open with a host monologue before the guest joins.
  Label these with the confirmed speaker.
- **Group discussions (3+ speakers):** Pay particular attention to direct address — panel
  members frequently name each other. Note `[crosstalk]` for interjected fragments.
- **Guest speaks before introduction:** If strong signals confirm the voice, attribute it
  and note in Attribution Notes that attribution precedes the formal introduction.
- **Transcript too short or garbled:** If fewer than ~200 words or heavily garbled, skip
  attribution and return the transcript unlabeled with an explanation.

## Output

Present the results in four clearly labeled sections:

### Metadata

Display the metadata fields from Step 1 in a readable format.

### Speaker Roster

The roster produced in Step 3a, listing identified speakers and their roles.

### Attribution Notes

A short paragraph (3–8 sentences) describing:
- How many turns were attributed with high confidence vs. flagged as uncertain
- Which sections were most difficult to attribute and why
- Any structural features that affected attribution (e.g., solo host monologue at the start)
- Any UNCLEAR turns and what made them unresolvable

### Transcript

The full transcript with speaker labels applied. Use all-caps full name followed by a
colon and space:

```
EZRA KLEIN: So let's start with the most basic version of this question.

JACK CLARK: The most basic version is that labor markets are going to be disrupted...
```

For uncertain turns: `EZRA KLEIN [?]: ...`
For unresolvable turns: `UNCLEAR: ...`

## Error Handling

- If the URL is invalid or the video is unavailable, report the error clearly.
- If the video is age-restricted or region-locked, inform the user.
- If only auto-generated captions are available, note this when presenting the
  transcript so the user is aware of potential transcription errors.
