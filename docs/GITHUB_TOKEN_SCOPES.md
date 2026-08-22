# SecurePR AI — GitHub Token Scopes Guide

Which permissions to assign to the GitHub access token used by SecurePR AI.

## 📖 Table of Contents
1. [Quick Answer](#quick-answer)
2. [Where the Token Is Used](#where-the-token-is-used)
3. [API Calls → Permission Map](#api-calls--permission-map)
4. [Fine-grained PAT Setup](#fine-grained-pat-setup)
5. [Classic PAT Setup](#classic-pat-setup)
6. [Check Runs Do Not Work With a PAT](#check-runs-do-not-work-with-a-pat)
7. [GitHub Enterprise Server (GHES)](#github-enterprise-server-ghes)
8. [Verifying the Token](#verifying-the-token)
9. [Troubleshooting](#troubleshooting)
10. [Security Notes](#security-notes)

---

## Quick Answer

**Fine-grained PAT** (recommended) — repository permissions:

| Permission | Level |
|---|---|
| Metadata | Read |
| Webhooks | Read & write |
| Pull requests | Read & write |
| Issues | Read & write |
| Commit statuses | Read & write |
| Checks | Read |

**Classic PAT** — scopes: `repo` + `admin:repo_hook`

> ⚠️ If you use a PAT (either kind), set `STATUS_REPORTING_MODE=commit_status`.
> Check runs are GitHub App–only. See [Check Runs Do Not Work With a PAT](#check-runs-do-not-work-with-a-pat).

---

## Where the Token Is Used

SecurePR AI resolves a token in this order:

1. **Relay header** — `X-SecurePR-Github-Token`, for callers that forward their own
   credential (`api/routes/ingest.ts:76`).
2. **Per-repo token** — supplied on *Connect Repository*, stored encrypted
   (`services/repo-service.ts:82` → `encryptSecret`), decrypted at ingest time
   (`api/routes/ingest.ts:81`).

There is **no global token**. `GITHUB_TOKEN` was removed so no single credential
spans every repository: each repo acts under its own token, which keeps access
scoped and keeps PR activity attributable. A webhook for a repo that was never
connected — and that carries no relay header — is rejected with
`400 No GitHub token for <owner>/<repo> on <host>`.

The **same token** is used for both webhook management *and* all later PR
publishing, so it needs the full permission set — not just read access.

```
Connect Repo ──▶ validate repo + create webhook   (Webhooks: write)
                          │
PR opened ────▶ webhook ──▶ queue ──▶ orchestrator
                                        ├─ FetchDiffStage    (Pull requests: read)
                                        ├─ AnalyzeStage      (no GitHub calls)
                                        ├─ AggregateStage    (no GitHub calls)
                                        └─ PublishStage      (Pull requests: write,
                                                              Issues: write,
                                                              Commit statuses: write)
```

---

## API Calls → Permission Map

Every GitHub endpoint this codebase calls, and what it needs:

| Call site | Endpoint | Fine-grained permission | Classic scope |
|---|---|---|---|
| `integrations/github/repo-client.ts:16` | `GET /repos/{owner}/{repo}` | Metadata: Read | `repo` |
| `integrations/github/repo-client.ts:34` | `POST /repos/{owner}/{repo}/hooks` | Webhooks: Read & write | `admin:repo_hook` |
| `integrations/github/repo-client.ts:41` | `GET /repos/{owner}/{repo}/hooks` | Webhooks: Read & write | `admin:repo_hook` |
| `integrations/github/repo-client.ts:59` | `PATCH /repos/{owner}/{repo}/hooks/{id}` | Webhooks: Read & write | `admin:repo_hook` |
| `integrations/github/repo-client.ts:63` | `DELETE /repos/{owner}/{repo}/hooks/{id}` | Webhooks: Read & write | `admin:repo_hook` |
| `services/diff-fetcher.ts:17` | `GET /repos/{o}/{r}/pulls/{n}/files` | Pull requests: Read | `repo` |
| `integrations/github/review-publisher.ts:18` | `POST /pulls/{n}/reviews` | Pull requests: Read & write | `repo` |
| `integrations/github/review-publisher.ts:33` | `POST /pulls/{n}/comments` | Pull requests: Read & write | `repo` |
| `integrations/github/review-publisher.ts:48` | `POST /issues/{n}/comments` | Issues: Read & write | `repo` |
| `integrations/github/checks-publisher.ts:18` | `POST /repos/{o}/{r}/check-runs` | Checks: Read & write ⚠️ App-only | ❌ not supported |
| `integrations/github/checks-publisher.ts:36` | `PATCH /repos/{o}/{r}/check-runs/{id}` | Checks: Read & write ⚠️ App-only | ❌ not supported |
| `integrations/github/checks-publisher.ts:53` | `POST /repos/{o}/{r}/statuses/{sha}` | Commit statuses: Read & write | `repo:status` (in `repo`) |
| `integrations/github/status-client.ts:15` | `GET /commits/{sha}/status` | Commit statuses: Read | `repo:status` (in `repo`) |
| `integrations/github/status-client.ts:24` | `GET /commits/{sha}/check-runs` | Checks: Read | `repo` |

### Why each one

- **Metadata: Read** — mandatory baseline for every fine-grained token; also backs the
  `getRepo` call that validates the token during Connect Repository.
- **Webhooks: Read & write** — the most commonly missed one. SecurePR AI auto-creates
  the `pull_request` webhook (`repo-client.ts:26`) instead of asking you to add it by hand.
  `DELETE /repos/:id` removes the hook, so you need write (not just read) here.
- **Pull requests: Read & write** — read to fetch changed files, write to post the review
  and inline findings.
- **Issues: Read & write** — only used by the fallback path in `pipeline/stages/publish.ts:50`.
  When `createReview` fails, the summary is posted as a plain PR comment via the issues
  endpoint. Omit this and you lose the fallback, not the happy path.
- **Commit statuses: Read & write** — the actual merge-gate signal in `commit_status` mode,
  and the fallback whenever a check run is unavailable.
- **Checks: Read** — needed by `GET /github/status/:owner/:repo/:sha` to display existing
  check runs in the UI. Write is pointless with a PAT (see below).

---

## Fine-grained PAT Setup

1. Go to **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. Click **Generate new token**.
3. **Resource owner**: pick the org/user that owns the repos you want to scan.
   > For org-owned repos, an org admin may need to approve the token before it works.
4. **Repository access**: *Only select repositories* → choose the repos to connect.
5. **Repository permissions** — set exactly these:

   ```
   Metadata           → Read-only        (auto-selected, required)
   Webhooks           → Read and write
   Pull requests      → Read and write
   Issues             → Read and write
   Commit statuses    → Read and write
   Checks             → Read-only
   ```

6. Set an expiry, generate, and copy the `github_pat_...` value.
7. Paste it into the **Connect Repository** page (or `POST /repos`); it is stored
   encrypted per repo. With a PAT, also set in `backend/.env`:
   ```bash
   STATUS_REPORTING_MODE=commit_status
   ```

---

## Classic PAT Setup

Use this when fine-grained tokens are unavailable (older GHES, or org policy).

1. **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**.
2. **Generate new token (classic)**, then check:

   ```
   ☑ repo                 (full control of private repositories)
       └ includes repo:status, repo_deployment, public_repo
   ☑ admin:repo_hook      (read, write, and delete repository hooks)
   ```

3. Copy the `ghp_...` value and use it as above.

**Notes**
- `repo` already includes `repo:status`, so don't check it separately.
- `write:repo_hook` is *not* enough — `disconnectRepo` calls `DELETE .../hooks/{id}`,
  which requires `admin:repo_hook`.
- For public repos only, `public_repo` can replace `repo` — but private repos will 404.

---

## Check Runs Do Not Work With a PAT

`ChecksPublisher.createCheckRun` calls `POST /repos/{owner}/{repo}/check-runs`
(`integrations/github/checks-publisher.ts:18`). A check run must be **owned by a GitHub App
identity**, so GitHub rejects this endpoint for both classic and fine-grained PATs —
granting `Checks: Read & write` does not change that.

**The code degrades instead of breaking:**

| Step | Behavior |
|---|---|
| `services/ingest-service.ts:78` | Catches the 403, returns `null` for `checkRunId` |
| `services/pipeline/stages/publish.ts:100` | Sees no `checkRunId`, falls through to `else` |
| `services/pipeline/stages/publish.ts:113` | Posts a commit status instead |

So the merge gate still works — just as a commit status rather than a check run.

**Recommended with a PAT:**

```bash
# backend/.env
STATUS_REPORTING_MODE=commit_status
```

This skips a guaranteed-failing API call on every job and makes the config match reality.
Keep `check_run` only if you switch to a **GitHub App installation token**, which is the
supported way to get real check runs (and also avoids per-user PAT expiry).

See also: [CHECK_RUN_STATUS.md](./CHECK_RUN_STATUS.md).

---

## GitHub Enterprise Server (GHES)

SecurePR AI supports GHES hosts alongside github.com. The host must be allow-listed:

```bash
GITHUB_ALLOWED_HOSTS=github.com,github.boschdevcloud.com
```

The API base URL is derived automatically (`integrations/github/host.ts`):

| Host | API base |
|---|---|
| `github.com` | `https://api.github.com` |
| GHES host | `https://<host>/api/v3` |

**GHES caveats**
- Fine-grained PATs require a recent GHES version. If the *Fine-grained tokens* menu is
  missing, use a **classic PAT** with `repo` + `admin:repo_hook`.
- The token must be created **on the GHES instance itself**, not on github.com.
- A token for one host will not authenticate against another — connect each repo with a
  token issued by its own host.

---

## Verifying the Token

Replace `<TOKEN>`, `<OWNER>`, `<REPO>`, and `<API>` (`https://api.github.com` or
`https://<ghes-host>/api/v3`).

```bash
# 1) Token is valid + repo is reachable  → Metadata / repo
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer <TOKEN>" \
  <API>/repos/<OWNER>/<REPO>

# 2) Webhook permission  → Webhooks / admin:repo_hook
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer <TOKEN>" \
  <API>/repos/<OWNER>/<REPO>/hooks

# 3) Pull request read  → Pull requests: Read
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer <TOKEN>" \
  <API>/repos/<OWNER>/<REPO>/pulls

# 4) Commit status write  → Commit statuses: Read & write
#    (safe: writes a neutral status on the given SHA)
curl -sS -o /dev/null -w '%{http_code}\n' \
  -X POST -H "Authorization: Bearer <TOKEN>" \
  -d '{"state":"success","context":"SecurePR AI token check"}' \
  <API>/repos/<OWNER>/<REPO>/statuses/<SHA>
```

Expected: `200` for 1–3, `201` for 4. A `403` means the permission is missing;
a `404` on a private repo usually also means missing permission (GitHub hides
existence rather than returning 403).

The simplest end-to-end check is the **Connect Repository** page — it calls `getRepo`
and then `createWebhook`, so a successful connect proves both Metadata and Webhooks.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Connect Repo fails with 404 on a private repo | Token lacks repo access, or fine-grained token wasn't granted *this* repo | Add the repo under *Repository access*; org admin approval may be pending |
| Connect Repo succeeds, no webhook appears | Missing **Webhooks: write** / `admin:repo_hook` | Add the permission, then re-run *Configure webhook* (`POST /repos/:id/webhook`) |
| Disconnect leaves an orphan webhook | `write:repo_hook` only | Upgrade to `admin:repo_hook` |
| Job runs, but no check run on the PR | PAT cannot create check runs | Set `STATUS_REPORTING_MODE=commit_status`, or move to a GitHub App |
| `createReview failed, falling back to issue comment` in logs | Missing **Pull requests: write** | Add it; the fallback needs **Issues: write** to work at all |
| No status at all on the commit | Missing **Commit statuses: write**, or `STATUS_REPORTING_ENABLED=false` | Add the permission / enable reporting |
| Worked yesterday, 401 today | PAT expired | Rotate the token and reconnect the repo |

---

## Security Notes

- **Least privilege** — prefer a fine-grained PAT scoped to *only* the repos you scan over
  a classic `repo` token, which grants full control of every private repo you can see.
- **Per-repo tokens are encrypted at rest** (`core/security.ts:encryptSecret`) using
  `TOKEN_ENCRYPTION_KEY`. Change it from the default `change_me` before any real
  deployment, and treat it as a secret — it decrypts every stored token.
- **Never commit tokens.** Tokens live only in the encrypted per-repo store — never in
  `.env`, `.env.example`, or `docker-compose.yml`.
- **No global credential.** There is deliberately no `GITHUB_TOKEN` env var; connect each
  repository so a leaked or over-scoped token cannot reach repos you never onboarded.
- **Rotate on expiry** and set the shortest practical lifetime; reconnect affected repos
  afterwards so the encrypted per-repo copy is refreshed.
- **Prefer a GitHub App** for production: installation tokens are short-lived, scoped per
  installation, not tied to a person, and unlock real check runs.
