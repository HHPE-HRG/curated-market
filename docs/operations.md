# Operations

Run discovery, then validation, then sync without `--apply`. Resolve every `COLLISION`. Apply is additive: it creates only absent individual links and records each one in `migration-state.yaml`. Re-run validation and start a new host session. Never run upstream installers during registry deployment.

Backups belong under `backups/<timestamp>` and must be recorded as `backup_only`. The current additive phase has not modified host config files, so no config backup is required yet.
