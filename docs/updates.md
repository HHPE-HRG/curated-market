# Updates

`hhpe-registry-update --package <id>` fetches metadata against the pinned checkout. Review source, hook, command, agent, executable, license, and security diffs. Clone the selected exact commit into a new directory, regenerate in staging, validate, run parity tests, commit, and only then atomically change exposures. Never deploy a moving branch.
