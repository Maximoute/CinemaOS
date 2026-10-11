const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
try { process.loadEnvFile(path.join(ROOT, '.env')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
const seed = require('./catalog.json');
const genres = {28:'Action',12:'Aventure',16:'Animation',35:'Comédie',80:'Crime',99:'Documentaire',18:'Drame',10751:'Famille',14:'Fantastique',36:'Histoire',27:'Horreur',10402:'Musique',9648:'Mystère',10749:'Romance',878:'Science-fiction',53:'Thriller',10752:'Guerre',37:'Western'};
function normalize(m) {
  return { id:m.id, title:m.title, aliases:m.aliases || [], year:(m.release_date || m.year || '').slice(0,4), overview:m.overview || 'Synopsis indisponible.', poster:m.poster_path || m.poster || null, backdrop:m.backdrop_path || m.backdrop || null, rating:m.vote_average || m.rating || 0, genres:m.genres?.map(g=>g.name) || m.genre_ids?.map(id=>genres[id]).filter(Boolean) || m.genres || [], runtime:m.runtime || null, director:m.credits?.crew?.find(c=>c.job==='Director')?.name || m.director || '', cast:m.credits?.cast?.slice(0,5).map(c=>c.name) || m.cast || [], country:m.production_countries?.map(c=>c.name).join(', ') || '', tagline:m.tagline || '' };
}
function createApp({dataDir=path.join(ROOT,'data'), offline=false, fetcher=fetch}={}) {
  fs.mkdirSync(dataDir,{recursive:true});
  const stateFile=path.join(dataDir,'library.json');
  const emptyState=()=>({library:{},viewings:[],inbox:[],settings:{name:'Cinéphile'}});
  let state=emptyState();
  let stateVersion='';
  const loadState=()=>{
    if(!fs.existsSync(stateFile))return;
    const stat=fs.statSync(stateFile);
    const version=stat.mtimeMs+':'+stat.size;
    if(version===stateVersion)return;
    const loaded=JSON.parse(fs.readFileSync(stateFile,'utf8'));
    state={...emptyState(),...loaded,library:loaded.library||{},viewings:loaded.viewings||[],inbox:loaded.inbox||[],settings:{...emptyState().settings,...loaded.settings}};
    stateVersion=version;
  };
  loadState();
  let cache={};
  try { cache=JSON.parse(fs.readFileSync(path.join(dataDir,'catalog-cache.json'),'utf8')); } catch {}
  const persist=()=>{
    const temporary=stateFile+'.'+process.pid+'.tmp';
    fs.writeFileSync(temporary,JSON.stringify(state,null,2));
    fs.renameSync(temporary,stateFile);
    const stat=fs.statSync(stateFile);stateVersion=stat.mtimeMs+':'+stat.size;
  };
  const allLocal=()=>Array.from(new Map([...seed,...Object.values(cache)].map(m=>[m.id,m])).values());
  async function tmdb(route,params={}) {
    if(offline || (!process.env.TMDB_READ_ACCESS_TOKEN && !process.env.TMDB_API_KEY)) throw Error('offline');
    const url=new URL('https://api.themoviedb.org/3/'+route);
    Object.entries({language:'fr-FR',include_adult:'false',...params}).forEach(([k,v])=>url.searchParams.set(k,v));
    const headers={Accept:'application/json'};
    if(process.env.TMDB_READ_ACCESS_TOKEN) headers.Authorization='Bearer '+process.env.TMDB_READ_ACCESS_TOKEN;
    else url.searchParams.set('api_key',process.env.TMDB_API_KEY);
    const res=await fetcher(url,{headers,signal:AbortSignal.timeout(6000)});
    if(!res.ok) throw Error('TMDB unavailable');
    return res.json();
  }
  function remember(movies) { movies.forEach(m=>{ const old=cache[m.id] || seed.find(s=>s.id===m.id) || {}; cache[m.id]={...old,...m,runtime:m.runtime||old.runtime||null,director:m.director||old.director||'',cast:m.cast?.length?m.cast:(old.cast||[])}; }); try {fs.writeFileSync(path.join(dataDir,'catalog-cache.json'),JSON.stringify(cache));}catch{} }
  const fold=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  async function movie(id) {
    try { let d; try {d=await tmdb('movie/'+id,{append_to_response:'credits'});} catch {d=await tmdb('movie/'+id);} const m=normalize(d);remember([m]);return cache[m.id]; }
    catch {return allLocal().find(m=>m.id===id) || state.library[id]?.movie;}
  }
  async function body(req) {
    let result='';for await(const chunk of req){result+=chunk;if(result.length>150000)throw Object.assign(Error('Données trop volumineuses.'),{status:413});}
    try{return JSON.parse(result || '{}');}catch{throw Object.assign(Error('Données JSON invalides.'),{status:400});}
  }
  const str=(v,max=10000)=>typeof v==='string'?v.slice(0,max):'';
  const error=(msg,status=400)=>Object.assign(Error(msg),{status});
  function checkpoint(value){
    if(!value||typeof value.query!=='string'||typeof value.genre!=='string'||typeof value.sort!=='string'||!Array.isArray(value.queue)||!Array.isArray(value.known))throw error('Progression invalide.');
    const ids=list=>list.slice(0,10000).filter(id=>Number.isSafeInteger(id)&&id>0);
    return {query:value.query.slice(0,200),genre:value.genre.slice(0,40),sort:value.sort.slice(0,20),queue:ids(value.queue),known:ids(value.known),nextPage:Math.max(1,Math.min(500,Number(value.nextPage)||1)),remaining:Math.max(0,Math.min(499,Number(value.remaining)||0)),limit:Math.max(1,Math.min(500,Number(value.limit)||1)),updated:new Date().toISOString()};
  }
  const handler=async(req,res)=>{
    const send=(status,value,type='application/json; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(type.startsWith('application/json')?JSON.stringify(value):value);};
    try {
      const url=new URL(req.url,'http://localhost');const p=url.pathname;
      if(req.headers.host && !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(req.headers.host))return send(403,{error:'Hôte non autorisé.'});
      if(!['GET','HEAD'].includes(req.method) && req.headers.origin && req.headers.origin!=='http://'+req.headers.host)return send(403,{error:'Origine non autorisée.'});
      if(p.startsWith('/api/'))loadState();
      if(p==='/api/status')return send(200,{configured:!offline && !!(process.env.TMDB_READ_ACCESS_TOKEN||process.env.TMDB_API_KEY),storage:'local',synchronized:true,dataFile:stateFile});
      if(p==='/api/state' && req.method==='GET')return send(200,state);
      if(p==='/api/exploration' && req.method==='GET')return send(200,{progress:state.exploration||null,movies:(state.exploration?.queue||[]).map(id=>cache[id]||state.library[id]?.movie||seed.find(m=>m.id===id)).filter(Boolean)});
      if(p==='/api/exploration' && req.method==='PATCH'){const b=await body(req);state.exploration=checkpoint(b);persist();return send(200,state.exploration);}
      if(p==='/api/discovery' && req.method==='GET') {
        const genreId=Object.keys(genres).find(id=>genres[id]===url.searchParams.get('genre'));
        const duration=Math.max(1,Math.min(999,Number(url.searchParams.get('duration'))||999));
        const batches=await Promise.allSettled([0,1,2].map(i=>tmdb('discover/movie',{page:1+i*20+Math.floor(Math.random()*20),sort_by:i===1?'vote_average.desc':'popularity.desc','vote_count.gte':100,'with_runtime.lte':duration,'with_runtime.gte':1,...(genreId?{with_genres:genreId}:{})})));
        const remote=batches.flatMap(r=>r.status==='fulfilled'?r.value.results.filter(m=>!m.adult).map(normalize):[]);
        remember(remote);
        const pool=remote.length?remote:allLocal().filter(m=>(!genreId||m.genres.includes(genres[genreId]))&&(!m.runtime||m.runtime<=duration));
        for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
        return send(200,{movies:Array.from(new Map(pool.map(m=>[m.id,m])).values()),source:remote.length?'tmdb':'local'});
      }
      if(p==='/api/movies' && req.method==='GET') {
        const q=str(url.searchParams.get('q'),200);const page=Math.max(1,Math.min(500,Math.floor(Number(url.searchParams.get('page'))||1)));
        const genreId=Object.keys(genres).find(id=>genres[id]===url.searchParams.get('genre'));
        const sorting={rating:'vote_average.desc',year:'primary_release_date.desc'}[url.searchParams.get('sort')]||'popularity.desc';
        if(!q && url.searchParams.get('collection')==='curated')return send(200,{movies:seed.map(m=>cache[m.id] || m),source:'selection',page:1,pages:1});
        try {
          const params=q?{query:q}:{sort_by:sorting,include_video:false,...(genreId?{with_genres:genreId}:{}),...(sorting==='vote_average.desc'?{'vote_count.gte':100}:{}),...(sorting==='primary_release_date.desc'?{'primary_release_date.lte':new Date().toISOString().slice(0,10)}:{})};
          const d=await tmdb(q?'search/movie':'discover/movie',{...params,page});
          const movies=d.results.filter(m=>!m.adult).map(normalize);remember(movies);
          return send(200,{movies,source:'tmdb',page,pages:Math.min(d.total_pages,500),total:d.total_results});
        }
        catch {return send(200,{movies:allLocal().filter(m=>!q||fold(m.title+' '+(m.aliases||[]).join(' ')).includes(fold(q)) || (/long\s*(way|walk)|300\s*km|marche|cr[eè]ve/i.test(q)&&m.id===604079)),source:'local',page:1,pages:1});}
      }
      if(/^\/api\/movies\/\d+$/.test(p) && req.method==='GET'){const m=await movie(Number(p.split('/').pop()));return m?send(200,m):send(404,{error:'Film introuvable.'});}
      if(/^\/api\/library\/\d+$/.test(p) && req.method==='PATCH') {
        const id=Number(p.split('/').pop());const b=await body(req);const m=state.library[id]?.movie || await movie(id);if(!m)throw error('Film introuvable.',404);
        const entry=state.library[id] || {movie:m,watchlist:false,favorite:false};
        if(typeof b.watchlist==='boolean')entry.watchlist=b.watchlist;
        if(typeof b.favorite==='boolean')entry.favorite=b.favorite;
        if(typeof b.seen==='boolean')entry.seen=b.seen;
        state.library[id]=entry;if(b.exploration)state.exploration=checkpoint(b.exploration);persist();return send(200,state);
      }
      if(p==='/api/viewings' && req.method==='POST') {
        const b=await body(req);const id=Number(b.movieId);if(!Number.isInteger(id)||id<=0)throw error('Film invalide.');
        const rating=Number(b.rating);if(!Number.isFinite(rating)||rating<0||rating>10)throw error('La note doit être entre 0 et 10.');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date||'') || Number.isNaN(Date.parse(b.date)))throw error('Date invalide.');
        const m=state.library[id]?.movie || await movie(id);if(!m)throw error('Film introuvable.',404);
        state.library[id]={...(state.library[id] || {favorite:false}),movie:m,watchlist:false,seen:true};
        state.viewings.unshift({id:randomUUID(),movieId:id,date:b.date,rating,reaction:str(b.reaction),scene:str(b.scene),question:str(b.question),critique:str(b.critique),concept:str(b.concept,100)});persist();return send(201,state);
      }
      if(/^\/api\/viewings\/[0-9a-f-]+$/.test(p) && req.method==='PATCH') {
        const id=p.split('/').pop();const b=await body(req);const viewing=state.viewings.find(v=>v.id===id);if(!viewing)throw error('Séance introuvable.',404);
        for(const key of ['date','reaction','scene','question','critique','concept']) if(b[key]!==undefined) viewing[key]=str(b[key],key==='concept'?100:10000);
        if(b.rating!==undefined){const rating=Number(b.rating);if(!Number.isFinite(rating)||rating<0||rating>10)throw error('La note doit être entre 0 et 10.');viewing.rating=rating;}
        persist();return send(200,state);
      }
      if(p==='/api/inbox' && req.method==='POST'){const b=await body(req);if(!str(b.title,200).trim())throw error('Un titre est nécessaire.');state.inbox.unshift({id:randomUUID(),title:str(b.title,200).trim(),source:str(b.source,300),created:new Date().toISOString()});persist();return send(201,state);}
      if(p.startsWith('/api/inbox/') && req.method==='DELETE'){state.inbox=state.inbox.filter(i=>i.id!==p.split('/').pop());persist();return send(200,state);}
      if(p==='/api/settings' && req.method==='PATCH'){const b=await body(req);state.settings.name=str(b.name,60).trim() || 'Cinéphile';persist();return send(200,state);}
      if(p==='/api/export' && req.method==='GET')return send(200,state);
      if(p==='/api/export/markdown' && req.method==='GET') {
        const lines=['# Mon carnet CinemaOS','',...Object.values(state.library).flatMap(e=>['## '+e.movie.title,'','Année : '+e.movie.year+' · Favori : '+(e.favorite?'oui':'non')+' · À voir : '+(e.watchlist?'oui':'non'),'',...state.viewings.filter(v=>v.movieId===e.movie.id).flatMap(v=>['### Séance du '+v.date+' — '+v.rating+'/10','',v.reaction,'','**Scène marquante**',v.scene,'','**Question**',v.question,'','**Critique**',v.critique,'',v.concept?'Concept : [['+v.concept+']]':'',''])])];return send(200,lines.join('\n'),'text/markdown; charset=utf-8');
      }
      if(p.startsWith('/api/'))return send(404,{error:'Route inconnue.'});
      if(!['GET','HEAD'].includes(req.method))return send(405,{error:'Méthode non autorisée.'});
      const base=p.startsWith('/assets/')?path.join(ROOT,'assets'):path.join(ROOT,'public');
      const relative=p.startsWith('/assets/')?p.slice(8):(p==='/'?'index.html':p.slice(1));
      const file=path.resolve(base,decodeURIComponent(relative));
      if(!file.startsWith(base+path.sep) || path.basename(file).startsWith('.'))return send(403,{error:'Accès refusé.'});
      if(!fs.existsSync(file)||!fs.statSync(file).isFile())return send(404,{error:'Fichier introuvable.'});
      const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':mime,'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; img-src 'self' https://image.tmdb.org; style-src 'self'; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"});
      if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
    } catch(e) {send(e.status||500,{error:e.status?e.message:'Impossible de terminer cette action. Vos données enregistrées sont conservées.'});}
  };
  return http.createServer(handler);
}
if(require.main===module){const port=Number(process.env.CINEMA_PORT)||3080;const server=createApp();server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'Le port '+port+' est occupé. CinemaOS est peut-être déjà ouvert : http://127.0.0.1:'+port:'Impossible de démarrer CinemaOS.');process.exitCode=1;});server.listen(port,'127.0.0.1',()=>console.log('CinemaOS ouvert sur http://127.0.0.1:'+port));}
module.exports={createApp};
