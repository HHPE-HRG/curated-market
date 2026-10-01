/**
 * Agent context: Host skill-creators write output; Market ingest will pull
 * later. Intended: discoverSkillOutput is a reserved no-op. Observed: lookers
 * must not scan this drop into `$`. Do not call from T3 attach.
 */
export function discoverSkillOutput() {
  return [];
}
