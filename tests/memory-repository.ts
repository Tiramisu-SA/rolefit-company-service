import type { Company, CompanyRepository, RecruiterProfile } from "../src/repository";

export class MemoryRepository implements CompanyRepository {
  companies = new Map<string, Company>();
  recruiters = new Map<string, RecruiterProfile>();
  pingFails = false;

  async getCompany(id: string) {
    return this.companies.get(id) ?? null;
  }
  async upsertCompany(c: Company, _updatedBy: string) {
    const saved = { ...c, updatedAt: new Date().toISOString() };
    this.companies.set(c.id, saved);
    return saved;
  }
  async getRecruiter(userId: string) {
    return this.recruiters.get(userId) ?? null;
  }
  async upsertRecruiter(p: RecruiterProfile) {
    const saved = { ...p, updatedAt: new Date().toISOString() };
    this.recruiters.set(p.userId, saved);
    return saved;
  }
  async ping() {
    if (this.pingFails) throw new Error("db down");
  }
}
