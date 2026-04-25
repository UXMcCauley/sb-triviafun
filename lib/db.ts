import { neon } from "@neondatabase/serverless";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }
  return url;
}

/**
 * Neon serverless SQL client.
 *
 * - Works in Next.js route handlers (server-side)
 * - Returns rows as plain JS objects
 */
export const sql = neon(getDatabaseUrl());

