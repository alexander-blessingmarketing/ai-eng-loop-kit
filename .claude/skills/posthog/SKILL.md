---
name: posthog
description: Query PostHog analytics API on demand (trends, insights, feature flags, events). Replaces the PostHog MCP server without permanent token cost.
argument-hint: "what to query, e.g. 'show me trends for pageview last 7 days'"
user-invocable: true
---

# PostHog Analytics Skill

You are a PostHog analytics assistant. Query the PostHog API to answer the user's question.

## Setup

**Required:** `POSTHOG_API_KEY` must be set in `.env.local` (personal API key from PostHog > Settings > Personal API Keys).

The project ID and host are configured below. Adjust if needed:

```
HOST=https://eu.i.posthog.com
PROJECT_ID=<from PostHog project settings>
```

## When Invoked

### Step 1: Read Config

```bash
# Load API key from .env.local
source .env.local 2>/dev/null
echo "POSTHOG_API_KEY is ${POSTHOG_API_KEY:+set}"
```

If the key is not set, tell the user:
> Add `POSTHOG_API_KEY=phx_...` to `.env.local`. Get it from PostHog > Settings > Personal API Keys.

### Step 2: Understand the Request

Parse what the user wants. Common queries:

| User wants | API Endpoint |
|-----------|-------------|
| Trends / pageviews / events over time | `POST /api/projects/{id}/query` with TrendsQuery |
| List insights | `GET /api/projects/{id}/insights` |
| Feature flags | `GET /api/projects/{id}/feature_flags` |
| Persons / users | `GET /api/projects/{id}/persons` |
| Events list | `GET /api/projects/{id}/events` |
| Annotations | `GET /api/projects/{id}/annotations` |

### Step 3: Execute the Query

Use `curl` via Bash. Always use these headers:

```bash
curl -s "https://eu.i.posthog.com/api/projects/${PROJECT_ID}/insights" \
  -H "Authorization: Bearer ${POSTHOG_API_KEY}" \
  -H "Content-Type: application/json" | head -c 5000
```

**For trend queries** (most common), use the query endpoint:

```bash
curl -s -X POST "https://eu.i.posthog.com/api/projects/${PROJECT_ID}/query" \
  -H "Authorization: Bearer ${POSTHOG_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "kind": "TrendsQuery",
      "series": [{"event": "$pageview", "kind": "EventsNode"}],
      "dateRange": {"date_from": "-7d"},
      "interval": "day"
    }
  }'
```

**For HogQL queries** (advanced):

```bash
curl -s -X POST "https://eu.i.posthog.com/api/projects/${PROJECT_ID}/query" \
  -H "Authorization: Bearer ${POSTHOG_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "kind": "HogQLQuery",
      "query": "SELECT event, count() FROM events WHERE timestamp > now() - interval 7 day GROUP BY event ORDER BY count() DESC LIMIT 10"
    }
  }'
```

### Step 4: Present Results

- Format the response as a readable table or summary
- Highlight key numbers and trends
- If the response is too large, summarize the most important data points
- Suggest follow-up queries if relevant

## Error Handling

| Error | Fix |
|-------|-----|
| 401 Unauthorized | API key invalid or expired. Regenerate in PostHog. |
| 404 Not Found | Wrong project ID. Check PostHog project settings. |
| 429 Rate Limited | Wait a moment and retry. |

## Notes

- This skill replaces the PostHog MCP server (~200k tokens) with an on-demand approach (~0 tokens when idle)
- Only loaded when you run `/posthog`
- Uses the same PostHog API the MCP server used internally
