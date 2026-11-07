import type { Pool } from "pg";

export class AppError extends Error {
  constructor(
    public readonly httpStatus: number,
    public readonly code: string,
    message: string,
    public readonly details?: { field: string; message: string }[],
  ) {
    super(message);
  }
}

export type CompanySize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";
export interface Company {
  id: string;
  name: string;
  description: string;
  website: string;
  industry: string;
  size: CompanySize | "";
  location: string;
  logoUrl: string;
  updatedAt: string | null;
}
export interface RecruiterProfile {
  userId: string;
  companyId: string;
  displayName: string;
  jobTitle: string;
  updatedAt: string | null;
}
export interface CompanyRepository {
  getCompany(id: string): Promise<Company | null>;
  upsertCompany(c: Company, updatedBy: string): Promise<Company>;
  getRecruiter(userId: string): Promise<RecruiterProfile | null>;
  upsertRecruiter(p: RecruiterProfile): Promise<RecruiterProfile>;
  ping(): Promise<void>;
}

const COMPANY_COLUMNS =
  "id, name, description, website, industry, size, location, logo_url, updated_at";
function toCompany(r: any): Company {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    website: r.website,
    industry: r.industry,
    size: r.size,
    location: r.location,
    logoUrl: r.logo_url,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}
function toRecruiter(r: any): RecruiterProfile {
  return {
    userId: r.user_id,
    companyId: r.company_id,
    displayName: r.display_name,
    jobTitle: r.job_title,
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export class PostgresCompanyRepository implements CompanyRepository {
  constructor(private readonly pool: Pool) {}

  async getCompany(id: string) {
    const { rows } = await this.pool.query(
      `SELECT ${COMPANY_COLUMNS} FROM companies WHERE id=$1`,
      [id],
    );
    return rows[0] ? toCompany(rows[0]) : null;
  }
  async upsertCompany(c: Company, updatedBy: string) {
    const { rows } = await this.pool.query(
      `INSERT INTO companies (id, name, description, website, industry, size, location, logo_url, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, description=EXCLUDED.description, website=EXCLUDED.website,
         industry=EXCLUDED.industry, size=EXCLUDED.size, location=EXCLUDED.location,
         logo_url=EXCLUDED.logo_url, updated_by=EXCLUDED.updated_by, updated_at=now()
       RETURNING ${COMPANY_COLUMNS}`,
      [c.id, c.name, c.description, c.website, c.industry, c.size, c.location, c.logoUrl, updatedBy],
    );
    return toCompany(rows[0]);
  }
  async getRecruiter(userId: string) {
    const { rows } = await this.pool.query(
      "SELECT user_id, company_id, display_name, job_title, updated_at FROM recruiter_profiles WHERE user_id=$1",
      [userId],
    );
    return rows[0] ? toRecruiter(rows[0]) : null;
  }
  async upsertRecruiter(p: RecruiterProfile) {
    const { rows } = await this.pool.query(
      `INSERT INTO recruiter_profiles (user_id, company_id, display_name, job_title)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id) DO UPDATE SET
         company_id=EXCLUDED.company_id, display_name=EXCLUDED.display_name,
         job_title=EXCLUDED.job_title, updated_at=now()
       RETURNING user_id, company_id, display_name, job_title, updated_at`,
      [p.userId, p.companyId, p.displayName, p.jobTitle],
    );
    return toRecruiter(rows[0]);
  }
  async ping() {
    await this.pool.query("SELECT 1");
  }
}
