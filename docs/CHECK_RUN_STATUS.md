# Check run status

This project supports two status reporting modes:

1) `STATUS_REPORTING_MODE=check_run`
- Uses GitHub Checks API: create check run, then complete it with success/failure.

2) `STATUS_REPORTING_MODE=commit_status`
- Uses commit status API: pending -> success/failure.

If check-run creation is rejected by GitHub, switch to `commit_status`.
