# Host support matrix

| Host | Installed | Version | State | Native discovery | Result |
|---|---:|---:|---|---|---|
| HHPE HRG | yes | wrapper-c566c638ac | SUPPORTED_AND_INSTALLED | runtime projection | PASS |
| Codex | yes | 0.144.1 | SUPPORTED_AND_INSTALLED | native plugins/shared skills | PASS |
| Claude Code | yes | 2.1.207 | BLOCKED_BY_EXTERNAL_AUTH | plugin-native | authentication gate before skill load |
| Cursor | yes | 3.9.16 | INSTALLED_PENDING_VALIDATION | Agent Skills paths documented | BLOCKED_BY_UNAVAILABLE_INTERACTIVE_UI |
| Antigravity IDE | yes | 2.0.10 | INSTALLED_PENDING_VALIDATION | plugin-native | BLOCKED_BY_UNAVAILABLE_INTERACTIVE_UI |
| Antigravity CLI | no | — | SUPPORTED_NOT_INSTALLED | not testable | NOT_APPLICABLE |
| OpenCode | yes | 1.17.1 | INSTALLED_PENDING_VALIDATION | native project loader and `debug paths` | PASS_WITH_DOCUMENTED_HOST_LIMITATION |

No host installation was retired.
