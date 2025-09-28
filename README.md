# Receiptly API — Quick reference for frontend engineers

Minimal server that accepts an uploaded receipt image (multipart/form-data), sends it to a Gemini model for parsing, and returns a strict JSON representation of the receipt.

Only essential details below so you can integrate quickly.

## Environment

- Create a `.env` file or set environment variables in your runtime.
- Required:
  - `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) — API key for Google GenAI/Gemini.
- Optional:
  - `PORT` — port to run the server (defaults to `8080`).

There is a `.env.example` in the repo showing the keys.

## Run locally

- Install and build per the repo's scripts (pnpm/npm depending on your setup).
- Example (if using pnpm):

```bash
pnpm install
pnpm run dev    # starts server in dev mode (defaults to port 8080)
```

The server listens on `http://localhost:8080` by default.

## Endpoint

POST /analyze-receipt

- Accepts: multipart/form-data with a single file. The server reads the first file part (field name is not enforced; `file` is a safe choice).
- Returns: JSON object describing the parsed receipt (see schema below).
- Content-Type: application/json

Example curl (replace with your file path and ensure `GEMINI_API_KEY` is set):

```bash
curl -X POST \
  -F "file=@/path/to/receipt.jpg" \
  http://localhost:8080/analyze-receipt
```

## Response schema

The API returns a single JSON object with this shape:

```json
{
  "merchant": "string | null",
  "date": "string | null",
  "total": number | null,
  "currency": "string | null",
  "items": [
    { "name": "string", "quantity": number | null, "price": number | null }
  ],
  "category": "string | null" // e.g. "Food & Drink", "Travel", "Office Supplies", "Other"
}
```

If the model cannot determine a value it will be `null`. If the model returns non-JSON, the server will return a 502 with the raw model text in the `raw` field.

## Notes / Tips

- For quick testing use small images or text receipts; the current implementation inlines the image as base64 when sending to the model. For very large images you may want to implement a file-hosting approach and pass a URI instead.
- Keep your `GEMINI_API_KEY` secret — do not commit `.env` to source control. A `.env.example` is included for reference.
- This service is intentionally minimal and meant to be called from frontend code via a server-side proxy or directly from a trusted backend.

If you need example frontend code (fetch + formdata) or CI/test scripts, tell me which stack you're using and I can add a snippet.
