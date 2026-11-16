# MECHA — Waitlist Follow-up (n8n workflow)

**Status: BUILT, NOT ACTIVE.** This workflow is importable now, but it activates
only when MECHA email sending is unblocked. Gmail sending for the company
account is currently **blocked**: it needs the owner's 2-Step Verification +
app password on the Mecha Google account, and that step is **not done yet**.
Do not activate this workflow until the checklist below is complete.

No n8n account is created by this deliverable. These are import files only.

## Files

| File | What it is |
| --- | --- |
| `mecha-waitlist-followup.workflow.json` | Importable n8n workflow export (nodes + connections, current n8n export format). Import it via n8n → Workflows → Import from File. |
| `README.md` | This file. |

The coordinator places these files under the repo's `workflows/` directory.

## What the workflow does

When someone joins the MECHA waitlist on the homepage, this workflow sends a
short welcome email, then two short follow-ups — one after 3 days, one 4 days
after that (day 7 total).

- Stateless, per-signup: each webhook event runs independently.
- No database writes and no schema changes.
- The source of truth stays in the app's Postgres table `waitlist_signups`
  (columns: `id` uuid, `email`, `source`, `locale`, `created_at`).
- All email is sent from the company Gmail identity,
  **app.mechaai@gmail.com**, via n8n Gmail nodes.
- Copy follows the owner's standard: minimal text, straight to the point —
  short subject lines, 3–5 short lines per email, one clear call to action,
  no hype, no fake claims, no invented statistics.
- Locale: the payload carries `locale`, and the workflow passes it through,
  but **all emails are sent in English (EN) for now**. Locale-based
  personalization is a future step (see the sticky note in the workflow).

### The three emails

1. **Welcome** (immediately) — Subject: `You're on the MECHA list`.
   Confirms the signup and says early-access news will come by email.
2. **Follow-up #1** (day 3) — Subject: `What early access gets you`.
   What MECHA does, plus the early-access benefits: **3 months free Pro** and
   a **lifetime pricing lock** for early members.
3. **Follow-up #2** (day 7) — Subject: `Know what's wrong. Pay what's fair.`
   The product story — AI diagnosis, fair-price protection, health vault —
   with one call to action: try a diagnosis when access opens.

## Flow

```text
POST /webhook/mecha-waitlist-signup
  payload: { email, source, locale, created_at }
        │
        ▼
[Waitlist Signup Webhook]  (POST, path: mecha-waitlist-signup, responds onReceived)
        │
        ▼
[Normalize Signup]  (Set — pulls email / source / locale / created_at
                     out of the webhook body, defaults source=homepage, locale=en)
        │
        ▼
[Has Valid Email?]  (IF — email must contain "@" and ".")
        ├── false ──► [Drop Invalid Signup]  (NoOp — execution ends, nothing sent)
        │
        └── true
              ▼
        [Gmail — Welcome]            sendTo = signup email
              │
              ▼
        [Wait 3 Days]
              │
              ▼
        [Gmail — Follow-up 1 (Day 3)]
              │
              ▼
        [Wait 4 Days]
              │
              ▼
        [Gmail — Follow-up 2 (Day 7)]
```

The workflow file also contains three sticky notes documenting its purpose,
the activation blockers, and the locale note.

## Credential placeholders to replace at import

All three Gmail nodes reference a **placeholder** credential — there are no
real credentials in this file, and none should ever be committed:

- Credential type: Gmail OAuth2 (`gmailOAuth2`)
- Placeholder name on every Gmail node: `MECHA Gmail (app.mechaai@gmail.com)`
- Placeholder id: empty (`""`)

At import/activation time, create the real n8n Gmail credential under the
Mecha identity (app.mechaai@gmail.com) and select it on all three Gmail nodes,
replacing the placeholder.

## Activation checklist

Do these in order. The workflow stays inactive until every step is done.

- [ ] **Owner enables 2-Step Verification** on the Mecha Google account
      (app.mechaai@gmail.com).
- [ ] **Owner creates an app password** for mail sending on that account.
- [ ] **Create the n8n Gmail credential under the Mecha identity**
      (app.mechaai@gmail.com) in n8n, and select it on all three Gmail nodes
      in place of the placeholder credential.
- [ ] **Import the workflow** (`mecha-waitlist-followup.workflow.json`) into n8n.
- [ ] **Set the webhook URL env in the app**: set `N8N_WAITLIST_WEBHOOK_URL`
      to this workflow's production webhook URL (the URL for path
      `mecha-waitlist-signup`), and add the app-side hook below if it is not
      already in place.
- [ ] **Test with one signup**: submit one real waitlist signup, confirm the
      welcome email arrives from app.mechaai@gmail.com, then activate the
      workflow.

## Still owed: the app-side webhook hook

The app does **not** yet POST signups to n8n. This is the one app-side hook
still owed, and it is separate from importing this workflow:

- On a **successful** waitlist signup (after the row is written to
  `waitlist_signups`), the Next.js server code makes a **server-side POST**
  to the n8n webhook URL with a JSON body:

  ```json
  { "email": "...", "source": "homepage", "locale": "en", "created_at": "..." }
  ```

- The POST is **env-gated by `N8N_WAITLIST_WEBHOOK_URL`**: if that variable is
  unset, the app skips the POST silently and signup behavior is unchanged.
- The POST must be fire-and-forget from the user's perspective — a slow or
  failing n8n endpoint must never fail or delay the signup response.
- Never expose the webhook URL to the browser; the POST happens server-side
  only.

Until that hook lands and `N8N_WAITLIST_WEBHOOK_URL` is set, an activated
workflow would simply never receive events.
