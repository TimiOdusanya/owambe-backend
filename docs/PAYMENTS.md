# Media payments (Flutterwave)

## Overview

- **Guests** see event media via **guest-media** APIs. Paid media require purchase; after successful payment only purchased media are accessible (view/download). **Money goes to the event’s admin**: each payment is credited to that **event’s wallet** (tracked in our backend). The admin adds **their bank account** on the event; withdrawals are sent to that account.
- **Dashboard users** (authenticated via JWT) use existing **admin media** APIs and see all media without paying.
- **Owambe wallet**: We do **not** use Flutterwave’s wallet for admins. We keep a **ledger per event** (balance, transactions). When a guest pays for an event’s media, we credit that event’s wallet. The admin only sees **Owambe** balance and transactions (payments in, withdrawals out). Real money is collected into **Owambe’s Flutterwave account**, then **transferred** to the event admin’s bank when they withdraw.

## Where the money goes

1. **Collection**: Card or bank transfer payments are collected by **Flutterwave into Owambe’s Flutterwave account** (the one tied to your API keys).
2. **Event wallet (our backend)**: When a payment completes, we **credit the event’s wallet** (EventWallet + WalletTransaction). The **event** is identified by `eventId` on the payment (media belongs to an event). So the guest can only “send money” to that event’s admin because the payment is always for that event’s media.
3. **Admin bank account**: When creating or editing an event, the **admin adds their bank details** (bank code, account number, account name). These are stored on the **Event** model (`payoutBankCode`, `payoutAccountNumber`, `payoutAccountName`).
4. **Withdrawal**: When the admin clicks **Withdraw**, we call **Flutterwave Transfer API** to send money from Owambe’s Flutterwave balance to the **event’s payout bank account**, then we **debit** the event’s wallet. The admin sees their Owambe wallet balance and transaction history (payments in, withdrawals out), not Flutterwave.

## Event bank account (admin) – dedicated endpoints

Bank account for an event is managed via **separate endpoints** (not the generic event PATCH). All require authentication and that the user is the **event organizer**.

**Add or update bank account**  
`PUT /api/v1/events/:eventId/bank-account`  
Body:

- `bankCode` (string, required) – Flutterwave bank code, e.g. `"058"` for GTBank.
- `bankName` (string, required) – Display name, e.g. `"GTBank"`.
- `accountNumber` (string, required) – 10-digit NGN account number.
- `accountName` (string, optional) – Account holder name; can come from resolve or user input.
- `accountType` (string, optional) – e.g. `"Savings"`, `"Current"`.

Response: `{ message, bankAccount: { bankCode, bankName, accountNumber, accountName, accountType } }`.

**Get bank account** (account number masked)  
`GET /api/v1/events/:eventId/bank-account`  
Response: `{ hasBankAccount, bankAccount: { bankCode, bankName, accountNumberMasked: "****55664", accountName, accountType } }`.

**Resolve account name** (for “Account name will appear after verification”)  
`POST /api/v1/events/:eventId/bank-account/resolve`  
Body: `{ bankCode, accountNumber }`.  
Calls Flutterwave account resolution; returns `{ accountNumber, accountName }` so the frontend can show the verified account name.

**Event** model fields used: `payoutBankCode`, `payoutBankName`, `payoutAccountNumber`, `payoutAccountName`, `payoutAccountType`.

**List banks (for dropdown)**  
`GET /api/v1/payment/banks?country=NG`  
Returns the list of banks supported by Flutterwave for that country (e.g. Nigeria). Each item has a `code` (use as `bankCode` when saving) and `name` (use as `bankName`). Only these banks can receive payouts; the dropdown should use this list.

## Architecture

```
src/modules/
├── admin/
│   ├── models/Event.js              # + payoutBankCode, payoutAccountNumber, payoutAccountName
│   └── media (unchanged)
├── shared/
│   └── guest-media
└── payment/
    ├── models/
    │   ├── MediaPurchase.js
    │   ├── EventWallet.js           # eventId, balance, currency
    │   └── WalletTransaction.js     # eventId, type (payment_in | transfer_out), amount, reference
    ├── services/
    │   ├── flutterwave.service.js   # card, bank_transfer, validate, verify, initiateTransfer
    │   ├── payment.service.js       # initiate, validate OTP, webhook, verify; credits wallet on complete
    │   ├── wallet.service.js        # creditFromPayment, debitForTransfer, getBalance, getTransactions
    │   └── withdraw.service.js      # initiateWithdrawal (transfer to event bank, debit wallet)
    ├── controllers/
    │   ├── payment.controller.js
    │   └── wallet.controller.js     # getWallet, getTransactions, withdraw (organizer only)
    └── routes/payment.routes.js
```

## Environment variables

Add to `.env`:

```env
FLW_PUBLIC_KEY=FLWPUBK_TEST-...   # or FLWPUBK-... for live
FLW_SECRET_KEY=FLWSECK_TEST-...   # or FLWSECK-... for live
FLW_ENCRYPTION_KEY=FLWSECK_TEST... # from dashboard Settings > API
```

Use **V3** test keys for sandbox. Get keys from [Flutterwave Dashboard](https://dashboard.flutterwave.com/) → Settings → API Keys.

## Guest flow

1. **List media (guest)**  
   `GET /api/v1/guest-media/:eventId?guestId=...&email=...`  
   Returns media with `price`, `purchased`, `has_access`. Optional `guestId` or `email` to show purchased state.

2. **View/download single media**  
   `GET /api/v1/guest-media/:eventId/:mediaId?guestId=...&email=...`  
   If not purchased and price > 0 → `402 Payment required` (metadata only). If free or purchased → full media with links.

3. **Proceed to payment**  
   `POST /api/v1/payment/initiate`  
   Body: `eventId`, `purpose` (`media` | `wishlist` | `gift`), `email`, `fullname`, `phone_number?`, `method` (`card` | `bank_transfer`), optional `guestId`.
   - **media**: `mediaIds[]` required.
   - **wishlist**: `wishlistId` required (one wishlist item; once purchased it is marked and no one else can buy it).
   - **gift**: `amount` (positive number) required; guest gifts the event.  
     For **card**: also `card_number`, `expiry_month`, `expiry_year`, `cvv`, optional `redirect_url`.  
     Response: `next_action` = `otp` | `redirect` | `bank_transfer` | `completed` | `pending`, plus `flw_ref` (for OTP), `redirect_url`, or `bank_account` details.

4. **Card – OTP**  
   If `next_action === 'otp'`: show OTP field, then  
   `POST /api/v1/payment/validate`  
   Body: `flw_ref`, `otp`.  
   On success, purchase is completed and media become accessible.

5. **Card – redirect (3DS)**  
   If `next_action === 'redirect'`: redirect user to `redirect_url`. After they complete 3DS, they land on your `redirect_url` with `tx_ref` (and optionally `status`). Frontend then calls  
   `GET /api/v1/payment/verify/:tx_ref`  
   to confirm and complete the purchase.

6. **Bank transfer**  
   If `next_action === 'bank_transfer'`: show `bank_account` (account_number, bank_name, amount). Customer pays; Flutterwave sends a webhook. Backend marks purchase completed on webhook. Frontend can poll  
   `GET /api/v1/payment/verify/:tx_ref`  
   until success.

7. **My purchases**  
   `GET /api/v1/payment/purchases/:eventId?guestId=...` or `?email=...`  
   Returns `purchased_media_ids` for that guest in the event.

## Wishlist (guest + admin)

**Admin – manage wishlist (authenticated)**

- Create: `POST /api/v1/gifts/:eventId/wishlist` — body: `name`, `price`, `description?`, `media?`
- List: `GET /api/v1/gifts/:eventId/wishlist`
- Get one: `GET /api/v1/gifts/:eventId/wishlist/:wishlistId`
- Update: `PUT /api/v1/gifts/:eventId/wishlist/:wishlistId`
- Delete: `DELETE /api/v1/gifts/:eventId/wishlist/:wishlistId`
- Delete multiple: `DELETE /api/v1/gifts/:eventId/wishlist` — body: `{ wishlistIds }`

**Guest – list wishlist (no auth)**

- `GET /api/v1/guest-wishlist/:eventId?limit=20&skip=0&includePurchased=false`  
  Returns wishlist items for the event. Default: only **unpurchased** items so the guest can buy. Set `includePurchased=true` to include already-purchased items.

**Guest – purchase a wishlist item**

- Call `POST /api/v1/payment/initiate` with `purpose: "wishlist"`, `wishlistId: "<id>"`. After payment completes, that wishlist item is marked **purchased** and no other guest can purchase it.

## Gift (guest)

**Guest – gift the event**

- Call `POST /api/v1/payment/initiate` with `purpose: "gift"`, `amount: <number>`. No `mediaIds` or `wishlistId`. Same card/bank transfer flow.

## Payment tags and guest info (admin dashboard)

Each **WalletTransaction** of type `payment_in` has:

- **purpose**: `media` | `wishlist` | `gift` — so the admin can see what the payment was for.
- **guestId**, **guestEmail**, **guestName**, **guestPhone** — populated from the payer so the admin can see who made the payment.

`GET /api/v1/payment/wallet/:eventId/transactions` returns these fields for each transaction.

## Admin wallet and withdrawals (organizer only, authenticated)

- **Get wallet balance**  
  `GET /api/v1/payment/wallet/:eventId`  
  Returns `{ eventId, balance, currency, can_withdraw }`. `can_withdraw` is true if the event has payout bank details.

- **Get wallet transactions**  
  `GET /api/v1/payment/wallet/:eventId/transactions?limit=20&skip=0`  
  Returns `{ balance, currency, transactions, totalCount, ... }`. Transactions are `payment_in` (guest paid for media) or `transfer_out` (withdrawal to bank).

- **Withdraw to bank**  
  `POST /api/v1/payment/wallet/xeventId/withdraw`  
  Body: `{ amount, callback_url?, bankCode?, accountNumber?, accountName? }`.  
  Transfers `amount` from the event wallet. By default uses the **event’s saved payout bank account**. To send to **another bank of their choice** for this withdrawal, the organiser can pass `bankCode`, `accountNumber`, and optionally `accountName`; that account is used for this transfer only. Only the **event organizer** can call this.

## Webhook

- **URL**: `POST /api/v1/payment/webhook`
- **Event**: `charge.completed`
- Configure this URL in Flutterwave Dashboard (Settings → Webhooks).
- In production, verify the webhook signature using `FLW_WEBHOOK_SECRET` if available.

## Dashboard (admin) media

- Existing routes under `/api/v1/media` (with `authenticate` middleware) are unchanged.
- Dashboard users see all media and do not need to pay.

## Testing (Flutterwave test mode)

- Use **V3 Test** keys (prefix `FLWPUBK_TEST-`, `FLWSECK_TEST-`).
- Card: use [test cards](https://developer.flutterwave.com/docs/test-cards).
- Bank transfer: in test mode transfers are often auto-completed after a short delay; use webhook or polling verify to confirm.

---

## Testing from the backend (no frontend)

You can test the full flow using **curl**, **Postman**, or the provided **test script** (see below). No frontend required.

### Webhook when testing locally (localhost)

Flutterwave **cannot** send webhooks to `http://localhost:PORT` because your machine is not reachable from the internet.

**Options:**

1. **Don’t rely on the webhook for local testing**
   - **Card:** Use **initiate** → then **validate** with OTP. No webhook needed.
   - **Bank transfer:** Use **initiate** → you get virtual account details. In **test mode** Flutterwave often marks the transfer as successful after a short time. **Poll** `GET /api/v1/payment/verify/:tx_ref` every few seconds until it returns `success: true`. So for local backend-only testing you **do not need a webhook**.

2. **Use a tunnel so Flutterwave can hit your backend**
   - Run [ngrok](https://ngrok.com/): `ngrok http 4000` (or your `PORT`).
   - You get a public URL like `https://abc123.ngrok.io`.
   - In Flutterwave Dashboard → Webhooks, set:  
     `https://abc123.ngrok.io/api/v1/payment/webhook`
   - Then bank transfer completions will hit your local server.

3. **Deploy to a public URL**
   - Deploy your API to a staging URL (e.g. Heroku, Render).
   - Set webhook in Flutterwave to: `https://your-staging-url.com/api/v1/payment/webhook`.

**Summary:** For backend-only testing you can **ignore the webhook**: use **card + OTP** and **bank transfer + polling verify**.

### 1. Test with curl (replace IDs and base URL)

**Prerequisites:** An existing **event** and at least one **media** with `price > 0` in your DB. Get their IDs (e.g. from MongoDB or from `GET /api/v1/media/:eventId` when logged in).

**Card flow (OTP):**

```bash
# 1) Initiate card payment (use a real eventId and mediaId from your DB)
curl -X POST http://localhost:4000/api/v1/payment/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "YOUR_EVENT_ID",
    "mediaIds": ["YOUR_MEDIA_ID"],
    "email": "guest@example.com",
    "fullname": "Test Guest",
    "phone_number": "+2348012345678",
    "method": "card",
    "card_number": "5531886652142950",
    "expiry_month": "09",
    "expiry_year": "32",
    "cvv": "564"
  }'
```

From the response, copy `flw_ref` and `tx_ref`.

```bash
# 2) Validate with test OTP (use the flw_ref from step 1)
curl -X POST http://localhost:4000/api/v1/payment/validate \
  -H "Content-Type: application/json" \
  -d '{"flw_ref": "PASTE_FLW_REF_HERE", "otp": "123456"}'
```

**Bank transfer flow (then poll verify, no webhook):**

```bash
# 1) Initiate bank transfer
curl -X POST http://localhost:4000/api/v1/payment/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "YOUR_EVENT_ID",
    "mediaIds": ["YOUR_MEDIA_ID"],
    "email": "guest@example.com",
    "fullname": "Test Guest",
    "phone_number": "+2348012345678",
    "method": "bank_transfer"
  }'
```

Copy `tx_ref` from the response. In test mode the transfer is often auto-completed after a few seconds.

```bash
# 2) Poll verify until success (replace TX_REF with the value from step 1)
curl "http://localhost:4000/api/v1/payment/verify/TX_REF"
```

Run the verify request every 5–10 seconds until you get `"success": true`.

### 2. Test script (Node)

From the project root, run:

```bash
node scripts/test-payment.js
```

The script will prompt for `eventId` and `mediaId` (or use env vars), then run card initiate → validate with OTP `123456`. See `scripts/test-payment.js` for details.
