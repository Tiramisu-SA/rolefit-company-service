import { AppError, type CompanySize } from "./repository";

export const COMPANY_SIZES: CompanySize[] = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

type Issues = { field: string; message: string }[];

function body(raw: unknown): Record<string, unknown> {
  if (raw === undefined || raw === null) return {};
  if (typeof raw !== "object" || Array.isArray(raw))
    throw new AppError(400, "VALIDATION_ERROR", "Body must be a JSON object");
  return raw as Record<string, unknown>;
}

/** Optional trimmed string, empty when absent. */
function text(input: Record<string, unknown>, field: string, max: number, issues: Issues): string {
  const value = input[field];
  if (value === undefined) return "";
  if (typeof value !== "string") {
    issues.push({ field, message: `${field} must be a string` });
    return "";
  }
  const trimmed = value.trim();
  if (trimmed.length > max) issues.push({ field, message: `${field} must be at most ${max} characters` });
  return trimmed;
}

function httpsUrl(input: Record<string, unknown>, field: string, issues: Issues): string {
  const value = text(input, field, 200, issues);
  if (!value) return value;
  try {
    if (new URL(value).protocol !== "https:") throw new Error();
  } catch {
    issues.push({ field, message: `${field} must be an https URL` });
  }
  return value;
}

function finish<T>(value: T, issues: Issues): T {
  if (issues.length)
    throw new AppError(400, "VALIDATION_ERROR", "Request body is invalid", issues);
  return value;
}

export interface CompanyInput {
  description: string;
  website: string;
  industry: string;
  size: CompanySize | "";
  location: string;
  logoUrl: string;
}
export function parseCompanyInput(raw: unknown): CompanyInput {
  const input = body(raw);
  const issues: Issues = [];
  const size = text(input, "size", 200, issues);
  if (size && !COMPANY_SIZES.includes(size as CompanySize))
    issues.push({ field: "size", message: `size must be one of ${COMPANY_SIZES.join(", ")}` });
  return finish(
    {
      description: text(input, "description", 2000, issues),
      website: httpsUrl(input, "website", issues),
      industry: text(input, "industry", 200, issues),
      size: size as CompanySize | "",
      location: text(input, "location", 200, issues),
      logoUrl: httpsUrl(input, "logoUrl", issues),
    },
    issues,
  );
}

export function parseRecruiterInput(raw: unknown): { displayName: string; jobTitle: string } {
  const input = body(raw);
  const issues: Issues = [];
  return finish(
    {
      displayName: text(input, "displayName", 200, issues),
      jobTitle: text(input, "jobTitle", 200, issues),
    },
    issues,
  );
}
