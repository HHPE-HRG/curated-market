# Redis dependency analysis

Redis is a required integration dependency for workflow-protocol and Workroom transport tests, not a registry dependency. The expected local service is container `hhp-local-redis`, published on `127.0.0.1:6379`.

Evidence: `docker exec hhp-local-redis redis-cli ping` returned `PONG`; an ioredis ping from `infrastructure/workflow-protocol` returned `PONG`; the isolated Redis transport suite passed 11/11; the full workflow-protocol build/test passed 5 suites and 49 tests. The earlier failure was environmental service availability/timing. Remediation is `docker start hhp-local-redis` or the stack's Redis startup path. The test topology should report this dependency explicitly rather than as a generic registry failure.
