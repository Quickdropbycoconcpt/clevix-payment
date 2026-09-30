# Money Integrity Audit — Fake Payments & Unauthorized Withdrawals

Date: 2026-09-30
Scope: code-level review of the flows that create wallet balance (collection: card, POS, virtual account) and remove it (disbursement/transfers), looking specifically for ways a user could (a) get wallet credit without real money entering the system, or (b) withdraw money they didn't bring in.

This is a code review, not a penetration test. No requests were sent to any live or sandbox endpoint. Every finding below cites the exact file and lines it's based on. The "Not covered" section at the end lists what this pass did not get to — treat it as an audit of the paths inspected, not a certification that nothing else is wrong.

---

## Critical

### 1. Card payment webhook accepts unsigned, unauthenticated payloads and credits the wallet directly

**Files:**
- [card-payment.controller.ts:34-39](../../src/modules/Api/collection/card/controller/card-payment.controller.ts#L34-L39) — `@Public() @Post('card/:provider/webhook')`
- [card-payment.service.ts:134-150](../../src/modules/Api/collection/card/service/card-payment.service.ts#L134-L150) — `incomingWebhook`
- [vfd-card-payment.adapter.ts:38-43](../../src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-card-payment.adapter.ts#L38-L43) — `incomingWebhookHandler`
- [card-payment-webhook.processor.ts:34-100](../../src/modules/Api/collection/card/jobs/card-payment-webhook.processor.ts#L34-L100) — the job that actually credits the wallet

**What the code does:**
The route is `@Public()`, meaning it bypasses `ApiJwtAuthGuard` entirely (confirmed in [api-guard.ts:23-25](../../src/modules/authentication/guards/api-guard.ts#L23-L25), which returns `true` unconditionally when the `IS_PUBLIC_KEY` metadata is set). The handler chain never reads a signature header, a shared secret, or an HMAC of the body — the adapter's `incomingWebhookHandler` only reads two fields out of the JSON body:

```ts
incomingWebhookHandler(payload: VfdCardWebhookPayload): CardWebhookEvent {
  return {
    reference: payload?.data?.reference,
    providerReference: payload?.data?.paymentReference,
  };
}
```

The processor then looks up the existing `Transactions` row by that `reference` and, if it isn't already `SUCCESS`, unconditionally calls `settlementService.createSettlement({ ..., amount: transaction.expectedAmount, ... })` — which credits the merchant's wallet for the full amount, marks the card transaction `SUCCESS`, and dispatches a "payment successful" webhook to the merchant.

**Exploit:**
1. Call `POST /v1/collection/card/initiate` with valid merchant API credentials (this is authenticated, but any merchant account — including one the attacker controls — can do this) to create a `Transactions` row with a known `reference`, for whatever amount they choose. The card need not be real or have funds; the transaction just needs to exist with a known reference and `expectedAmount`.
2. Call `POST /v1/collection/card/:provider/webhook` (fully public, no auth) with `{ "data": { "reference": "<reference from step 1>", "paymentReference": "anything" } }`.
3. The processor finds the transaction, sees it isn't `SUCCESS` yet, and credits the wallet for `expectedAmount` — regardless of whether VFD (or any card network) ever actually authorized or settled the charge.

There is no re-check against the provider's own transaction-status API before crediting. The only replay guard is that a *second* identical call is a no-op once the card transaction is already marked `SUCCESS` — that stops double-crediting on retries, but the first forged call already succeeds.

**Impact:** any merchant can mint wallet balance in an arbitrary amount, limited only by whatever `expectedAmount` they put on their own `initiate` call.

**Fix direction:** verify the provider's signature (VFD's webhook payloads should carry some form of shared-secret or HMAC header — check their docs for what's available) before trusting the body, and/or make the webhook a *trigger to re-query VFD's transaction status endpoint* rather than a source of truth in itself.

---

### 2. ~~Virtual account webhook trusts `amount` and `account_number` straight from the request body~~ — FIXED 2026-09-30

**Files:**
- [virtual-accounts.controllers.ts:47-50](../../src/modules/Api/collection/virtual-accounts/controllers/virtual-accounts.controllers.ts#L47-L50) — `@Public() @Post(':provider/webhook')`
- [virtual-accounts.service.ts:310-372](../../src/modules/Api/collection/virtual-accounts/service/virtual-accounts.service.ts#L310-L372) — `incomingWebhook`
- [vfd-virtual-account-adapter.ts:57-69](../../src/infrastructure/payments/providers/vfd/vfd-adapter/vfd-virtual-account-adapter.ts#L57-L69) — `incomingPaymentWebhook`

**What the code does:**

```ts
incomingPaymentWebhook(body: VfdVirtualAccountCreditWebhook): VirtualAccountCreditResponse {
  return {
    amount: Number(body.amount),
    senderAccountNumber: body.originator_account_number,
    reference: body.reference,
    sessionId: body.session_id,
    senderName: body.originator_account_name,
    receivedAccountNumber: body.account_number,
    narration: body.originator_narration,
  };
}
```

Every one of these fields — including `amount` and `account_number` — comes straight from the unauthenticated POST body, with no signature check anywhere in the call chain. `incomingWebhook` uses `account_number` to look up whichever business owns that virtual/static account, then queues a credit job for `amount` into that business's wallet ([virtual-accounts.service.ts:349-365](../../src/modules/Api/collection/virtual-accounts/service/virtual-accounts.service.ts#L349-L365)). Account numbers are not secrets — they're meant to be handed out to payers — so this is guessable/discoverable by design, not just by luck.

**Exploit:** `POST /v1/collection/<provider>/webhook` with `{ "account_number": "<any known virtual account number>", "amount": "<any amount>", "reference": "anything" }` credits that amount into the owning business's wallet. No authentication, no signature, no dependency on any real transfer having happened.

**Impact:** same as finding 1, but the attacker doesn't even need a valid API key or an `initiate` call first — they only need to know (or guess/observe) any merchant's account number. This is the most severe finding in the audit.

**Fix direction:** same as finding 1 — provider signature verification is non-negotiable on both webhook endpoints before anything in the body is trusted enough to move money.

**Status:** fixed. `incomingWebhook` now calls `checkProviderHeader(apiKey, provider)` before touching the DB or queuing a credit job. It rejects unknown providers, and for `vfd` it requires `x-api-key` to match `VFD_EXPECTED_INTERNAL_KEY` — throwing (not silently returning) on a missing env var or a mismatched key, so a misconfigured deployment fails closed rather than open. The controller passes the header through and logs it ([virtual-accounts.controllers.ts](../../src/modules/Api/collection/virtual-accounts/controllers/virtual-accounts.controllers.ts)). Confirm `x-api-key` is genuinely the field VFD signs (not just an arbitrary header we invented) and that `VFD_EXPECTED_INTERNAL_KEY` is set in every deployed environment before treating this as closed in production.

---

## High

### 3. ~~Virtual-account "simulate credit" endpoint has no ownership check — any merchant can credit any other merchant's account~~ — FIXED 2026-09-30

**Files:**
- [virtual-accounts.controllers.ts:42-45](../../src/modules/Api/collection/virtual-accounts/controllers/virtual-accounts.controllers.ts#L42-L45) — `@Post('credit') simulateCredit(@Body() dto)`
- [virtual-accounts.service.ts:183-207](../../src/modules/Api/collection/virtual-accounts/service/virtual-accounts.service.ts#L183-L207) — `simulateCredit`

**What the code does:** the route requires an API JWT (class-level `@UseGuards(ApiJwtAuthGuard)`, no `@Public()` on this method), but the controller never passes `@CurrentUser()` into the service call, and the service never checks that `input.accountNumber` belongs to the caller's own `businessId`:

```ts
async simulateCredit(input: SimulateInwardCreditDto) {
  const dva = await this.dvaRepo.findOne({
    where: { accountNumber: input.accountNumber, status: BasicStatus.ACTIVE },
  });
  // ...falls back to any StaticWalletAccounts row with that account number...
  return await adapter.simulateIncomingCredit({
    amount: input.amount,
    reference: dva?.reference,
    accountNumber: input.accountNumber ?? dva.accountNumber,
    environment: RequestEnvironment.TEST,
  });
}
```

Any authenticated merchant can call this with any other merchant's virtual/static account number. It hardcodes `environment: RequestEnvironment.TEST` when calling the adapter, which presumably tells VFD to simulate the inbound transfer on their sandbox rather than moving real money — I did not verify VFD's side of this, so I can't rule out that this only affects `TEST`-environment balances. Even scoped to `TEST`, the missing ownership check means one merchant can pollute another merchant's test-environment wallet, which is still a real cross-tenant bug and worth closing, and it sits directly upstream of finding 2's webhook (VFD's sandbox will presumably call back into the same public, unsigned webhook once the simulated credit "arrives").

**Fix direction:** load the target account's `businessId` and compare it against the caller's scope before calling the adapter; reject with 403/404 on mismatch, the same way `updateService`/`updateServiceItem` in the service-checkout module scope by `businessId` before allowing a mutation.

**Status:** fixed, in two parts:
- The controller now passes `@CurrentUser()` through to `simulateCredit`, and the service compares the resolved account's `businessId` against the caller's own `businessId`, rejecting with the exact same `BadRequestException('Invalid request')` used for "account doesn't exist at all" — same status code, same message — so there's no oracle distinguishing "not yours" from "doesn't exist."
- Independently, `targetEnvironment !== RequestEnvironment.TEST` is now also checked and rejected before calling the adapter. This was verified, not assumed: `simulateInWardVirtualCredit` in `vfd.client.ts` always resolves credentials via `credentialPicker(RequestEnvironment.TEST)`, so the outbound call to VFD only ever uses dev/sandbox credentials — but the account-number *lookup* on our side previously had no environment filter, meaning it would resolve a real LIVE account's row and pass its real account number to VFD's sandbox. Whatever VFD's sandbox does with an unrecognized live account number wasn't something I could verify externally, so the fix closes it on our side regardless: the endpoint now refuses to act on anything but a `TEST`-environment account.

---

## Medium

### 4. POS webhook is also unsigned, but has a narrower blast radius

**File:** [pos.service.ts:234-260](../../src/modules/Api/collection/pos/service/pos.service.ts#L234-L260) — `incomingWebhook`

Same pattern as findings 1–2 — `@Public()`, no signature check, body trusted directly — but unlike card/virtual-account, this handler only updates `cardType` and `providerReference` on an existing `pos_transactions` row matched by `rrn`+`stan`; it does not call `createSettlement` or touch wallet balance. POS crediting happens synchronously off the real provider API response in `chargePos` (verified — the `executionStatus` driving the credit comes from `adapter.chargePos(...)`'s actual network response, not from this webhook), so this doesn't let an attacker mint money directly. It's still worth signing, because a forged webhook can overwrite `providerReference` on someone else's transaction (their `rrn`/`stan` pair), which is exactly the field used elsewhere for reconciliation against the provider — corrupting that could hide a real discrepancy or make manual reconciliation harder.

### 5. `SettlementTransactions.settlementBankAccount` relation is dead — always null

**File:** [settlement_transactions.entity.ts:47-49](../../src/modules/settlement-management/entity/settlement_transactions.entity.ts#L47-L49)

```ts
@ManyToOne(() => SettlementBankAccounts)
@JoinColumn({ name: 'providerbankId' })
settlementBankAccount: SettlementBankAccounts;
```

The actual column is `settlementbankAccountId` (see the v3 migration, which explicitly drops `providerbankId` from this table and adds the FK on `settlementbankAccountId` instead: [1786483469264-v3.ts:8-15](../../src/infrastructure/database/migrations/1786483469264-v3.ts#L8-L15)). The `@JoinColumn` still points at the old, now-nonexistent-as-a-real-value `providerbankId`, so this relation resolves to `null` for every row. [settlement.processor.ts:33-72](../../src/modules/settlement-management/jobs/settlement.processor.ts#L33-L72) loads this relation to look up the destination bank account for a payout and, seeing it null, logs a warning and returns early rather than paying out. This isn't a money-creation bug — if anything it fails closed (no payout happens) — but it means **outbound settlement payouts to bank accounts may not be running at all**, which is worth confirming against production logs for the `Settlement bank account ... was not found` warning. I patched around this at the query level for the new settlement-listing endpoints (joining explicitly on `settlementbankAccountId`), but the entity itself is still broken for whatever code relies on the ORM relation.

### 6. Pattern to keep watching for: missing business/environment scoping on listing and lookup endpoints

Earlier in this workstream I found and fixed one instance of this: `GET /v1/dashboard/transactions` had no `businessId`/`environment` filter at all, returning every business's transactions to any authenticated dashboard user (fixed in `list-transactions.service.ts`). I did not do an exhaustive sweep of every controller for the same class of bug (missing `getBusinessScope`/`andWhere('businessId = ...')` on a query), but given this exact bug was found once already, I'd treat it as a pattern rather than a one-off, and check every `@Get`/`@Post` handler that reads or writes by an ID for a missing ownership check, not just the ones this session happened to touch. It's very rarely about the SQL WHERE clause — it's about an ID resolved from a URL param or body **before** confirming it belongs to the caller.

---

## Not covered in this pass

- Live/sandbox verification of any of the above (no requests were sent anywhere)
- Refund/reversal flows for failed disbursements — the settlement engine's T+1 vs instant payout design was flagged elsewhere as not yet fully implemented; if/when reversal-on-failure crediting is added, it should be checked for the same "trust the callback" pattern as findings 1–2
- A full sweep of every controller for the business-scoping gap described in finding 6 — only the transactions listing was checked and fixed
- Ledger double-entry invariants beyond the wallet debit path in `wallets.service.ts` (which does look correctly guarded: pessimistic lock + a `WHERE balance >= amount` guard at the SQL level + idempotency key, see `debitUserWallet`)
- Rate limiting / brute-force protection on any endpoint (out of scope for "fake money" but adjacent)
- Anything in the tax-management, wallets-to-wallets transfer, or business-members/permissions modules — not reviewed this pass

## Priority order to fix

1. Sign and verify both the card and virtual-account provider webhooks (findings 1–2) — everything else is secondary until these are closed, since they're live, unauthenticated money-creation endpoints.
2. Add the ownership check to `simulateCredit` (finding 3).
3. Confirm whether settlement payouts are actually running given finding 5, then fix the entity's `@JoinColumn`.
4. Sign the POS webhook for reconciliation integrity (finding 4).
5. Sweep for the scoping pattern in finding 6.
