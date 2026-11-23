import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('dist',{recursive:true});
const files = ['grandfather-recitation.mp3','grandfather-dua.mp3','grandfather-naml.mp3','index.html','style.css','app.js','data.js','icon.svg','prayer.js','extra-azkar.js','install.js','sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const version = createHash('sha256');
for (const file of files) {
  await copyFile(file, `dist/${file}`);
  version.update(file).update(await readFile(file));
}
const worker = await readFile('sw.js', 'utf8');
await writeFile('dist/sw.js', worker.replace('development-10', version.digest('hex')));
console.log('Built dist/ successfully');
