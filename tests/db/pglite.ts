/**
 * PostgreSQL real en memoria (PGlite) con las migraciones del proyecto y los
 * roles de Supabase (anon, authenticated, service_role) para probar SQL,
 * reservas de stock y RLS sin depender de un proyecto Supabase.
 */
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import path from "node:path";
import { DbError, type RpcCaller } from "../../src/lib/commerce/orders-repo";

/** Equivalente a supabase.rpc() sobre PGlite (argumentos por nombre). */
export function pgliteRpc(db: PGlite, role = "service_role"): RpcCaller {
  return async (fn, args) => {
    const keys = Object.keys(args);
    const sql = `SELECT ${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) AS result`;
    await db.exec(`SET ROLE ${role}`);
    try {
      const r = await db.query<{ result: unknown }>(sql, keys.map((k) => args[k]));
      return r.rows[0]?.result ?? null;
    } catch (e) {
      const err = e as { message: string; detail?: string };
      throw new DbError(err.message, err.detail ?? null);
    } finally {
      await db.exec("RESET ROLE");
    }
  };
}

const MIGRATIONS = ["20260928_equipment.sql", "20260929_orders.sql"];

export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  // Réplica mínima de los roles y permisos por defecto de Supabase
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
  `);
  for (const file of MIGRATIONS) {
    await db.exec(readFileSync(path.resolve(__dirname, "../../supabase/migrations", file), "utf8"));
  }
  return db;
}

export async function asRole<T>(db: PGlite, role: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`SET ROLE ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("RESET ROLE");
  }
}

export async function seedProduct(
  db: PGlite,
  opts: { slug: string; price: number; stock?: number; active?: boolean; variants?: { sku: string; size: string; stock: number; price?: number | null }[] },
): Promise<{ productId: string; variantIds: Record<string, string> }> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO equipment_products (slug, sku, brand, name, category, price, stock, active, images)
     VALUES ($1, $2, 'Marca', $3, 'cascos', $4, $5, $6, ARRAY['/img/' || $1 || '.jpg']) RETURNING id`,
    [opts.slug, `SKU-${opts.slug}`, `Producto ${opts.slug}`, opts.price, opts.stock ?? 0, opts.active ?? true],
  );
  const productId = rows[0].id;
  const variantIds: Record<string, string> = {};
  for (const v of opts.variants ?? []) {
    const r = await db.query<{ id: string }>(
      `INSERT INTO equipment_variants (product_id, sku, color, size, stock, price) VALUES ($1, $2, 'Negro', $3, $4, $5) RETURNING id`,
      [productId, v.sku, v.size, v.stock, v.price ?? null],
    );
    variantIds[v.sku] = r.rows[0].id;
  }
  return { productId, variantIds };
}
