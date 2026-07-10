# Package preservation policy

Packages are clean, complete Git checkouts pinned by commit and Git tree. The validator rejects revision, tree, or working-tree drift. No upstream file is edited. HHPE changes live in overlays or reproducible patches. A package may be updated only by staging a new commit directory and preserving the old revision for rollback.
