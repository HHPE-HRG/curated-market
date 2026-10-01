# Source classes (reference)

<!--
Agent context: Heavy lists live here so SKILL.md stays short. Intended
function: classify a URL before quoting it. Observed failure: treating
registry READMEs, GitHub READMEs, and product sites as interchangeable.
-->

## Foundation surfaces

### Canonical repository

**Use for:** source, tags, releases, changelogs, issues, design docs, CI, license.

**Accept:** `github.com/<owner>/<repo>` (or GitLab/Codeberg equivalent) where `<owner>` is the producing org or the maintainer the registry declares.

**Reject:** forks unless the registry `repository` field points there; gist copies; “awesome-*" lists.

### Official site

**Use for:** intended use case, getting started, configuration the producer wants users to follow, product constraints, playgrounds, supported hosts.

**Accept:** apex and `docs.` / `www.` of the project; first-party host-framework documentation that names the artifact as supported (the platform vendor is a producer for *application*, not for the engine's internals).

**If the marketing site was withdrawn and now redirects into the repo:** still search for **host-platform** first-party docs. Application guidance often lives with the framework or cloud that ships the artifact, not only in the engine repo.

### Distribution

**Use for:** installable name, version, provenance, deprecated status, dependency graph.

**Accept (non-exhaustive):**

| Ecosystem | Origin |
|---|---|
| JavaScript/TypeScript | npm (`npmjs.com/package/...`), plus the tarball |
| Python | PyPI |
| Rust | crates.io |
| Go | module proxy / `pkg.go.dev` for the canonical module path |
| Java/Kotlin | Maven Central (or the org's declared repository) |
| .NET | NuGet |
| Ruby | RubyGems |
| PHP | Packagist |
| Native/CLI | GitHub Releases, Homebrew formulae **published by the org**, OS vendor packages |

Registry metadata fields `homepage`, `repository`, `bugs` are **pointers**, not a reason to skip fetching those URLs.

## Impulse surfaces

Allowed only as pointers, never as how-to:

- X / Twitter (prefer official org or named maintainer accounts)
- Conference talks and livestreams (same corroboration rule)
- Issue comments announcing a release (prefer the release tag after)

After impulse: official site, repo release/tag, registry version. No exception for “everyone is talking about it”.

## Blacklist signals

Treat as non-sources when **any** of these hold:

- Headline is emotional or unexplained-superlative (“you won’t believe”, “destroyed”, “secret flag”)
- Body is a paraphrase of one social post plus ads
- No link to producer-controlled docs except the social embed
- Domain is a general news/tabloid property, not the producing org
- Author has no affiliation with the project and cites only social media

Secondary blogs by the **producing org** (engineering.* ) are whitelist class 6 in SKILL.md, not tabloids.

## Citation hygiene

When writing an answer:

- Prefer `https://` URLs of whitelist surfaces
- If an impulse post is mentioned, prefix with `impulse:` and follow with `corroborated:` or `unverified:`
- Do not launder a tweet through a news URL to make it look first-party
