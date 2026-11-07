import type { Request } from "express";
import { AppError } from "./repository";

export interface Identity {
  userId: string;
  role: "recruiter" | "seeker";
  companyId?: string;
  companyName?: string;
}

function decode(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return decodeURIComponent(value).trim() || undefined;
  } catch {
    return value.trim() || undefined;
  }
}

/** Reads the identity the API Gateway forwards after verifying the token. */
export function identityOf(req: Request): Identity {
  const userId = req.get("x-user-id")?.trim();
  if (!userId)
    throw new AppError(401, "UNAUTHENTICATED", "Verified gateway identity is required");
  const role = req.get("x-user-role");
  if (role !== "recruiter" && role !== "seeker")
    throw new AppError(403, "FORBIDDEN", "Unsupported account role");
  return {
    userId,
    role,
    companyId: req.get("x-company-id")?.trim() || undefined,
    companyName: decode(req.get("x-company-name")),
  };
}

/** Identity of a recruiter that belongs to a company; anything else is rejected. */
export function recruiterOf(req: Request): Identity & { companyId: string } {
  const identity = identityOf(req);
  if (identity.role !== "recruiter")
    throw new AppError(403, "FORBIDDEN", "Only recruiters can use this resource");
  if (!identity.companyId)
    throw new AppError(403, "NO_COMPANY", "Recruiter account has no company");
  return identity as Identity & { companyId: string };
}
