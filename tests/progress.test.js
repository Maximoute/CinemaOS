const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createApp}=require('../src/app-server');
test('le choix et la progression sont enregistrés ensemble et survivent au redémarrage',async t=>{
 const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'cinemaos-progress-'));
 async function open(){const server=createApp({dataDir,offline:true});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return 'http://127.0.0.1:'+server.address().port;}
 const base=await open();const progress={query:'',genre:'Tous',sort:'selection',queue:[194],known:[194,157336],nextPage:3,remaining:7,limit:10};
 const result=await fetch(base+'/api/library/157336',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({seen:false,exploration:progress})});assert.equal(result.status,200);
 const next=await open();const restored=await(await fetch(next+'/api/exploration')).json();assert.equal(restored.progress.nextPage,3);assert.deepEqual(restored.progress.queue,[194]);assert.equal(restored.movies[0].id,194);
 const state=await(await fetch(next+'/api/state')).json();assert.equal(state.library['157336'].seen,false);
});
