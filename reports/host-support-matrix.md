# Host support matrix

| Host | Installed | Version | State | Native discovery | Result |
|---|---:|---:|---|---|---|
| HHPE HRG | yes | wrapper-c566c638ac | SUPPORTED_AND_INSTALLED | runtime projection | PASS |
| Codex | yes | 0.144.1 | SUPPORTED_AND_INSTALLED | native plugins/shared skills | PASS |
| Claude Code | yes | 2.1.207 | INSTALLED_PENDING_VALIDATION | plugin-native | blocked by interactive session validation |
| Cursor | yes | 3.9.16 | INSTALLED_PENDING_VALIDATION | Agent Skills paths documented | blocked by noninteractive IDE probe |
| Antigravity IDE | yes | 2.0.10 | INSTALLED_PENDING_VALIDATION | plugin-native | blocked by interactive IDE probe |
| Antigravity CLI | no | — | SUPPORTED_NOT_INSTALLED | not testable | NOT_APPLICABLE |
| OpenCode | yes | 1.17.1 | INSTALLED_PENDING_VALIDATION | native loader and `debug paths` available | loader probe inconclusive |

No host installation was retired.
