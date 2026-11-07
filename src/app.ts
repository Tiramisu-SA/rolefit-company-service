import express, { type NextFunction, type Request, type Response } from "express";
import { identityOf, recruiterOf } from "./identity";
import { logger } from "./logger";
import { requestContext } from "./request-context.middleware";
import { AppError, type Company, type CompanyRepository } from "./repository";
import { parseCompanyInput, parseRecruiterInput } from "./validation";

/** Path prefix of the resource routes. The gateway forwards /api/companies/* and /api/recruiters/* unchanged; probes stay unprefixed. */
export const ROUTE_PREFIX = "/api";

function emptyCompany(id: string, name: string): Company {
  return { id, name, description: "", website: "", industry: "", size: "", location: "", logoUrl: "", updatedAt: null };
}

export function createApp(repo: CompanyRepository) {
  const app = express();
  app.disable("x-powered-by");
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", async (_req, res) => {
    try {
      await repo.ping();
      res.json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });
  // After the probes, so they are not logged; before the body parser, so malformed bodies carry a request id.
  app.use(requestContext);
  app.use(express.json({ limit: "16kb" }));

  const api = express.Router();
  api.get("/companies/me", async (req, res) => {
    const me = recruiterOf(req);
    res.json((await repo.getCompany(me.companyId)) ?? emptyCompany(me.companyId, me.companyName || me.companyId));
  });
  api.put("/companies/me", async (req, res) => {
    const me = recruiterOf(req);
    const input = parseCompanyInput(req.body);
    const existing = await repo.getCompany(me.companyId);
    const name = existing?.name ?? (me.companyName || me.companyId);
    res.json(await repo.upsertCompany({ ...input, id: me.companyId, name, updatedAt: null }, me.userId));
  });
  api.get("/companies/:id", async (req, res) => {
    identityOf(req);
    const company = await repo.getCompany(req.params.id as string);
    if (!company) throw new AppError(404, "COMPANY_NOT_FOUND", "Company not found");
    res.json(company);
  });
  api.get("/recruiters/me", async (req, res) => {
    const me = recruiterOf(req);
    res.json(
      (await repo.getRecruiter(me.userId)) ?? {
        userId: me.userId, companyId: me.companyId, displayName: "", jobTitle: "", updatedAt: null,
      },
    );
  });
  api.put("/recruiters/me", async (req, res) => {
    const me = recruiterOf(req);
    const input = parseRecruiterInput(req.body);
    res.json(await repo.upsertRecruiter({ ...input, userId: me.userId, companyId: me.companyId, updatedAt: null }));
  });
  app.use(ROUTE_PREFIX || "/", api);

  app.use((_req, _res, next) => next(new AppError(404, "ROUTE_NOT_FOUND", "Route not found")));
  app.use((error: any, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof AppError) {
      res.status(error.httpStatus).json({
        error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
      });
      return;
    }
    if (error?.type === "entity.parse.failed" || error?.type === "entity.too.large") {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "Invalid JSON or request body too large" },
      });
      return;
    }
    // Database errors never expose connection strings or raw SQL details.
    logger.error("Company operation failed");
    res.status(503).json({
      error: { code: "SERVICE_UNAVAILABLE", message: "Company storage is unavailable" },
    });
  });
  return app;
}
