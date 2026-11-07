import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createApp } from "../src/app";
import { MemoryRepository } from "./memory-repository";

async function start(repo = new MemoryRepository()) {
  const server = createApp(repo).listen(0, "127.0.0.1");
  await once(server, "listening");
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  return { url, repo, close: () => server.close() };
}
const recruiter = {
  "x-user-id": "r1",
  "x-user-role": "recruiter",
  "x-company-id": "c1",
  "x-company-name": "Acme%20Corp",
};
const seeker = { "x-user-id": "s1", "x-user-role": "seeker" };
const json = { "content-type": "application/json" };
const put = (url: string, headers: Record<string, string>, body: unknown) =>
  fetch(url, { method: "PUT", headers: { ...json, ...headers }, body: JSON.stringify(body) });

test("GET /companies/me returns defaults with decoded name", async () => {
  const s = await start();
  try {
    const res = await fetch(s.url + "/companies/me", { headers: recruiter });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      id: "c1", name: "Acme Corp", description: "", website: "", industry: "",
      size: "", location: "", logoUrl: "", updatedAt: null,
    });
  } finally { s.close(); }
});

test("PUT /companies/me saves, readable by seeker, ignores name/id", async () => {
  const s = await start();
  try {
    const res = await put(s.url + "/companies/me", recruiter, {
      name: "Hacked", id: "evil", description: "  We build  ", website: "https://acme.com",
      industry: "Software", size: "11-50", location: "Berlin", logoUrl: "",
    });
    assert.equal(res.status, 200);
    const saved = await res.json();
    assert.equal(saved.id, "c1");
    assert.equal(saved.name, "Acme Corp");
    assert.equal(saved.description, "We build");
    const read = await fetch(s.url + "/companies/c1", { headers: seeker });
    assert.equal(read.status, 200);
    assert.deepEqual(await read.json(), saved);
    const mine = await fetch(s.url + "/companies/me", { headers: recruiter });
    assert.equal((await mine.json()).industry, "Software");
  } finally { s.close(); }
});

test("PUT /companies/me validates input", async () => {
  const s = await start();
  try {
    for (const [field, value] of [
      ["website", "http://x.com"], ["size", "huge"], ["description", "x".repeat(2001)],
      ["logoUrl", "not a url"], ["industry", "x".repeat(201)], ["location", 5],
    ] as const) {
      const res = await put(s.url + "/companies/me", recruiter, { [field]: value });
      assert.equal(res.status, 400, field);
      const body = await res.json();
      assert.equal(body.error.code, "VALIDATION_ERROR");
      assert.ok(body.error.details.some((d: { field: string }) => d.field === field), field);
    }
    assert.equal((await put(s.url + "/companies/me", recruiter, { description: "x".repeat(2000) })).status, 200);
  } finally { s.close(); }
});

test("authentication and authorization", async () => {
  const s = await start();
  try {
    const anon = await fetch(s.url + "/companies/c1");
    assert.equal(anon.status, 401);
    assert.equal((await anon.json()).error.code, "UNAUTHENTICATED");
    const forbidden = await put(s.url + "/companies/me", seeker, {});
    assert.equal(forbidden.status, 403);
    assert.equal((await forbidden.json()).error.code, "FORBIDDEN");
    assert.equal((await fetch(s.url + "/recruiters/me", { headers: seeker })).status, 403);
    const noCompany = await fetch(s.url + "/companies/me", {
      headers: { "x-user-id": "r1", "x-user-role": "recruiter" },
    });
    assert.equal(noCompany.status, 403);
    assert.equal((await noCompany.json()).error.code, "NO_COMPANY");
  } finally { s.close(); }
});

test("GET /companies/unknown is 404", async () => {
  const s = await start();
  try {
    const res = await fetch(s.url + "/companies/unknown", { headers: seeker });
    assert.equal(res.status, 404);
    assert.equal((await res.json()).error.code, "COMPANY_NOT_FOUND");
  } finally { s.close(); }
});

test("recruiter profile round trip takes companyId from header", async () => {
  const s = await start();
  try {
    const empty = await fetch(s.url + "/recruiters/me", { headers: recruiter });
    assert.deepEqual(await empty.json(), {
      userId: "r1", companyId: "c1", displayName: "", jobTitle: "", updatedAt: null,
    });
    const res = await put(s.url + "/recruiters/me", recruiter, {
      displayName: " Rita ", jobTitle: "Head of Talent", companyId: "other", userId: "x",
    });
    assert.equal(res.status, 200);
    const read = await (await fetch(s.url + "/recruiters/me", { headers: recruiter })).json();
    assert.equal(read.displayName, "Rita");
    assert.equal(read.companyId, "c1");
    assert.equal(read.userId, "r1");
    const bad = await put(s.url + "/recruiters/me", recruiter, { jobTitle: "x".repeat(201) });
    assert.equal(bad.status, 400);
  } finally { s.close(); }
});

test("health and readiness", async () => {
  const s = await start();
  try {
    assert.deepEqual(await (await fetch(s.url + "/health")).json(), { status: "ok" });
    assert.equal((await fetch(s.url + "/ready")).status, 200);
    s.repo.pingFails = true;
    assert.equal((await fetch(s.url + "/ready")).status, 503);
  } finally { s.close(); }
});
