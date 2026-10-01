---
name: original-source-research
argument-hint: "[package, repo, or claim to source]"
description: >-
  Original-source research. Use when looking up packages, libraries, engines,
  tools, or internet sources for how to install or apply them; when choosing
  GitHub, npm, PyPI, crates.io, Maven, NuGet, or official project sites; when
  X/Twitter or breaking-news posts appear; when search results mix first-party
  docs with tabloids, listicles, or outlets that treat social posts as citations.
---

# Original Source Research

<!--
Agent context: This skill is the sourcing policy for third-party artifacts and
docs. Intended function: build foundation knowledge only from first-party
origins (VCS, official site, registry/package), and treat social posts as
impulse pointers that must be corroborated. Observed failure if skipped:
agents quote aggregators that recap tweets as if they were documentation.
-->

## Overview

Foundation knowledge comes from **original producers**: the canonical repository, the official product or docs site, and the published distribution (registry listing plus the package itself). Social networks are **impulse identifiers** only. Tabloid and click-through outlets are never sources, even when they embed a post from X or Twitter.

## When to Use

- Installing, enabling, configuring, or explaining a third-party artifact
- Choosing between search hits for a library, engine, SDK, or CLI
- A claim originated on X/Twitter, Hacker News, or similar
- Results include “X user says”, “according to a tweet”, or unattributed “reports”

**When not to use:** wholly internal code with no external dependency or public claim.

## Source classes

<!--
Agent context: Do not collapse these classes. A README on GitHub is not a
substitute for host-platform usage docs, and a registry README is not a
substitute for the repo's release tags. Fetch each class that exists.
-->

Treat every artifact as potentially **multi-surface**. Always attempt all three foundation surfaces, even when one URL redirects to another:

| Class | What it is for | Typical URLs |
|---|---|---|
| **Canonical repository** | Source of truth for code, tags, releases, issues, internals, contributing | GitHub / GitLab / Codeberg of the **owning org**, not a fork |
| **Official site** | Intended use, how to apply it, getting started, product constraints | Project domain, `docs.*`, host-framework docs that officially ship the item |
| **Distribution** | What you actually install: name, version, peers, provenance | npm, PyPI, crates.io, Maven Central, NuGet, Go modules, GitHub Releases, Homebrew, etc. |

**Dual-surface rule:** If a project has both a repository and a website (or host-platform docs), **read both**. The repo holds the artifact and engineering record. The site (or first-party host docs) holds intended use and application. Do not pick one and skip the other.

**Registry + package rule:** The registry page and the published package (README, `package.json` / metadata, bundled docs) are first-party. Prefer the version you will install, not an unrelated major.

**Generic shape (do not copy these names as required sources):** an engine or library often has (1) a VCS repo with source and releases, (2) a product or host-framework site that explains when and how to enable it in an app, (3) a registry package for the prebuilt artifact. Foundation requires all three classes that exist.

## Whitelist (foundation)

Use these, in this order, when building how-to knowledge:

1. Official product / documentation site of the producing org or project
2. Canonical VCS of the producing org (not random forks; prefer the repo the registry points at)
3. Official distribution: registry entry, release assets, and the package tarball/wheel you install
4. First-party **host** docs when the item is consumed through a platform (framework, cloud, language) that documents the integration
5. Language/spec/RFC/standards documents when the claim is about the language or protocol
6. Official engineering blog of the **same org** as secondary first-party (after 1–4, never instead of them)

Prefer pages the producer controls. Registry “Website” / “Repository” / “Homepage” fields are the discovery path to (1) and (2).

## Impulse only (not foundation)

<!--
Agent context: Impulse means “something may have changed; go verify.” It does
not mean “cite this.” X/Twitter is useful for cutting-edge use and breaking
product news. It is not useful for teaching default usage.
-->

**X / Twitter (and similar social posts):** allowed **only** to detect impulse — breaking news, a new flag, a maintainer announcement, cutting-edge misuse or adoption. They are not how-to manuals.

Protocol:

1. Record the impulse: who posted, when, and the claim in one sentence.
2. Identify the **concrete artifact** (package name, version, API, flag).
3. **Corroborate** on whitelist surfaces: release notes, official docs, repo commit/tag, registry version.
4. If whitelist sources disagree or are silent, state the gap. Do not teach the tweet as usage.
5. Never cite a tabloid, newsletter farm, or SEO article that merely restates the post.

## Blacklist

Do not use as sources of fact or usage:

- Tabloid, clickbait, and sensational tech-news recap sites
- Articles whose primary evidence is an embedded X/Twitter post
- Content farms, unattributed listicles, “top N libraries” roundups
- Random GitHub forks, unofficial mirrors, and copy-paste gist blogs
- AI-generated aggregator pages with no producer attribution
- Comment sections, Reddit, and forums **as foundation** (they can be impulse, same protocol as X)

**Tabloid test:** if removing the social embed leaves no first-party documentation, the page is not a source. Discard it.

## Workflow

Copy and track:

```
Sourcing:
- [ ] Named the artifact (package / repo / product)
- [ ] Official site or host docs fetched (or documented missing)
- [ ] Canonical repo fetched (or documented missing)
- [ ] Registry + installed version metadata fetched (or N/A)
- [ ] Impulse claims (if any) corroborated on whitelist surfaces
- [ ] No blacklist URLs used as citations
```

**Step 1 — Identify the producer.** Org, project name, package name, and the registry you would install from.

**Step 2 — Resolve origin URLs.** From the registry homepage/repository fields, then from the repo README links. Follow to the official site. If the site is gone or redirects into the repo, still read host-platform docs that officially describe application.

**Step 3 — Split reading by job.**

- *How to apply / intended use* → official site and first-party host docs
- *What to install / which version* → registry and release tags
- *How it is built / constraints / bugs* → canonical repo (docs, issues, design notes)

**Step 4 — Apply impulse filter.** If the user asked because of news or a post, corroborate before changing recommendations.

**Step 5 — Cite.** Link whitelist URLs. If you mention X/Twitter, label it **impulse**, then give the corroborating whitelist link or an explicit “unverified”.

## Output contract

When reporting research, use this shape:

1. **Artifact** — name, registry, version under discussion
2. **Origins used** — site, repo, distribution (URLs)
3. **How to apply** — from official site / host docs
4. **Install/provenance** — from registry/releases
5. **Impulse (optional)** — claim + corroboration or “unverified”
6. **Rejected** — blacklist hits you ignored (names/URLs optional, one line)

## Common mistakes

| Mistake | Fix |
|---|---|
| Using a blog that quotes a tweet as the usage guide | Open official docs + repo + registry; treat the blog as void |
| Reading only GitHub | Also fetch the product/host site for intended use |
| Reading only the marketing site | Also fetch repo releases and the package you install |
| Teaching from X/Twitter | Impulse → corroborate → then teach |
| Citing a popular fork | Use the repo the registry and owning org point to |
| Mixing versions | Align docs, tags, and registry version |

## Red flags — stop and resource

- Answer would cite Medium/Dev.to/news recap as the primary link
- “According to Twitter/X” without a whitelist follow-up
- Single-surface research on a multi-surface project
- Fork URL that is not what `npm` / `pip` / `cargo` / `go` resolve

**All of these mean:** drop blacklist material, fetch the three foundation classes, then answer.

## Additional resources

- Classification details and more registries: [source-classes.md](source-classes.md)
