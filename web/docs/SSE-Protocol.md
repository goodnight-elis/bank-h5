# SSE Protocol Specification

This document defines the streaming protocol between frontend and backend.

## Basic Format

Each SSE message consists of `event:` and `data:` lines, separated by blank line (`\n\n`):

```
event: <type>
data: <JSON or plain text>

```

## Event Types

| event | Description |
|-------|-------------|
| `message` | Content increment, chips, options, buttons, message_id |
| `card` | Tool result card (complete object, not incremental) |
| `violation` | Content policy violation, abort stream |
| `done` | Stream complete, carries message_id |

## Message Sub-types (event: message)

### 1. Text/Markdown Increment

```json
{"type": "content", "delta": "hello", "format": "markdown"}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | yes | `"content"` |
| delta | string | yes | Incremental text chunk |
| format | string | no | `"text"` or `"markdown"`. Only needed on first chunk |

### 2. Message ID

```json
{"type": "message_id", "message_id": "msg_20260101_001"}
```

### 3. Quick Chips

```json
{"type": "chips", "data": ["Follow up", "New topic", "Export"]}
```

### 4. Options (interactive choice)

```json
{"type": "options", "data": ["Option A", "Option B", "Option C"]}
```

### 5. Bottom Buttons

```json
{"type": "buttons", "data": [{"title": "View Report", "type": "link", "url": "https://..."}]}
```

## Card Event (Tool Results)

Complete object, not incremental. Frontend routes to registered component via `toolName`.

```json
{
  "type": "tool_result",
  "toolName": "report",
  "data": {
    "title": "Analysis Report",
    "description": "Generated from user query",
    "date": "2026-01-01 12:00",
    "reportId": "rpt_abc123"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | string | yes | Always `"tool_result"` |
| toolName | string | yes | Maps to frontend card registry key |
| data | object | yes | Tool-specific payload (parsed by card component) |

## Violation Event

```
event: violation
data: {"reason": "content policy violation"}
```

Frontend action: clear message content, show violation notice, abort SSE connection.

## Stream End

Two forms (can appear together or separately):

```
event: done
data: {"message_id": "msg_001"}

event: message
data: [DONE]
```

`[DONE]` is plain text string, NOT JSON.

## Custom Text Styles (Markdown Extension)

Inside `delta` with `format: "markdown"`, custom markers are supported:

| Syntax | Effect |
|--------|--------|
| `{color:#hex}text{/color}` | Colored text |
| `{color:#hex,bold}text{/color}` | Colored + bold |
| `{size:16}text{/size}` | Font size in px |
| `{highlight}text{/highlight}` | Highlight background |

## Key Rules

| Rule | Description |
|------|-------------|
| Message separator | Each SSE message ends with `\n\n` (double newline) |
| event default | If no `event:` line, frontend treats it as `message` |
| Markdown flag | Only first chunk needs `format:"markdown"`, subsequent chunks inherit |
| Incremental accumulation | `content`/`markdown` deltas append; `chips`/`options`/`buttons`/`message_id` overwrite |
| [DONE] format | Plain string, not JSON |
| Violation stop | After `event: violation`, frontend aborts; no need to send [DONE] |

## Complete Example

```
event: message
data: {"type": "content", "delta": "Hello! ", "format": "markdown"}

event: message
data: {"type": "content", "delta": "Today I analyzed **3** items:\n\n1. Item A\n2. Item B\n3. Item C"}

event: message
data: {"type": "message_id", "message_id": "msg_001"}

event: card
data: {"type": "tool_result", "toolName": "report", "data": {"title": "Daily Report", "date": "2026-01-01"}}

event: message
data: {"type": "chips", "data": ["More detail", "Next topic"]}

event: done
data: {"message_id": "msg_001"}

event: message
data: [DONE]

```
