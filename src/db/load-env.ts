import { config } from "dotenv";

// For standalone scripts (drizzle-kit, tsx) only — Next.js itself already
// loads .env/.env.local natively at runtime. Must be the first import in
// any file that also imports "@/db", since ESM import side effects run in
// source order and "@/db" reads process.env.DATABASE_URL at module load.
config({ path: ".env" });
config({ path: ".env.local", override: true });
