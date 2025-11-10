# Receiptly API — Quick reference for frontend engineers

Minimal server that accepts an uploaded receipt image (multipart/form-data), sends it to a Gemini model for parsing, and returns a strict JSON representation of the receipt.

Now also supports exporting stored receipts (queried from Supabase) as a user-friendly CSV file.

Only essential details below so you can integrate quickly.

## Environment

- Create a `.env` file or set environment variables in your runtime.
- Required:
  - `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) — API key for Google GenAI/Gemini.
  - `SUPABASE_URL` — Your Supabase project base URL.
  - `SUPABASE_SERVICE_ROLE_KEY` — Service role key (make sure this stays server-side only).
  - `SUPABASE_JWT_SECRET` — JWT secret used to verify Supabase access tokens.
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

## New Endpoint — Export Receipt as CSV

GET `/receipts/:id/export/csv`

Returns a human-readable CSV file for a single receipt you own.

Auth:

- Send the Supabase access token in the header: `Authorization: Bearer <access_token>`.
- Ownership is enforced: you can only export receipts where `user_id` matches your token's `sub` claim.

Response:

- `200` text/csv; triggers download with filename `receipt_<id>.csv`.
- Errors: `400` invalid id format, `401` missing/invalid token, `404` not found, `403` (if ownership mismatch; may also surface as 404), `500` server/db issues.

CSV Layout:

```
Merchant,<merchant>
Purchase Date,<YYYY-MM-DD>
Total,<amount to 2 decimals>
Currency,<currency code>
Category,<category>
Receipt ID,<uuid>

Items
Name,Quantity,Price
<item name>,<qty>,<price>
...
```

Example curl (replace `<token>` and `<receipt_id>`):

```bash
curl -H "Authorization: Bearer <token>" \
  -o receipt.csv \
  http://localhost:8080/receipts/<receipt_id>/export/csv
```

Notes:

- Empty / null values appear as blank cells.
- Prices and totals are formatted to two decimal places.
- If a receipt has no items the CSV will still include the header and `Items` section.

## Notes / Tips

- For quick testing use small images or text receipts; the current implementation inlines the image as base64 when sending to the model. For very large images you may want to implement a file-hosting approach and pass a URI instead.
- Keep your `GEMINI_API_KEY` secret — do not commit `.env` to source control. A `.env.example` is included for reference.
