# Upstream identity audit

Canonical IDs use `package/capability` in the registry. XLOTYL's compatibility API uses `package:capability` as a transport ID and carries the canonical slash ID separately; this is not a source rename. The resolver reads skill frontmatter from the pinned package path and preserves the upstream `name` and `description` metadata. No `hhpe-` prefix is added to a user-facing skill name.

Host transports are documented in `registry/manifests/invocation-transports.yaml`. `/using-superpowers` is not required for native discovery.
