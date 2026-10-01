import { Pool, type PoolClient, type PoolConfig } from 'pg'
import type { AppConfig } from './config.js'
import { databaseSchema } from './config.js'

export type Db = ReturnType<typeof createDb>

export function createPoolConfig(config: Pick<AppConfig, 'databaseUrl' | 'databaseSchema'>): PoolConfig {
  const schema = databaseSchema(config.databaseSchema)
  return {
    connectionString: config.databaseUrl,
    max: 10,
    ...(schema === 'public' ? {} : { options: `-c search_path=${schema},public` }),
  }
}

export function createDb(config: Pick<AppConfig, 'databaseUrl' | 'databaseSchema'>) {
  const pool = new Pool(createPoolConfig(config))
  return {
    pool,
    query: pool.query.bind(pool),
    async transaction<T>(work: (client: PoolClient) => Promise<T>) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const result = await work(client)
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
    close: () => pool.end(),
  }
}

export async function ensureDatabaseSchema(databaseUrl: string, schemaName: string) {
  const schema = databaseSchema(schemaName)
  const pool = new Pool({ connectionString: databaseUrl, max: 1 })
  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`)
  } finally {
    await pool.end()
  }
}

export async function migrate(db: Db) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS facility_admins (
      id uuid PRIMARY KEY,
      iam_user_id text NOT NULL UNIQUE,
      tenant_id text NOT NULL,
      username text NOT NULL,
      email text,
      display_name text NOT NULL,
      is_active boolean NOT NULL DEFAULT true,
      can_configure boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      version integer NOT NULL DEFAULT 1,
      CHECK (iam_user_id ~ '^[0-9]{1,128}$')
    );
    CREATE TABLE IF NOT EXISTS facility_sessions (
      token_hash text PRIMARY KEY,
      admin_id uuid NOT NULL REFERENCES facility_admins(id) ON DELETE CASCADE,
      csrf_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      expires_at timestamptz NOT NULL,
      revoked_at timestamptz,
      last_seen_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS facility_sessions_admin_idx ON facility_sessions(admin_id);
    CREATE TABLE IF NOT EXISTS facility_access_audit (
      id bigserial PRIMARY KEY,
      actor_admin_id uuid REFERENCES facility_admins(id),
      action text NOT NULL,
      target_admin_id uuid REFERENCES facility_admins(id),
      details jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS facility_login_throttle (
      throttle_key text PRIMARY KEY,
      failure_count integer NOT NULL DEFAULT 0,
      first_failure_at timestamptz NOT NULL DEFAULT now(),
      blocked_until timestamptz
    );
  `)
}
