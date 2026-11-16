import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL tanımlı değil. .env dosyasını kontrol edin.");
  }
  return drizzle(neon(url), { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

/** Yalnızca sunucu tarafında kullanılır. Bağlantı ilk kullanımda kurulur. */
export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

export { schema };
