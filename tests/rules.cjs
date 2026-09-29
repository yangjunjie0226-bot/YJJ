const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const dir=process.argv[2]||'work/site';
const ctx={window:{}};vm.createContext(ctx);
for(const file of ['bazi-engine.js','bazi-advanced.js','bazi-v05.js'])vm.runInContext(fs.readFileSync(`${dir}/${file}`,'utf8'),ctx);
const api=ctx.window.BaziV05;
let count=0;function check(name,fn){fn();count++;console.log('PASS',name);}
const p={year:'庚申',month:'戊寅',day:'甲辰',time:'丁卯'},t={year:'丙午',month:'丁酉',day:'丙午'};
check('all ten categories; default collapsed',()=>{assert.equal(new Set(api.shensha(p).map(r=>r.name)).size,10);assert(!api.renderShensha(p).includes(' open'));});
check('Tianyi alternate explicitly documented',()=>{const r=api.shensha({...p,time:'乙丑'}).find(r=>r.name==='天乙贵人'&&r.token==='庚');assert.equal(r.target,'丑未');assert.equal(r.matches[0].position,'time');assert(r.note.includes('庚辛'));});
check('all stem lookup tables',()=>{const expected={文昌:'巳午申酉申酉亥子寅卯',禄神:'寅卯巳午巳午申酉亥子'};for(const [name,table]of Object.entries(expected))for(const [i,s]of [...'甲乙丙丁戊己庚辛壬癸'].entries())assert.equal(api.shensha({...p,day:s+'子'}).find(r=>r.name===name).target,table[i]);});
check('yin blade stays unspecified',()=>assert.equal(api.shensha({...p,day:'乙丑'}).find(r=>r.name==='羊刃').target,null));
check('12 month Tiande stem/branch distinction',()=>{const months='寅卯辰巳午未申酉戌亥子丑',targets='丁申壬辛亥甲癸寅丙乙巳庚';for(let i=0;i<12;i++){const rows=api.shensha({...p,month:'甲'+months[i],time:'壬申'});const r=rows.find(r=>r.name==='天德');assert.equal(r.target,targets[i]);if(i===1)assert(r.matches.some(m=>m.position==='time'));if(i===2)assert(r.matches.some(m=>m.position==='time'));}});
check('four group rules year and day separately',()=>{for(const [branch,horse,peach,canopy,general]of [['申','寅','酉','辰','子'],['寅','申','卯','戌','午'],['亥','巳','子','未','卯'],['巳','亥','午','丑','酉']]){const rows=api.shensha({...p,day:'甲'+branch});for(const [name,target]of [['驿马',horse],['桃花',peach],['华盖',canopy],['将星',general]])assert.equal(rows.find(r=>r.name===name&&r.origin==='日柱地支').target,target);}});
check('unknown time never invented',()=>assert(api.shensha({...p,time:null}).every(r=>r.matches.every(m=>m.position!=='time'))));
check('climate auxiliary visible and hidden evidence',()=>{const c=api.climate({...p,month:'丙寅',year:'癸丑'});assert.equal(c.auxiliary[0].stem,'癸');assert(c.auxiliary[0].visible.includes('年柱'));assert(c.auxiliary[0].hidden.includes('年柱'));});
check('unreviewed auxiliary remains empty',()=>assert.equal(api.climate({...p,day:'乙丑'}).auxiliary.length,0));
check('disputed primary excluded',()=>{const c=api.composite({...p,month:'乙未'});assert(c.climate.review.disputed);assert(!Object.values(c.reasons).flat().includes('调候初筛'));});
check('dynamic reproducibility and year month day supply',()=>{const d=api.dynamic(p,t);assert.equal(JSON.stringify(d),JSON.stringify(api.dynamic(p,t)));assert.equal(d.exposure.火,5);assert.equal(d.exposure.金,1);assert.equal(d.flows[2].god,'食神');});
check('daily/monthly/yearly changes affect evidence and scores',()=>{const d=api.dynamic(p,t);for(const key of ['day','month','year'])assert.notEqual(JSON.stringify(api.dynamic(p,{...t,[key]:'壬子'}).exposure),JSON.stringify(d.exposure));});
check('flows cannot create unsupported natal direction',()=>{for(let i=0;i<60;i++){const d=api.dynamic(p,{...t,day:'甲乙丙丁戊己庚辛壬癸'[i%10]+'子丑寅卯辰巳午未申酉戌亥'[i%12]});for(const e of d.direction){assert(d.base[e]>0);assert(!d.conflicts.includes(e));}}});
check('extreme and birth boundary block every recommendation',()=>{for(const [n,o]of [[{year:'乙卯',month:'乙卯',day:'乙卯',time:'乙卯'},{}],[p,{boundary:true}]]){const d=api.dynamic(n,t,o);assert(d.blocked);assert.equal(d.direction.length,0);assert(!api.renderDaily(n,t,o).includes('<b>宜参考</b>'));assert(!api.renderComposite(n,o).includes('重合度最高'));}});
check('invalid input handled',()=>{assert.equal(api.dynamic({day:'??',month:'甲寅'},t),null);assert.equal(api.shensha({}).length,0);});
check('HTML integration and persistent profile key',()=>{const app=fs.readFileSync(`${dir}/app.js`,'utf8'),html=fs.readFileSync(`${dir}/index.html`,'utf8');assert(app.includes("APP_VERSION = '0.5.0'"));assert(app.includes("xuanli.profile.v1"));assert(app.includes('BaziV05.renderDaily'));assert(app.includes('BaziV05.renderShensha'));assert(html.indexOf('./bazi-v05.js')<html.indexOf('./app.js'));});
async function serviceWorkerTest(){
 const listeners={},cacheData=new Map(),deleted=[];let fail=false,claimed=false,skipped=false;
 const cache={addAll:async requests=>{if(fail)throw Error('network');for(const r of requests)cacheData.set(r.url,{ok:true,url:r.url});},match:async key=>cacheData.get(typeof key==='string'?key:key.url)};
 const c={Request:class{constructor(url,opts){this.url=url;this.opts=opts;}},URL,fetch:async()=>{throw Error('offline');},caches:{open:async()=>cache,keys:async()=>['xuanli-v0.4.0','other-app'],delete:async key=>deleted.push(key)},self:{location:{origin:'https://example.com'},addEventListener:(k,fn)=>listeners[k]=fn,skipWaiting:async()=>{skipped=true;},clients:{claim:async()=>{claimed=true;}}}};
 vm.runInNewContext(fs.readFileSync(`${dir}/sw.js`,'utf8'),c);
 let pending;listeners.install({waitUntil:p=>pending=p});await pending;assert(skipped);assert(cacheData.has('./bazi-v05.js'));
 listeners.activate({waitUntil:p=>pending=p});await pending;assert(claimed);assert.deepEqual(deleted,['xuanli-v0.4.0']);
 listeners.fetch({request:{method:'GET',url:'https://example.com/YJJ/',mode:'navigate'},respondWith:p=>pending=p});assert.equal((await pending).url,'./index.html');
 fail=true;skipped=false;listeners.install({waitUntil:p=>pending=p});await assert.rejects(pending);assert(!skipped);
 console.log('PASS atomic offline cache / failure keeps prior worker / scoped cleanup');
}
serviceWorkerTest().then(()=>console.log(`${count+1} test groups passed`)).catch(e=>{console.error(e);process.exitCode=1;});

