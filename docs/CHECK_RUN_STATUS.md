# Check run status

This project supports two status reporting modes:

1) `STATUS_REPORTING_MODE=check_run`
- Uses GitHub Checks API: create check run, then complete it with success/failure.

2) `STATUS_REPORTING_MODE=commit_status`
- Uses commit status API: pending -> success/failure.

If check-run creation is rejected by GitHub, switch to `commit_status`.

The usual reason for rejection: `POST /repos/{owner}/{repo}/check-runs` is
GitHub App-only — a check run must be owned by an App identity, so both classic
and fine-grained PATs get a 403 no matter which permissions are granted.
Use `commit_status` with a PAT; keep `check_run` only with a GitHub App
installation token.

For the full permission map, see [GITHUB_TOKEN_SCOPES.md](./GITHUB_TOKEN_SCOPES.md).
