-- CBT Platform Postgres schema
-- JSONB `data` column preserves documents as JSONB exactly.
-- Indexed columns exist for the fields the API actually filters on.

CREATE TABLE IF NOT EXISTS institutions (
  id          TEXT PRIMARY KEY,
  slug        TEXT UNIQUE,
  data        JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id             TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  data           JSONB NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admins (
  id             TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
  username       TEXT,
  email          TEXT,
  data           JSONB NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id             TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
  username       TEXT,
  role           TEXT,
  data           JSONB NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exams (
  id             TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
  data           JSONB NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id             TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
  exam_id        TEXT REFERENCES exams(id) ON DELETE CASCADE,
  data           JSONB NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS results (
  id             TEXT PRIMARY KEY,
  institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
  exam_id        TEXT,
  user_id        TEXT,
  data           JSONB NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS blogs (
  id         TEXT PRIMARY KEY,
  published  BOOLEAN DEFAULT false,
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS super_admins (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE,
  email         TEXT,
  password_hash TEXT NOT NULL,
  data          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Landing page contact/demo submissions (replaces the email-only endpoints)
CREATE TABLE IF NOT EXISTS demo_requests (
  id         SERIAL PRIMARY KEY,
  kind       TEXT NOT NULL, -- 'contact' | 'demo'
  data       JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_departments_inst ON departments(institution_id);
CREATE INDEX IF NOT EXISTS idx_admins_inst      ON admins(institution_id);
CREATE INDEX IF NOT EXISTS idx_users_inst       ON users(institution_id);
CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);
CREATE INDEX IF NOT EXISTS idx_exams_inst       ON exams(institution_id);
CREATE INDEX IF NOT EXISTS idx_questions_inst   ON questions(institution_id);
CREATE INDEX IF NOT EXISTS idx_questions_exam   ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_inst     ON results(institution_id);
CREATE INDEX IF NOT EXISTS idx_results_exam     ON results(exam_id);
CREATE INDEX IF NOT EXISTS idx_results_user     ON results(user_id);
CREATE INDEX IF NOT EXISTS idx_results_inst_created ON results(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_exam_created ON results(exam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_user_exam ON results(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_blogs_published  ON blogs(published);
