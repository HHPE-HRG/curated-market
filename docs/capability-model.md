# Capability model

Capabilities have a canonical ID, type, package, source path, containment result, dependencies, owner, ADR, and exposures. Supported types are skill, plugin, command, agent, hook, policy, reference, script, MCP server, executable, configuration, and generated state. `self_contained: false` is the safe default until dependency and parity evidence proves otherwise.
