/* XuanLi 0.5.0 — deterministic, local-only reference rules. */
(()=>{'use strict';
const S='甲乙丙丁戊己庚辛壬癸', B='子丑寅卯辰巳午未申酉戌亥', MONTHS='寅卯辰巳午未申酉戌亥子丑';
const E=Object.fromEntries([...S].map((s,i)=>[s,'木木火火土土金金水水'[i]]));
const BE=Object.fromEntries([...B].map((b,i)=>[b,'水土木木土火火土金金土水'[i]]));
const H={子:['癸'],丑:['己','癸','辛'],寅:['甲','丙','戊'],卯:['乙'],辰:['戊','乙','癸'],巳:['丙','戊','庚'],午:['丁','己'],未:['己','丁','乙'],申:['庚','壬','戊'],酉:['辛'],戌:['戊','辛','丁'],亥:['壬','甲']};
const GEN={木:'火',火:'土',土:'金',金:'水',水:'木'},CTRL={木:'土',土:'水',水:'火',火:'金',金:'木'};
const COLORS={木:'青绿、墨绿',火:'红、紫',土:'米黄、卡其',金:'白、银灰',水:'深蓝、黑'};
const POS={year:'年柱',month:'月柱',day:'日柱',time:'时柱'}, ELEMENTS=[...'木火土金水'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const source='https://zh.wikisource.org/zh/三命通會/卷三';
const climateSource='https://zh.wikisource.org/zh/穷通宝鉴';
const STEM_RULES=[
 {name:'天乙贵人',table:['丑未','子申','亥酉','亥酉','丑未','子申','丑未','寅午','卯巳','卯巳'],note:'采用甲戊庚牛羊的通行表，年干、日干分别查。另有甲戊并牛羊、庚辛逢虎马表，以及昼夜贵人口径；本版不混算。'},
 {name:'文昌',table:[...'巳午申酉申酉亥子寅卯'],note:'日干查四支；另有兼取年干的口径，本版只取日干。采用通行文昌查表，非能力或考试结果判断。'},
 {name:'禄神',table:[...'寅卯巳午巳午申酉亥子'],note:'日干查四支，戊己寄丙丁；年干查禄另属口径，本版不混算。'},
 {name:'羊刃',table:['卯',null,'午',null,'午',null,'酉',null,'子',null],note:'仅采用五阳干帝旺为刃；阴干有无刃、禄前一位或逆行帝旺等说法不一，阴干显示未采用，不判无刃。'}
];
const GROUP_RULES=[
 {group:'申子辰',驿马:'寅',桃花:'酉',华盖:'辰',将星:'子',月德:'壬'},
 {group:'寅午戌',驿马:'申',桃花:'卯',华盖:'戌',将星:'午',月德:'丙'},
 {group:'亥卯未',驿马:'巳',桃花:'子',华盖:'未',将星:'卯',月德:'甲'},
 {group:'巳酉丑',驿马:'亥',桃花:'午',华盖:'丑',将星:'酉',月德:'庚'}
];
const TIANDE=[...'丁申壬辛亥甲癸寅丙乙巳庚'];
function valid(p){return !!p?.day&&!!p?.month&&Object.keys(POS).every(k=>!p[k]||(p[k].length===2&&S.includes(p[k][0])&&B.includes(p[k][1])));}
function tenGod(ds,ts){const d=E[ds],t=E[ts],same=S.indexOf(ds)%2===S.indexOf(ts)%2;if(!d||!t)return '—';return d===t?(same?'比肩':'劫财'):GEN[d]===t?(same?'食神':'伤官'):GEN[t]===d?(same?'偏印':'正印'):CTRL[d]===t?(same?'偏财':'正财'):(same?'七杀':'正官');}
function shensha(p){
 if(!valid(p))return [];
 const rows=[];
 function add(name,origin,token,target,note){
  const idx=S.includes(target?.[0])?0:1;
  const matches=target?Object.keys(POS).filter(k=>p[k]&&target.includes(p[k][idx])).map(k=>({position:k,pillar:p[k],token:p[k][idx]})):[];
  rows.push({name,origin,token,target:target||null,matches,note});
 }
 for(const r of STEM_RULES)for(const key of r.name==='天乙贵人'?['year','day']:['day'])if(p[key])add(r.name,POS[key]+'天干',p[key][0],r.table[S.indexOf(p[key][0])],r.note);
 for(const name of ['驿马','桃花','华盖','将星'])for(const key of ['year','day'])if(p[key]){
  const g=GROUP_RULES.find(g=>g.group.includes(p[key][1]));
  add(name,POS[key]+'地支',p[key][1],g[name],`三合组 ${g.group} 查 ${g[name]}。年支、日支分别列证；有仅取年支或日支流派。查全部已知四支，包含起例柱自身，不把两路命中叠加成吉凶分值。`);
 }
 const mb=p.month[1];
 add('天德','月令',mb,TIANDE[MONTHS.indexOf(mb)],'寅月起丁申壬辛亥甲癸寅丙乙巳庚。申亥寅巳查地支，其余查明干，不将藏干混作透出；月令按节换月。');
 add('月德','月令',mb,GROUP_RULES.find(g=>g.group.includes(mb)).月德,'寅午戌丙、申子辰壬、亥卯未甲、巳酉丑庚；按月令查明干，不查藏干。');
 return rows;
}
function renderShensha(p){return `<details class="card shensha"><summary>神煞 · 10 类确定性规则（展开核对）</summary><p class="note-line">只显示查表命中，不独立判吉凶，不参与综合取用或颜色分值。时辰未知时，时柱不参与，未命中仅指已知柱。</p>${shensha(p).map(r=>`<div class="rule-row"><b>${esc(r.name)}</b><p>${esc(r.origin)} ${esc(r.token)} → 查 ${esc(r.target||'此流派未采用')}；${r.matches.length?r.matches.map(m=>esc(POS[m.position]+' '+m.pillar)).join('、'):'已知柱未命中'}</p><small>${esc(r.note)}</small></div>`).join('')}<p class="note-line">规则参考：《三命通会》论十干禄、驿马、天乙贵人、天月德、羊刃及通行神煞查表。流派范围见每条说明。<a href="${source}" target="_blank" rel="noopener">在线核对古籍</a>（计算无需联网）。</p></details>`;}
// Only reviewed passages are represented; no inferred full 120-entry secondary table.
const AUX={
 '甲寅':{stems:['癸'],section:'三春甲木·正月',note:'丙火温暖与癸水滋润并看；原文另论水多，不将见癸直接当成应继续增水。'},
 '甲辰':{stems:['壬'],section:'三春甲木·三月',note:'庚金之后考察壬水；是否可用仍需核对火土与根气。'},
 '甲巳':{stems:['丁'],section:'三夏甲木·四月',note:'在癸水线索后列丁；金多、火多另有条件，不能据此直接补火。'},
 '甲午':{stems:['丁','庚'],section:'三夏甲木·五月',note:'癸之后列丁、庚；木盛与庚盛会改变先后，未自动判定复杂条件。'},
 '甲未':{stems:['丁','庚'],section:'三夏甲木·六月',note:'此段有先丁后庚、无癸亦可，与 v0.4 简表先癸存在差异，暂停调候加权，保留两种资料。',disputed:true},
 '甲申':{stems:['庚'],section:'三秋甲木·七月',note:'丁与庚并看，另涉及水阻、甲引助及戊制水；这里只列候选，不自动认定制化。'},
 '甲酉':{stems:['丙','庚'],section:'三秋甲木·八月',note:'丁之后列丙、庚；木局、金局等条件另论，不自动判富贵。'},
 '甲戌':{stems:['丁','壬','癸'],section:'三秋甲木·九月',note:'原文重点讨论丁与壬癸及全局，和 v0.4 简表主甲不同；暂停调候加权，先复核。',disputed:true}
};
function presence(p,s){const visible=[],hidden=[];for(const k of Object.keys(POS))if(p[k]){if(p[k][0]===s)visible.push(POS[k]);if(H[p[k][1]].includes(s))hidden.push(POS[k]);}return {visible,hidden};}
function climate(p){const base=window.BaziAdvanced.analyzeClimate(p);if(!base)return null;const entry=AUX[p.day[0]+p.month[1]];return {...base,review:entry||null,auxiliary:(entry?.stems||[]).map(s=>({stem:s,element:E[s],...presence(p,s)}))};}
const originalClimate=window.BaziAdvanced.renderClimate;
window.BaziAdvanced.renderClimate=p=>{
 const c=climate(p);if(!c)return '';
 return originalClimate(p).replace('只显示第一优先调候干与原局存在状态','主干沿用 v0.4 简表，辅助规则与差异见下方')+`<div class="card advanced-card"><div class="section-title">扩展调候 · 条件核对</div>${c.review?`<p><b>核对章节：</b>《穷通宝鉴》${esc(c.review.section)}</p><p>${esc(c.review.note)}</p>${c.auxiliary.map(a=>`<p><b>辅助候选 ${a.stem} · ${a.element}</b>：明干 ${a.visible.join('、')||'未见'}；藏干 ${a.hidden.join('、')||'未见'}</p>`).join('')}`:'<p>此日干与月令的辅助条文尚未逐条核对，暂不填第二、第三调候干。主干仍仅为简表初筛。</p>'}<p class="note-line">辅助干是条件线索，不自动计入综合分值；透出、伏藏不等于已经发挥作用。<a href="${climateSource}" target="_blank" rel="noopener">核对原文</a>；条目与说明均已本地保存。</p></div>`;
};
function composite(p,options={}){
 if(!valid(p))return null;
 const c=window.BaziAdvanced.composite(p),cl=climate(p),s=c.strength;
 const blocked=options.boundary?'出生交节边界未确定':!s?'本命数据不足':s.candidate||s.extreme?'极端命局/从格边界，需人工复核':null;
 const base=Object.fromEntries(ELEMENTS.map(e=>[e,0]));
 const reasons=Object.fromEntries(ELEMENTS.map(e=>[e,[]]));
 const add=(e,n,r)=>{base[e]+=n;reasons[e].push(r);};
 if(!blocked){s.direction.forEach((e,i)=>add(e,i===0?2:1,'扶抑'));c.pattern.supportElements.forEach(e=>add(e,1,'格局相神'));if(cl.primaryElement&&!cl.review?.disputed)add(cl.primaryElement,2,'调候初筛');}
 const conflicts=ELEMENTS.filter(e=>s?.avoid.includes(e)&&((c.pattern.supportElements||[]).includes(e)||(!cl.review?.disputed&&cl.primaryElement===e)));
 return {base,reasons,blocked,conflicts,strength:s,pattern:c.pattern,climate:cl};
}
function dynamic(p,t,options={}){
 const c=composite(p,options);if(!c||!valid(t))return null;
 const exposure=Object.fromEntries(ELEMENTS.map(e=>[e,0])),weights={year:1,month:2,day:3};
 const flows=Object.keys(weights).map(k=>{const gz=t[k];if(!gz)return null;const weight=weights[k];exposure[E[gz[0]]]+=weight/2;exposure[BE[gz[1]]]+=weight/2;return {key:k,gz,weight,stemElement:E[gz[0]],branchElement:BE[gz[1]],god:tenGod(p.day[0],gz[0]),hidden:H[gz[1]].map(s=>s+'·'+tenGod(p.day[0],s))};}).filter(Boolean);
 const ranked=ELEMENTS.map(e=>({element:e,base:c.base[e],exposure:exposure[e],score:c.base[e]>0?c.base[e]/(1+exposure[e]):0})).sort((a,b)=>b.score-a.score);
 // A flow never invents a new natal direction; more supplied elements lose priority.
 const eligible=ranked.filter(r=>r.base>0&&!c.conflicts.includes(r.element));
 const direction=c.blocked?[]:eligible.filter(r=>Math.abs(r.score-(eligible[0]?.score||0))<1e-9).map(r=>r.element);
 return {...c,flows,exposure,ranked,direction};
}
function baseEvidence(c){return `<p><b>本命扶抑：</b>${esc(c.strength?.direction.join('、')||'暂停')}；<b>格局：</b>${esc(c.pattern.candidate)}，相神线索 ${esc(c.pattern.supportElements.join('、')||'待定')}；<b>调候：</b>${esc(c.climate.primary)}${c.climate.review?.disputed?'（资料有差异，未计分）':''}</p><p><b>保留冲突：</b>${esc(c.conflicts.join('、')||'本模型未检出扶抑慎增与另两法重叠')}。冲突五行不进入自动颜色推荐。</p>`;}
function renderComposite(p,options={}){const c=composite(p,options);if(!c)return '';return `<div class="card"><div class="section-title">综合取用 · 三法交叉 v0.5</div>${c.blocked?`<div class="warning">${esc(c.blocked)}；暂停综合方向、颜色及宜慎推荐。</div>`:'<p>分别保留三法线索；相同五行不代表三法已全部一致，分值也不是吉凶概率。</p>'}${baseEvidence(c)}<p class="note-line">${!p.time?'缺少时柱，以下仅为已知三柱的暂定参考。':''}辅助调候干与神煞不参与打分。</p></div>`;}
const ACTIVITIES={比肩:['协作与任务分工','核对分工边界'],劫财:['整理团队资源','核对共同支出'],食神:['安排创作与表达','给执行留出时间'],伤官:['整理改进意见','沟通前核对规则'],正财:['记录预算与账目','核对支出明细'],偏财:['整理外部信息','核实信息来源'],正官:['梳理日程与手续','核对截止时间'],七杀:['拆解紧急任务','决策前复核信息'],正印:['学习与资料整理','避免只准备不行动'],偏印:['研究与独立复盘','避免频繁改动计划']};
function renderDaily(p,t,options={}){
 const d=dynamic(p,t,options);if(!d)return '';
 const god=d.flows.find(f=>f.key==='day')?.god,act=ACTIVITIES[god]||['按计划安排','核对信息'];
 return `<div class="daily-balance"><div class="section-title">当日动态方向 · 三法与流年/月/日</div><p class="note-line">所选日期 12:00 截面；年按立春、月按节换柱，交节前后见上方节气卡。${!p.time?'出生时辰未知：只按已知三柱暂算。':''}</p>${d.blocked?`<div class="warning">${esc(d.blocked)}；暂停方向、辅助色与宜慎结论，仅展示干支依据。</div>`:`<div class="daily-grid"><div><span>动态辅助方向</span><strong>${esc(d.direction.join('、')||'三法冲突，暂不推荐')}</strong></div><div><span>辅助色</span><strong>${esc(d.direction.map(e=>e+'·'+COLORS[e]).join(' / ')||'暂不推荐')}</strong></div></div>`}${baseEvidence(d)}
 <table class="dynamic-table"><caption>流运输入与十神依据（日干为参照）</caption><thead><tr><th>层级</th><th>干支/五行</th><th>干十神 / 支藏十神</th><th>权重</th></tr></thead><tbody>${d.flows.map(f=>`<tr><td>${{year:'流年',month:'流月',day:'流日'}[f.key]}</td><td>${f.gz}<br>${f.stemElement} / ${f.branchElement}</td><td>${f.god}<br>${f.hidden.join('、')}</td><td>${f.weight}</td></tr>`).join('')}</tbody></table>
 <details><summary>展开逐项分值与计算规则</summary><p>本命：扶抑首位 2、其余 1；格局相神各 1；主调候 2（资料差异时 0）。流运年/月/日权重 1/2/3，各半分配给天干五行和地支本气五行。动态分＝本命分÷(1+流运供给)。表示本命候选尚待辅助的相对优先级，不是运气或传统统一公式；未模拟合化，不叠加大运。藏干十神只展示，不另计供给。</p>${d.ranked.map(r=>`<p>${r.element}：本命 ${r.base}（${esc(d.reasons[r.element].join('+')||'无线索')}）÷(1+${r.exposure})＝${r.score.toFixed(3)}${d.conflicts.includes(r.element)?'；冲突，排除推荐':''}</p>`).join('')}</details>
 ${!d.blocked&&d.direction.length?`<div class="yi-ji personal-yi-ji"><div class="yi"><b>宜参考</b><p>${esc(act[0])}</p></div><div class="ji"><b>慎参考</b><p>${esc(act[1])}；${d.flows.some(f=>d.conflicts.includes(f.stemElement)||d.conflicts.includes(f.branchElement))?'流运触及冲突五行，保留多种判断':'按现实任务安排节奏'}</p></div></div><p class="note-line">宜慎文案来自流日${god}的生活化映射；颜色来自上方动态方向，仅作文化参考，不承诺现实结果。</p>`:''}</div>`;
}
window.BaziV05={shensha,climate,composite,dynamic,renderShensha,renderComposite,renderDaily,tenGod,version:'0.5.0'};
})();
