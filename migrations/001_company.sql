CREATE TABLE companies (
 id text PRIMARY KEY, name text NOT NULL,
 description text NOT NULL DEFAULT '', website text NOT NULL DEFAULT '',
 industry text NOT NULL DEFAULT '', size text NOT NULL DEFAULT '' CHECK (size IN ('','1-10','11-50','51-200','201-1000','1000+')),
 location text NOT NULL DEFAULT '', logo_url text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now(), updated_by text NOT NULL
);
CREATE TABLE recruiter_profiles (
 user_id text PRIMARY KEY, company_id text NOT NULL,
 display_name text NOT NULL DEFAULT '', job_title text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX recruiter_profiles_company_idx ON recruiter_profiles(company_id);
