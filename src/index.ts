// load environment variables from .env (if present)
import dotenv from "dotenv";
dotenv.config();

import fastify from "fastify";
import multipart from "@fastify/multipart";
import cors from "@fastify/cors";
import { GoogleGenAI, createPartFromBase64 } from "@google/genai";

const server = fastify({ logger: true });

// Configure CORS - add production URL here when needed
const allowedOrigins = [
  "http://localhost:8080",
  "https://receiptly-frontend.vercel.app",
  // Add production URL here: "https://your-production-domain.com"
];

// register multipart support (no top-level await to stay compatible with tsconfig)
server.register(multipart);

// register CORS support
server.register(cors, {
  origin: allowedOrigins,
  credentials: true,
});

server.get("/", async (request, reply) => {
  return { hello: "world" };
});

/**
 * POST /analyze-receipt
 * Accepts multipart/form-data with a single file field named `image`.
 * Calls Google Gemini (via @google/genai) with the image inlined (base64)
 * and asks the model to return a strict JSON object representing the parsed
 * receipt and an expense category. Returns that JSON to the client.
 */
server.post("/analyze-receipt", async (req, reply) => {
  // using req.file() to get the first uploaded file
  // @ts-ignore - types for fastify multipart may not be present in this repo
  const data = await (req as any).file();
  if (!data) {
    return reply.status(400).send({
      error: "No file provided. Send multipart form with an image file.",
    });
  }
  const buffers: Buffer[] = [];
  for await (const chunk of data.file) {
    buffers.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(buffers);

  // init Gemini client
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return reply
      .status(500)
      .send({ error: "Server missing GEMINI_API_KEY environment variable" });
  }
  const ai = new GoogleGenAI({ apiKey });

  // prepare prompt that requests strict JSON
  const prompt = `You are given an image of a receipt. Extract the receipt information and return ONLY a single JSON object (no surrounding text) with the following shape:

{
  "merchant": string or null,
  "date": string (ISO or human readable) or null,
  "total": number or null,
  "currency": string or null,
  "items": [
    {
      "name": string,
      "quantity": number | null,
      "price": number | null
    }
  ],
  "category": string (one of: Food & Drink, Travel, Accommodation, Office Supplies, Utilities, Entertainment, Other)
}

If a value cannot be determined, use null. Do not include extra commentary.`;

  // inline the image as base64 part for the request
  const b64 = buffer.toString("base64");
  const imagePart = createPartFromBase64(b64, data.mimetype || "image/jpeg");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [prompt, imagePart],
      config: {
        responseMimeType: "application/json",
      },
    });

    // extract text and robustly parse JSON (strip fences if present)
    const text = response.text ?? "";
    const jsonText = extractJson(text);
    if (!jsonText) {
      return reply
        .status(502)
        .send({ error: "Model did not return JSON", raw: text });
    }
    const parsed = JSON.parse(jsonText);
    return reply.send(parsed);
  } catch (err: any) {
    server.log.error(err);
    return reply.status(500).send({
      error: "Failed to analyze receipt",
      details: err?.message ?? String(err),
    });
  }
});

// Helper: extract JSON substring if model returned code fences or extra text
function extractJson(s: string): string | null {
  if (!s) return null;
  // look for ```json ... ``` or ``` ... ```
  const fenceJson = /```json\s*([\s\S]*?)\s*```/i.exec(s);
  if (fenceJson && fenceJson[1]) return fenceJson[1].trim();
  const fence = /```\s*([\s\S]*?)\s*```/.exec(s);
  if (fence && fence[1]) return fence[1].trim();
  // look for first and last curly braces
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return s.slice(first, last + 1);
  }
  return null;
}

const start = async () => {
  try {
    await server.listen({ port: 8080, host: "0.0.0.0" });
    console.log("Server started successfully");
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
