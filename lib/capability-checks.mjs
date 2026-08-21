#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {ROOT} from './registry.mjs';
import {staticIntegrity} from './skills-ci.mjs';
import {attachReadiness,ephemeralLocalContext,observeToolVersion,resolveExecutable} from './tool-contracts.mjs';

const manifests = path.join(ROOT, 'registry/manifests');
const read = name => JSON.parse(fs.readFileSync(path.join(manifests, name), 'utf8'));
const now = () => new Date().toISOString();
const run = (command, args, options = {}) => spawnSync(command, args, {encoding: 'utf8', timeout: options.timeout ?? 15000, cwd: options.cwd, env: {...process.env, ...(options.env || {})}});
const packages = () => read('packages.lock.yaml').packages;
const capabilities = () => read('capabilities.yaml').capabilities;
const packageFor = id => packages().find(item => item.package_id === id);
const sourceFor = cap => path.join(ROOT, packageFor(cap.package_id).package_root, cap.source_path);
const reportRoot = path.join(ROOT, 'reports', 'capability-checks');
const write = (name, value) => { fs.mkdirSync(reportRoot, {recursive: true}); fs.writeFileSync(path.join(reportRoot, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`); };
const result = (name, status, evidence, extra = {}) => ({check: name, result: status, generated_at: now(), evidence, ...extra});
const legacyPolicies={
  'ast-grep-runtime':{provenance:{strength:'approved-external-coordinate'},commands:['ast-grep','sg'],discovery:{method:'path',required:['ast-grep'],aliases:['sg']},version_probe:{parser:'ast-grep-semver',command:'ast-grep',args:['--version'],requirement:'0.43.0'},readiness_probe:'ast-grep-structural-fixture',provisioning:{execution:'manual-only'}},
  'serena-runtime':{provenance:{strength:'approved-external-coordinate'},commands:['serena'],discovery:{method:'path',required:['serena'],aliases:[]},version_probe:{parser:'serena-semver',command:'serena',args:['--version'],requirement:'1.5.3'},readiness_probe:'serena-project-activation',provisioning:{execution:'manual-only'}},
  'context7-runtime':{provenance:{strength:'approved-external-coordinate'},commands:['ctx7'],discovery:{method:'path',required:['ctx7'],aliases:[]},version_probe:{parser:'context7-semver',command:'ctx7',args:['--version'],requirement:'0.5.4'},readiness_probe:'context7-live-lookup',provisioning:{execution:'manual-only'}},
  'playwright-cli-runtime':{provenance:{strength:'approved-external-coordinate'},commands:['playwright-cli'],discovery:{method:'path',required:['playwright-cli'],aliases:[]},version_probe:{parser:'playwright-cli-semver',command:'playwright-cli',args:['--version'],requirement:'0.1.17'},readiness_probe:'playwright-layered-readiness',provisioning:{execution:'manual-only'}}
};
const toolSpec=id=>{const tool=read('tools.yaml').tools.find(item=>item.tool_id===id);return tool&&tool.version_probe?tool:tool?{tool_id:tool.tool_id,capability_id:tool.capability_id,version:tool.version,source:tool.source,...legacyPolicies[id]}:null;};
const semver=text=>text.match(/(?:^|\s)(\d+\.\d+\.\d+)(?:\s|$)/)?.[1]??null;
const observeVersion=(id,options={})=>{const spec=toolSpec(id);if(!spec)throw new Error(`tool is absent from tools manifest: ${id}`);const context=options.context||ephemeralLocalContext();return {spec,observation:observeToolVersion(spec,{context,now:options.now||now,resolve:options.resolve||(command=>resolveExecutable(command,{env:options.env})),run:options.run||run,parseVersion:options.parseVersion||((stdout,stderr)=>semver(`${stdout}\n${stderr}`)),compareVersion:(observed,required)=>observed===required})};};

export function evaluateAstGrep(requirement,observation){
  const versionReady=observation.discovery.outcome==='present'&&observation.version.outcome==='compatible';
  const readinessRequired=requirement==='structural-refactor';
  const satisfied=versionReady&&(!readinessRequired||observation.readiness.outcome==='satisfied');
  return {requirement,satisfied,result:satisfied?'PASS':'FAIL_TOOL_RUNTIME',evidence:satisfied?`${requirement} satisfied`:`${requirement} not satisfied`,observed_at:observation.observed_at};
}

export function projectLegacyResult(check,observation,evaluation){
  if(evaluation.observed_at!==observation.observed_at)throw new Error('evaluation does not apply to observation');
  return {check,result:evaluation.result,generated_at:observation.observed_at,evidence:evaluation.evidence,tool_observation:observation};
}

export function checkAstGrep(options={}){
  const {observation:version}=observeVersion('ast-grep-runtime',options);let observation=version;
  if(version.discovery.outcome==='present'&&version.version.outcome==='compatible'){
    const probe=(options.run||run)(version.discovery.executable,['run','-p','console.log($A)','-l','js','--stdin'],{input:'console.log(1);'});
    observation=attachReadiness(version,probe.status===0?{outcome:'satisfied',probe:'ast-grep-structural-fixture',exit_code:probe.status,stdout:probe.stdout??'',stderr:probe.stderr??''}:{outcome:'failed',probe:'ast-grep-structural-fixture',exit_code:probe.status,stdout:probe.stdout??'',stderr:probe.stderr??''});
  }
  const evaluation=evaluateAstGrep('structural-refactor',observation);const value=projectLegacyResult('ast-grep',observation,evaluation);
  if(options.writeReport)options.writeReport('ast-grep',value);
  return value;
}

export function checkStatic() {
  const value = staticIntegrity();
  write('static', value);
  return result('static', value.status === 'PASS' ? 'PASS' : 'FAIL_STATIC_INTEGRITY', value.errors?.length ? value.errors : `validated ${value.counts.capabilities} capabilities`, {counts: value.counts, errors: value.errors});
}

export function evaluateToolRequirement(requirement,observation){
  const versionReady=observation.discovery.outcome==='present'&&observation.version.outcome==='compatible';
  const cliOnly=requirement==='cli-inspection';
  const satisfied=versionReady&&(cliOnly||observation.readiness.outcome==='satisfied');
  return {requirement,satisfied,result:satisfied?'PASS':'FAIL_TOOL_RUNTIME',evidence:satisfied?`${requirement} satisfied`:`${requirement} not satisfied`,observed_at:observation.observed_at};
}

const completeCheck=(name,toolId,requirement,options,readiness)=>{
  const {observation:version}=observeVersion(toolId,options);const observation=version.discovery.outcome==='present'&&version.version.outcome==='compatible'?attachReadiness(version,readiness(version)):version;
  const value=projectLegacyResult(name,observation,evaluateToolRequirement(requirement,observation));if(options.writeReport)options.writeReport(name,value);return value;
};

const defaultSerenaActivation=({discovery},options)=>{
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'hhpe-serena-check-'));const home=path.join(fixture,'home');fs.mkdirSync(path.join(fixture,'src'),{recursive:true});fs.mkdirSync(home);fs.writeFileSync(path.join(fixture,'src/symbols.ts'),'export interface Cache { key: string }\n');
  try{const probe=(options.run||run)(discovery.executable,['project','create',fixture,'--language','typescript'],{timeout:15000,env:{HOME:home,XDG_CONFIG_HOME:path.join(home,'.config')}});const configured=fs.existsSync(path.join(fixture,'.serena/project.yml'));return {outcome:probe.status===0&&configured?'satisfied':'failed',probe:'serena-project-activation',project_configuration:configured,exit_code:probe.status,stdout:probe.stdout??'',stderr:probe.stderr??''};}finally{fs.rmSync(fixture,{recursive:true,force:true});}
};

export function checkSerena(options={}){
  return completeCheck('serena','serena-runtime','project-semantic-readiness',options,observation=>(options.activateProject||((value)=>defaultSerenaActivation(value,options)))(observation));
}

const defaultContext7Lookup=({discovery},options)=>{const probe=(options.run||run)(discovery.executable,['library','react','useEffect','--json'],{timeout:20000});const text=`${probe.stdout??''}\n${probe.stderr??''}`;if(probe.status===0)return {outcome:'satisfied',probe:'context7-live-lookup',exit_code:probe.status,stdout:probe.stdout??'',stderr:probe.stderr??''};if(/(fetch failed|auth|login|network|connect|401|403|429)/i.test(text))return {outcome:'blocked',probe:'context7-live-lookup',reason:'documentation service/network authentication unavailable',exit_code:probe.status,stdout:probe.stdout??'',stderr:probe.stderr??''};return {outcome:'failed',probe:'context7-live-lookup',exit_code:probe.status,stdout:probe.stdout??'',stderr:probe.stderr??''};};

export function checkContext7(options={}){
  return completeCheck('context7','context7-runtime','live-lookup',options,observation=>(options.lookupService||((value)=>defaultContext7Lookup(value,options)))(observation));
}

export function checkSpecialists() {
  const expected = ['trailofbits/dimensional-analysis', 'trailofbits/property-based-testing', 'trailofbits/differential-review', 'trailofbits/supply-chain-risk-auditor', 'trailofbits/rust-review', 'trailofbits/c-review', 'trailofbits/sharp-edges', 'trailofbits/static-analysis/codeql', 'trailofbits/static-analysis/semgrep', 'trailofbits/static-analysis/sarif-parsing'];
  const missing = expected.filter(id => { const cap = capabilities().find(item => item.capability_id === id); return !cap || !fs.existsSync(path.join(sourceFor(cap), 'SKILL.md')); });
  const value = result('specialists', missing.length ? 'FAIL_STATIC_INTEGRITY' : 'PASS', missing.length ? `missing: ${missing.join(', ')}` : `validated ${expected.length} Trail of Bits specialist skills`, {expected, missing});
  write('specialists', value); return value;
}

export function checkPlaywright(options={}){
  return completeCheck('playwright','playwright-cli-runtime','browser-execution',options,()=>{
    const generated=(options.inspectSkillMaterial||(()=>({outcome:'not-observed',reason:'no bounded generated-material probe'})))();
    const browser=(options.inspectBrowserRuntime||(()=>({outcome:'not-observed',reason:'no bounded browser/daemon probe'})))();
    return {outcome:generated.outcome==='satisfied'&&browser.outcome==='satisfied'?'satisfied':generated.outcome==='failed'||browser.outcome==='failed'?'failed':'blocked',probe:'playwright-layered-readiness',generated_material:generated,browser_runtime:browser,reason:browser.reason||generated.reason};
  });
}

export function checkSessionStart() {
  const cap = capabilities().find(item => item.capability_id === 'hhpe-hrg/session-start');
  const file = cap && path.join(sourceFor(cap), 'SKILL.md'); const text = file && fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const fields = ['Repository:', 'Branch:', 'Working tree:', 'CE state:', 'Current unit:', 'Task state:', 'Serena:', 'Required tools:', 'Protected paths:', 'Concurrent changes:', 'Blockers:', 'Recommended next action:'];
  const missing = fields.filter(field => !text.includes(field));
  const value = result('session-start', cap && !missing.length && /do not .*modify files/i.test(text) ? 'PASS' : 'FAIL_STATIC_INTEGRITY', missing.length ? `missing fields: ${missing.join(', ')}` : 'read-only hydration contract present', {missing});
  write('session-start', value); return value;
}

export function checkRouting() {
  const stack = read('final-stack.yaml');
  const expected = ['hhpe-hrg/serena-guidance', 'hhpe-hrg/context7-guidance', 'hhpe-hrg/playwright-guidance', 'trailofbits/dimensional-analysis', 'trailofbits/property-based-testing', 'trailofbits/differential-review', 'trailofbits/supply-chain-risk-auditor', 'trailofbits/rust-review', 'trailofbits/c-review', 'trailofbits/sharp-edges'];
  const missing = expected.filter(id => !Object.values(stack.specialist_routing || {}).includes(id));
  const fixtures = stack.natural_language_routing_fixtures || [];
  const fixtureErrors = [];
  for (const fixture of fixtures) {
    if (!fixture.id || !fixture.primary_lifecycle || !Array.isArray(fixture.specialists) || !fixture.specialists.length) fixtureErrors.push(`${fixture.id || 'unknown'}: incomplete fixture`);
    if (fixture.must_not_require_skill_names !== true) fixtureErrors.push(`${fixture.id}: must_not_require_skill_names must be true`);
    for (const specialist of fixture.specialists || []) {
      const known = Object.values(stack.specialist_routing || {}).includes(specialist)
        || (stack.superpowers?.retained_support || []).includes(specialist)
        || specialist.startsWith('compound-engineering/')
        || specialist.startsWith('hhpe-hrg/');
      if (!known && !capabilities().some(item => item.capability_id === specialist)) fixtureErrors.push(`${fixture.id}: unknown specialist ${specialist}`);
    }
  }
  const lifecycleOk = Boolean(stack.task_language_lifecycle_routing?.implement && stack.task_language_lifecycle_routing?.review);
  const policyOk = typeof stack.automatic_selection_policy === 'string' && /Compound Engineering is the primary engineering lifecycle/.test(stack.automatic_selection_policy);
  const pass = stack.lifecycle_owner === 'compound-engineering' && stack.specialists_are_task_triggered && !missing.length && fixtures.length >= 7 && !fixtureErrors.length && lifecycleOk && policyOk;
  const value = result('routing', pass ? 'PASS' : 'FAIL_CE_PRECEDENCE', fixtureErrors.length ? fixtureErrors.join('; ') : missing.length ? `missing routes: ${missing.join(', ')}` : `CE lifecycle and ${fixtures.length} natural-language routing fixtures agree`, {missing, fixtureErrors, lifecycle_owner: stack.lifecycle_owner, fixtures: fixtures.map(item => item.id)});
  write('routing', value); return value;
}

export function checkCapabilities() {
  const checks = [checkStatic(), checkAstGrep({writeReport:write}), checkSerena({writeReport:write}), checkContext7({writeReport:write}), checkSpecialists(), checkPlaywright({writeReport:write}), checkSessionStart(), checkRouting()];
  const failing = checks.filter(item => /^FAIL_/.test(item.result));
  const value = {generated_at: now(), status: failing.length ? 'FAIL' : 'PASS_WITH_DOCUMENTED_LIMITATIONS', checks};
  write('summary', value); return value;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || 'all';
  const values = {static: checkStatic, 'ast-grep':()=>checkAstGrep({writeReport:write}), serena:()=>checkSerena({writeReport:write}), context7:()=>checkContext7({writeReport:write}), specialists: checkSpecialists, playwright:()=>checkPlaywright({writeReport:write}), 'session-start': checkSessionStart, routing: checkRouting, capabilities: checkCapabilities, all: checkCapabilities};
  const value = values[command]?.() || result(command, 'NOT_APPLICABLE', 'unknown check; use static, serena, context7, specialists, playwright, session-start, routing, capabilities, or all');
  console.log(JSON.stringify(value, null, 2));
  if (value.result?.startsWith('FAIL') || value.status === 'FAIL') process.exitCode = 1;
}
