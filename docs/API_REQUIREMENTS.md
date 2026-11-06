# Agreement Module – API Requirements

## Purpose

This document lists the API requirements for the backend that will replace the
current mock Redux layer in this app. It complements the existing docs:

- [openapi.yaml](openapi.yaml) – the formal contract (source of truth for request/response shapes)
- [API.md](API.md) – documents the current mock/Redux behavior being replaced
- [BACKEND_IMPLEMENTATION_ORDER.md](BACKEND_IMPLEMENTATION_ORDER.md) – build sequencing

## Scope

The backend must support:

- Authentication and role lookup (`Checker`, `Approver`)
- Agreement drafts (save/list/resume)
- Agreement CRUD and submission workflow
- Approver review/status workflow
- Document uploads (LOI, WO, PO, Email Approval, client draft, final agreement)
- Addendums linked to a parent agreement, with their own status workflow
- Expiry notifications derived from agreement end dates

## Important: Client & Site Master Data

`selectedClient` and `selectedBranches` (site/branch names) on an agreement
must **not** be owned or hardcoded by this module. Today they are a static
list in `src/forms/AgreementForm.jsx` for demo purposes only.

**Client names and site/branch names must come from the Commercial
module/system.** When this module needs to ask for a client name or a
site/branch name, it should look it up from Commercial (e.g. a client/site
master endpoint such as `GET /api/commercial/clients` and
`GET /api/commercial/clients/{clientId}/sites`, or whatever contract
Commercial exposes), not maintain its own copy as the source of truth.

Implications for this backend:

- Agreement records should store a client/site reference (id) resolvable
  against Commercial's master data, in addition to the display name used in
  the UI today.
- This API should not expose an endpoint to create/edit clients or sites —
  that belongs to Commercial.
- If Commercial's API/contract isn't available yet, this is a blocking
  dependency and should be flagged before the client/site dropdowns in the
  Agreement form are wired to a real backend.

## Functional Requirements

### Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me` — returns current user `{ name, role }`

### Agreement Drafts
- `POST /api/agreement-drafts` — save a draft (checker flow, replaces localStorage)
- `GET /api/agreement-drafts` — list saved drafts for resuming

### Agreements
- `GET /api/agreements` — list, filterable by client, department, status, priority
- `POST /api/agreements` — create/submit (sets `status = Under Review`)
- `PATCH /api/agreements/{agreementId}` — edit an existing agreement
- `PATCH /api/agreements/{agreementId}/workflow/approver-review` — approver updates `status`, `priority`, `approvedDate`
- `POST /api/agreements/{agreementId}/documents` — upload LOI/WO/PO/Email Approval
- `POST /api/agreements/{agreementId}/client-draft` — upload client draft file
- `POST /api/agreements/{agreementId}/final-agreement` — upload signed final agreement

### Addendums
- `GET /api/addendums`
- `GET /api/agreements/{agreementId}/addendums`
- `POST /api/addendums` — create, linked to `parentAgreementId` (sets `status = Pending Review`)
- `PATCH /api/addendums/{addendumId}` — edit
- `PATCH /api/addendums/{addendumId}/status` — `Pending` / `Approved` / `Rejected`

### Notifications
- `GET /api/notifications`
- `PATCH /api/notifications/{id}/read`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications/{id}`

## Non-Functional Requirements

- File uploads must use multipart or a dedicated upload endpoint — not inline JSON (current Redux state holds file-like objects only because there is no backend yet).
- Validation currently lives in the form component (`AgreementForm.jsx`); the backend must re-validate server-side and not trust client-only checks (e.g. mandatory client/branch selection, mandatory draft file for `Client Draft` agreements).
- Role checks (`Checker` vs `Approver`) must be enforced server-side; today they are UI-only.
- Approval state must stay consistent between the top-level agreement fields (`status`, `approvedDate`, `finalAgreement`, `priority`) and `approvalWorkflow` history — these can drift in the current mock implementation.
- Dates are ISO date strings (`YYYY-MM-DD`), no time component.

## Open Questions

1. What is Commercial's exact client/site master API contract (endpoint, auth, response shape, pagination)?
2. Should an agreement store both a Commercial client/site id and a display name snapshot, or resolve the name live on every read?
3. What should happen to an existing agreement if its referenced client/site is later deactivated in Commercial?
