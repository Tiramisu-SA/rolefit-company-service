# Company Service API

Base path `/api` (through the gateway: `http://localhost:8080/api/...` with `Authorization: Bearer <token>`).
Requests and responses are JSON. Behind the gateway the service reads `X-User-Id`, `X-User-Role`,
`X-Company-Id` and `X-Company-Name` (URI-encoded); see [README.md](README.md).

## Company

```json
{
  "id": "co-acme-1a2b3c",
  "name": "Acme Corp",
  "description": "",
  "website": "",
  "industry": "",
  "size": "",
  "location": "",
  "logoUrl": "",
  "updatedAt": null
}
```

`size` is one of `""`, `1-10`, `11-50`, `51-200`, `201-1000`, `1000+`. `updatedAt` is an ISO 8601 timestamp, or
`null` for a company that was never saved.

### GET /api/companies/me
Recruiter with a company. Returns the saved profile, or a default one (`id` and `name` from the headers, other
fields empty, `updatedAt: null`) if none was saved. `200`.

### PUT /api/companies/me
Recruiter with a company. Body (all fields optional, missing ones become empty):

| Field | Rule |
| --- | --- |
| `description` | string, at most 2000 characters |
| `website` | `https` URL, at most 200 characters |
| `industry` | string, at most 200 characters |
| `size` | one of the values above |
| `location` | string, at most 200 characters |
| `logoUrl` | `https` URL, at most 200 characters |

Strings are trimmed. The `id` is always the caller's company and the `name` is kept from the first save (or the
signup name); neither can be changed in the body. Returns the saved company, `200`. The request body is limited to 16 KB.

### GET /api/companies/{id}
Any signed-in user (job seeker or recruiter). `200` with the company, `404 COMPANY_NOT_FOUND` if it was never saved.

## Recruiter profile

```json
{ "userId": "2222...", "companyId": "co-acme-1a2b3c", "displayName": "", "jobTitle": "", "updatedAt": null }
```

### GET /api/recruiters/me
Recruiter with a company. Saved profile, or empty defaults with `updatedAt: null`. `200`.

### PUT /api/recruiters/me
Recruiter with a company. Body: `displayName` (string, at most 200), `jobTitle` (string, at most 200); both optional.
`userId` and `companyId` always come from the headers. `200` with the saved profile.

## Probes (no auth, no `/api` prefix)

| Route | Response |
| --- | --- |
| `GET /health` | `200 {"status":"ok"}` |
| `GET /ready` | `200 {"status":"ready"}`, or `503 {"status":"unavailable"}` when the database is unreachable |

## Errors

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Request body is invalid",
             "details": [{ "field": "website", "message": "website must be an https URL" }] } }
```

`details` appears only for validation errors.

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | invalid field, body not a JSON object, malformed JSON, body over 16 KB |
| 401 | `UNAUTHENTICATED` | no `X-User-Id` header |
| 403 | `FORBIDDEN` | role is not `recruiter`/`seeker`, or a seeker uses a recruiter route |
| 403 | `NO_COMPANY` | recruiter without `X-Company-Id` |
| 404 | `COMPANY_NOT_FOUND` | `GET /api/companies/{id}` for an unknown company |
| 404 | `ROUTE_NOT_FOUND` | any other path |
| 503 | `SERVICE_UNAVAILABLE` | database error (no internal details are returned) |

Every response carries `X-Request-Id` (taken from the request when present).
