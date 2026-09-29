const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const dir=path.resolve(process.argv[2]||'work/site');
const {Solar}=require(path.join(dir,'lunar.js'));
const get=(...args)=>{const e=Solar.fromYmdHms(...args).getLunar().getEightChar();e.setSect(2);return {year:e.getYear(),month:e.getMonth(),day:e.getDay(),time:e.getTime()};};
const a=get(2026,2,4,4,2,7),b=get(2026,2,4,4,2,9);assert.notEqual(a.year,b.year);assert.notEqual(a.month,b.month);
const ctx={window:{}};vm.createContext(ctx);for(const f of ['bazi-engine.js','bazi-advanced.js','bazi-v05.js'])vm.runInContext(fs.readFileSync(path.join(dir,f),'utf8'),ctx);
const p=get(1990,1,15,12,0,0),api=ctx.window.BaziV05;
const results=[];for(let day=1;day<=30;day++){const t=get(2026,9,day,12,0,0);const d=api.dynamic(p,t);assert(d);assert.equal(d.flows.length,3);assert(api.renderDaily(p,t).includes('当日动态方向'));results.push(JSON.stringify(d.direction));}
assert(new Set(results).size>1,'dynamic directions should change across real dates');
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');for(const [,file]of html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g))assert(fs.existsSync(path.join(dir,file)),file);
console.log('PASS actual lunar 1.7.7 solar-term boundary, 30 dates, changing directions, deployment assets');

