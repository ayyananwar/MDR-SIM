const fs=require('fs'),path=require('path'),crypto=require('crypto');
const dir=process.argv[2];
if(!dir)throw new Error('Usage: node scripts/verifyArtifacts.cjs results/paper-v3');
const records=JSON.parse(fs.readFileSync(process.argv[3] ?? path.join(dir,'checksums.json'),'utf8'));
for(const r of records){const actual=crypto.createHash('sha256').update(fs.readFileSync(path.join(dir,r.file))).digest('hex');if(actual!==r.sha256)throw new Error(`Checksum mismatch: ${r.file}`);}
console.log(`Verified ${records.length} artifacts in ${dir}`);
