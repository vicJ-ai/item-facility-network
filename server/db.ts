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
    CREATE TABLE IF NOT EXISTS facility_availability (
      facility_id text PRIMARY KEY,
      square_feet bigint NOT NULL CHECK (square_feet >= 0 AND square_feet <= 9007199254740991),
      version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by_admin_id uuid NOT NULL REFERENCES facility_admins(id)
    );
    CREATE TABLE IF NOT EXISTS facility_availability_audit (
      id bigserial PRIMARY KEY,
      facility_id text NOT NULL,
      old_square_feet bigint CHECK (old_square_feet IS NULL OR (old_square_feet >= 0 AND old_square_feet <= 9007199254740991)),
      new_square_feet bigint NOT NULL CHECK (new_square_feet >= 0 AND new_square_feet <= 9007199254740991),
      version integer NOT NULL CHECK (version >= 1),
      actor_admin_id uuid NOT NULL REFERENCES facility_admins(id),
      actor_iam_user_id text NOT NULL CHECK (actor_iam_user_id ~ '^[0-9]{1,128}$'),
      actor_username text NOT NULL,
      old_value_source text NOT NULL DEFAULT 'administrator' CHECK (old_value_source IN ('administrator','source-snapshot','pending')),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE facility_availability_audit ADD COLUMN IF NOT EXISTS old_value_source text NOT NULL DEFAULT 'administrator';
    DO $$ BEGIN
      ALTER TABLE facility_availability_audit ADD CONSTRAINT facility_availability_audit_old_value_source_check
        CHECK (old_value_source IN ('administrator','source-snapshot','pending'));
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE INDEX IF NOT EXISTS facility_availability_audit_history_idx ON facility_availability_audit(created_at DESC,id DESC);
    CREATE INDEX IF NOT EXISTS facility_availability_audit_facility_history_idx ON facility_availability_audit(facility_id,created_at DESC,id DESC);
    CREATE OR REPLACE FUNCTION prevent_facility_availability_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'facility availability audit is append-only'; END
    $$;
    DO $$ BEGIN
      CREATE TRIGGER facility_availability_audit_immutable BEFORE UPDATE OR DELETE ON facility_availability_audit
        FOR EACH ROW EXECUTE FUNCTION prevent_facility_availability_audit_mutation();
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    CREATE TABLE IF NOT EXISTS facility_bulk_rack (
      facility_id text PRIMARY KEY,
      bulk_square_feet bigint CHECK (bulk_square_feet IS NULL OR (bulk_square_feet >= 0 AND bulk_square_feet <= 9007199254740991)),
      rack_pallet_positions bigint CHECK (rack_pallet_positions IS NULL OR (rack_pallet_positions >= 0 AND rack_pallet_positions <= 9007199254740991)),
      version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
      updated_at timestamptz NOT NULL DEFAULT now(),
      updated_by_admin_id uuid NOT NULL REFERENCES facility_admins(id),
      CHECK (bulk_square_feet IS NOT NULL OR rack_pallet_positions IS NOT NULL)
    );
    CREATE TABLE IF NOT EXISTS facility_bulk_rack_audit (
      id bigserial PRIMARY KEY,
      facility_id text NOT NULL,
      metric text NOT NULL CHECK (metric IN ('bulk','rack')),
      old_value bigint CHECK (old_value IS NULL OR (old_value >= 0 AND old_value <= 9007199254740991)),
      new_value bigint NOT NULL CHECK (new_value >= 0 AND new_value <= 9007199254740991),
      version integer NOT NULL CHECK (version >= 1),
      actor_admin_id uuid NOT NULL REFERENCES facility_admins(id),
      actor_iam_user_id text NOT NULL CHECK (actor_iam_user_id ~ '^[0-9]{1,128}$'),
      actor_username text NOT NULL,
      old_value_source text NOT NULL CHECK (old_value_source IN ('administrator','source-snapshot','pending')),
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS facility_bulk_rack_audit_history_idx ON facility_bulk_rack_audit(created_at DESC,id DESC);
    CREATE INDEX IF NOT EXISTS facility_bulk_rack_audit_facility_history_idx ON facility_bulk_rack_audit(facility_id,created_at DESC,id DESC);
    CREATE OR REPLACE FUNCTION prevent_facility_bulk_rack_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'facility bulk rack audit is append-only'; END
    $$;
    DO $$ BEGIN
      CREATE TRIGGER facility_bulk_rack_audit_immutable BEFORE UPDATE OR DELETE ON facility_bulk_rack_audit
        FOR EACH ROW EXECUTE FUNCTION prevent_facility_bulk_rack_audit_mutation();
    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
  `)
}
