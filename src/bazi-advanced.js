/* 玄历 v0.5 格局 + 调候引擎
 * 格局：月令为纲，透干优先；建禄/月刃与杂气月令单列。
 * 调候：使用《穷通宝鉴》通行“第一调候干”简表做初筛，并检查原局是否透/藏。
 * 不把格局、调候、扶抑三者强行合成唯一答案。
 */
(function(){
'use strict';
const E={甲:'木',乙:'木',丙:'火',丁:'火',戊:'土',己:'土',庚:'金',辛:'金',壬:'水',癸:'水'};
const POL={甲:'阳',乙:'阴',丙:'阳',丁:'阴',戊:'阳',己:'阴',庚:'阳',辛:'阴',壬:'阳',癸:'阴'};
const H={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
const GEN={木:'火',火:'土',土:'金',金:'水',水:'木'};
const CTRL={木:'土',土:'水',水:'火',火:'金',金:'木'};
const STORAGE=new Set(['辰','戌','丑','未']);
const CLIMATE={
  寅:'孟春·余寒未尽',卯:'仲春·木旺渐暖',辰:'季春·湿土',
  巳:'孟夏·渐热',午:'仲夏·炎热',未:'季夏·暑燥',
  申:'孟秋·余暑',酉:'仲秋·燥凉',戌:'季秋·燥土',
  亥:'孟冬·初寒',子:'仲冬·严寒',丑:'季冬·寒湿'
};
const QIONGTONG_PRIMARY={
  甲:{寅:'丙',卯:'庚',辰:'庚',巳:'癸',午:'癸',未:'癸',申:'丁',酉:'丁',戌:'甲',亥:'丁',子:'丁',丑:'丁'},
  乙:{寅:'丙',卯:'丙',辰:'癸',巳:'癸',午:'癸',未:'癸',申:'丙',酉:'癸',戌:'癸',亥:'丙',子:'丙',丑:'丙'},
  丙:{寅:'壬',卯:'壬',辰:'壬',巳:'壬',午:'壬',未:'壬',申:'戊',酉:'戊',戌:'甲',亥:'甲',子:'戊',丑:'戊'},
  丁:{寅:'甲',卯:'甲',辰:'甲',巳:'甲',午:'壬',未:'甲',申:'甲',酉:'甲',戌:'甲',亥:'甲',子:'甲',丑:'甲'},
  戊:{寅:'丙',卯:'丙',辰:'甲',巳:'甲',午:'壬',未:'癸',申:'丙',酉:'丙',戌:'甲',亥:'甲',子:'丙',丑:'丙'},
  己:{寅:'丙',卯:'丙',辰:'癸',巳:'癸',午:'癸',未:'癸',申:'丙',酉:'丙',戌:'丙',亥:'丙',子:'丙',丑:'丙'},
  庚:{寅:'戊',卯:'丁',辰:'甲',巳:'壬',午:'壬',未:'癸',申:'丁',酉:'丁',戌:'甲',亥:'丁',子:'丙',丑:'丙'},
  辛:{寅:'己',卯:'壬',辰:'壬',巳:'壬',午:'壬',未:'壬',申:'壬',酉:'壬',戌:'壬',亥:'壬',子:'丙',丑:'丙'},
  壬:{寅:'庚',卯:'戊',辰:'甲',巳:'壬',午:'壬',未:'癸',申:'戊',酉:'丁',戌:'甲',亥:'戊',子:'戊',丑:'戊'},
  癸:{寅:'丙',卯:'丙',辰:'丙',巳:'辛',午:'辛',未:'辛',申:'丁',酉:'丁',戌:'辛',亥:'庚',子:'丙',丑:'丙'}
};
const GOD_PATTERN={正官:'正官格',七杀:'七杀格',正财:'正财格',偏财:'偏财格',正印:'正印格',偏印:'偏印格',食神:'食神格',伤官:'伤官格'};
const SUPPORT_ROLES={
  正官:['财','印'],七杀:['食伤','印'],正财:['食伤','官杀'],偏财:['食伤','官杀'],
  正印:['官杀','比劫'],偏印:['官杀','比劫'],食神:['财'],伤官:['财','印']
};
function invGen(el){return Object.keys(GEN).find(k=>GEN[k]===el)}
function invCtrl(el){return Object.keys(CTRL).find(k=>CTRL[k]===el)}
function roleEl(dm,role){
  if(role==='比劫')return dm;
  if(role==='印')return invGen(dm);
  if(role==='食伤')return GEN[dm];
  if(role==='财')return CTRL[dm];
  if(role==='官杀')return invCtrl(dm);
  return null;
}
function tenGod(ds,ts){
  if(!E[ds]||!E[ts])return '—';
  const de=E[ds],te=E[ts],same=POL[ds]===POL[ts];
  if(de===te)return same?'比肩':'劫财';
  if(GEN[de]===te)return same?'食神':'伤官';
  if(GEN[te]===de)return same?'偏印':'正印';
  if(CTRL[de]===te)return same?'偏财':'正财';
  if(CTRL[te]===de)return same?'七杀':'正官';
  return '—';
}
function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function pillarStems(p){return ['year','month','day','time'].map(k=>p[k]?.[0]).filter(Boolean)}
function pillarBranches(p){return ['year','month','day','time'].map(k=>p[k]?.[1]).filter(Boolean)}
function exactStemPresence(p,stem){
  const stems=pillarStems(p),branches=pillarBranches(p);
  const visible=stems.filter(x=>x===stem).length;
  const hidden=branches.reduce((n,b)=>n+(H[b]||[]).filter(x=>x===stem).length,0);
  return {visible,hidden};
}
function monthDiShi(dayStem,monthBranch){
  const stages={
    甲:{亥:'长生',子:'沐浴',丑:'冠带',寅:'临官',卯:'帝旺',辰:'衰',巳:'病',午:'死',未:'墓',申:'绝',酉:'胎',戌:'养'},
    乙:{午:'长生',巳:'沐浴',辰:'冠带',卯:'临官',寅:'帝旺',丑:'衰',子:'病',亥:'死',戌:'墓',酉:'绝',申:'胎',未:'养'},
    丙:{寅:'长生',卯:'沐浴',辰:'冠带',巳:'临官',午:'帝旺',未:'衰',申:'病',酉:'死',戌:'墓',亥:'绝',子:'胎',丑:'养'},
    丁:{酉:'长生',申:'沐浴',未:'冠带',午:'临官',巳:'帝旺',辰:'衰',卯:'病',寅:'死',丑:'墓',子:'绝',亥:'胎',戌:'养'},
    戊:{寅:'长生',卯:'沐浴',辰:'冠带',巳:'临官',午:'帝旺',未:'衰',申:'病',酉:'死',戌:'墓',亥:'绝',子:'胎',丑:'养'},
    己:{酉:'长生',申:'沐浴',未:'冠带',午:'临官',巳:'帝旺',辰:'衰',卯:'病',寅:'死',丑:'墓',子:'绝',亥:'胎',戌:'养'},
    庚:{巳:'长生',午:'沐浴',未:'冠带',申:'临官',酉:'帝旺',戌:'衰',亥:'病',子:'死',丑:'墓',寅:'绝',卯:'胎',辰:'养'},
    辛:{子:'长生',亥:'沐浴',戌:'冠带',酉:'临官',申:'帝旺',未:'衰',午:'病',巳:'死',辰:'墓',卯:'绝',寅:'胎',丑:'养'},
    壬:{申:'长生',酉:'沐浴',戌:'冠带',亥:'临官',子:'帝旺',丑:'衰',寅:'病',卯:'死',辰:'墓',巳:'绝',午:'胎',未:'养'},
    癸:{卯:'长生',寅:'沐浴',丑:'冠带',子:'临官',亥:'帝旺',戌:'衰',酉:'病',申:'死',未:'墓',午:'绝',巳:'胎',辰:'养'}
  };
  return stages[dayStem]?.[monthBranch]||'—';
}

function analyzePattern(p){
  const ds=p.day?.[0],mb=p.month?.[1]; if(!ds||!mb)return null;
  const hidden=H[mb]||[], visible=pillarStems(p).filter((_,i)=>true);
  const visibleExDay=['year','month','time'].map(k=>p[k]?.[0]).filter(Boolean);
  const stage=monthDiShi(ds,mb);
  const hiddenInfo=hidden.map((s,i)=>({stem:s,level:i===0?'本气':i===1?'中气':'余气',god:tenGod(ds,s),visible:visibleExDay.includes(s)}));
  let candidate=null,basis='',coreGod=null,coreStem=null,confidence='候选';
  if(stage==='临官'){
    candidate='建禄格'; basis='日主临官在月令，建禄结构单列，不按普通财官印食格处理。';coreGod='比劫';coreStem=hidden[0]||null;confidence='明确结构';
  }else if(stage==='帝旺'){
    candidate='月刃/帝旺结构'; basis='日主帝旺在月令，按月刃/羊刃类结构单列；名称及细则随流派有差异。';coreGod='比劫';coreStem=hidden[0]||null;confidence='明确结构';
  }else{
    const main=hiddenInfo[0]||null;
    const mainVisible=main?.visible;
    const secondary=hiddenInfo.slice(1).find(x=>x.visible&&GOD_PATTERN[x.god]);
    if(STORAGE.has(mb)){
      if(mainVisible&&GOD_PATTERN[main.god]){
        candidate='杂气'+GOD_PATTERN[main.god];coreGod=main.god;coreStem=main.stem;basis='辰戌丑未为杂气月令，本气透干，作为主要格局候选。';confidence='较强候选';
      }else if(secondary){
        candidate='杂气'+GOD_PATTERN[secondary.god];coreGod=secondary.god;coreStem=secondary.stem;basis=`辰戌丑未为杂气月令，${secondary.level}${secondary.stem}透干，作为格局候选。`;confidence='候选';
      }else{
        candidate='杂气月令·待定';coreGod=main?.god||null;coreStem=main?.stem||null;basis='辰戌丑未杂气未见可直接取格的月令藏干透出，本版不强定格。';confidence='待复核';
      }
    }else if(main&&GOD_PATTERN[main.god]){
      if(mainVisible){candidate=GOD_PATTERN[main.god];coreGod=main.god;coreStem=main.stem;basis='月令本气透干，按月令为纲取格。';confidence='较强候选';}
      else if(secondary){candidate=GOD_PATTERN[secondary.god];coreGod=secondary.god;coreStem=secondary.stem;basis=`月令本气未透，${secondary.level}${secondary.stem}透干，列为次级格局候选。`;confidence='候选';}
      else{candidate=GOD_PATTERN[main.god]+'候选';coreGod=main.god;coreStem=main.stem;basis='月令本气未透，仅按月令十神列出候选，不判“成格”。';confidence='待复核';}
    }else{
      candidate='月令比劫结构';coreGod=main?.god||'比劫';coreStem=main?.stem||null;basis='月令本气属比劫，不直接套普通八格。';confidence='待复核';
    }
  }
  const gods=visibleExDay.map(s=>tenGod(ds,s));
  const signals=[];
  if(gods.includes('正官')&&gods.includes('七杀'))signals.push('官杀并透：存在官杀混杂信号，需看去留、制化与根气。');
  if(gods.includes('伤官')&&gods.includes('正官'))signals.push('伤官与正官同透：存在“伤官见官”结构信号，是否为忌需结合格局与制化。');
  if(gods.includes('偏印')&&gods.includes('食神'))signals.push('偏印与食神同透：存在“枭食同见”信号，是否构成枭夺食需看强弱与制化。');
  if((coreGod==='正印'||coreGod==='偏印')&&(gods.includes('正财')||gods.includes('偏财')))signals.push('印格候选见财透：存在财印相战/财破印风险信号，需看官杀通关与强弱。');
  if((coreGod==='正财'||coreGod==='偏财')&&(gods.includes('食神')||gods.includes('伤官')))signals.push('财格候选见食伤：存在食伤生财的相生线索。');
  if(coreGod==='七杀'&&(gods.includes('食神')||gods.includes('伤官')))signals.push('七杀格候选见食伤：存在制杀线索。');
  if(coreGod==='七杀'&&(gods.includes('正印')||gods.includes('偏印')))signals.push('七杀格候选见印：存在杀印相生线索。');
  if(coreGod==='正官'&&(gods.includes('正印')||gods.includes('偏印')))signals.push('正官格候选见印：存在官印相生线索。');
  const supportRoles=SUPPORT_ROLES[coreGod]||[];
  const dm=E[ds];
  const supportElements=[...new Set(supportRoles.map(r=>roleEl(dm,r)).filter(Boolean))];
  return {candidate,basis,coreGod,coreStem,confidence,hiddenInfo,signals,supportRoles,supportElements,stage};
}
function analyzeClimate(p){
  const ds=p.day?.[0],mb=p.month?.[1]; if(!ds||!mb)return null;
  const primary=QIONGTONG_PRIMARY[ds]?.[mb]||null;
  const presence=primary?exactStemPresence(p,primary):{visible:0,hidden:0};
  let state='无数据';
  if(primary){
    if(presence.visible>0)state='主调候干已透';
    else if(presence.hidden>0)state='主调候干仅伏藏';
    else state='原局未见主调候干';
  }
  return {dayStem:ds,monthBranch:mb,climate:CLIMATE[mb]||'—',primary,primaryElement:E[primary]||null,presence,state};
}
function composite(p){
  const pattern=analyzePattern(p),climate=analyzeClimate(p);
  const strength=window.BaziStrength?.analyze?window.BaziStrength.analyze(p):null;
  const score={木:0,火:0,土:0,金:0,水:0};
  const reason={木:[],火:[],土:[],金:[],水:[]};
  if(strength&&!strength.candidate){
    (strength.direction||[]).forEach((el,i)=>{score[el]+=i===0?2:1;reason[el].push('扶抑');});
  }
  if(climate?.primaryElement){score[climate.primaryElement]+=2;reason[climate.primaryElement].push('调候');}
  (pattern?.supportElements||[]).forEach(el=>{score[el]+=1;reason[el].push('格局相神方向');});
  const ranked=Object.entries(score).sort((a,b)=>b[1]-a[1]);
  const max=ranked[0]?.[1]||0;
  const overlap=ranked.filter(([,s])=>s>=2&&s===max).map(([el])=>el);
  const secondary=ranked.filter(([,s])=>s>=2&&s<max).slice(0,2).map(([el])=>el);
  return {pattern,climate,strength,score,reason,overlap,secondary,ranked};
}
function renderPattern(p){
  const a=analyzePattern(p); if(!a)return '';
  return `<div class="card advanced-card">
    <div class="section-title">格局法 · 月令取格 <span class="beta-tag">v0.5</span></div>
    <div class="adv-summary"><div><span>格局候选</span><strong>${esc(a.candidate)}</strong></div><div><span>确定度</span><strong>${esc(a.confidence)}</strong></div><div><span>月令十二长生</span><strong>${esc(a.stage)}</strong></div></div>
    <div class="evidence-list"><p><b>取格依据：</b>${esc(a.basis)}</p><p><b>月令藏干：</b>${a.hiddenInfo.map(x=>`${x.level}${x.stem}（${x.god}）${x.visible?'已透':'未透'}`).map(esc).join('；')}</p>
    <p><b>相神方向线索：</b>${esc(a.supportRoles.join('、')||'此结构不宜用单一相神口诀自动判定')}${a.supportElements.length?`（五行：${esc(a.supportElements.join('、'))}）`:''}</p></div>
    ${a.signals.length?`<div class="signal-list">${a.signals.map(x=>`<p>• ${esc(x)}</p>`).join('')}</div>`:''}
    <div class="note-line">本版只判断“格局候选、透干与结构信号”，不自动宣称成格、破格或富贵层级。格局成败还要结合根气、制化、清纯混杂与全局。</div>
  </div>`;
}

function renderClimate(p){
  const a=analyzeClimate(p); if(!a)return '';
  const presenceText=!a.primary?'—':a.presence.visible?('天干已见 '+a.presence.visible+' 处'):a.presence.hidden?('地支藏干见 '+a.presence.hidden+' 处'):'原局未见';
  return '<div class="card advanced-card">'
    +'<div class="section-title">调候法 · 寒暖燥湿 <span class="beta-tag">v0.5</span></div>'
    +'<div class="adv-summary">'
      +'<div><span>月令气候</span><strong>'+esc(a.climate)+'</strong></div>'
      +'<div><span>主调候干</span><strong>'+esc(a.primary||'—')+(a.primaryElement?' · '+esc(a.primaryElement):'')+'</strong></div>'
      +'<div><span>原局状态</span><strong>'+esc(a.state)+'</strong></div>'
    +'</div>'
    +'<div class="evidence-list">'
      +'<p><b>检查结果：</b>'+esc(presenceText)+'</p>'
      +'<p><b>使用方式：</b>调候关注寒暖燥湿，不等同于“身强身弱”。即使同一五行在扶抑法中不是第一优先，只要季节寒燥湿热问题突出，调候仍可能优先考虑对应天干。</p>'
    +'</div>'
    +'<div class="note-line">本版调候采用《穷通宝鉴》常见“十干十二月第一调候干”简表做初筛，只显示第一优先调候干与原局存在状态；不会把整部调候体系压缩成一个绝对用神。</div>'
  +'</div>';
}
function renderComposite(p){
  const c=composite(p); if(!c)return '';
  if(c.strength?.candidate||c.strength?.extreme)return '<div class="card"><div class="section-title">综合取用 · 边界保护</div><p>极端命局/疑似从格：暂停综合排序和颜色推荐；保留各法线索供复核。</p></div>';
  const top=c.ranked.filter(([,s])=>s>0).slice(0,3);
  let verdict='';
  if(c.overlap.length){
    verdict='三法交叉后，当前重合度最高的是：<b>'+esc(c.overlap.join('、'))+'</b>';
  }else if(top.length){
    verdict='三法暂未形成唯一重合方向，当前仅可按线索强弱排序：<b>'+top.map(([e])=>esc(e)).join('、')+'</b>';
  }else{
    verdict='当前信息不足，不生成综合取用方向。';
  }
  return '<div class="card composite-card">'
    +'<div class="section-title">综合取用 · 三法交叉</div>'
    +'<div class="warning">'+verdict+'</div>'
    +'<div class="cross-grid">'
      +top.map(([el,score])=>'<div><strong>'+esc(el)+'</strong><span>'+score+' 点</span><small>'+esc([...new Set(c.reason[el])].join(' + ')||'—')+'</small></div>').join('')
    +'</div>'
    +'<div class="evidence-list">'
      +'<p><b>扶抑：</b>'+(c.strength?.candidate?esc(c.strength.candidate):esc((c.strength?.direction||[]).join('、')||'—'))+'</p>'
      +'<p><b>格局：</b>'+esc(c.pattern?.candidate||'—')+'；相神方向 '+esc((c.pattern?.supportElements||[]).join('、')||'—')+'</p>'
      +'<p><b>调候：</b>'+esc(c.climate?.primary||'—')+(c.climate?.primaryElement?'（'+esc(c.climate.primaryElement)+'）':'')+'；'+esc(c.climate?.state||'—')+'</p>'
    +'</div>'
    +'<div class="note-line">综合结果只在三套规则有交叉时提升置信度；若扶抑、格局、调候相互冲突，应用会保留冲突，不强行给出“唯一用神”。</div>'
  +'</div>';
}
window.BaziAdvanced={analyzePattern,analyzeClimate,composite,renderPattern,renderClimate,renderComposite,version:'0.5.0'};
})();
