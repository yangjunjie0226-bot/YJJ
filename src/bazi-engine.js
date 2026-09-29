/* 玄历 v0.3 扶抑分析引擎
 * 目标：确定性、可复算、展示依据。
 * 注意：权重是本应用为“扶抑法”建立的显式量化模型，不宣称为古籍唯一标准。
 */
(function(){
'use strict';
const STEMS=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const E={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const POL={甲:'阳',乙:'阴',丙:'阳',丁:'阴',戊:'阳',己:'阴',庚:'阳',辛:'阴',壬:'阳',癸:'阴'};
const BE={子:'水',丑:'土',寅:'木',卯:'木',辰:'土',巳:'火',午:'火',未:'土',申:'金',酉:'金',戌:'土',亥:'水'};
const H={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
const GEN={木:'火',火:'土',土:'金',金:'水',水:'木'};
const CTRL={木:'土',土:'水',水:'火',火:'金',金:'木'};
const ELEMENTS=['木','火','土','金','水'];
const COLORS={木:['青绿','墨绿'],火:['红','紫'],土:['米黄','卡其'],金:['白','银灰'],水:['深蓝','黑']};
const hiddenRatio={1:[1],2:[.7,.3],3:[.6,.3,.1]};
const branchBase={year:20,month:35,day:25,time:20};
const stemBase={year:9,month:11,day:12,time:9};
const posName={year:'年柱',month:'月柱',day:'日柱',time:'时柱'};

function invGen(el){return ELEMENTS.find(x=>GEN[x]===el)}
function invCtrl(el){return ELEMENTS.find(x=>CTRL[x]===el)}
function role(dm,el){
  if(el===dm)return '比劫';
  if(el===invGen(dm))return '印';
  if(el===GEN[dm])return '食伤';
  if(el===CTRL[dm])return '财';
  if(el===invCtrl(dm))return '官杀';
  return '其他';
}
function tenGod(dayStem,targetStem){
  if(!E[dayStem]||!E[targetStem])return '—';
  const de=E[dayStem],te=E[targetStem],same=POL[dayStem]===POL[targetStem];
  if(de===te)return same?'比肩':'劫财';
  if(GEN[de]===te)return same?'食神':'伤官';
  if(GEN[te]===de)return same?'偏印':'正印';
  if(CTRL[de]===te)return same?'偏财':'正财';
  if(CTRL[te]===de)return same?'七杀':'正官';
  return '—';
}
function seasonElement(monthBranch){return BE[monthBranch]}
function seasonState(season,el){
  if(el===season)return ['旺',1.60];
  if(GEN[season]===el)return ['相',1.30];
  if(GEN[el]===season)return ['休',1.00];
  if(CTRL[el]===season)return ['囚',0.75];
  if(CTRL[season]===el)return ['死',0.55];
  return ['平',1];
}
function rootLevel(dayStem,branch){
  const hs=H[branch]||[], idx=hs.indexOf(dayStem);
  if(idx===0)return ['本气通根',2.2];
  if(idx===1)return ['中气通根',1.4];
  if(idx===2)return ['余气通根',.8];
  const same=hs.find(s=>E[s]===E[dayStem]);
  if(same)return ['同类根',.6];
  return [null,0];
}
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function analyze(pillars){
  const ps={year:pillars.year,month:pillars.month,day:pillars.day,time:pillars.time||null};
  if(!ps.day||!ps.month)return null;
  const dayStem=ps.day[0],dm=E[dayStem],monthBranch=ps.month[1],season=seasonElement(monthBranch);
  const raw=Object.fromEntries(ELEMENTS.map(x=>[x,0]));
  const detail=[];
  for(const pos of ['year','month','day','time']){
    const gz=ps[pos]; if(!gz)continue;
    const st=gz[0],br=gz[1];
    if(E[st]){raw[E[st]]+=stemBase[pos];detail.push({type:'干',pos,token:st,el:E[st],raw:stemBase[pos]});}
    const hs=H[br]||[],rat=hiddenRatio[hs.length]||[];
    hs.forEach((s,i)=>{const w=branchBase[pos]*(rat[i]||0);raw[E[s]]+=w;detail.push({type:'支藏',pos,token:s,el:E[s],raw:w});});
  }
  const weighted={};
  for(const el of ELEMENTS){const [state,mul]=seasonState(season,el);weighted[el]=raw[el]*mul;}
  const total=Object.values(weighted).reduce((a,b)=>a+b,0)||1;
  const pct=Object.fromEntries(ELEMENTS.map(el=>[el,weighted[el]/total]));
  const resource=invGen(dm),output=GEN[dm],wealth=CTRL[dm],officer=invCtrl(dm);
  const support=(weighted[dm]+weighted[resource])/total;
  const oppose=1-support;

  const roots=[];
  let rootScore=0;
  for(const pos of ['year','month','day','time']){
    const gz=ps[pos]; if(!gz)continue;
    const [label,score]=rootLevel(dayStem,gz[1]);
    if(label){roots.push({pos,label,branch:gz[1],score});rootScore+=score*(pos==='month'?1.5:1);}
  }

  const monthHidden=H[monthBranch]||[];
  const monthMain=monthHidden[0]||null;
  const monthMainGod=monthMain?tenGod(dayStem,monthMain):'—';
  const otherStems=['year','month','time'].map(k=>ps[k]?.[0]).filter(Boolean);
  const through=monthHidden.map((s,i)=>({stem:s,level:i===0?'本气':i===1?'中气':'余气',god:tenGod(dayStem,s),through:otherStems.includes(s)}));

  const monthRelation=role(dm,season);
  let deLing;
  if(season===dm)deLing='得令（同旺）';
  else if(season===resource)deLing='得令助身（印生）';
  else if(season===output)deLing='月令泄身';
  else if(season===wealth)deLing='月令耗身';
  else deLing='月令克身';

  const supportStems=['year','month','time'].filter(k=>ps[k]&&[dm,resource].includes(E[ps[k][0]])).length;
  const opposeStems=['year','month','time'].filter(k=>ps[k]&&![dm,resource].includes(E[ps[k][0]])).length;
  const deShi=supportStems>opposeStems?'得势偏多':supportStems<opposeStems?'失势偏多':'干上势均';

  let level,extreme=false;
  if(support>=.80){level='偏旺';extreme=true;}
  else if(support>=.66)level='身强';
  else if(support>=.56)level='偏强';
  else if(support>=.44)level='中和';
  else if(support>=.34)level='偏弱';
  else if(support>=.20)level='身弱';
  else {level='偏弱极端';extreme=true;}

  const noRoot=rootScore<.8;
  const candidate=(support<.20&&noRoot)?'疑似从弱边界':(support>.80&&oppose<.20)?'疑似专旺/从强边界':null;

  let direction=[],avoid=[],primary=null,secondary=null;
  if(!candidate&&!extreme){
    if(support>=.56){
      direction=[output,officer,wealth]; avoid=[dm,resource]; primary=output;secondary=officer;
    }else if(support<=.44){
      direction=[resource,dm]; avoid=[officer,wealth,output]; primary=resource;secondary=dm;
    }else{
      const sorted=[...ELEMENTS].sort((a,b)=>pct[a]-pct[b]);
      direction=sorted.slice(0,2); avoid=sorted.slice(-2).reverse(); primary=direction[0];secondary=direction[1];
    }
  }

  const elementRows=ELEMENTS.map(el=>{
    const [ss]=seasonState(season,el);
    return {el,pct:pct[el],raw:raw[el],weighted:weighted[el],season:ss,role:role(dm,el)};
  }).sort((a,b)=>b.pct-a.pct);

  return {
    pillars:ps,dayStem,dm,resource,output,wealth,officer,monthBranch,season,
    raw,weighted,pct,support,oppose,roots,rootScore,through,monthMain,monthMainGod,
    deLing,deShi,level,extreme,candidate,direction,avoid,primary,secondary,elementRows,
    model:'子平扶抑法·量化辅助模型 v1'
  };
}

function fmtPct(v){return (v*100).toFixed(1)+'%'}
function colorText(elements){return elements.filter(Boolean).flatMap(el=>(COLORS[el]||[]).map(c=>el+'·'+c)).join(' / ')||'—'}
function activityForGod(god){
  const map={
    比肩:['协作、同辈沟通、自己推进','合伙账目与利益边界要写清楚'],
    劫财:['团队协同、资源整合、执行推进','借贷、冲动竞争、临时加码要谨慎'],
    正印:['学习、复盘、资料整理、证照手续','避免只准备不行动'],
    偏印:['研究、独立思考、技术性工作','避免钻牛角尖或频繁改方案'],
    食神:['表达、创作、沟通、生活安排','避免节奏过松'],
    伤官:['输出、创意、谈判、发现问题','与规则/上级硬碰时宜留余地'],
    正财:['预算、对账、采购、落实交易','不宜情绪性消费'],
    偏财:['商务接触、资源信息、市场观察','临时投资和人情支出宜设上限'],
    正官:['手续、合同、制度内事项、按计划完成','避免拖延截止事项'],
    七杀:['处理紧急任务、攻坚、明确边界','高压决策宜先核实信息']
  };
  return map[god]||['按原计划处理重要事项','不以单一十神替代现实判断'];
}
function renderBars(a){
  return '<div class="element-bars">'+a.elementRows.map(r=>`
    <div class="element-row">
      <div class="element-meta"><b>${r.el}</b><span>${r.role} · ${r.season}</span><strong>${fmtPct(r.pct)}</strong></div>
      <div class="element-track"><i style="width:${Math.max(2,r.pct*100)}%"></i></div>
    </div>`).join('')+'</div>';
}
function renderNatal(pillars){
  const a=analyze(pillars); if(!a)return '';
  const roots=a.roots.length?a.roots.map(r=>`${posName[r.pos]}${r.branch}：${r.label}`).join('；'):'未见日干直接通根';
  const through=a.through.map(x=>`${x.level}${x.stem}（${x.god}）${x.through?'已透干':'未透干'}`).join('；');
  const direction=(a.candidate||a.extreme)
    ? `<div class="warning strong-warning"><b>${esc(a.candidate||'极端比例边界')}</b><br>该结构已接近普通扶抑法的适用边界，本版不直接给“喜用神”结论，需由格局法/从格条件继续复核。</div>`
    : `<div class="use-grid">
        <div><b>扶抑优先</b><strong>${esc(a.primary)} → ${esc(a.secondary)}</strong><small>方向：${esc(a.direction.join('、'))}</small></div>
        <div><b>慎增方向</b><strong>${esc(a.avoid.join('、'))}</strong><small>这是扶抑取向，不等同于唯一终身用神</small></div>
      </div>
      <div class="color-line"><b>辅助色参考：</b>${esc(colorText([a.primary,a.secondary]))}</div>`;
  const monthThrough=a.through.find(x=>x.stem===a.monthMain)?.through;
  return `<div class="card strength-card">
    <div class="section-title">旺衰与扶抑分析 <span class="beta-tag">v0.3</span></div>
    <div class="warning">采用“${esc(a.model)}”。月令优先，并将天干、地支藏干、通根与季节旺相休囚死转为公开权重。<b>量化权重是本应用的可复算模型，不是古籍统一分值标准。</b></div>
    <div class="strength-summary">
      <div><span>日主</span><strong>${esc(a.dayStem)} · ${a.dm}</strong></div>
      <div><span>旺衰层级</span><strong>${esc(a.level)}</strong></div>
      <div><span>扶助比</span><strong>${fmtPct(a.support)}</strong></div>
      <div><span>月令</span><strong>${esc(a.monthBranch)} · ${esc(a.deLing)}</strong></div>
    </div>
    ${renderBars(a)}
    <div class="evidence-list">
      <p><b>得地 / 通根：</b>${esc(roots)}</p>
      <p><b>得势：</b>${esc(a.deShi)}；干上扶身 ${['year','month','time'].filter(k=>a.pillars[k]&&[a.dm,a.resource].includes(E[a.pillars[k][0]])).length} 位。</p>
      <p><b>月令格局线索：</b>${esc(a.monthMain)} 为月令本气，十神为 ${esc(a.monthMainGod)}，${monthThrough?'已在天干透出':'未见同字透干'}。本版只显示线索，不据此单独定格。</p>
      <p><b>月令藏干：</b>${esc(through)}</p>
    </div>
    ${direction}
    <div class="note-line">扶抑法适合判断“日主承受力与五行平衡方向”，但从格、化格、专旺、调候急迫等情况不能只靠一个强弱比例判断，所以这些边界会主动停止自动结论。</div>
  </div>`;
}
function renderDaily(natalPillars,transitPillars){
  const a=analyze(natalPillars); if(!a||!transitPillars?.day)return '';
  const dayGz=transitPillars.day,st=dayGz[0],br=dayGz[1],el=E[st],god=tenGod(a.dayStem,st);
  const favorable=!a.candidate&&a.direction.includes(el);
  const adverse=!a.candidate&&a.avoid.includes(el);
  let impact='中性观察';
  if(a.candidate)impact='边界命局，不自动判喜忌';
  else if(favorable)impact='流日天干落在扶抑有利方向';
  else if(adverse)impact='流日天干落在当前慎增方向';
  const [good,caution]=activityForGod(god);
  const recommended=a.candidate?[]:[a.primary,a.secondary].filter(Boolean);
  return `<div class="daily-balance">
    <div class="section-title">个人日用参考 · 扶抑法</div>
    <div class="daily-grid">
      <div><span>流日十神</span><strong>${esc(dayGz)} · ${esc(god)}</strong></div>
      <div><span>对原局作用</span><strong>${esc(impact)}</strong></div>
      <div><span>辅助五行</span><strong>${esc(recommended.join('、')||'暂不判')}</strong></div>
      <div><span>颜色参考</span><strong>${esc(colorText(recommended))}</strong></div>
    </div>
    <div class="yi-ji personal-yi-ji">
      <div class="yi"><b>宜参考</b><p>${esc(good)}${favorable?'；当天五行方向与扶抑目标一致，可按正常节奏推进':''}</p></div>
      <div class="ji"><b>慎参考</b><p>${esc(caution)}${adverse?'；当天五行会进一步偏向原局较重一侧，重要事项多做一次核对':''}</p></div>
    </div>
    <div class="note-line">这是传统十神与扶抑规则的生活化提示，不是对现实结果的保证，也不会覆盖你当天真实的工作、健康、财务或法律条件。</div>
  </div>`;
}
window.BaziStrength={analyze,renderNatal,renderDaily,version:'0.3.0'};
})();
