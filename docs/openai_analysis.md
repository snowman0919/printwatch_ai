# OpenAI Analysis

Cloud Functions call GPT-5-nano through the OpenAI Responses API. The OpenAI key is read from `OPENAI_API_KEY` in Functions only.

The prompt builder lives in `functions/src/aiPrompt.ts`. It sends:

- current AI-sized image
- previous AI-sized image when available
- time-based progress estimate
- OCR progress
- local image signals
- previous AI status

The model must return strict JSON:

- `status`
- `failure_types`
- `failure_probability`
- `visual_progress_percent`
- `progress_confidence`
- `is_print_stopped`
- `is_filament_tangled`
- `is_spaghetti`
- `summary`
- `recommended_action`
- `notify_level`

The policy is conservative:

- `normal` when evidence is weak
- `suspected` for possible failures
- `failed` only when highly likely

If two consecutive analyses for the same job share a suspected failure type, Functions escalate the second result to `failed`.

Cost controls:

- 30-minute scheduled analysis
- early analysis only on suspicious local signals
- 512px or 768px AI images
- GPT-5-nano
- 7-day retention
