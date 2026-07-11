# Host support policy

`SUPPORTED_AND_INSTALLED` requires an installed executable, a documented native discovery mechanism, and passing parity evidence. `SUPPORTED_NOT_INSTALLED` is not an implementation blocker. `INSTALLED_PENDING_VALIDATION` means the product exists but a safe noninteractive discovery proof is unavailable. `NOT_APPLICABLE` is used when a requested surface is not a separate installed product.

The registry never replaces a complete host configuration directory. Host adapters may expose individual package-preserving links only after discovery and collision checks pass. Hosts without a headless probe remain retained and are not retired.
