-- TalentOS PostgreSQL initialization
-- Runs on first container start

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- GIN index for full-text search on candidate names / emails
-- (Applied after models are created by SQLAlchemy)

-- Create demo company and user after tables exist (done via API/seed script)
