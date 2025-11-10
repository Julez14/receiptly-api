// load environment variables from .env (if present)
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServer } from "./server";

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn(
    "Supabase environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY are missing. /receipts/:id/export/csv will fail until set."
  );
}

const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : (undefined as any);

const server = createServer({ supabase, jwtSecret: SUPABASE_JWT_SECRET });

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
