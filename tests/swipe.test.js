const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
function loader(api){
 const source=fs.readFileSync(path.join(__dirname,'../public/app.js'),'utf8');
 const code=source.slice(source.indexOf('let swipeQueue='),source.indexOf('function renderSwipe(){'));
 const context=vm.createContext({api:(url,method,data)=>url==='/api/exploration'?Promise.resolve(method?data:{progress:null}):api(url),state:{},toast:()=>{},filmSeen:id=>id===3,routeToken:1,genre:'Tous',sort:'selection',pages:4,page:1,currentMovies:[{id:1,genres:[]}],renderSwipe:()=>{},$:()=>null,window:{addEventListener:()=>{}}});
 vm.runInContext(code,context);return context;
}
test('le tri reprend la file et le curseur sauvegardés',async()=>{
 const c=loader(async()=>({}));c.api=async()=>({progress:{query:'',genre:'Tous',sort:'selection',known:[1,2],limit:4,remaining:2,nextPage:3},movies:[{id:2,genres:[]}]});
 await vm.runInContext("startSwipe('');",c);
 assert.equal(vm.runInContext('swipeQueue[0].id',c),2);assert.equal(vm.runInContext('swipeNextPage',c),3);assert.equal(vm.runInContext('swipeRemaining',c),2);
});
test('le flux charge les pages suivantes, sans doublons ni films vus',async()=>{
 const calls=[];const c=loader(async url=>{const page=Number(new URL(url,'http://localhost').searchParams.get('page'));calls.push(page);return {source:'tmdb',movies:[{id:1,genres:[]},{id:page,genres:[]}]};});
 await vm.runInContext("startSwipe('');",c);await vm.runInContext('refillSwipe()',c);
 assert.deepEqual(calls,[2,3,4]);assert.equal(vm.runInContext('swipeQueue.map(m=>m.id).join(",")',c),'1,2,4');
 assert.equal(vm.runInContext('swipeRemaining',c),0);
});
test('une réponse tardive ne remplit pas un flux fermé',async()=>{
 let resolve;const c=loader(()=>new Promise(r=>{resolve=r;}));await vm.runInContext("startSwipe('');",c);
 const pending=vm.runInContext('refillSwipe()',c);vm.runInContext('swipeActive=false;swipeSession++;',c);
 resolve({source:'tmdb',movies:[{id:2,genres:[]}]});await pending;
 assert.equal(vm.runInContext('swipeQueue.length',c),1);
});
