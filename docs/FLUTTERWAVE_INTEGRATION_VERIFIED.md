# Flutterwave integration – verified against official docs

## Summary

- **Guest payments (media, wishlist, gift):** Your current API uses **Direct Charge** (card details sent to backend, then PIN/OTP steps). That works but puts more on the frontend (card capture and multi-step flow). Flutterwave’s recommended way to “let Flutterwave’s UI do the work” is **Flutterwave Standard**: backend creates a **payment link**, frontend **redirects** the user to it; user pays on Flutterwave’s page; your webhook + verify complete the order. Adding a **“create payment link”** flow is the right way to lessen frontend work.
- **Admin withdraw:** Your current flow (initiate transfer from your backend) matches Flutterwave’s Transfer API. No Flutterwave UI needed; your implementation is correct.

---

## 1. Pay for media as a guest

| Approach | What Flutterwave recommends | What you have | Best for frontend? |
|----------|-----------------------------|---------------|--------------------|
| **Direct Charge** | Backend receives card/bank and calls Charge.card / Charge.bank_transfer. Frontend may collect card or show bank details; for card, PIN/OTP steps may apply. | ✅ You have this (initiate → submit-pin → validate → verify). | No: frontend must handle card or bank UI and possibly PIN/OTP. |
| **Flutterwave Standard** | Backend calls **POST /v3/payments** (tx_ref, amount, customer, redirect_url, meta). Response gives a **link**. Frontend redirects user to that link. User pays on Flutterwave’s page (card, bank, mobile money, etc.). Flutterwave redirects back to your `redirect_url`; you verify by `tx_ref` and/or use webhook. | ✅ **Implemented:** **POST /api/v1/payment/create-link** | ✅ Yes: frontend only “create payment” → get link → redirect. |

**What you have on your end**

- **POST /api/v1/payment/create-link** creates the pending purchase, calls Flutterwave **POST /v3/payments**, and returns **`{ link, tx_ref, purchase_id, amount }`**. Webhook and **GET /payment/verify/:tx_ref** complete the order as before.
- Frontend: call **POST /payment/create-link** with eventId, purpose, email, fullname, redirect_url, and (mediaIds | wishlistId | amount) → get `link` → redirect user to `link`. After payment, Flutterwave redirects to your `redirect_url` with `?status=successful&tx_ref=...`; your page can call **GET /payment/verify/:tx_ref** to confirm. No card fields, PIN, or OTP on your frontend.

---

## 2. Pay for wishlist as a guest

Same as media, only the “create payment” payload differs (wishlistId instead of mediaIds, amount comes from the wishlist item).

- Your current **Direct Charge** flow (initiate with purpose wishlist + wishlistId) is valid.
- To use **Flutterwave’s UI** and lessen frontend work: same as media — backend creates pending purchase (wishlist), calls **POST /v3/payments**, returns the **link**; frontend redirects; webhook/verify complete the order.

---

## 3. Gift money as a guest

Same again: amount is provided by the client; no media/wishlist IDs.

- Current **Direct Charge** (initiate with purpose gift + amount) is valid.
- For Flutterwave UI: backend creates pending “gift” purchase, calls **POST /v3/payments** with that amount, returns **link**; frontend redirects; webhook/verify complete.

---

## 4. Withdraw as admin

Flutterwave’s docs: payouts are done by **initiating a transfer** from your Flutterwave balance to a bank account (Transfer API). There is no “Flutterwave hosted UI” for this; the integration is server-to-server.

Your flow is correct:

- Backend calls **Transfer.initiate** (bank code, account number, amount, narration, reference, optional callback_url).
- You already have: wallet balance check, initiate withdrawal, webhook/callback for status.
- Frontend only needs to call your withdraw endpoint (with auth); no Flutterwave UI involved. No change needed for “best practice” here.

---

## What you’re doing today vs what’s “best” for less frontend work

| Part | What you do today | What Flutterwave recommends for “their UI” | What you need to do on your end |
|------|-------------------|--------------------------------------------|----------------------------------|
| 1–3: Guest payments | Direct Charge: backend receives card/bank, calls Charge APIs; optional PIN/OTP. | **Standard**: backend creates payment (POST /v3/payments), returns **link**; user pays on Flutterwave; you verify + webhook. | **Done:** **POST /payment/create-link** creates pending purchase, calls Flutterwave Standard, returns `link`. Keep webhook and verify as-is. |
| 4: Admin withdraw | Backend calls Transfer.initiate. | Same: server-side transfer, no hosted UI. | Nothing; your implementation is correct. |

So:

- **Withdraw:** Your endpoints and flow are already the right way; no change needed.
- **Guest payments:** **POST /api/v1/payment/create-link** is implemented: it creates the pending purchase, calls Flutterwave **POST /v3/payments**, and returns the payment **link**. Frontend redirects the user to that link; your existing webhook and verify logic complete the order. Your existing **POST /payment/initiate** (Direct Charge) remains for flows where you want to collect card/bank on your side.

---

## Flutterwave docs references (conceptually)

- **Standard payment (payment link):** Create payment with POST to `/v3/payments`; response includes link; redirect customer to it; after payment, Flutterwave redirects to your `redirect_url` with `status`, `tx_ref`, `transaction_id`. Always verify on your server (by tx_ref or transaction_id); use webhooks for async methods.
- **Direct Charge:** Charge.card / Charge.bank_transfer with card or bank details; may require PIN then OTP; you handle each step (your current flow).
- **Webhooks:** `charge.completed` with transaction data; verify amount and status before fulfilling. You already do this.
- **Transfers:** Initiate transfer from balance to bank; no customer-facing Flutterwave UI. You already do this.

---

## Conclusion

- **Withdraw (admin):** Your implementation matches Flutterwave’s recommended approach; no change needed.
- **Guest payments (media, wishlist, gift):** **POST /api/v1/payment/create-link** is implemented and is the recommended way to let Flutterwave’s UI handle payment: backend creates the link, frontend redirects; webhook and verify complete the order. Your Direct Charge flow (POST /payment/initiate, submit-pin, validate) remains available for custom UX.
