import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Match Next.js's own precedence: .env first, then .env.local overrides it
// (Vercel's `vercel env pull` writes to .env.local, same as Next.js itself).
config({ path: ".env" });
config({ path: ".env.local", override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
