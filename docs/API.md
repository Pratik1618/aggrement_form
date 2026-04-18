# Agreement Form App API Documentation

## Scope

This application does not currently call a real backend API. Its operational API is the Redux layer: async thunks, slice reducers, payload shapes, and state contracts used by the UI.

The async thunks are mock implementations intended for future backend integration. They currently resolve against in-memory demo data.

Primary source files:

- `src/slice/agreementsSlice.jsx`
- `src/slice/addendumsSlice.jsx`
- `src/slice/userSlice.jsx`
- `src/slice/notificationsSlice.jsx`
- `src/store/store.jsx`
- `src/App.jsx`

## Architecture Summary

The app uses:

- React + Vite
- Redux Toolkit for state management
- `createAsyncThunk` for simulated async operations
- Local in-memory data as the current persistence layer

Store modules:

- `user`
- `agreements`
- `addendums`
- `ui`
- `notifications`

## API Surface

There are two API layers in the current codebase:

1. Internal app API
   - Redux thunks and reducers
   - Used by forms, tables, dashboards, and approval flows
2. Future backend API
   - Not implemented yet
   - Can be mapped directly from the existing thunk contracts documented below

---

## Agreements API

Source: `src/slice/agreementsSlice.jsx`

### `fetchAgreements()`

Purpose:

- Load all agreements into the Redux store

Type:

- Async thunk

Current behavior:

- Returns demo agreement records after a simulated delay

Redux action type:

- `agreements/fetchAgreements`

Request payload:

- None

Resolved payload:

```json
[
  {
    "id": "STATIC-001",
    "selectedClient": "TechCorp Solutions",
    "selectedDepartment": "IT Services",
    "agreementType": "LOI",
    "startDate": "2024-01-15",
    "endDate": "2024-12-31",
    "totalValue": 50000,
    "currency": "USD",
    "status": "Execution Pending",
    "priority": "Medium"
  }
]
```

State effects:

- `loading = true` on pending
- `agreements = payload` on fulfilled
- `error = action.error.message` on rejected

Suggested future REST mapping:

- `GET /api/agreements`

### `createAgreement(agreementData)`

Purpose:

- Create a new agreement record

Type:

- Async thunk

Current behavior:

- Adds generated metadata locally:
  - `id`
  - `createdAt`
  - `lastModified`
  - `version`

Redux action type:

- `agreements/createAgreement`

Request payload:

```json
{
  "selectedClient": "Acme Corp",
  "selectedDepartment": "IT",
  "agreementType": "LOI",
  "startDate": "2026-04-01",
  "endDate": "2027-03-31",
  "totalValue": 100000,
  "currency": "USD",
  "status": "Execution Pending",
  "priority": "Medium",
  "contactInfo": {},
  "clauses": [],
  "uploadStatuses": {
    "LOI": { "uploaded": false, "file": null },
    "WO": { "uploaded": false, "file": null },
    "PO": { "uploaded": false, "file": null },
    "EmailApproval": { "uploaded": false, "file": null }
  }
}
```

Resolved payload:

```json
{
  "id": "AGR1710000000000",
  "createdAt": "2026-04-18T10:00:00.000Z",
  "lastModified": "2026-04-18T10:00:00.000Z",
  "version": "1.0.0"
}
```

State effects:

- Pushes the created agreement into `state.agreements`

Suggested future REST mapping:

- `POST /api/agreements`

### `updateAgreement({ id, updates })`

Purpose:

- Update an existing agreement object

Type:

- Async thunk

Redux action type:

- `agreements/updateAgreement`

Request payload:

```json
{
  "id": "AGR1710000000000",
  "updates": {
    "status": "Executed",
    "priority": "High"
  }
}
```

Resolved payload:

```json
{
  "id": "AGR1710000000000",
  "updates": {
    "status": "Executed",
    "priority": "High"
  }
}
```

State effects:

- Merges `updates` into the target agreement
- Refreshes `lastModified`

Suggested future REST mapping:

- `PATCH /api/agreements/:id`

### `updateAgreementStatus({ id, status, approvedDate, finalAgreement, priority })`

Purpose:

- Fast in-store update for approver decisions and status changes

Type:

- Slice reducer action

Redux action type:

- `agreements/updateAgreementStatus`

Request payload:

```json
{
  "id": "AGR1710000000000",
  "status": "Approved",
  "approvedDate": "2026-04-18",
  "finalAgreement": {
    "name": "final-agreement.pdf",
    "size": 102400
  },
  "priority": "High"
}
```

State effects:

- Updates any provided fields on the target agreement
- Refreshes `lastModified`

Used by:

- Approver save flow in `src/forms/AgreementTable.jsx`
- Dispatch wiring in `src/App.jsx`

Suggested future REST mapping:

- `PATCH /api/agreements/:id/status`

### Agreement selectors

Available selectors:

- `selectAllAgreements(state)`
- `selectAgreementsLoading(state)`
- `selectAgreementsError(state)`
- `selectAgreementsFilters(state)`

---

## Addendums API

Source: `src/slice/addendumsSlice.jsx`

### `fetchAddendums()`

Purpose:

- Load all addendums into the Redux store

Type:

- Async thunk

Current behavior:

- Returns demo addendum records after a simulated delay

Redux action type:

- `addendums/fetchAddendums`

Suggested future REST mapping:

- `GET /api/addendums`

### `createAddendum(addendumData)`

Purpose:

- Create a new addendum linked to a parent agreement

Type:

- Async thunk

Redux action type:

- `addendums/createAddendum`

Request payload:

```json
{
  "parentAgreementId": "STATIC-001",
  "parentAgreementTitle": "TechCorp Solutions",
  "title": "Extension of Service Period",
  "description": "Extend by 6 months",
  "effectiveDate": "2026-05-01",
  "status": "Draft",
  "uploadedFiles": {}
}
```

Resolved payload:

```json
{
  "id": "ADD1710000000000",
  "submittedDate": "2026-04-18",
  "version": "1.0.0",
  "isDemo": false
}
```

Suggested future REST mapping:

- `POST /api/addendums`

### `updateAddendumStatus({ addendumId, newStatus })`

Purpose:

- Update addendum status

Type:

- Async thunk

Redux action type:

- `addendums/updateAddendumStatus`

Request payload:

```json
{
  "addendumId": "ADD001",
  "newStatus": "Approved"
}
```

Resolved payload:

```json
{
  "addendumId": "ADD001",
  "newStatus": "Approved"
}
```

Suggested future REST mapping:

- `PATCH /api/addendums/:id/status`

### Addendum local reducer actions

Also available as synchronous local actions:

- `addAddendum(payload)`
- `updateAddendum({ id, updates })`
- `removeAddendum(id)`
- `setAddendumStatus({ id, status })`

---

## User API

Source: `src/slice/userSlice.jsx`

### `setUser({ name, role })`

Purpose:

- Update the current user identity and role

Type:

- Slice reducer action

Request payload:

```json
{
  "name": "Demo User",
  "role": "Approver"
}
```

State effects:

- Sets `state.user.name`
- Sets `state.user.role`

### `logout()`

Purpose:

- Clear current user state

Type:

- Slice reducer action

State effects:

- Clears `name`
- Sets `role = null`

Role values currently used in UI:

- `Checker`
- `Approver`

---

## Notifications API

Source: `src/slice/notificationsSlice.jsx`

### `generateNotifications({ agreements })`

Purpose:

- Generate contract expiry notifications from current agreement data

Type:

- Slice reducer action

Trigger rule:

- Notification is created when:
  - `agreement.endDate` exists
  - `agreement.openAgreement` is falsey
  - contract expires within 30 days

Request payload:

```json
{
  "agreements": [
    {
      "id": "STATIC-001",
      "selectedClient": "TechCorp Solutions",
      "endDate": "2026-05-05"
    }
  ]
}
```

Generated notification shape:

```json
{
  "id": "expiry-STATIC-001-1710000000000",
  "type": "expiry_warning",
  "title": "Contract Expiring Soon",
  "message": "Agreement with TechCorp Solutions expires in 17 days",
  "agreementId": "STATIC-001",
  "clientName": "TechCorp Solutions",
  "daysUntilExpiry": 17,
  "priority": "medium",
  "createdAt": "2026-04-18T10:00:00.000Z",
  "read": false,
  "actionRequired": true
}
```

### Other notification actions

- `markAsRead(notificationId)`
- `markAllAsRead()`
- `removeNotification(notificationId)`
- `clearAllNotifications()`
- `updateLastChecked()`

---

## Data Models

## Agreement model

Representative shape based on current slices and form usage:

```json
{
  "id": "AGR1710000000000",
  "selectedClient": "Acme Corp",
  "selectedDepartment": "IT",
  "agreementType": "LOI",
  "startDate": "2026-04-01",
  "endDate": "2027-03-31",
  "totalValue": 100000,
  "currency": "USD",
  "status": "Execution Pending",
  "submittedDate": "2026-04-18",
  "submittedBy": "checker",
  "priority": "Medium",
  "entityType": "single",
  "contactInfo": {
    "name": "Internal Owner",
    "email": "owner@example.com",
    "phone": "9999999999",
    "clientName": "Client Contact",
    "clientEmail": "client@example.com",
    "clientPhone": "8888888888",
    "ismartName": "Internal Owner",
    "ismartEmail": "owner@example.com",
    "ismartPhone": "9999999999"
  },
  "clauses": [
    {
      "title": "Payment Terms",
      "placeholder": "15 days",
      "isInitial": true
    }
  ],
  "uploadStatuses": {
    "LOI": { "uploaded": true, "file": { "name": "loi.pdf" } },
    "WO": { "uploaded": false, "file": null },
    "PO": { "uploaded": false, "file": null },
    "EmailApproval": { "uploaded": false, "file": null }
  },
  "approvalWorkflow": {
    "steps": [],
    "finalApproval": {
      "approved": false,
      "approvedBy": null,
      "approvedDate": null,
      "finalComments": null
    }
  },
  "finalAgreement": {
    "name": "signed-final.pdf"
  },
  "createdAt": "2026-04-18T10:00:00.000Z",
  "lastModified": "2026-04-18T10:00:00.000Z",
  "version": "1.0.0"
}
```

## Addendum model

```json
{
  "id": "ADD1710000000000",
  "parentAgreementId": "AGR1710000000000",
  "parentAgreementTitle": "Acme Corp",
  "title": "Extension of Service Period",
  "description": "Extend by 6 months",
  "reason": "Client request",
  "impact": "No pricing change",
  "effectiveDate": "2026-05-01",
  "submittedDate": "2026-04-18",
  "submittedBy": "checker",
  "status": "Draft",
  "uploadedFiles": {},
  "clauseModifications": [],
  "version": "1.0.0"
}
```

## Notification model

```json
{
  "id": "expiry-AGR1710000000000-1710000000000",
  "type": "expiry_warning",
  "title": "Contract Expiring Soon",
  "message": "Agreement with Acme Corp expires in 10 days",
  "agreementId": "AGR1710000000000",
  "clientName": "Acme Corp",
  "daysUntilExpiry": 10,
  "priority": "medium",
  "createdAt": "2026-04-18T10:00:00.000Z",
  "read": false,
  "actionRequired": true
}
```

---

## Approval Flow API

The approver acceptance flow is UI-driven and currently persists through `updateAgreementStatus`.

Flow:

1. Approver opens agreement details in the table modal
2. Approver changes:
   - `priority`
   - `status`
   - optional `finalAgreement` upload
3. UI calls `onStatusUpdate(agreementId, status, approvedDate, finalAgreement, priority)`
4. `App.jsx` dispatches `updateAgreementStatus(...)`
5. Agreements slice updates the selected agreement in store

Current accepted status values used in the UI:

- `Execution Pending`
- `Executed`
- `Under Process with Client`
- `Approved`

Important implementation note:

- `approvalWorkflow.finalApproval` exists in seeded demo data
- the current approver flow does not automatically keep that nested workflow object in sync
- the effective accepted state in the running app is the top-level agreement fields:
  - `status`
  - `approvedDate`
  - `finalAgreement`
  - `priority`

If a backend is introduced, approval state should be normalized so both top-level status and workflow history are updated together.

---

## Store Contract

Source: `src/store/store.jsx`

Reducer keys:

```json
{
  "user": {},
  "agreements": {},
  "addendums": {},
  "ui": {},
  "notifications": {}
}
```

Special middleware handling:

- Redux serializable checks ignore file objects in agreement and addendum payloads
- This is required because uploaded documents are stored as local file-like objects in state

Implication for future backend integration:

- File uploads should be moved out of plain JSON requests
- Use multipart upload or separate document upload endpoints

---

## Hook-Level API

Source: `src/hooks/useRedux.js`

These hooks provide the public state/action interface consumed by components.

### `useAgreements()`

Returns:

- `agreements`
- `loading`
- `error`
- `filters`
- `actions`

Actions:

- `setFilters(filters)`
- `clearFilters()`
- `updateStatus(data)`
- `add(agreement)`
- `remove(id)`
- `create(data)`
- `update(data)`
- `fetch()`

### `useAddendums()`

Returns:

- `addendums`
- `loading`
- `error`
- `actions`

Actions:

- `add(addendum)`
- `update(data)`
- `remove(id)`
- `setStatus(data)`
- `create(data)`
- `updateStatus(data)`
- `fetch()`

### `useUser()`

Returns:

- `name`
- `role`
- `actions`

Actions:

- `setUser(userData)`
- `logout()`

### `useUI()`

Returns current UI state and modal/navigation actions. This is app-internal only, not business-domain API.

---

## Proposed Backend Endpoint Mapping

If this app is connected to a backend, the current Redux API can map to these endpoints:

### Agreements

- `GET /api/agreements`
- `POST /api/agreements`
- `PATCH /api/agreements/:id`
- `PATCH /api/agreements/:id/status`
- `POST /api/agreements/:id/final-agreement`

### Addendums

- `GET /api/addendums`
- `GET /api/agreements/:id/addendums`
- `POST /api/addendums`
- `PATCH /api/addendums/:id`
- `PATCH /api/addendums/:id/status`

### Notifications

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `PATCH /api/notifications/read-all`
- `DELETE /api/notifications/:id`

### Users / Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`

---

## Known Gaps

These are relevant if this documentation is used for backend implementation:

1. No real HTTP layer exists yet.
2. Approval workflow history and top-level approval state are not fully synchronized.
3. File uploads are held in Redux state instead of an upload service.
4. Validation rules live mostly in form components, not in a shared schema.
5. Role enforcement is UI-based and not backed by a server authorization layer.

---

## Recommended Next Step

If this app is moving to a real backend, implement in this order:

1. `GET /api/agreements`
2. `POST /api/agreements`
3. `PATCH /api/agreements/:id`
4. `PATCH /api/agreements/:id/status`
5. document upload endpoints
6. addendum endpoints
7. authentication and server-side role checks
