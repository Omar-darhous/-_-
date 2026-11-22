import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist',{recursive:true});
for(const f of ['grandfather-recitation.mp3','grandfather-dua.mp3','grandfather-naml.mp3','index.html','style.css','app.js','data.js','icon.svg','prayer.js','extra-azkar.js','install.js','sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'])await copyFile(f,`dist/${f}`);
console.log('Built dist/ successfully');
