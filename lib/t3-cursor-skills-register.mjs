/**
 * Agent context: Node `--import` entry for t3-server. Intended: wrap
 * getProviders to attach Market catalog. Observed: register() needs href string.
 */
import {register} from 'node:module';

register(new URL('./t3-cursor-skills-loader.mjs', import.meta.url).href, import.meta.url);
