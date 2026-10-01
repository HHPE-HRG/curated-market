/**
 * Agent context: ESM loader that rewrites packaged t3 `dist/bin.mjs`.
 * Intended: wrap getProviders so `$` is Market catalog via
 * attachCursorSkillsToProviders. Observed: Cursor-FS wrap did not change `$`.
 */
import {transformT3BinSource} from './t3-cursor-skills.mjs';

const RUNTIME_HREF = new URL('./t3-cursor-skills.mjs', import.meta.url).href;

function sourceText(source) {
  if (source == null) return '';
  if (typeof source === 'string') return source;
  if (Buffer.isBuffer(source)) return source.toString('utf8');
  if (source instanceof ArrayBuffer) return Buffer.from(source).toString('utf8');
  if (ArrayBuffer.isView(source)) return Buffer.from(source.buffer, source.byteOffset, source.byteLength).toString('utf8');
  return String(source);
}

export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);
  const href = typeof url === 'string' ? url : String(url);
  const pathname = href.split('?')[0];
  if (!pathname.endsWith('/dist/bin.mjs') || !pathname.includes('/t3/')) {
    return result;
  }
  const transformed = transformT3BinSource(sourceText(result.source), RUNTIME_HREF);
  return {
    format: result.format ?? 'module',
    source: transformed,
    shortCircuit: true,
  };
}
