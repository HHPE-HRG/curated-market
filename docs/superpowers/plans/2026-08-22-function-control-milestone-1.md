# Function Control Milestone 1 — closeout record

Status: **verification pass** (see checklist at end).

## Runtime path (correct)

Function Control **runtime state** must not live in the Git checkout.

| Purpose | Path |
| --- | --- |
| Catalog/manifests (git) | Repository checkout `registry/manifests/` |
| Runtime default (ADR-001) | `~/.local/share/hhpe-hrg/function-control/` |
| Isolated smoke | `export HHPE_HRG_HOME="$(mktemp -d)"` |

`lib/function-control/paths.mjs` defaults **runtime** to `~/.local/share/hhpe-hrg` when `HHPE_HRG_HOME` is unset; manifest reads still default to checkout (same as `lib/registry.mjs`).

## Smoke commands (safe)

```bash
export HHPE_HRG_HOME="$(mktemp -d)"
export HHPE_FUNCTION_VAULT_KEY="$(openssl rand -hex 32)"
# HHPE_HRG_HOME must point at install root containing lib/ and registry/manifests
# For smoke from checkout without installing:
export HHPE_HRG_HOME="$(mktemp -d)"
cp -R lib registry/bin "$HHPE_HRG_HOME/"
node "$HHPE_HRG_HOME/bin/hhpe-function-resolve" resolve \
  --binding-key test:smoke --pin-account openai:personal
rm -rf "$HHPE_HRG_HOME"
```

Production:

```bash
export HHPE_HRG_HOME="${HHPE_HRG_HOME:-$HOME/.local/share/hhpe-hrg}"
```

## Git fixtures vs runtime

`registry/manifests/function-accounts.yaml` defines **logical account slots** (priorities, capabilities). No secrets, emails, or OAuth IDs. Runtime registration and vault contents live only under `$HHPE_HRG_HOME/function-control/`.

## Acceptance commands

```bash
npm run test:function
npm run validate   # HHPE_HRG_HOME unset → catalog from checkout
npm test           # canonical: see closeout report
```

## Deferred (Milestone 2)

See closeout report § Milestone 2 decomposition.
