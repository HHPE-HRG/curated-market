# Remote-worker parity

Remote workers must receive the lock, capability, exposure, policy, and tool manifests plus either the pinned package bundle or a read-only package mount. The worker contract rejects missing packages, wrong revisions, unregistered patches, missing tools, and policy mismatch.

Actual remote synchronization was not run because no remote worker endpoint or transport was available. Result: `BLOCKED — external worker target unavailable`. The local runtime and manifests are deterministic and ready for a verified bundle transport.
