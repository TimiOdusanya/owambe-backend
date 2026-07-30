# Payment & Guest Endpoints – Postman Guide

Use **{{URL}}** = your base including `/api/v1` (e.g. `http://localhost:8081/api/v1`).

---

## 1. Guest wishlist

| # | Title | Method | URL |
|---|--------|--------|-----|
| 1 | List wishlist items | GET | `{{URL}}/guest-wishlist/{{eventId}}` |
| 2 | Get a wishlist item | GET | `{{URL}}/guest-wishlist/{{eventId}}/{{wishlistId}}` |

**List wishlist – query (optional)**  
- `limit` (default 20), `skip` (default 0), `includePurchased` (`true` to include purchased items).

**URL examples**  
- List: `{{URL}}/guest-wishlist/{{eventId}}`  
- List with options: `{{URL}}/guest-wishlist/{{eventId}}?limit=10&includePurchased=true`  
- Get one: `{{URL}}/guest-wishlist/{{eventId}}/{{wishlistId}}`

---

## 2. Guest media (browse & access)

| # | Title | Method | URL |
|---|--------|--------|-----|
| 1 | List media (guest view) | GET | `{{URL}}/guest-media/{{eventId}}` |
| 2 | Get one media (guest view) | GET | `{{URL}}/guest-media/{{eventId}}/{{mediaId}}` |

**Query (optional)**  
- List: `limit`, `skip`, `guestId`, `email` (use `email` or `guestId` to see purchased/access).  
- Get one: `guestId` or `email` (or header `X-Guest-Email` / `X-Guest-Id`).

**URL examples**  
- List: `{{URL}}/guest-media/{{eventId}}?email=guest@example.com`  
- Get one: `{{URL}}/guest-media/{{eventId}}/{{mediaId}}?email=guest@example.com`

---

## 3. Payment – shared steps for Media, Wishlist, Gift

All three flows use the same payment endpoints. Only the **initiate** body and where you get IDs differ.

### 3.1 Get banks (optional – for bank_transfer)

| Title | Method | URL |
|--------|--------|-----|
| Get banks | GET | `{{URL}}/payment/banks?country=NG` |

---

### 3.2 Create payment link (Flutterwave Standard – recommended)

**Use this so the guest pays on Flutterwave’s page.** No card capture or PIN/OTP on your side; frontend just redirects to the returned `link`.

| Title | Method | URL |
|--------|--------|-----|
| Create payment link | POST | `{{URL}}/payment/create-link` |

**Body (JSON):** `eventId`, `purpose` (media | wishlist | gift), `email`, `fullname`, **`redirect_url`** (required), `phone_number?`, `guestId?`, and:
- **Media:** `mediaIds` (array of media IDs)
- **Wishlist:** `wishlistId`
- **Gift:** `amount` (number)

**Response:** `{ link, tx_ref, purchase_id, amount }` → frontend redirects user to `link`. After payment, Flutterwave redirects to your `redirect_url` with `?status=successful&tx_ref=...`; optionally call **GET /payment/verify/:tx_ref** to confirm.

**Example – media:**
```json
{
  "eventId": "EVENT_OBJECT_ID",
  "purpose": "media",
  "email": "guest@example.com",
  "fullname": "Guest Name",
  "redirect_url": "https://yoursite.com/payment/done",
  "mediaIds": ["MEDIA_ID_1", "MEDIA_ID_2"]
}
```

**Example – wishlist:**
```json
{
  "eventId": "EVENT_OBJECT_ID",
  "purpose": "wishlist",
  "wishlistId": "WISHLIST_ITEM_OBJECT_ID",
  "email": "guest@example.com",
  "fullname": "Guest Name",
  "redirect_url": "https://yoursite.com/payment/done"
}
```

**Example – gift:**
```json
{
  "eventId": "EVENT_OBJECT_ID",
  "purpose": "gift",
  "amount": 5000,
  "email": "guest@example.com",
  "fullname": "Guest Name",
  "redirect_url": "https://yoursite.com/payment/done"
}
```

---

### 3.3 Initiate payment – Direct Charge (card/bank on your side)

| Title | Method | URL |
|--------|--------|-----|
| Initiate payment | POST | `{{URL}}/payment/initiate` |

**Body (JSON)** – see below for **Media**, **Wishlist**, and **Gift**. Use when you want to collect card or bank transfer details yourself (more frontend work).

---

### 3.4 Card flow (if initiate returns `next_action: "pin"` or OTP)

| Title | Method | URL |
|--------|--------|-----|
| Submit PIN | POST | `{{URL}}/payment/submit-pin` |
| Validate OTP | POST | `{{URL}}/payment/validate` |

**Submit PIN – body**
```json
{
  "purchase_id": "PURCHASE_ID_FROM_INITIATE_RESPONSE",
  "pin": "1234"
}
```

**Validate OTP – body**
```json
{
  "flw_ref": "FLW_REF_FROM_SUBMIT_PIN_OR_INITIATE",
  "otp": "12345"
}
```

---

### 3.5 Verify payment (after redirect or polling)

| Title | Method | URL |
|--------|--------|-----|
| Verify payment | GET | `{{URL}}/payment/verify/{{tx_ref}}` |

Replace `{{tx_ref}}` with the transaction reference from initiate response or redirect.

---

### 3.6 Get purchases (guest’s completed media purchases)

| Title | Method | URL |
|--------|--------|-----|
| Get purchases | GET | `{{URL}}/payment/purchases/{{eventId}}?email=guest@example.com` |

Query: **one of** `guestId` or `email` is required.

---

## 4. Initiate payment (Direct Charge) – body by purpose

### 4.1 Pay for **media**

Get `mediaIds` from **List media** (`GET .../guest-media/{{eventId}}`); use the `_id` of each media the guest is buying.

**Body – card**
```json
{
  "eventId": "EVENT_OBJECT_ID",
  "purpose": "media",
  "email": "guest@example.com",
  "fullname": "Guest Name",
  "phone_number": "08012345678",
  "method": "card",
  "mediaIds": ["MEDIA_ID_1", "MEDIA_ID_2"],
  "card_number": "5531886652142950",
  "expiry_month": "09",
  "expiry_year": "32",
  "cvv": "564",
  "redirect_url": "https://yoursite.com/redirect"
}
```

**Body – bank transfer**
```json
{
  "eventId": "EVENT_OBJECT_ID",
  "purpose": "media",
  "email": "guest@example.com",
  "fullname": "Guest Name",
  "method": "bank_transfer",
  "mediaIds": ["MEDIA_ID_1"],
  "redirect_url": "https://yoursite.com/redirect"
}
```

Optional: `guestId` (if guest is known).

---

### 4.2 Pay for **wishlist**

Get `wishlistId` from **List wishlist** or **Get a wishlist** (`GET .../guest-wishlist/{{eventId}}` or `.../{{eventId}}/{{wishlistId}}`); use the wishlist item’s `_id`.

**Body – card**
```json
{
  "eventId": "EVENT_OBJECT_ID",
  "purpose": "wishlist",
  "wishlistId": "WISHLIST_ITEM_OBJECT_ID",
  "email": "guest@example.com",
  "fullname": "Guest Name",
  "method": "card",
  "card_number": "5531886652142950",
  "expiry_month": "09",
  "expiry_year": "32",
  "cvv": "564",
  "redirect_url": "https://yoursite.com/redirect"
}
```

**Body – bank transfer**
```json
{
  "eventId": "EVENT_OBJECT_ID",
  "purpose": "wishlist",
  "wishlistId": "WISHLIST_ITEM_OBJECT_ID",
  "email": "guest@example.com",
  "fullname": "Guest Name",
  "method": "bank_transfer",
  "redirect_url": "https://yoursite.com/redirect"
}
```

Optional: `guestId`.

---

### 4.3 Pay **gift** (cash gift)

No media/wishlist IDs; only `amount` (positive number).

**Body – card**
```json
{
  "eventId": "EVENT_OBJECT_ID",
  "purpose": "gift",
  "amount": 5000,
  "email": "guest@example.com",
  "fullname": "Guest Name",
  "method": "card",
  "card_number": "5531886652142950",
  "expiry_month": "09",
  "expiry_year": "32",
  "cvv": "564",
  "redirect_url": "https://yoursite.com/redirect"
}
```

**Body – bank transfer**
```json
{
  "eventId": "EVENT_OBJECT_ID",
  "purpose": "gift",
  "amount": 5000,
  "email": "guest@example.com",
  "fullname": "Guest Name",
  "method": "bank_transfer",
  "redirect_url": "https://yoursite.com/redirect"
}
```

Optional: `guestId`.

---

## 5. How the flows connect in Postman

### Media payment flow

1. **List media**  
   `GET {{URL}}/guest-media/{{eventId}}?email=guest@example.com`  
   → Copy `_id` of media to buy into `mediaIds[]`.

2. **Initiate payment**  
   `POST {{URL}}/payment/initiate`  
   Body: `purpose: "media"`, `mediaIds: ["id1", "id2"]`, plus `eventId`, `email`, `fullname`, `method`, and card/bank details.

3. If response has `next_action: "pin"`:  
   **Submit PIN**  
   `POST {{URL}}/payment/submit-pin`  
   Body: `purchase_id` from initiate, `pin`.

4. If response asks for OTP:  
   **Validate OTP**  
   `POST {{URL}}/payment/validate`  
   Body: `flw_ref`, `otp`.

5. **Verify payment**  
   `GET {{URL}}/payment/verify/{{tx_ref}}`  
   Use `tx_ref` from initiate (or from redirect).

6. **Get purchases**  
   `GET {{URL}}/payment/purchases/{{eventId}}?email=guest@example.com`  
   → See `purchased_media_ids`. Use same `email` (or `guestId`) when calling **List media** / **Get one media** to see access.

---

### Wishlist payment flow

1. **List wishlist** (or **Get a wishlist**)  
   `GET {{URL}}/guest-wishlist/{{eventId}}` or  
   `GET {{URL}}/guest-wishlist/{{eventId}}/{{wishlistId}}`  
   → Copy wishlist item `_id` as `wishlistId`.

2. **Initiate payment**  
   `POST {{URL}}/payment/initiate`  
   Body: `purpose: "wishlist"`, `wishlistId: "WISHLIST_ITEM_ID"`, plus `eventId`, `email`, `fullname`, `method`, and card/bank details.

3. Same as media: **Submit PIN** and/or **Validate OTP** if needed.

4. **Verify payment**  
   `GET {{URL}}/payment/verify/{{tx_ref}}`

---

### Gift payment flow

1. **Initiate payment**  
   `POST {{URL}}/payment/initiate`  
   Body: `purpose: "gift"`, `amount: 5000`, plus `eventId`, `email`, `fullname`, `method`, and card/bank details.

2. Same as above: **Submit PIN** / **Validate OTP** if needed, then **Verify payment**.

---

## 6. Admin-only (auth required)

| Title | Method | URL |
|--------|--------|-----|
| Get wallet | GET | `{{URL}}/payment/wallet/{{eventId}}` |
| Get wallet transactions | GET | `{{URL}}/payment/wallet/{{eventId}}/transactions?purpose=media` |
| Withdraw | POST | `{{URL}}/payment/wallet/{{eventId}}/withdraw` |

**Headers:** `Authorization: Bearer <token>` (organizer).

**Withdraw body**
```json
{
  "amount": 5000,
  "callback_url": "https://yoursite.com/callback",
  "bankCode": "058",
  "accountNumber": "0123456789",
  "accountName": "Account Name"
}
```

**Wallet transactions – query**  
- `purpose`: `media` \| `wishlist` \| `gift` (omit for all)  
- `limit`, `skip`

---

## 7. Quick reference – all payment & guest URLs

| Purpose | Method | URL |
|--------|--------|-----|
| List wishlist | GET | `{{URL}}/guest-wishlist/{{eventId}}` |
| Get a wishlist | GET | `{{URL}}/guest-wishlist/{{eventId}}/{{wishlistId}}` |
| List media | GET | `{{URL}}/guest-media/{{eventId}}` |
| Get one media | GET | `{{URL}}/guest-media/{{eventId}}/{{mediaId}}` |
| Get banks | GET | `{{URL}}/payment/banks` |
| Initiate payment | POST | `{{URL}}/payment/initiate` |
| Submit PIN | POST | `{{URL}}/payment/submit-pin` |
| Validate OTP | POST | `{{URL}}/payment/validate` |
| Verify payment | GET | `{{URL}}/payment/verify/{{tx_ref}}` |
| Get purchases | GET | `{{URL}}/payment/purchases/{{eventId}}?email=...` |
| **Create payment link** (Standard) | POST | `{{URL}}/payment/create-link` |
| Get wallet | GET | `{{URL}}/payment/wallet/{{eventId}}` (auth) |
| Wallet transactions | GET | `{{URL}}/payment/wallet/{{eventId}}/transactions` (auth) |
| Withdraw | POST | `{{URL}}/payment/wallet/{{eventId}}/withdraw` (auth) |
