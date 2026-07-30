# Bank account & bank list API (already implemented)

These endpoints are **already in the codebase**. No new routes were required.

Use **{{URL}}** = base including `/api/v1` (e.g. `http://localhost:8081/api/v1`).

---

## 1. Add / update payout bank account (organizer)

**Title:** `PUT /api/v1/events/{{eventId}}/bank-account – Save event payout bank account`

**Description:** Saves or updates the event’s payout bank details (used for withdrawals when you don’t pass a one-off bank in the withdraw body). Organizer only.

**Method:** `PUT`  
**URL:** `{{URL}}/events/{{eventId}}/bank-account`

**Headers:**
- `Content-Type`: `application/json`
- `Authorization`: `Bearer <organizer_jwt>`

**Body (raw JSON):**
```json
{
  "bankCode": "058",
  "bankName": "GTBank",
  "accountNumber": "0123456789",
  "accountName": "JOHN DOE",
  "accountType": "Savings"
}
```

**Required:** `bankCode`, `bankName`, `accountNumber` (10 digits, NGN).  
**Optional:** `accountName` (often filled after resolve), `accountType`.

**Response (200):** `message`, `bankAccount` with saved fields.

---

## 2. List banks (bank codes for dropdown)

**Title:** `GET /api/v1/payment/banks – List banks (codes & names)`

**Description:** Returns Flutterwave-supported banks for a country. Use `code` as `bankCode` when saving account or resolving. **No auth required** (public helper for forms).

**Method:** `GET`  
**URL:** `{{URL}}/payment/banks?country=NG`

**Query:** `country` optional, default `NG`.

**Headers:** None required.

**Body:** None.

**Response (200):** Array of `{ code, name, ... }` from Flutterwave.

---

## 3. Name inquiry / resolve account (verify account number)

**Title:** `POST /api/v1/events/{{eventId}}/bank-account/resolve – Resolve account name`

**Description:** Calls Flutterwave account resolution: given bank code + account number, returns the **account holder name** so the user can confirm before saving. Organizer only. Typical flow: user picks bank → enters account number → call this endpoint → show `accountName` → then **PUT** bank-account with the same `bankCode`, `bankName`, `accountNumber`, and resolved `accountName`.

**Method:** `POST`  
**URL:** `{{URL}}/events/{{eventId}}/bank-account/resolve`

**Headers:**
- `Content-Type`: `application/json`
- `Authorization`: `Bearer <organizer_jwt>`

**Body (raw JSON):**
```json
{
  "bankCode": "058",
  "accountNumber": "0123456789"
}
```

**Response (200):**
```json
{
  "accountNumber": "0123456789",
  "accountName": "JOHN DOE"
}
```

**Sandbox / test keys:** Flutterwave often returns errors like *“only 044 is allowed”* for account resolve. In **test mode**, resolution is usually limited to **bank code `044`** (Access Bank) and **test account numbers** from Flutterwave docs (e.g. `0690000032`). With **live keys**, other bank codes (e.g. `058` GTBank) work for real accounts.

---

## Recommended frontend flow

1. **GET** `{{URL}}/payment/banks?country=NG` → populate bank dropdown (`code` → `bankCode`, `name` → `bankName`).
2. User enters **account number** → **POST** `{{URL}}/events/{{eventId}}/bank-account/resolve` with `bankCode` + `accountNumber` → display `accountName`.
3. User confirms → **PUT** `{{URL}}/events/{{eventId}}/bank-account` with `bankCode`, `bankName`, `accountNumber`, `accountName` (and optional `accountType`).

---

## Related

- **GET** `{{URL}}/events/{{eventId}}/bank-account` – read saved payout account (masked account number), organizer only.
- **DELETE** `{{URL}}/events/{{eventId}}/bank-account` – clear payout account, organizer only.
