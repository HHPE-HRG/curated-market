# Rollback

`hhpe-registry-rollback` previews actions. `--apply` removes only recorded `created_by_hhpe` symlinks that are still symlinks. Replaced files are refused. Config restoration requires a specific recorded backup. Broad directory deletion is forbidden.
