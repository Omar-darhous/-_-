import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
await mkdir('dist',{recursive:true});
const mediaFiles = ['grandfather-waqiah.m4a','grandfather-saffat.m4a','grandfather-ramadan.mp4','grandfather-recitation.mp3','grandfather-dua.mp3','grandfather-naml.mp3'];
const shellFiles = ['index.html','style.css','app.js','data.js','icon.svg','prayer.js','extra-azkar.js','offline-media.js','install.js','sw.js','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
const files = [...mediaFiles, ...shellFiles];
const version = createHash('sha256');
for (const file of files) {
  await copyFile(file, `dist/${file}`);
  if (shellFiles.includes(file)) version.update(file).update(await readFile(file));
}
const worker = await readFile('sw.js', 'utf8');
if (!worker.includes('development-11')) throw new Error('Expected development-11 placeholder in sw.js');
await writeFile('dist/sw.js', worker.replace('development-11', version.digest('hex')));
console.log('Built dist/ successfully');
