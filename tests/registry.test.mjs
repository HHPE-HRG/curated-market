import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';import {compareAdapterProjection} from '../scripts/sync-adapters.mjs';import {validate,sync,ROOT} from '../lib/registry.mjs';import {staticIntegrity} from '../lib/skills-ci.mjs';

test('registry integrity passes',()=>{const r=validate();assert.equal(r.status,'passed');assert.equal(r.counts.packages,7);assert.ok(r.counts.capabilities>=96);});
test('headless static integrity covers the complete capability catalog',()=>{const r=staticIntegrity();assert.equal(r.status,'PASS');assert.equal(r.counts.capabilities,96);});
test('generic repository validation includes opencode_only policy statically',()=>{
  assert.equal(validate().status,'passed');
  assert.equal(staticIntegrity().status,'PASS');

  const configPath=path.join(ROOT,'opencode.json');
  const original=fs.readFileSync;
  const invalid=JSON.parse(original(configPath,'utf8'));
  invalid.credentials='forbidden';
  let projectConfigReads=0;
  fs.readFileSync=function(file,...args){
    if(path.resolve(String(file))===configPath){projectConfigReads+=1;return JSON.stringify(invalid);}
    return original.call(this,file,...args);
  };
  try{
    const registryResult=validate();
    assert.equal(registryResult.status,'failed');
    assert.ok(registryResult.errors.some(error=>error.includes('opencode.json credentials')&&/(?:unsupported|forbidden)/.test(error)));
    const staticResult=staticIntegrity();
    assert.equal(staticResult.status,'FAIL_STATIC_INTEGRITY');
    assert.ok(staticResult.errors.some(error=>error.includes('opencode.json credentials')&&/(?:unsupported|forbidden)/.test(error)));
    assert.ok(projectConfigReads>=3);
  }finally{fs.readFileSync=original;}
});
test('dry run is additive in an empty hermetic home',()=>{const home=fs.mkdtempSync(path.join(os.tmpdir(),'hhpe-sync-home-'));try{const r=sync({home});assert.equal(r.mode,'dry-run');assert.ok(r.actions.length>0);assert.ok(r.actions.every(a=>['LINK','SKIP','REGISTER'].includes(a.action)));}finally{fs.rmSync(home,{recursive:true,force:true});}});
test('whole skill directory exposure resolves supporting files',()=>{const cap=JSON.parse(fs.readFileSync(path.join(ROOT,'registry/manifests/capabilities.yaml'))).capabilities.find(c=>c.capability_id==='superpowers/systematic-debugging');assert.ok(cap.requires.files.length);const pkg=JSON.parse(fs.readFileSync(path.join(ROOT,'registry/manifests/packages.lock.yaml'))).packages.find(p=>p.package_id===cap.package_id);const source=path.join(ROOT,pkg.package_root,cap.source_path);const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'hhpe-link-'));const link=path.join(tmp,'skill');fs.symlinkSync(source,link,'dir');assert.ok(fs.readFileSync(path.join(link,'SKILL.md'),'utf8').includes('systematic'));for(const rel of cap.requires.files)assert.ok(fs.existsSync(path.join(ROOT,pkg.package_root,rel)));fs.rmSync(tmp,{recursive:true});});
test('all executable wrappers invoke a registry core',()=>{for(const f of fs.readdirSync(path.join(ROOT,'bin'))){const s=fs.readFileSync(path.join(ROOT,'bin',f),'utf8');assert.match(s,/registry\.mjs|skills-ci\.mjs|capability-checks\.mjs/);assert.match(s,/exec node/);}});
test('generated HHPE Codex adapter matches canonical overlays',()=>{assert.deepEqual(compareAdapterProjection({root:ROOT}),{ok:true,differences:[]});});
