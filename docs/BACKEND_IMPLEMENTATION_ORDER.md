# Backend Implementation Order

Use the OpenAPI spec as the source of truth:

- OpenAPI YAML: [openapi.yaml](openapi.yaml)
- Supporting API notes: [API.md](API.md)

## Current Flow Captured In The OpenAPI Spec

### Checker / Maker flow

1. Save draft
   - current frontend stores drafts in localStorage
   - backend spec models this as `/api/agreement-drafts`
2. Submit agreement for review
   - current frontend sets `status = Under Review`
   - backend spec models this as `POST /api/agreements`
3. Edit existing agreement
   - current frontend opens the form again and updates agreement data
   - backend spec models this as `PATCH /api/agreements/{agreementId}`

### Approver flow

1. Approver cannot access the new-agreement tab
2. Approver opens agreement details from the agreement table
3. Approver can update:
   - `priority`
   - `status`
   - final agreement upload
4. Current approver status options in the UI:
   - `Execution Pending`
   - `Executed`
   - `Under Process with Client`
   - `Approved`
5. Current helper logic also supports reset/reject back to `Execution Pending`
6. Backend spec models this as:
   - `PATCH /api/agreements/{agreementId}/workflow/approver-review`
   - `POST /api/agreements/{agreementId}/final-agreement`

### Addendum flow

1. Checker creates addendum
2. Current frontend sets `status = Pending Review`
3. Approver can update addendum status to:
   - `Pending`
   - `Approved`
   - `Rejected`

## Recommended Implementation Order

1. `POST /api/auth/login`
2. `GET /api/me`
3. `POST /api/agreement-drafts`
4. `GET /api/agreement-drafts`
5. `POST /api/agreements`
6. `GET /api/agreements`
7. `PATCH /api/agreements/{agreementId}`
8. `PATCH /api/agreements/{agreementId}/workflow/approver-review`
9. `POST /api/agreements/{agreementId}/documents`
10. `POST /api/agreements/{agreementId}/client-draft`
11. `POST /api/agreements/{agreementId}/final-agreement`
12. `POST /api/addendums`
13. `PATCH /api/addendums/{addendumId}/status`
