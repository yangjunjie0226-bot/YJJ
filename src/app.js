/* 玄历 v0.2 - 确定性历法/八字结构规则，不使用随机命理结果 */
(() => {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const STORAGE_KEY = 'xuanli.profile.v1';
  const APP_VERSION = '0.5.0';
  const LUNAR_LIB_VERSION = '1.7.7';

  const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const STEM_INFO = {
    甲:['木','阳'],乙:['木','阴'],丙:['火','阳'],丁:['火','阴'],戊:['土','阳'],己:['土','阴'],庚:['金','阳'],辛:['金','阴'],壬:['水','阳'],癸:['水','阴']
  };
  const BRANCH_ELEMENT = {子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
  const HIDDEN_STEMS = {子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
  const GENERATES = {木:'火',火:'土',土:'金',金:'水',水:'木'};
  const CONTROLS = {木:'土',土:'水',水:'火',火:'金',金:'木'};

  const LIU_HE = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']];
  const LIU_CHONG = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']];
  const LIU_HAI = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']];
  const LIU_PO = [['子','酉'],['卯','午'],['辰','丑'],['戌','未'],['寅','亥'],['巳','申']];
  const STEM_HE = [['甲','己'],['乙','庚'],['丙','辛'],['丁','壬'],['戊','癸']];
  const SAN_HE = [
    {branches:['申','子','辰'],element:'水'}, {branches:['亥','卯','未'],element:'木'},
    {branches:['寅','午','戌'],element:'火'}, {branches:['巳','酉','丑'],element:'金'}
  ];
  const SAN_HUI = [
    {branches:['寅','卯','辰'],element:'木'}, {branches:['巳','午','未'],element:'火'},
    {branches:['申','酉','戌'],element:'金'}, {branches:['亥','子','丑'],element:'水'}
  ];
  const SAN_XING_GROUPS = [['寅','巳','申'],['丑','戌','未']];
  const SELF_XING = ['辰','午','酉','亥'];

  const NAYIN_PAIRS = [
    ['甲子','乙丑','海中金'],['丙寅','丁卯','炉中火'],['戊辰','己巳','大林木'],['庚午','辛未','路旁土'],['壬申','癸酉','剑锋金'],
    ['甲戌','乙亥','山头火'],['丙子','丁丑','涧下水'],['戊寅','己卯','城头土'],['庚辰','辛巳','白蜡金'],['壬午','癸未','杨柳木'],
    ['甲申','乙酉','泉中水'],['丙戌','丁亥','屋上土'],['戊子','己丑','霹雳火'],['庚寅','辛卯','松柏木'],['壬辰','癸巳','长流水'],
    ['甲午','乙未','沙中金'],['丙申','丁酉','山下火'],['戊戌','己亥','平地木'],['庚子','辛丑','壁上土'],['壬寅','癸卯','金箔金'],
    ['甲辰','乙巳','覆灯火'],['丙午','丁未','天河水'],['戊申','己酉','大驿土'],['庚戌','辛亥','钗钏金'],['壬子','癸丑','桑柘木'],
    ['甲寅','乙卯','大溪水'],['丙辰','丁巳','沙中土'],['戊午','己未','天上火'],['庚申','辛酉','石榴木'],['壬戌','癸亥','大海水']
  ];
  const NAYIN = Object.fromEntries(NAYIN_PAIRS.flatMap(([a,b,n]) => [[a,n],[b,n]]));

  const state = {
    cursor: new Date(),
    selected: new Date(),
    profile: loadProfile()
  };
  state.cursor = new Date(state.selected.getFullYear(), state.selected.getMonth(), 1);

  function safe(obj, method, fallback='—', ...args){
    try { return obj && typeof obj[method] === 'function' ? obj[method](...args) : fallback; } catch { return fallback; }
  }
  function arr(v){ return Array.isArray(v) ? v : (v && v !== '—' ? [v] : []); }
  function html(v){ return String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
  function pad(n){ return String(n).padStart(2,'0'); }
  function dateKey(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
  function sameDate(a,b){ return dateKey(a)===dateKey(b); }
  function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
  function toast(msg){ const el=$('#toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),1800); }
  function loadProfile(){ try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{return null;} }
  function saveProfile(p){ localStorage.setItem(STORAGE_KEY,JSON.stringify(p)); state.profile=p; }
  function toDate(solar){ return new Date(safe(solar,'getYear',0),safe(solar,'getMonth',1)-1,safe(solar,'getDay',1),safe(solar,'getHour',0),safe(solar,'getMinute',0),safe(solar,'getSecond',0)); }
  function solarText(solar, withSeconds=false){
    if(!solar) return '—';
    const y=safe(solar,'getYear',''),m=pad(safe(solar,'getMonth','')),d=pad(safe(solar,'getDay','')),h=pad(safe(solar,'getHour','')),mi=pad(safe(solar,'getMinute',''));
    const sec=pad(safe(solar,'getSecond',''));
    return `${y}-${m}-${d} ${h}:${mi}${withSeconds?`:${sec}`:''}`;
  }

  function solarForDate(d,h=12,min=0){ return Solar.fromYmdHms ? Solar.fromYmdHms(d.getFullYear(),d.getMonth()+1,d.getDate(),h,min,0) : Solar.fromDate(new Date(d.getFullYear(),d.getMonth(),d.getDate(),h,min)); }
  function lunarForDate(d,h=12,min=0){ return solarForDate(d,h,min).getLunar(); }

  function lunarLabel(lunar){
    const festivals=[...arr(safe(lunar,'getFestivals',[])),...arr(safe(lunar,'getOtherFestivals',[]))];
    const jq=safe(lunar,'getJieQi','');
    if(jq && jq!=='—') return jq;
    if(festivals.length) return festivals[0];
    if(safe(lunar,'getDay',0)===1) return `${safe(lunar,'getMonthInChinese','')}月`;
    return safe(lunar,'getDayInChinese','');
  }

  function getExactPillars(lunar, hasTime=true, sect='sect2'){
    const ec=safe(lunar,'getEightChar',null);
    if(ec && ec!=='—'){
      safe(ec,'setSect',null,sect==='sect1'?1:2);
      return {
        year:safe(ec,'getYear',safe(lunar,'getYearInGanZhiExact','—')),
        month:safe(ec,'getMonth',safe(lunar,'getMonthInGanZhiExact','—')),
        day:safe(ec,'getDay',safe(lunar,'getDayInGanZhiExact2','—')),
        time:hasTime?safe(ec,'getTime',null):null,
        eightChar:ec
      };
    }
    const year=safe(lunar,'getYearInGanZhiExact',safe(lunar,'getYearInGanZhi','—'));
    const month=safe(lunar,'getMonthInGanZhiExact',safe(lunar,'getMonthInGanZhi','—'));
    const dayMethod=sect==='sect1'?'getDayInGanZhiExact':'getDayInGanZhiExact2';
    const day=safe(lunar,dayMethod,safe(lunar,'getDayInGanZhi','—'));
    return {year,month,day,time:hasTime?safe(lunar,'getTimeInGanZhi',null):null,eightChar:null};
  }

  function tenGod(dayStem,targetStem){
    if(!STEM_INFO[dayStem]||!STEM_INFO[targetStem]) return '—';
    const [de,dp]=STEM_INFO[dayStem], [te,tp]=STEM_INFO[targetStem];


    const same=dp===tp;
    if(de===te) return same?'比肩':'劫财';
    if(GENERATES[de]===te) return same?'食神':'伤官';
    if(GENERATES[te]===de) return same?'偏印':'正印';
    if(CONTROLS[de]===te) return same?'偏财':'正财';
    if(CONTROLS[te]===de) return same?'七杀':'正官';
    return '—';
  }

  function pairHas(a,b,pairs){ return pairs.some(p=>p.includes(a)&&p.includes(b)); }
  function branchRelations(a,b){
    const out=[];
    if(!a||!b) return out;
    if(pairHas(a,b,LIU_HE)) out.push('六合');
    if(pairHas(a,b,LIU_CHONG)) out.push('六冲');
    if(pairHas(a,b,LIU_HAI)) out.push('六害');
    if(pairHas(a,b,LIU_PO)) out.push('六破');
    if((a==='子'&&b==='卯')||(a==='卯'&&b==='子')) out.push('子卯刑');
    if(a===b&&SELF_XING.includes(a)) out.push('自刑');
    for(const g of SAN_XING_GROUPS){ if(a!==b&&g.includes(a)&&g.includes(b)) out.push(`${g.join('')}刑组`); }
    return [...new Set(out)];
  }

  function stemRelations(a,b){
    const out=[]; if(!STEM_INFO[a]||!STEM_INFO[b])return out;
    if(pairHas(a,b,STEM_HE)) out.push('天干五合');
    const ae=STEM_INFO[a][0],be=STEM_INFO[b][0];
    if(GENERATES[ae]===be) out.push(`${a}生${b}`);
    else if(GENERATES[be]===ae) out.push(`${b}生${a}`);
    if(CONTROLS[ae]===be) out.push(`${a}克${b}`);
    else if(CONTROLS[be]===ae) out.push(`${b}克${a}`);
    if(a===b) out.push('同干');
    return out;
  }

  function multiBranchRelations(transitBranch,natalBranches){
    const pool=new Set([transitBranch,...natalBranches]);
    const out=[];
    SAN_HE.forEach(g=>{if(g.branches.every(x=>pool.has(x))) out.push(`具备${g.branches.join('')}三合${g.element}局支位组合`);});
    SAN_HUI.forEach(g=>{if(g.branches.every(x=>pool.has(x))) out.push(`具备${g.branches.join('')}三会${g.element}局支位组合`);});
    SAN_XING_GROUPS.forEach(g=>{if(g.every(x=>pool.has(x))) out.push(`具备${g.join('')}三刑支位组合`);});
    return out;
  }

  function renderCalendar(){
    if(typeof Solar==='undefined'){ $('#calendarGrid').innerHTML='<div class="warning" style="grid-column:1/-1">历法核心加载失败，请联网刷新一次。首次成功打开后会进入离线缓存。</div>'; return; }
    const y=state.cursor.getFullYear(),m=state.cursor.getMonth();
    $('#monthTitle').textContent=`${y}年 ${m+1}月`;
    const terms=[];
    for(let day=1;day<=daysInMonth(y,m);day++){
      const lunar=lunarForDate(new Date(y,m,day)); const jq=safe(lunar,'getJieQi','');
      if(jq&&jq!=='—') terms.push(`${m+1}月${day}日 · ${jq}`);
    }
    $('#solarTermStrip').innerHTML=terms.length?terms.map(t=>`<span class="term-chip">${html(t)}</span>`).join(''):'<span class="term-chip">本月无节气数据</span>';

    const first=new Date(y,m,1); const start=new Date(y,m,1-first.getDay());
    let cells='';
    for(let i=0;i<42;i++){
      const d=new Date(start);d.setDate(start.getDate()+i);
      const lunar=lunarForDate(d);
      const label=lunarLabel(lunar);
      const gz=safe(lunar,'getDayInGanZhi', '');
      const festivals=[...arr(safe(lunar,'getFestivals',[])),...arr(safe(lunar,'getOtherFestivals',[]))];
      const jq=safe(lunar,'getJieQi','');
      const cls=['day-cell',d.getMonth()!==m?'other':'',sameDate(d,state.selected)?'selected':'',sameDate(d,new Date())?'today':''].filter(Boolean).join(' ');
      cells+=`<button class="${cls}" data-date="${dateKey(d)}">${(festivals.length||jq)?'<i class="festival-dot"></i>':''}<span class="day-num">${d.getDate()}</span><span class="lunar-label">${html(label)}</span><span class="gz-label">${html(gz)}日</span></button>`;
    }
    $('#calendarGrid').innerHTML=cells;
    $$('#calendarGrid [data-date]').forEach(btn=>btn.addEventListener('click',()=>{
      const [yy,mm,dd]=btn.dataset.date.split('-').map(Number);state.selected=new Date(yy,mm-1,dd);state.cursor=new Date(yy,mm-1,1);renderCalendar();renderDetail();switchView('detail');
    }));
  }

  function kv(label,value){ return `<div class="kv"><b>${html(label)}</b><span>${html(value||'—')}</span></div>`; }

  function renderJieQiBoundary(lunar){
    const prev=safe(lunar,'getPrevJieQi',null,false);
    const next=safe(lunar,'getNextJieQi',null,false);
    const prevJie=safe(lunar,'getPrevJie',null,false);
    const nextJie=safe(lunar,'getNextJie',null,false);
    const item=(title,jq)=>jq&&jq!=='—'?`${safe(jq,'getName','—')} · ${solarText(safe(jq,'getSolar',null),true)}`:'—';
    let transition='';
    try{
      const early=lunarForDate(state.selected,0,1), late=lunarForDate(state.selected,23,59);
      const pe=getExactPillars(early,false,'sect2'),pl=getExactPillars(late,false,'sect2');
      if(pe.year!==pl.year||pe.month!==pl.month){
        const current=safe(lunar,'getCurrentJie',null);
        const when=current&&current!=='—'?`${safe(current,'getName','交节')} ${solarText(safe(current,'getSolar',null),true)}`:'当天交节';
        transition=`<div class="warning" style="margin-top:10px;margin-bottom:0"><b>${html(when)}</b><br>交节前参考：${html(pe.year)}年 ${html(pe.month)}月；交节后参考：${html(pl.year)}年 ${html(pl.month)}月。若要看当天某一时刻，应按具体时间判断。</div>`;
      }
    }catch{}
    $('#jieqiCard').innerHTML=`<div class="section-title">节气交接</div><div class="kv-grid">
      ${kv('上一节气',item('',prev))}${kv('下一节气',item('',next))}
      ${kv('上一“节”',item('',prevJie))}${kv('下一“节”',item('',nextJie))}
    </div>${transition}<div class="note-line">八字月柱按“节”交月，不按农历初一换月。本页使用精确节气时刻参与年月柱计算。</div>`;
  }

  function renderDetail(){
    if(typeof Solar==='undefined')return;
    const d=state.selected; const solar=solarForDate(d,12,0); const lunar=solar.getLunar();
    const pillars=getExactPillars(lunar,false,'sect2');
    const lunarText=`农历${safe(lunar,'getYearInChinese','')}年${safe(lunar,'getMonthInChinese','')}月${safe(lunar,'getDayInChinese','')}`;
    const festivals=[...arr(safe(lunar,'getFestivals',[])),...arr(safe(lunar,'getOtherFestivals',[])),...arr(safe(solar,'getFestivals',[]))];
    const jq=safe(lunar,'getJieQi',''); if(jq&&jq!=='—')festivals.unshift(jq);
    $('#dateHero').innerHTML=`<div class="date-big">${d.getDate()}</div><div class="date-sub">${d.getFullYear()}年${d.getMonth()+1}月 · 星期${'日一二三四五六'[d.getDay()]}</div><div class="date-lunar">${html(lunarText)}</div><div class="pill-row"><span class="pill">${html(pillars.year)}年</span><span class="pill">${html(pillars.month)}月</span><span class="pill">${html(pillars.day)}日</span>${festivals.slice(0,3).map(x=>`<span class="pill">${html(x)}</span>`).join('')}</div>`;

    const dayGz=pillars.day, dayStem=dayGz[0];
    $('#ganzhiCard').innerHTML=`<div class="section-title">当天命理信息</div><div class="kv-grid">
      ${kv('年柱',pillars.year)}${kv('月柱',pillars.month)}
}${kv('日柱',pillars.day)}${kv('日主五行',`${STEM_INFO[dayStem]?.join('')||'—'}${dayStem}`)}
      ${kv('日柱纳音',NAYIN[dayGz]||safe(lunar,'getDayNaYin','—'))}${kv('日干临日支地势',safe(pillars.eightChar,'getDayDiShi','—'))}
      ${kv('旬',safe(lunar,'getDayXun','—'))}${kv('旬空',safe(lunar,'getDayXunKong','—'))}
      ${kv('建除十二神',safe(lunar,'getZhiXing','—'))}${kv('值日天神',`${safe(lunar,'getDayTianShen','—')} · ${safe(lunar,'getDayTianShenType','—')}`)}
      ${kv('二十八宿',`${safe(lunar,'getXiu','—')} · ${safe(lunar,'getXiuLuck','—')}`)}${kv('月相',safe(lunar,'getYueXiang','—'))}
      ${kv('冲',safe(lunar,'getDayChongDesc',safe(lunar,'getChongDesc','—')))}${kv('煞',safe(lunar,'getDaySha',safe(lunar,'getSha','—')))}
      ${kv('彭祖百忌·干',safe(lunar,'getPengZuGan','—'))}${kv('彭祖百忌·支',safe(lunar,'getPengZuZhi','—'))}
    </div>`;

    renderJieQiBoundary(lunar);

    const yi=arr(safe(lunar,'getDayYi',safe(lunar,'getYi',[]))).join(' · ')||'无';
    const ji=arr(safe(lunar,'getDayJi',safe(lunar,'getJi',[]))).join(' · ')||'无';
    const jiShen=arr(safe(lunar,'getDayJiShen',[])).join(' · ');
    const xiongSha=arr(safe(lunar,'getDayXiongSha',[])).join(' · ');
    $('#huangliCard').innerHTML=`<div class="section-title">传统黄历</div><div class="yi-ji"><div class="yi"><b>宜</b><p>${html(yi)}</p></div><div class="ji"><b>忌</b><p>${html(ji)}</p></div></div>${jiShen||xiongSha?`<div class="kv-grid" style="margin-top:10px">${kv('吉神宜趋',jiShen||'—')}${kv('凶煞宜忌',xiongSha||'—')}</div>`:''}`;

    renderHours(d);
    renderPersonalToday(lunar);
  }

  function renderHours(d){
    const hours=[23,1,3,5,7,9,11,13,15,17,19,21];
    const names=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    const rows=hours.map((h,i)=>{
      const lunar=lunarForDate(d,h,0);const gz=safe(lunar,'getTimeInGanZhi','—');
      const ts=safe(lunar,'getTimeTianShen',''); const luck=safe(lunar,'getTimeTianShenLuck','');
      const range=i===0?'23:00–00:59':`${pad(h)}:00–${pad(h+1)}:59`;
      return `<div class="hour-row"><strong>${names[i]}时</strong><span>${html(gz)}</span><span>${range}${ts&&ts!=='—'?` · ${html(ts)}${luck&&luck!=='—'?`(${html(luck)})`:''}`:''}</span></div>`;
    }).join('');
    $('#hourCard').innerHTML=`<div class="section-title">十二时辰</div><div class="hour-list">${rows}</div>`;
  }

  function birthLunarFromProfile(p, overrideTime=null){
    const y=Number(p.year),m=Number(p.month),d=Number(p.day);
    const hasTime=overrideTime!==null?true:Boolean(p.time);
    const timeString=overrideTime!==null?overrideTime:p.time;
    const [h,min]=hasTime?timeString.split(':').map(Number):[12,0];
    if(p.calendarType==='lunar'){
      const lm=p.leap?-m:m;
      const lunar=Lunar.fromYmdHms(y,lm,d,h,min,0);
      return {lunar,solar:lunar.getSolar(),hasTime,h,min};
    }
    const solar=Solar.fromYmdHms ? Solar.fromYmdHms(y,m,d,h,min,0) : Solar.fromDate(new Date(y,m-1,d,h,min));
    return {solar,lunar:solar.getLunar(),hasTime,h,min};
  }

  function birthChart(){
    if(!state.profile||typeof Solar==='undefined') return null;
    try{
      const src=birthLunarFromProfile(state.profile);
      const sect=state.profile.ziRule||'sect2';
      const pillars=getExactPillars(src.lunar,src.hasTime,sect);
      return {...src,pillars,eightChar:pillars.eightChar};
    }catch(e){ console.warn(e); return null; }
  }

  function boundaryPossibilities(){
    if(!state.profile || state.profile.time) return null;
    try{
      const a=birthLunarFromProfile(state.profile,'00:01');
      const b=birthLunarFromProfile(state.profile,'23:59');
      const sect=state.profile.ziRule||'sect2';
      const pa=getExactPillars(a.lunar,true,sect),pb=getExactPillars(b.lunar,true,sect);
      const changed=pa.year!==pb.year||pa.month!==pb.month;
      if(!changed) return null;
      const dayLunar=birthLunarFromProfile(state.profile,'12:00').lunar;
      const currentJie=safe(dayLunar,'getCurrentJie',null);
      return {pa,pb,currentJie};
    }catch{return null;}
  }

  function relationLine(transitName,transitGz,natalName,natalGz){
    if(!transitGz||!natalGz||transitGz.length<2||natalGz.length<2)return [];
    const sr=stemRelations(transitGz[0],natalGz[0]);
    const br=branchRelations(transitGz[1],natalGz[1]);
    return [...sr.map(x=>`${transitName}${transitGz[0]} 与 ${natalName}${natalGz[0]}：${x}`),...br.map(x=>`${transitName}${transitGz[1]} 与 ${natalName}${natalGz[1]}：${x}`)];
  }

  function daYunData(chart,targetYear=new Date().getFullYear()){
    if(!chart?.hasTime || !chart.eightChar || !state.profile || state.profile.gender==='unknown') return null;
    try{
      const gender=state.profile.gender==='male'?1:0;
      const rule=Number(state.profile.yunRule||1)===2?2:1;
      const yun=chart.eightChar.getYun(gender,rule);
      const list=yun.getDaYun(10).filter(x=>safe(x,'getIndex',0)>0);
      const current=list.find(x=>targetYear>=safe(x,'getStartYear',9999)&&targetYear<=safe(x,'getEndYear',-1))||null;
      return {yun,list,current,rule};
    }catch(e){console.warn(e);return null;}
  }

  function renderPersonalToday(transitLunar){
    const card=$('#personalToday'); const chart=birthChart();
    if(!chart){ card.classList.add('hidden'); return; }
    const transit=getExactPillars(transitLunar,false,'sect2');
    const natalPillars=[['年柱',chart.pillars.year],['月柱',chart.pillars.month],['日柱',chart.pillars.day]];
    if(chart.pillars.time)natalPillars.push(['时柱',chart.pillars.time]);
    const transits=[['流年',transit.year],['流月',transit.month],['流日',transit.day]];
    const groups=[];
    const dm=chart.pillars.day[0];
    for(const [tn,tgz] of transits){
      const lines=natalPillars.flatMap(([nn,ngz])=>relationLine(tn,tgz,nn,ngz));
      const natalBranches=natalPillars.map(x=>x[1]?.[1]).filter(Boolean);
      lines.push(...multiBranchRelations(tgz?.[1],natalBranches).map(x=>`${tn}${tgz?.[1]}：${x}`));
      groups.push({tn,tgz,tenGod:tenGod(dm,tgz?.[0]),lines:[...new Set(lines)]});
    }
    const dy=daYunData(chart,state.selected.getFullYear());
    card.classList.remove('hidden');
    card.innerHTML=`<div class="section-title">所选日期与你</div><div class="warning">这里显示的是可复算的干支结构关系。单个“冲、合、刑、害”不直接等同于现实中的吉凶事件。</div>
      <div class="flow-grid">${groups.map(g=>`<div class="flow-card"><b>${g.tn}</b><strong>${html(g.tgz)}</strong><span>${html(g.tenGod)}</span></div>`).join('')}${dy?.current?`<div class="flow-card accent"><b>大运</b><strong>${html(safe(dy.current,'getGanZhi','—'))}</strong><span>${safe(dy.current,'getStartYear','')}–${safe(dy.current,'getEndYear','')}</span></div>`:''}</div>
      ${groups.map(g=>`<div class="relation-block"><b>${g.tn} ${html(g.tgz)} · ${html(g.tenGod)}</b><ul class="list-clean">${g.lines.length?g.lines.map(x=>`<li><span class="relation-tag">关系</span>${html(x)}</li>`).join(''):'<li>与原局未检测到本版列出的主要合冲刑害关系</li>'}</ul></div>`).join('')}${window.BaziV05?window.BaziV05.renderDaily(chart.pillars,transit,{boundary:!!boundaryPossibilities()}):''}`;
  }

  function ecPillar(ec,key,gz,dayStem){
    if(!gz) return {name:key,gz:null};
    const methodPrefix={年:'Year',月:'Month',日:'Day',时:'Time'}[key];
    const hide=arr(safe(ec,`get${methodPrefix}HideGan`,HIDDEN_STEMS[gz[1]]||[]));
    const hideGod=arr(safe(ec,`get${methodPrefix}ShiShenZhi`,hide.map(s=>tenGod(dayStem,s))));
    return {
      name:key,
      gz,
      stem:gz[0],branch:gz[1],
      stemGod:safe(ec,`get${methodPrefix}ShiShenGan`,key==='日'?'日主':tenGod(dayStem,gz[0])),
      hide,hideGod,
      wx:safe(ec,`get${methodPrefix}WuXing`,`${STEM_INFO[gz[0]]?.[0]||'—'}${BRANCH_ELEMENT[gz[1]]||'—'}`),
      nayin:safe(ec,`get${methodPrefix}NaYin`,NAYIN[gz]||'—'),
      dishi:safe(ec,`get${methodPrefix}DiShi`,'—'),
      xun:safe(ec,`get${methodPrefix}Xun`,'—'),
      kong:safe(ec,`get${methodPrefix}XunKong`,'—')
    };
  }

  function renderBaziTable(chart){
    const p=chart.pillars,ec=chart.eightChar,dm=p.day[0];
    const cols=[ecPillar(ec,'年',p.year,dm),ecPillar(ec,'月',p.month,dm),ecPillar(ec,'日',p.day,dm),ecPillar(ec,'时',p.time,dm)];
    const row=(label,fn)=>`<div class="bazi-row"><div class="bazi-label">${label}</div>${cols.map(c=>`<div class="bazi-cell">${c.gz?fn(c):'<span class="muted">—</span>'}</div>`).join('')}</div>`;
    return `<div class="bazi-table">
      <div class="bazi-row bazi-head"><div class="bazi-label"></div>${cols.map(c=>`<div class="bazi-cell"><b>${c.name}柱</b></div>`).join('')}</div>
      ${row('十神',c=>`<span>${html(c.stemGod)}</span>`)}
      ${row('天干',c=>`<strong class="big-gz">${html(c.stem)}</strong><small>${html(STEM_INFO[c.stem]?.join('')||'—')}</small>`)}
      ${row('地支',c=>`<strong class="big-gz">${html(c.branch)}</strong><small>${html(BRANCH_ELEMENT[c.branch]||'—')}</small>`)}
      ${row('藏干',c=>c.hide.map((s,i)=>`<span class="hide-stem">${html(s)}<small>${html(c.hideGod[i]||tenGod(dm,s))}</small></span>`).join(''))}
      ${row('纳音',c=>`<span>${html(c.nayin)}</span>`)}
      ${row('地势',c=>`<span>${html(c.dishi)}</span>`)}
      ${row('旬空',c=>`<span>${html(c.kong)}</span><small>${html(c.xun)}</small>`)}
    </div>`;
  }

  function renderDaYun(chart){
    const dy=daYunData(chart,new Date().getFullYear());
    if(!chart.hasTime) return `<div class="card"><div class="section-title">大运</div><div class="warning">出生时辰未知，暂不计算起运时间和大运，避免用假定时辰生成结果。</div></div>`;
    if(state.profile.gender==='unknown') return `<div class="card"><div class="section-title">大运</div><div class="warning">请在“我的”设置性别后再计算大运。顺逆排规则需要使用年干阴阳与性别。</div></div>`;
    if(!dy) return `<div class="card"><div class="section-title">大运</div><p class="muted">大运暂时无法计算，请检查出生资料。</p></div>`;
    const yun=dy.yun;
    const startAge=`${safe(yun,'getStartYear',0)}年 ${safe(yun,'getStartMonth',0)}月 ${safe(yun,'getStartDay',0)}日${safe(yun,'getStartHour',0)?` ${safe(yun,'getStartHour',0)}时`:''}`;
    const startSolar=safe(yun,'getStartSolar',null);
    return `<div class="card"><div class="section-title">大运</div><div class="kv-grid">
      ${kv('排运方向',safe(yun,'isForward',false)?'顺排':'逆排')}${kv('起运折算',startAge)}
      ${kv('起运公历',solarText(startSolar))}${kv('起运算法',dy.rule===1?'流派1：3天1年、1天4个月、1时辰10天':'流派2：按分钟折算')}
    </div><div class="dayun-scroll">${dy.list.slice(0,8).map(x=>{
      const current=x===dy.current;
      return `<div class="dayun-item ${current?'current':''}"><span>${safe(x,'getStartAge','')}–${safe(x,'getEndAge','')}岁</span><strong>${html(safe(x,'getGanZhi','—'))}</strong><small>${safe(x,'getStartYear','')}–${safe(x,'getEndYear','')}</small>${current?'<i>当前</i>':''}</div>`;
    }).join('')}</div><div class="note-line">大运起运算法存在不同门派口径，当前使用你在“我的”中选择的算法；结果不与其他流派强行混用。</div></div>`;
  }

  function renderChart(){
    const chart=birthChart();
    if(!chart){$('#chartEmpty').classList.remove('hidden');$('#chartContent').classList.add('hidden');return;}
    $('#chartEmpty').classList.add('hidden');$('#chartContent').classList.remove('hidden');
    const p=chart.pillars,dm=p.day[0],ec=chart.eightChar;
    const boundary=boundaryPossibilities();
    const unknownWarn=!chart.hasTime?'<div class="warning">出生时辰未知：时柱不计算；若实际出生在23:00–23:59，日柱还会受你选择的“晚子时换日”规则影响。</div>':'';
    let boundaryWarn='';
    if(boundary){
      const jq=boundary.currentJie&&boundary.currentJie!=='—'?`${safe(boundary.currentJie,'getName','交节')} ${solarText(safe(boundary.currentJie,'getSolar',null),true)}`:'当天存在柱位边界';
      boundaryWarn=`<div class="warning strong-warning"><b>出生当天存在交界：${html(jq)}</b><br>00:01 参考：${html(boundary.pa.year)}年 ${html(boundary.pa.month)}月 ${html(boundary.pa.day)}日；23:59 参考：${html(boundary.pb.year)}年 ${html(boundary.pb.month)}月 ${html(boundary.pb.day)}日。因时辰未知，不能把其中一套当成唯一确定命盘。</div>`;
    }
    const originalSolar=`${safe(chart.solar,'getYear','')}-${pad(safe(chart.solar,'getMonth',''))}-${pad(safe(chart.solar,'getDay',''))}${chart.hasTime?` ${pad(chart.h)}:${pad(chart.min)}`:''}`;

    const extra=[];
    if(ec){
      extra.push(['胎元',safe(ec,'getTaiYuan','—')],['胎元纳音',safe(ec,'getTaiYuanNaYin','—')],['胎息',safe(ec,'getTaiXi','—')],['胎息纳音',safe(ec,'getTaiXiNaYin','—')]);
      if(chart.hasTime){
        extra.push(['命宫',safe(ec,'getMingGong','—')],['命宫纳音',safe(ec,'getMingGongNaYin','—')],['身宫',safe(ec,'getShenGong','—')],['身宫纳音',safe(ec,'getShenGongNaYin','—')]);
      }
    }

    $('#chartContent').innerHTML=`${unknownWarn}${boundaryWarn}
      <div class="card"><div class="section-title">专业四柱</div><div class="date-sub chart-sub">公历 ${html(originalSolar)}${state.profile.birthPlace?` · ${html(state.profile.birthPlace)}`:''}</div>${renderBaziTable(chart)}</div>
      <div class="card"><div class="section-title">命局基础数据</div><div class="kv-grid">${kv('日主',`${dm} · ${STEM_INFO[dm]?.join('')||'—'}`)}${kv('月令',p.month?.[1]||'—')}${extra.map(([k,v])=>kv(k,v)).join('')}</div><div class="note-line">十神、藏干、纳音、地势与旬空均按同一四柱规则计算；“胎元/胎息/命宫/身宫”属于传统命理辅助信息，不作为现代科学预测结论。</div></div>
      ${renderDaYun(chart)}
      ${window.BaziStrength?window.BaziStrength.renderNatal(p):''}
      ${window.BaziAdvanced?window.BaziAdvanced.renderPattern(p):''}
      ${window.BaziAdvanced?window.BaziAdvanced.renderClimate(p):''}
      ${window.BaziV05?window.BaziV05.renderComposite(p,{boundary:!!boundary}):''}
      ${window.BaziV05?window.BaziV05.renderShensha(p):''}
      <div class="card hidden"><div class="section-title">喜用神与个人宜忌</div><p class="muted paragraph">高级规则引擎仍未启用。本版继续不输出随机“喜用神、幸运色、吉凶分数”。下一阶段会先固定旺衰/格局/调候的具体体系，再开放结论和计算依据。</p></div>`;
  }

  function fillProfileForm(){
    const p=state.profile||{};
    $('#calendarType').value=p.calendarType||'solar';$('#birthYear').value=p.year||'';$('#birthMonth').value=p.month||'';$('#birthDay').value=p.day||'';$('#birthTime').value=p.time||'';$('#gender').value=p.gender||'unknown';$('#birthPlace').value=p.birthPlace||'';$('#birthLeap').checked=!!p.leap;$('#ziRule').value=p.ziRule||'sect2';$('#yunRule').value=String(p.yunRule||1);$('#trueSolarTime').checked=!!p.trueSolarTime;
    $('#leapMonthRow').classList.toggle('hidden',$('#calendarType').value!=='lunar');
    const version=$('#versionInfo'); if(version) version.textContent=`玄历 v${APP_VERSION} · lunar-javascript ${LUNAR_LIB_VERSION}`;
  }

  function switchView(name){
    const map={calendar:'#calendarView',detail:'#detailView',chart:'#chartView',profile:'#profileView'};
    $$('.view').forEach(v=>v.classList.remove('active'));$(map[name]).classList.add('active');
    $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===name));
    const titles={calendar:'玄历',detail:'日期详情',chart:'我的命盘',profile:'我的'};$('#pageTitle').textContent=titles[name];
    if(name==='detail')renderDetail();if(name==='chart')renderChart();if(name==='profile')fillProfileForm();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function bind(){
    $('#prevMonth').addEventListener('click',()=>{state.cursor=new Date(state.cursor.getFullYear(),state.cursor.getMonth()-1,1);renderCalendar();});
    $('#nextMonth').addEventListener('click',()=>{state.cursor=new Date(state.cursor.getFullYear(),state.cursor.getMonth()+1,1);renderCalendar();});
    $('#todayBtn').addEventListener('click',()=>{state.selected=new Date();state.cursor=new Date(state.selected.getFullYear(),state.selected.getMonth(),1);renderCalendar();renderDetail();switchView('detail');});
    $$('.tab').forEach(t=>t.addEventListener('click',()=>switchView(t.dataset.view)));
    $$('[data-go]').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.go)));
    $('#calendarType').addEventListener('change',()=>$('#leapMonthRow').classList.toggle('hidden',$('#calendarType').value!=='lunar'));
    $('#profileForm').addEventListener('submit',e=>{
      e.preventDefault();
      const p={calendarType:$('#calendarType').value,year:Number($('#birthYear').value),month:Number($('#birthMonth').value),day:Number($('#birthDay').value),time:$('#birthTime').value,gender:$('#gender').value,birthPlace:$('#birthPlace').value.trim(),leap:$('#birthLeap').checked,ziRule:$('#ziRule').value,yunRule:Number($('#yunRule').value||1),trueSolarTime:$('#trueSolarTime').checked};
      if(!p.year||!p.month||!p.day){toast('请填写出生年月日');return;}
      if(p.trueSolarTime){toast('真太阳时校正尚未启用，本次仍按输入时间排盘');p.trueSolarTime=false;$('#trueSolarTime').checked=false;}
      try{state.profile=p;const test=birthChart();if(!test)throw new Error('排盘失败');saveProfile(p);if($('#profileForm').dataset.dirty==='true'){$('#profileForm').dataset.dirty='false';navigator.serviceWorker?.getRegistration().then(r=>{if(r?.active?.scriptURL && window.__xuanliUpdatePending)location.reload();});}renderChart();renderDetail();toast('出生资料已保存');switchView('chart');}catch(err){console.error(err);toast('日期无效，请检查输入');}
    });
    $('#clearProfile').addEventListener('click',()=>{localStorage.removeItem(STORAGE_KEY);state.profile=null;fillProfileForm();renderChart();renderDetail();toast('已清除本机出生资料');});
  }

  function init(){
    bind();fillProfileForm();renderCalendar();renderDetail();renderChart();
    if('serviceWorker' in navigator){
      let reloading=false;
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(reloading)return;
        const form=document.querySelector('#profileForm');
        if(form?.dataset.dirty==='true'){window.__xuanliUpdatePending=true;toast('新版已就绪，保存资料后自动更新');return;}
        reloading=true;location.reload();
      });
      document.querySelector('#profileForm').addEventListener('input',e=>e.currentTarget.dataset.dirty='true');
      navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>{
        reg.update().catch(()=>{});
        document.addEventListener('visibilitychange',()=>{if(!document.hidden)reg.update().catch(()=>{});});
      }).catch(()=>{});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();

