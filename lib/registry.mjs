#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {validateToolManifest} from './tool-contracts.mjs';

export const ROOT = path.resolve(process.env.HHPE_HRG_HOME || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const M = path.join(ROOT, 'registry/manifests');
const read = n => JSON.parse(fs.readFileSync(path.join(M, n), 'utf8'));
const write = (p, v) => { fs.mkdirSync(path.dirname(p), {recursive:true}); fs.writeFileSync(p, JSON.stringify(v, null, 2)+'\n'); };
const run = (cmd,args,opts={}) => spawnSync(cmd,args,{encoding:'utf8',...opts});
const now = () => new Date().toISOString();
const exists = p => { try { fs.lstatSync(p); return true; } catch { return false; } };
const real = p => fs.realpathSync.native(p);
const inside = (base, rel) => {
  const candidate = path.resolve(base, rel);
  return candidate === path.resolve(base) || candidate.startsWith(path.resolve(base) + path.sep) ? candidate : null;
};
const fail = m => { throw new Error(m); };
const EXPOSURE_RELATIONSHIPS = new Set([
  'antigravity-ide|skill-symlink|registry/adapters/antigravity-ide',
  'codex|native-plugin|registry/adapters/codex/marketplace',
  'codex|skill-symlink|registry/adapters/codex',
  'cursor|skill-symlink|registry/adapters/cursor',
  'cursor|local-plugin|registry/adapters/cursor',
  'hhpe-hrg|registry-reference|registry/adapters/hhpe-hrg',
  'opencode|skill-symlink|registry/adapters/opencode',
]);
const NATIVE_PLUGIN_TARGET = /^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function packageRoot(pkg){ return path.join(ROOT,pkg.package_root); }
export function validateExposureDeclarations(exposures,capabilityIds){
  const errors=[];
  const CURSOR_SCOPES=new Set(['user-local','project','cloud-project']);
  const CURSOR_ENFORCEMENT=new Set(['guidance','enforceable']);
  const GUIDANCE_MODES=new Set(['skill-symlink','skill','rule','local-plugin']);
  const cursorBindings=new Set();
  const cursorVisibleNames=new Set();
  for(const exposure of exposures){
    if(!capabilityIds.has(exposure.capability_id))errors.push(`exposure unknown capability ${exposure.capability_id}`);
    if(!['planned','active'].includes(exposure.status))errors.push(`unsupported exposure status ${exposure.capability_id}: ${exposure.status}`);
    const relationship=`${exposure.host}|${exposure.mode}|${exposure.adapter}`;
    if(!EXPOSURE_RELATIONSHIPS.has(relationship))errors.push(`invalid exposure relationship ${exposure.capability_id}: ${relationship}`);
    if(typeof exposure.target!=='string'||!exposure.target||exposure.target.includes('..'))errors.push(`unsafe target ${exposure.capability_id}`);
    if(exposure.mode==='native-plugin'&&!NATIVE_PLUGIN_TARGET.test(exposure.target||''))errors.push(`unsafe native-plugin target ${exposure.capability_id}: ${exposure.target}`);
    if(exposure.host==='cursor'){
      if(!CURSOR_SCOPES.has(exposure.scope))errors.push(`unsupported Cursor scope ${exposure.capability_id}: ${exposure.scope}`);
      if(!CURSOR_ENFORCEMENT.has(exposure.enforcement))errors.push(`unsupported Cursor enforcement ${exposure.capability_id}: ${exposure.enforcement}`);
      if(GUIDANCE_MODES.has(exposure.mode)&&exposure.enforcement==='enforceable'){
        errors.push(`unsupported enforcement ${exposure.capability_id}: ${exposure.mode} cannot be enforceable`);
      }
      const target=exposure.target||'';
      if(target.includes('skills-cursor')||/^(?:\/|\\\\|[A-Za-z]:\\)/.test(target)){
        errors.push(`unsafe target ${exposure.capability_id}`);
      }
      if(exposure.scope==='user-local'&&!target.startsWith('~/.cursor/'))errors.push(`illegal scope/target ${exposure.capability_id}`);
      if(exposure.scope==='project'&&!target.startsWith('.cursor/'))errors.push(`illegal scope/target ${exposure.capability_id}`);
      if(exposure.scope==='cloud-project'&&!target.startsWith('.cursor/'))errors.push(`illegal scope/target ${exposure.capability_id}`);
      const binding=`${exposure.host}|${exposure.capability_id}|${exposure.scope}|${exposure.target}`;
      if(cursorBindings.has(binding))errors.push(`duplicate Cursor binding ${exposure.capability_id}`);
      else cursorBindings.add(binding);
      if(exposure.cursor_visible_name){
        const visible=`${exposure.host}|${exposure.scope}|${exposure.cursor_visible_name}`;
        if(cursorVisibleNames.has(visible))errors.push(`ambiguous Cursor-visible name ${exposure.cursor_visible_name}`);
        else cursorVisibleNames.add(visible);
      }
    }
  }
  return errors;
}
const boundOutput=text=>{
  const value=String(text||'');
  return value.length<=16384?value:`${value.slice(0,16384)}\n<truncated>`;
};
export function parseCodexPluginInventory(text){
  try{
    const value=JSON.parse(String(text));
    if(!Array.isArray(value?.installed))return null;
    if(value.installed.some(item=>!item||typeof item.pluginId!=='string'||item.installed!==true))return null;
    return [...new Set(value.installed.map(item=>item.pluginId))];
  }catch{return null;}
}
export function probeCodexPluginInventory(){
  const process=run('codex',['plugin','list','--json']);
  const parsed=process.error||process.status!==0?null:parseCodexPluginInventory(process.stdout);
  const stdout=boundOutput(process.stdout);
  const stderr=boundOutput(process.stderr||process.error?.message);
  const available=!process.error;
  const usable=parsed!==null;
  return {command:['codex','plugin','list','--json'],available,exit_status:process.status,stdout,stderr,usable,installed_targets:parsed||[]};
}
export function validateHostRealization({host,context,requiredPlannedTargets=[],inventoryProbe=probeCodexPluginInventory,exposures=read('exposures.yaml').exposures}={}){
  if(!host)fail('host is required');
  if(host!=='codex')fail(`unsupported host: ${host}`);
  if(typeof context!=='string'||!context.trim())fail('context is required');
  if(!Array.isArray(requiredPlannedTargets)||requiredPlannedTargets.some(target=>!NATIVE_PLUGIN_TARGET.test(target)))fail('invalid required planned target');
  const plannedTargets=[...new Set(requiredPlannedTargets)];
  const applicable=exposures.filter(exposure=>exposure.host===host&&exposure.mode==='native-plugin');
  for(const target of plannedTargets){
    if(!applicable.some(exposure=>exposure.status==='planned'&&exposure.target===target))fail(`no matching planned declaration: ${target}`);
  }
  const requiredTargets=new Set(applicable.filter(exposure=>exposure.status==='active'||(exposure.status==='planned'&&plannedTargets.includes(exposure.target))).map(exposure=>exposure.target));
  if(!requiredTargets.size)return {category:'host-realization',status:'passed',host,context,probe:null,observations:[]};
  const rawProbe=inventoryProbe();
  const probe={...rawProbe,stdout:boundOutput(rawProbe.stdout),stderr:boundOutput(rawProbe.stderr)};
  const installed=new Set(probe.installed_targets||[]);
  const groups=new Map();
  for(const item of applicable.filter(exposure=>requiredTargets.has(exposure.target))){
    if(!groups.has(item.target))groups.set(item.target,[]);
    groups.get(item.target).push(item);
  }
  const observations=[...groups.entries()].sort(([left],[right])=>left.localeCompare(right)).map(([target,items])=>{
    const outcome=!probe.usable?'indeterminate':installed.has(target)?'installed':'absent';
    const sorted=[...items].sort((left,right)=>left.capability_id.localeCompare(right.capability_id));
    return {
      target,
      outcome,
      affected_capability_ids:sorted.map(item=>item.capability_id),
      evaluations:sorted.map(item=>{
        const required=item.status==='active'||plannedTargets.includes(item.target);
        return {
          capability_id:item.capability_id,
          exposure_status:item.status,
          applicable:true,
          required,
          requirement_source:required?(item.status==='active'?'active':'explicit-planned'):null,
          satisfied:required?outcome==='installed':null,
        };
      }),
    };
  });
  const status=observations.every(observation=>observation.evaluations.filter(evaluation=>evaluation.required).every(evaluation=>evaluation.satisfied))?'passed':'failed';
  return {category:'host-realization',status,host,context,probe,observations};
}
export function validateManagedToolLinks(records,tools,registryRoot=ROOT){
  const errors=[];const toolIds=new Set(tools.map(tool=>tool.tool_id));
  for(const object of records){
    if(object.classification!=='created_by_hhpe'||object.kind!=='symlink'||!exists(object.path))continue;
    if(!fs.lstatSync(object.path).isSymbolicLink()){errors.push(`managed link replaced ${object.path}`);continue;}
    try{
      const target=real(object.path);
      if(!object.source||target!==real(object.source)){errors.push(`managed link retargeted ${object.path}`);continue;}
      if(!target.startsWith(path.resolve(registryRoot)+path.sep)&&(!object.tool_id||!toolIds.has(object.tool_id)))errors.push(`managed external link lacks tool identity ${object.path}`);
    }catch{errors.push(`managed link is broken ${object.path}`);}
  }
  return errors;
}
export function discover(){
  const commands=['claude','codex','cursor','antigravity','opencode','ast-grep'];
  const hosts=commands.map(name=>{
    const which=run('bash',['-lc',`command -v ${name}`]);
    const executable=which.status===0?which.stdout.trim():null;
    let version=null;
    if(executable && name!=='antigravity'){
      const v=run(executable,['--version'],{timeout:5000}); version=(v.stdout||v.stderr||'').trim().split('\n')[0]||null;
    }
    return {host:name,executable,version,status:executable?'installed':'not-found'};
  });
  const report={generated_at:now(),platform:{os:os.platform(),release:os.release(),arch:os.arch(),home:os.homedir()},hosts};
  write(path.join(ROOT,'reports/discovery.json'),report); return report;
}

export function validate(){
  const packages=read('packages.lock.yaml').packages;
  const capabilities=read('capabilities.yaml').capabilities;
  const exposures=read('exposures.yaml').exposures;
  const finalStack=fs.existsSync(path.join(M,'final-stack.yaml'))?read('final-stack.yaml'):null;
  const errors=[],warnings=[];
  const ids=new Set();
  for(const p of packages){
    const root=packageRoot(p);
    if(!exists(root)){errors.push(`missing package ${p.package_id}`);continue;}
    if(p.revision.type==='overlay') continue;
    const head=run('git',['-C',root,'rev-parse','HEAD']);
    const tree=run('git',['-C',root,'rev-parse','HEAD^{tree}']);
    if(head.status||head.stdout.trim()!==p.revision.value) errors.push(`revision mismatch ${p.package_id}`);
    if(tree.status||tree.stdout.trim()!==p.integrity.git_tree) errors.push(`tree mismatch ${p.package_id}`);
    const dirty=run('git',['-C',root,'status','--porcelain']);
    if(dirty.stdout.trim()) errors.push(`modified package ${p.package_id}`);
    if(!exists(path.join(root,p.license.path))) errors.push(`missing license ${p.package_id}`);
  }
  for(const c of capabilities){
    if(ids.has(c.capability_id)) errors.push(`duplicate capability ${c.capability_id}`); ids.add(c.capability_id);
    const p=packages.find(x=>x.package_id===c.package_id);
    if(!p){errors.push(`unknown package for ${c.capability_id}`);continue;}
    const packageDir=packageRoot(p);
    const src=inside(packageDir,c.source_path);
    if(!src){errors.push(`unsafe source ${c.capability_id}: ${c.source_path}`);continue;}
    if(!exists(src)) errors.push(`missing source ${c.capability_id}: ${c.source_path}`);
    if(c.type==='skill'){
      const skillFile=inside(src,'SKILL.md');
      if(!skillFile||!exists(skillFile)) errors.push(`missing SKILL.md ${c.capability_id}`);
      else if(!fs.readFileSync(skillFile,'utf8').trimStart().startsWith('---')) errors.push(`invalid frontmatter ${c.capability_id}`);
    }
    for(const field of ['files','scripts','hooks','agents','mcp_servers']) for(const rel of c.requires?.[field]||[]){
      const dependency=inside(packageDir,rel);
      if(!dependency||!exists(dependency)) errors.push(`missing dependency ${c.capability_id}: ${rel}`);
    }
  }
  errors.push(...validateExposureDeclarations(exposures,ids));
  if(!finalStack) warnings.push('missing final-stack.yaml; CE/Superpowers precedence is not enforceable');
  else {
    if(finalStack.lifecycle_owner!=='compound-engineering') errors.push('lifecycle owner is not compound-engineering');
    if(finalStack.superpowers?.bootstrap!==false) errors.push('Superpowers bootstrap is not disabled');
    const inactive=new Set(finalStack.superpowers?.inactive||[]);
    const retained=new Set(finalStack.superpowers?.retained_support||[]);
    for(const id of inactive) if(retained.has(id)) errors.push(`Superpowers capability both inactive and retained: ${id}`);
    for(const id of inactive) if(!ids.has(id)) warnings.push(`inactive capability is not indexed: ${id}`);
    for(const e of exposures) if(inactive.has(e.capability_id)) errors.push(`inactive capability exposed: ${e.capability_id}`);
  }
  const toolManifest=read('tools.yaml');
  errors.push(...validateToolManifest(toolManifest,ids));
  const state=read('migration-state.yaml');
  errors.push(...validateManagedToolLinks(state.managed_objects||[],toolManifest.tools||[]));
  const result={generated_at:now(),status:errors.length?'failed':'passed',errors,warnings,counts:{packages:packages.length,capabilities:capabilities.length,exposures:exposures.length},policy:{lifecycle_owner:finalStack?.lifecycle_owner??null,superpowers_bootstrap:finalStack?.superpowers?.bootstrap??null}};
  write(path.join(ROOT,'reports/validation.json'),result); return result;
}

function resolveExposureTarget(exposure, {home, projectRoot}) {
  if (exposure.host === 'cursor' && exposure.scope === 'cloud-project') {
    return {skip: 'cloud-project-not-implemented'};
  }
  if (exposure.host === 'cursor' && exposure.scope === 'project') {
    if (!projectRoot) return {skip: 'projectRoot-required'};
    return {target: path.join(projectRoot, exposure.target)};
  }
  return {target: exposure.target.replace(/^~(?=\/)/, home)};
}

export function sync({apply=false,host=null,home=os.homedir(),projectRoot=null}={}){
  const packages=read('packages.lock.yaml').packages;
  const caps=read('capabilities.yaml').capabilities;
  const exps=read('exposures.yaml').exposures.filter(e=>!host||e.host===host);
  const state=read('migration-state.yaml'); const actions=[];
  for(const e of exps){
    const c=caps.find(x=>x.capability_id===e.capability_id); const p=packages.find(x=>x.package_id===c.package_id);
    if(e.mode==='registry-reference'){actions.push({action:'REGISTER',source:path.join(packageRoot(p),c.source_path),target:e.target||`registry:${e.capability_id}`,reason:'canonical registry capability reference',rollback:'remove registry reference'});continue;}
    if(e.mode==='native-plugin'){actions.push({action:'REGISTER',source:path.join(packageRoot(p),c.source_path),target:e.target,reason:'use host-native plugin command',rollback:`remove plugin ${e.target}`});continue;}
    const source=path.join(packageRoot(p),c.source_path);
    const resolved=resolveExposureTarget(e,{home,projectRoot});
    if(resolved.skip){actions.push({action:'SKIP',source,target:e.target,reason:resolved.skip});continue;}
    const target=resolved.target;
    if(exists(target)){
      if(fs.lstatSync(target).isSymbolicLink()&&real(target)===real(source)) actions.push({action:'SKIP',source,target,reason:'already-linked'});
      else actions.push({action:'COLLISION',source,target,reason:'preexisting'});
      continue;
    }
    actions.push({action:'LINK',source,target,rollback:`remove link ${target}`});
    if(apply){ fs.mkdirSync(path.dirname(target),{recursive:true}); fs.symlinkSync(source,target,'dir'); state.managed_objects.push({path:target,kind:'symlink',classification:'created_by_hhpe',source,capability_id:e.capability_id,host:e.host,scope:e.scope,created_at:now()}); }
  }
  if(apply){state.updated_at=now();write(path.join(M,'migration-state.yaml'),state);}
  const result={generated_at:now(),mode:apply?'apply':'dry-run',actions}; write(path.join(ROOT,'reports/sync-plan.json'),result); return result;
}

export function rollback({apply=false}={}){
  const state=read('migration-state.yaml'); const actions=[]; let remaining=[];
  const order=o=>o.kind==='codex-plugin'?0:o.kind==='codex-marketplace'?2:1;
  for(const o of [...(state.managed_objects||[])].sort((a,b)=>order(a)-order(b))){
    if(o.classification!=='created_by_hhpe'){remaining.push(o);continue;}
    if(o.kind==='symlink'){
      if(!exists(o.path)){actions.push({action:'SKIP',path:o.path,reason:'absent'});continue;}
      if(!fs.lstatSync(o.path).isSymbolicLink()){actions.push({action:'REFUSE',path:o.path,reason:'no longer symlink'});remaining.push(o);continue;}
      if(!o.source||real(o.path)!==real(o.source)){actions.push({action:'REFUSE',path:o.path,reason:'symlink target changed'});remaining.push(o);continue;}
      actions.push({action:'UNLINK',path:o.path}); if(apply) fs.unlinkSync(o.path); else remaining.push(o);
    }else if(o.kind==='codex-plugin'){
      actions.push({action:'REMOVE_PLUGIN',path:o.path});if(apply){const r=run('codex',['plugin','remove',o.path,'--json']);if(r.status){actions.at(-1).action='REFUSE';actions.at(-1).reason=(r.stderr||r.stdout).trim();remaining.push(o);}}else remaining.push(o);
    }else if(o.kind==='codex-marketplace'){
      actions.push({action:'REMOVE_MARKETPLACE',path:o.path});if(apply){const r=run('codex',['plugin','marketplace','remove',o.path]);if(r.status){actions.at(-1).action='REFUSE';actions.at(-1).reason=(r.stderr||r.stdout).trim();remaining.push(o);}}else remaining.push(o);
    }else{
      actions.push({action:'PRESERVE',path:o.path,reason:o.classification});remaining.push(o);
    }
  }
  if(apply){state.managed_objects=remaining;state.updated_at=now();write(path.join(M,'migration-state.yaml'),state);}
  const result={generated_at:now(),mode:apply?'apply':'dry-run',actions};write(path.join(ROOT,'reports/rollback.json'),result);return result;
}

export function status(){const v=validate();const s=read('migration-state.yaml');const f=fs.existsSync(path.join(M,'final-stack.yaml'))?read('final-stack.yaml'):{};const h=fs.existsSync(path.join(M,'hosts.yaml'))?read('hosts.yaml'):{};return {root:ROOT,validation:v.status,phase:s.phase,managed_objects:s.managed_objects.length,limitations:s.limitations,hhpe_runtime_binding:{root:ROOT,policy_manifest:fs.existsSync(path.join(M,'final-stack.yaml'))?'registry/manifests/final-stack.yaml':null},ce_lifecycle_owner:f.lifecycle_owner??null,superpowers_bootstrap:f.superpowers?.bootstrap??null,retained_superpowers:f.superpowers?.retained_support??[],inactive_superpowers:f.superpowers?.inactive??[],host_support:(h.hosts||[]).map(x=>({host_id:x.host_id??x.id,support_state:x.support_state??x.status,result:x.result??null,installed:x.installed??null})),container_parity:'BLOCKED_BY_UNAVAILABLE_TEST_TARGET',remote_parity:'BLOCKED_BY_UNAVAILABLE_TEST_TARGET',strict_wrapper_verification:'BLOCKED_BY_UNRELATED_TOPOLOGY_APPLICATION_CHECKS'};}
export function diff(){const r=[];for(const p of read('packages.lock.yaml').packages){if(p.revision.type==='overlay'){r.push({package:p.package_id,revision:p.revision.value,changes:null});continue;}const root=packageRoot(p);const x=run('git',['-C',root,'status','--short']);r.push({package:p.package_id,revision:p.revision.value,changes:x.stdout.trim()||null});}return r;}
export function update(args=[]){
  if(args.includes('--rollback')) return rollback({apply:args.includes('--apply')});
  const selected=(args.includes('--all')||args.includes('--check'))?read('packages.lock.yaml').packages.map(p=>p.package_id):[args[args.indexOf('--package')+1]].filter(Boolean);
  if(!selected.length) return {mode:'check',message:'use --package <id> or --all; activation is never from a moving branch'};
  return {mode:'check',packages:selected.map(id=>{const p=read('packages.lock.yaml').packages.find(x=>x.package_id===id);if(!p)return {package:id,error:'unknown'};if(p.revision.type==='overlay')return {package:id,pinned:p.revision.value,source:'local overlay'};const f=run('git',['ls-remote','--heads','--tags',p.repository],{timeout:15000});return {package:id,pinned:p.revision.value,fetch_status:f.status,remote_refs:f.status?null:f.stdout.trim().split('\n').length,output:f.status?(f.stderr||f.stdout).trim():null};})};
}
export function recordManaged({kind,path:objectPath,source=null,classification='created_by_hhpe'}){const state=read('migration-state.yaml');if(!state.managed_objects.some(o=>o.kind===kind&&o.path===objectPath))state.managed_objects.push({kind,path:objectPath,source,classification,created_at:now()});state.updated_at=now();write(path.join(M,'migration-state.yaml'),state);return {recorded:{kind,path:objectPath,source,classification}};}
export function forgetManaged({kind,path:objectPath}){const state=read('migration-state.yaml');const before=state.managed_objects.length;state.managed_objects=state.managed_objects.filter(o=>!(o.kind===kind&&o.path===objectPath));state.updated_at=now();write(path.join(M,'migration-state.yaml'),state);return {removed:before-state.managed_objects.length,kind,path:objectPath};}

function hostValidationOptions(args){
  const values={requiredPlannedTargets:[]};
  for(let index=0;index<args.length;index+=1){
    const argument=args[index];
    if(argument==='--host')values.host=args[++index];
    else if(argument==='--context')values.context=args[++index];
    else if(argument==='--require-planned-target')values.requiredPlannedTargets.push(args[++index]);
    else fail(`unknown validate-host option: ${argument}`);
  }
  if(!values.host)fail('validate-host requires --host');
  if(!values.context)fail('validate-host requires --context');
  return values;
}

function syncOptions(args){
  const values={apply:false,host:null};
  for(let index=0;index<args.length;index+=1){
    const argument=args[index];
    if(argument==='--apply')values.apply=true;
    else if(argument==='--host')values.host=args[++index];
    else if(argument==='--home')values.home=args[++index];
    else if(argument==='--project-root')values.projectRoot=args[++index];
    else fail(`unknown sync option: ${argument}`);
  }
  return values;
}

if(process.argv[1]&&real(path.resolve(process.argv[1]))===real(fileURLToPath(import.meta.url))){
  const [cmd,...args]=process.argv.slice(2); let out;
  try{
    if(cmd==='discover')out=discover();else if(cmd==='validate')out=validate();else if(cmd==='validate-host')out=validateHostRealization(hostValidationOptions(args));else if(cmd==='sync')out=sync(syncOptions(args));else if(cmd==='rollback')out=rollback({apply:args.includes('--apply')});else if(cmd==='status')out=status();else if(cmd==='diff')out=diff();else if(cmd==='update')out=update(args);else if(cmd==='record')out=recordManaged({kind:args[args.indexOf('--kind')+1],path:args[args.indexOf('--path')+1],source:args.includes('--source')?args[args.indexOf('--source')+1]:null,classification:args.includes('--classification')?args[args.indexOf('--classification')+1]:'created_by_hhpe'});else if(cmd==='forget')out=forgetManaged({kind:args[args.indexOf('--kind')+1],path:args[args.indexOf('--path')+1]});else fail('usage: registry.mjs discover|validate|validate-host|sync|status|diff|update|rollback|record|forget');
    console.log(JSON.stringify(out,null,2));if(out.status==='failed'||out.actions?.some(a=>a.action==='COLLISION'||a.action==='REFUSE'))process.exitCode=1;
  }catch(e){console.error(`ERROR: ${e.message}`);process.exitCode=cmd==='validate-host'?2:1;}
}
