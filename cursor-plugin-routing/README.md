# HHPE-HRG Cursor plugin stack

Organization-wide Cursor customization stack maintained in
[`HHPE-HRG/curated-market`](https://github.com/HHPE-HRG/curated-market).
It is not owned by, or coupled to, any HHPE-HRG project repository.

Installs a Cursor-native plugin-routing rule, skill, and hooks:
- Always-applied rule: require plugin routing before plan/execution.
- Generated index: `~/.cursor/hhpe-hrg-plugin-stack/derived/plugin-index.md`
- Optional gating: blocks state-changing shell commands until routing completion is recorded.

## Install (portable across machines)

```sh
mkdir -p ~/.cursor/plugins/local
ln -sfn "$(pwd)/cursor-plugin-routing" ~/.cursor/plugins/local/hhpe-hrg-plugin-stack
```

Restart Cursor (plugin + hooks reload).

