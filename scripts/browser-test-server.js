// Serveur de vérification isolé : n'écrit jamais dans votre carnet réel.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../src/app-server');
const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'cinemaos-browser-test-'));
createApp({dataDir,offline:true}).listen(3081,'127.0.0.1',()=>console.log('Test isolé : http://127.0.0.1:3081'));

