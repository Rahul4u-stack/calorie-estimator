# Interview prep — Calorie Estimator

> Personal rehearsal notes. Not linked from README.

## Q1: Why Sonnet over Haiku for this? Haiku is ~1/12 the cost.

**A:** I A/B tested both during the build. Haiku could detect "this is food" but consistently missed multi-item meals (e.g. burger + fries + drink became "a hamburger"). For a calorie estimator that's a **wrong answer**, not a slow one. At portfolio scale (~$5 in credits total) the cost delta is noise; at production scale I'd revisit with a **hybrid** — Haiku for the "is this food?" gate, Sonnet only on confirmed food images.

## Q2: How do you handle hallucination — what if Claude invents a calorie count?

**A:** Three layers:

1. **Structured JSON output** with explicit `notes` field where the model is told to caveat confidence — surfaces uncertainty to the user instead of hiding it.
2. **Explicit `isFood: false` path** so non-food images route to an empty state, not a fake calorie count.
3. **UI explicitly labels output** as "estimates — consult a nutritionist for precise advice."

I don't pretend AI accuracy I don't have.

## Q3: How would this break at 10x users?

**A:** Two bottlenecks:

1. **Render free-tier cold-starts** cap at ~100 concurrent requests. I'd move to a paid dyno or AWS Lambda.
2. **Anthropic API rate limits** — at ~$0.003 per image and current Tier 1 limits I'd hit cap around 50 RPS. Would need tier upgrade or per-user rate limiting.

Latency itself isn't a bottleneck — Claude Vision responds in 2–4s which is acceptable for the use case.

## Bonus: Other questions to be ready for

- **"Walk me through what happens between the user clicking 'Analyze' and seeing the result."** — covered by the architecture diagram in the README; trace through file validation → upload → Claude call → JSON parse → render.
- **"What would change if Claude's API went down for an hour?"** — backend returns 502 with a user-visible error; no graceful degradation today (could cache last-N results in localStorage as fallback in v2).
- **"How do you test something whose output you can't predict?"** — tests mock `client.messages.create` and assert on the shape of the parsed response, not the content. 10 backend tests cover: happy path, non-food detection, malformed Claude JSON, empty Claude response, oversized file, missing file, invalid file type, surrounding-prose JSON extraction, health check, empty filename.
