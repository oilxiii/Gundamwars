const $ = (sel) => document.querySelector(sel);
const app = $('#app');

let state = {
  screen: 'home', name: '', botCount: 2,
  round: 1,
  players: [],
  history: [],
  lastReport: null,
  currentEvent: null,
  decision: { unitId: 'z1', quality: 50, priceStrategy: 50, prodPct: 70, lobby: 0, factoryInvest: 0, rndInvest: 0 }
};

function save(){ localStorage.setItem('msc-vanilla-save', JSON.stringify(state)); }
function migrateUnitNamesInSave(s){
  const unitNameById = Object.fromEntries(GameData.UNIT_TYPES.map(u => [u.id, {name:u.name, tag:u.tag}]));
  function fixReport(rep){
    if(!rep || !Array.isArray(rep.results)) return;
    rep.results.forEach(r => {
      if(r.unit && r.unit.id && unitNameById[r.unit.id]) {
        r.unit.name = unitNameById[r.unit.id].name;
        r.unit.tag = unitNameById[r.unit.id].tag;
      }
    });
  }
  fixReport(s.lastReport);
  if(Array.isArray(s.history)) s.history.forEach(fixReport);
  if(Array.isArray(s.players)) s.players = s.players.map(p => ({...p, inventory:p.inventory || {}}));
  return s;
}
function load(){ try{ const s = JSON.parse(localStorage.getItem('msc-vanilla-save')); if(s && s.players) state = migrateUnitNamesInSave(s); }catch(e){} ensureStateDefaults(); }
function player(){ return state.players[0]; }
function fmt(n){ return Math.round(n).toLocaleString('en-US'); }
function esc(s){ return String(s ?? '').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }
function reputationTitle(score){
  const v = Math.max(0, Math.min(100, Number(score || 0)));
  if(v < 10) return 'บริษัทหน้าใหม่';
  if(v < 25) return 'ดาวรุ่ง';
  if(v < 45) return 'ผู้ผลิตที่น่าจับตามอง';
  if(v < 65) return 'ผู้ผลิตชั้นนำ';
  if(v < 85) return 'ผู้นำตลาด';
  return 'มาตรฐานของอุตสาหกรรม';
}
function insiderAccuracy(score){
  const v = Math.max(0, Math.min(100, Number(score || 0)));
  if(v < 10) return 0.35;
  if(v < 25) return 0.45;
  if(v < 45) return 0.55;
  if(v < 65) return 0.65;
  if(v < 85) return 0.75;
  return 0.80;
}

function ensureStateDefaults(){
  state.usedMarketEventIds = Array.isArray(state.usedMarketEventIds) ? state.usedMarketEventIds : [];
  state.special = state.special || { offer:null, pending:[], locked:{}, usedOfferIds:[], lastNotice:'', processedRound:0 };
  state.special.pending = Array.isArray(state.special.pending) ? state.special.pending : [];
  state.special.locked = state.special.locked || {};
  state.special.usedOfferIds = Array.isArray(state.special.usedOfferIds) ? state.special.usedOfferIds : [];
  state.players = (state.players || []).map((p,i) => ({
    ...p,
    inventory:p.inventory || {},
    activeContracts:Array.isArray(p.activeContracts)?p.activeContracts:[],
    techLevel:Number.isFinite(Number(p.techLevel)) ? Number(p.techLevel) : 0,
    rp:Number.isFinite(Number(p.rp)) ? Number(p.rp) : 0,
    aiStyle:p.aiStyle || (i === 1 ? 'research' : i === 2 ? 'mass' : 'balanced')
  }));
  state.decision = {
    unitId: state.decision?.unitId || 'z1',
    quality: Number.isFinite(Number(state.decision?.quality)) ? Number(state.decision.quality) : Number(state.decision?.rndFocus || 50),
    priceStrategy: Number.isFinite(Number(state.decision?.priceStrategy)) ? Number(state.decision.priceStrategy) : 50,
    prodPct: Number.isFinite(Number(state.decision?.prodPct)) ? Number(state.decision.prodPct) : 70,
    lobby: Number(state.decision?.lobby || 0),
    factoryInvest: Number(state.decision?.factoryInvest || 0),
    rndInvest: Number(state.decision?.rndInvest || 0)
  };
  state.techNotices = Array.isArray(state.techNotices) ? state.techNotices : [];
}
function repNegotiationChance(rep){
  const v = Math.max(0, Math.min(100, Number(rep || 0)));
  if(v < 10) return 0.20;
  if(v < 25) return 0.30;
  if(v < 45) return 0.40;
  if(v < 65) return 0.50;
  if(v < 85) return 0.60;
  return 0.70;
}
function reputationWeight(rep){ return 1 + Math.max(0, Math.min(100, Number(rep||0))) / 100; }
function countProducedHistory(company, unitIds){
  const ids = new Set(unitIds || []); let total = 0;
  (state.history || []).forEach(rep => (rep.results || []).forEach(r => {
    if(r.playerId === company.id && r.unit && ids.has(r.unit.id)) total += Number(r.production || 0);
  }));
  return total;
}
function contractText(c){
  const ev = GameData.getSpecialEventById(c.eventId) || {};
  return `${c.name || ev.name || 'สัญญาพิเศษ'} → ${c.targetLabel || ev.targetLabel || 'รุ่นเป้าหมาย'} (+${Math.round((c.priceBonus || ev.priceBonus || 0)*100)}%, ${c.remaining}Q)`;
}
function activePilotText(company){
  const active = ((company && company.activeContracts) || []).filter(c => c.remaining > 0);
  if(!active.length) return '';
  return active.map(contractText).join(', ');
}
function hasActiveContract(company){
  return ((company && company.activeContracts) || []).some(c => c.remaining > 0);
}
function hasPlayerPendingSpecial(){
  const sp = state.special || {};
  return !!(sp.offer || (sp.pending || []).some(p => p.companyId === 'you'));
}
function cleanupExpiredSpecialNotice(){
  const sp = state.special;
  if(!sp) return;
  const stillRelevant = hasActiveContract(player()) || hasPlayerPendingSpecial();
  if(!stillRelevant) sp.lastNotice = '';
}
function weightedPick(items, weightFn){
  const weighted = items.map(item => ({item, w: Math.max(0, Number(weightFn(item) || 0))})).filter(x=>x.w>0);
  const total = weighted.reduce((s,x)=>s+x.w,0);
  if(!total) return null;
  let roll = Math.random() * total;
  for(const x of weighted){ roll -= x.w; if(roll <= 0) return x.item; }
  return weighted[weighted.length - 1].item;
}
function decrementContractsAndResolveNegotiations(){
  const sp = state.special;
  state.players = state.players.map(p => ({...p, activeContracts:(p.activeContracts || []).map(c=>({...c, remaining:Math.max(0,(c.remaining||0)-1)})).filter(c=>c.remaining>0)}));
  Object.keys(sp.locked || {}).forEach(eventId => {
    const lock = sp.locked[eventId];
    if(!lock || lock.remaining <= 0) delete sp.locked[eventId];
    else sp.locked[eventId] = {...lock, remaining: lock.remaining - 1};
    if(sp.locked[eventId] && sp.locked[eventId].remaining <= 0) delete sp.locked[eventId];
  });
  const nextPending = [];
  (sp.pending || []).forEach(pend => {
    const company = state.players.find(p => p.id === pend.companyId);
    const ev = GameData.getSpecialEventById(pend.eventId);
    if(!company || !ev) return;
    const chance = repNegotiationChance(company.reputation);
    const ok = Math.random() < chance;
    const newPrice = ok ? Math.max(0.06, Math.round((pend.pricePct - 0.02 - Math.random()*0.015)*100)/100) : pend.pricePct;
    const resolved = {...pend, pricePct:newPrice, attempts:(pend.attempts || 0) + 1, status: ok ? 'success' : 'same'};
    if(company.id === 'you') {
      sp.offer = resolved;
      sp.lastNotice = ok ? `การต่อรองสำเร็จ ${ev.name} ยอมลดค่าตัวเหลือ ${Math.round(newPrice*100)}% ของเงินสด` : `การต่อรองยังไม่คืบหน้า ${ev.name} ยังยืนยันค่าตัวเดิม`;
    } else {
      // AI ตัดสินใจอัตโนมัติหลังต่อรองเสร็จ
      if(ok || Math.random() < 0.55) signSpecialContract(company.id, resolved, true);
      else nextPending.push(resolved);
    }
  });
  sp.pending = nextPending;
}
function eventWeightForCompany(ev, company){
  if(!ev || !company) return 0;
  if(state.special?.locked?.[ev.id]) return 0;
  const base = ev.baseWeight || 10;
  const rep = reputationWeight(company.reputation);
  const produced = countProducedHistory(company, ev.unitIds || []);

  // Pass 16: affinity matters strongly.
  // Named pilot / presenter events should follow the line the company actually builds.
  // If a company has never produced the event's target unit family, keep a tiny
  // "wild card" chance, but make it extremely unlikely.
  const hasAffinity = produced > 0;
  const isNamedEvent = (ev.tier || 1) >= 2;
  const noAffinityPenalty = isNamedEvent ? 0.04 : 0.25;
  const productionBonus = hasAffinity ? Math.min(8, 1 + produced / 18) : noAffinityPenalty;

  const activeSame = ((company.activeContracts || []).some(c => c.eventId === ev.id || (c.unitIds || []).some(id => (ev.unitIds || []).includes(id)))) ? 0.2 : 1;
  return base * rep * productionBonus * activeSame;
}
function maybeCreateSpecialOfferForRound(){
  const sp = state.special;
  if(state.round < 3 || sp.offer || (sp.pending || []).some(p=>p.companyId==='you')) return;
  if(sp.offerRound === state.round) return;
  const candidates = (GameData.SPECIAL_EVENTS || []).filter(ev => (ev.startRound || 3) <= state.round && !sp.locked[ev.id]);
  if(!candidates.length) return;
  // ไม่จำเป็นต้องมี Event ทุกไตรมาส
  if(Math.random() > 0.72) { sp.offerRound = state.round; return; }
  const pairs = [];
  candidates.forEach(ev => state.players.forEach(company => {
    const w = eventWeightForCompany(ev, company);
    if(w > 0) pairs.push({ev, company, w});
  }));
  const picked = weightedPick(pairs, x=>x.w);
  sp.offerRound = state.round;
  if(!picked) return;
  const offer = {eventId:picked.ev.id, companyId:picked.company.id, pricePct:picked.ev.pricePct, attempts:0, status:'new'};
  if(picked.company.id === 'you') sp.offer = offer;
  else {
    // AI: เซ็นบ้าง ต่อรองบ้าง ปฏิเสธบ้าง
    const roll = Math.random();
    if(roll < 0.62) signSpecialContract(picked.company.id, offer, true);
    else if(roll < 0.85) sp.pending.push(offer);
  }
}
function signSpecialContract(companyId, offer, silent=false){
  ensureStateDefaults();
  const sp = state.special;
  const company = state.players.find(p=>p.id===companyId);
  const ev = GameData.getSpecialEventById(offer.eventId);
  if(!company || !ev) return false;
  const cost = Math.round(company.funds * offer.pricePct);
  if(company.funds < cost) return false;
  company.funds = Math.max(0, company.funds - cost);
  company.activeContracts = company.activeContracts || [];
  company.activeContracts.push({ eventId:ev.id, type:'pilot', name:ev.name, role:ev.role, unitIds:ev.unitIds, targetLabel:ev.targetLabel, priceBonus:ev.priceBonus, remaining:ev.duration, cost, pricePct:offer.pricePct });
  sp.locked[ev.id] = { companyId, remaining: ev.duration };
  sp.offer = null;
  sp.pending = (sp.pending || []).filter(p => !(p.eventId === ev.id && p.companyId === companyId));
  if(!silent) sp.lastNotice = `เซ็นสัญญากับ ${ev.name} แล้ว มีผลกับ ${ev.targetLabel} ${ev.duration} ไตรมาส`;
  return true;
}
function declineSpecialOffer(){ state.special.offer = null; state.special.lastNotice = 'คุณปฏิเสธข้อเสนอพิเศษในไตรมาสนี้'; }
function negotiateSpecialOffer(){
  const offer = state.special.offer;
  if(!offer) return;
  state.special.pending.push({...offer, attempts:(offer.attempts||0)+1});
  state.special.offer = null;
  state.special.lastNotice = 'เริ่มการต่อรองแล้ว ผลจะทราบในไตรมาสหน้า';
}
function ensureQuarterSetup(){
  ensureStateDefaults();
  if(state.special.processedRound !== state.round){
    decrementContractsAndResolveNegotiations();
    state.special.processedRound = state.round;
  }
  maybeCreateSpecialOfferForRound();
  cleanupExpiredSpecialNotice();
}
function renderSpecialOfferPanel(){
  ensureStateDefaults();
  const sp = state.special;
  const offer = sp.offer;
  const active = activePilotText(player());
  const noticeLine = sp.lastNotice ? `<p class="special-line">${esc(sp.lastNotice)}</p>` : `<p class="special-empty">ยังไม่มีรายงานพิเศษ</p>`;
  const activeBox = active ? `<div class="special-contracts"><b>สัญญาที่มีผล</b>${row('นักบิน/พรีเซ็นเตอร์', esc(active), 'gold')}</div>` : `<div class="special-contracts empty"><b>สัญญาที่มีผล</b><span class="muted small">ยังไม่มี</span></div>`;
  if(!offer){
    return `<div class="briefing compact-brief special-panel"><b>รายงานพิเศษ</b>${noticeLine}${activeBox}</div>`;
  }
  const ev = GameData.getSpecialEventById(offer.eventId);
  const cost = Math.round(player().funds * offer.pricePct);
  if(!ev){
    return `<div class="briefing compact-brief special-panel"><b>รายงานพิเศษ</b>${noticeLine}${activeBox}</div>`;
  }
  return `<div class="briefing compact-brief special-panel special-offer"><b>⭐ รายงานพิเศษ</b>
    <div class="special-offer-head"><div class="pilot-portrait" id="offerPilot"></div><div><h3>${esc(ev.name)}</h3><small>${esc(ev.role || 'สัญญาพิเศษ')}</small></div></div>
    <p>${esc(ev.pitch)}</p>
    ${row('เป้าหมาย', esc(ev.targetLabel))}
    ${row('ผล', `ราคาขาย +${Math.round(ev.priceBonus*100)}% / ${ev.duration} ไตรมาส`, 'green')}
    ${row('ค่าตัว', `${Math.round(offer.pricePct*100)}% ของเงินสด (${fmt(cost)} Cr.)`, 'gold')}
    <div class="offer-actions"><button class="mini-btn" id="signSpecial">เซ็นสัญญา</button><button class="mini-btn" id="negotiateSpecial">ต่อรอง</button><button class="mini-btn danger" id="declineSpecial">ปฏิเสธ</button></div>
    <small class="muted">ต่อรองใช้เวลา 1 ไตรมาส ระหว่างนั้นยังไม่ได้โบนัส</small>
    ${activeBox}
  </div>`;
}
function bindSpecialOfferButtons(){
  const sign = document.getElementById('signSpecial');
  const neg = document.getElementById('negotiateSpecial');
  const dec = document.getElementById('declineSpecial');
  if(sign) sign.onclick = () => { if(!signSpecialContract('you', state.special.offer)) alert('เงินสดไม่พอสำหรับเซ็นสัญญา'); save(); renderDecide(); };
  if(neg) neg.onclick = () => { negotiateSpecialOffer(); save(); renderDecide(); };
  if(dec) dec.onclick = () => { declineSpecialOffer(); save(); renderDecide(); };
}
function pickNonRepeatingMarketEvent(round){
  ensureStateDefaults();
  if(round <= 1) return GameData.getEventById('stable-market');
  const list = GameData.EVENTS.filter(e => e.id !== 'stable-market');
  let pool = list.filter(e => !state.usedMarketEventIds.includes(e.id));
  if(!pool.length){ state.usedMarketEventIds = []; pool = list; }
  const total = pool.reduce((s,e)=>s+(e.priority||1),0);
  let roll = Math.random()*total;
  let picked = pool[0];
  for(const e of pool){ roll -= (e.priority||1); if(roll <= 0){ picked = e; break; } }
  state.usedMarketEventIds.push(picked.id);
  return {...picked};
}
function randomUnit(exceptId=''){
  const list = GameData.UNIT_TYPES.filter(u => u.id !== exceptId);
  return list[Math.floor(Math.random() * list.length)];
}
function prepareMarketEvent(round, repScore){
  const base = pickNonRepeatingMarketEvent(round);
  const event = {...base};
  if(event.id === 'ace-pilot-trend') {
    const actual = randomUnit();
    const correct = Math.random() < insiderAccuracy(repScore);
    const rumor = correct ? actual : randomUnit(actual.id);
    event.preferredUnitId = actual.id;
    event.rumorUnitId = rumor.id;
    event.rumorWasCorrect = correct;
    event.publicNews = false;
  } else {
    event.publicNews = true;
  }
  return event;
}
function ensureMarketEvent(event){
  if(!event) return prepareMarketEvent(state.round, player()?.reputation || 0);
  if(event.id === 'ace-pilot-trend' && (!event.preferredUnitId || !event.rumorUnitId)) {
    return prepareMarketEvent(state.round, player()?.reputation || 0);
  }
  return event;
}
function shell(inner){
  const p = player();
  app.innerHTML = `<div class="shell"><div class="top"><div class="brand"><h1>MOBILE SUIT PRODUCTION COMMAND</h1><p>8-bit blind-bid mecha manufacturing sim · Vanilla HTML/CSS/JS</p></div><div class="hud">${p?`<div class="pill">QTR <b>${String(state.round).padStart(2,'0')}/${GameData.MAX_ROUNDS}</b></div><div class="pill">Cash <b class="cyan">${fmt(p.funds)} Cr.</b></div><div class="pill">ชื่อเสียง <b class="gold">${reputationTitle(p.reputation)}</b></div><div class="pill">Capacity <b>${p.capacity}</b></div>`:''}</div></div>${inner}</div>`;
}
function button(label, cls='', id=''){ return `<button class="btn ${cls}" ${id?`id="${id}"`:''}>${label}</button>`; }
function row(a,b,cls=''){ return `<div class="row ${cls}"><span>${a}</span><b>${b}</b></div>`; }
function renderSprite(target, unit, size=7){ const el = document.getElementById(target); if(el){ el.innerHTML=''; el.appendChild(Sprites.render(unit, size)); } }
function renderPilot(target, eventId, size=3){ const el = document.getElementById(target); if(el && Sprites.renderPilot){ el.innerHTML=''; el.appendChild(Sprites.renderPilot(eventId, size)); } }
function firstActiveContract(company){ return ((company && company.activeContracts) || []).find(c => c.remaining > 0); }
function pilotBadgeHTML(contract, id){
  if(!contract) return '';
  return `<div class="pilot-badge"><div class="pilot-portrait small" id="${id}"></div><span>${esc(contract.name || 'สัญญานักบิน')}</span></div>`;
}


function playerInventoryValue(player, unitId){
  const batches = (((player || {}).inventory || {})[unitId]) || [];
  const qty = batches.reduce((s,b)=>s + Math.max(0, Math.round(b.qty || 0)), 0);
  const value = batches.reduce((s,b)=>s + Math.max(0, Math.round(b.qty || 0)) * Number(b.unitCost || 0), 0);
  const avgCost = qty ? value / qty : 0;
  return {qty, value, avgCost};
}
function inventoryRows(player){
  const inv = (player && player.inventory) || {};
  return Object.entries(inv).map(([unitId,batches])=>{
    const unit = GameData.UNIT_TYPES.find(u=>u.id===unitId) || {name:unitId};
    const stat = playerInventoryValue(player, unitId);
    return {...stat, unitId, unit};
  }).filter(x=>x.qty>0);
}
function renderInventoryPanel(player, currentUnit){
  const rows = inventoryRows(player);
  const holding = GameData.inventoryHoldingCost(player);
  const current = currentUnit ? playerInventoryValue(player, currentUnit.id) : {qty:0};
  if(!rows.length){
    return `<div class="briefing compact-brief inventory-box"><b>คลังสินค้า</b>${row('สินค้าคงเหลือ','0 เครื่อง')}${row('ค่าดูแลคลัง','0 Cr.')}</div>`;
  }
  return `<div class="briefing compact-brief inventory-box"><b>คลังสินค้า</b>
    ${currentUnit ? row(`คงเหลือรุ่นนี้`, `${current.qty} เครื่อง`) : ''}
    ${row('รวมในคลัง', `${holding.qty} เครื่อง`)}
    ${row('อัตราค่าดูแล', `${Math.round((holding.rate||0)*100)}%`)}
    ${row('ค่าดูแลคาดการณ์', `${fmt(holding.cost||0)} Cr.`)}
    <div class="inventory-list">
      ${rows.map(x=>`<div class="inventory-item"><span>${esc(x.unit.name)} ×${x.qty}</span><button class="mini-btn" data-scrap="${x.unitId}">ขายเป็นเศษเหล็ก</button></div>`).join('')}
    </div>
    <small class="muted">ขายเป็นเศษเหล็กได้ ${Math.round(GameData.SCRAP_RATE*100)}% ของต้นทุนเฉลี่ย</small>
  </div>`;
}
function scrapInventory(unitId){
  const me = player();
  const stat = playerInventoryValue(me, unitId);
  if(!stat.qty) return;
  const unit = GameData.UNIT_TYPES.find(u=>u.id===unitId) || {name:unitId};
  const revenue = Math.round(stat.qty * stat.avgCost * GameData.SCRAP_RATE * 10) / 10;
  const ok = confirm(`ขายเป็นเศษเหล็ก: ${unit.name}\nคงเหลือ ${stat.qty} เครื่อง\nขายทั้งหมดทันที\nจะได้รับ ${fmt(revenue)} Cr. (${Math.round(GameData.SCRAP_RATE*100)}% ของต้นทุนเฉลี่ย)`);
  if(!ok) return;
  me.inventory = {...(me.inventory || {})};
  delete me.inventory[unitId];
  me.funds = Math.round((me.funds + revenue) * 10) / 10;
  save();
  renderDecide();
}


function renderHome(){
  shell(`<div class="menu panel"><h2>ตั้งบริษัทผลิตโมบิลสูท</h2><input class="field" id="name" placeholder="ชื่อบริษัทของคุณ" value="${esc(state.name)}"><p class="muted small">Solo vs Bot · บอทระดับ Medium จะอ่านตลาดและบริหารเงินดีขึ้น แต่ไม่เห็นข้อมูลลับมากกว่าผู้เล่น</p><div class="control"><label>จำนวนบอท <b id="botLabel">${state.botCount}</b></label><input id="bots" type="range" min="1" max="3" value="${state.botCount}"></div>${button('เริ่มเกมกับบอท','gold','start')}</div>`);
  $('#name').oninput=e=>state.name=e.target.value;
  $('#bots').oninput=e=>{state.botCount=+e.target.value; $('#botLabel').textContent=state.botCount};
  $('#start').onclick=startGame;
}
function startGame(){
  const name = ($('#name').value || '').trim(); if(!name){ alert('ใส่ชื่อบริษัทก่อนครับ'); return; }
  const styles = ['research','mass','balanced'];
  const bots = Array.from({length:state.botCount},(_,i)=>({id:'bot'+i,name:`${GameData.BOT_NAMES[i]} [BOT]`,funds:GameData.START_FUNDS,reputation:0,debt:0,capacity:GameData.START_CAPACITY,isBot:true,inventory:{},activeContracts:[],techLevel:0,rp:0,aiStyle:styles[i%styles.length]}));
  state = { ...state, screen:'story', name, round:1, history:[], lastReport:null, currentEvent: prepareMarketEvent(1, 0), usedMarketEventIds:[], techNotices:[], special:{offer:null,pending:[],locked:{},usedOfferIds:[],lastNotice:'',processedRound:0}, players:[{id:'you',name,funds:GameData.START_FUNDS,reputation:0,debt:0,capacity:GameData.START_CAPACITY,isBot:false,inventory:{},activeContracts:[],techLevel:0,rp:0,aiStyle:'player'},...bots], decision:{unitId:'z1',quality:50,priceStrategy:50,prodPct:70,lobby:0,factoryInvest:0,rndInvest:0} };
  save(); render();
}
function renderStory(){
  shell(`<div class="panel story"><h2>สรุปสถานการณ์</h2><p>สงครามอวกาศเข้าสู่ปีที่ 3 ทุกฝ่ายต้องการโมบิลสูทเพิ่มอย่างเร่งด่วน คุณคือผู้บริหารบริษัทผลิตอาวุธ แข่งกับคู่แข่งเพื่อแย่งชิงสัญญาผลิตจากกองทัพในแต่ละไตรมาส</p><p>ทุกบริษัทตัดสินใจพร้อมกันแบบปิดลับ: R&D, ราคา, กำลังผลิต, ค่าโฆษณาประชาสัมพันธ์ และการลงทุนขยายโรงงาน</p><p>จบ 12 ไตรมาส บริษัทที่มีเงินทุน + ชื่อเสียงสูงสุดคือผู้ชนะ</p>${button('เข้าใจแล้ว เริ่มภารกิจ','gold','go')}</div>`);
  $('#go').onclick=()=>{ if(!state.currentEvent) state.currentEvent = GameData.getEventById('stable-market'); state.screen='decide'; save(); render();};
}

function availableUnitsFor(company){ return GameData.unlockedUnits(company || player()); }
function normalizeDecisionUnit(){
  const me = player(); if(!me) return;
  const ids = new Set(availableUnitsFor(me).map(u=>u.id));
  if(!ids.has(state.decision.unitId)) state.decision.unitId = availableUnitsFor(me)[0]?.id || 'z1';
}
function cpBudget(company, prodPct){ return Math.max(0, Math.floor((company.capacity || GameData.START_CAPACITY) * Math.max(0, Number(prodPct || 0)) / 100)); }
function plannedUnits(company, decision){
  const unit = GameData.getUnit(decision.quality, decision.priceStrategy, decision.unitId, company);
  return Math.max(0, Math.floor(cpBudget(company, decision.prodPct) / Math.max(1, unit.cpCost || 1)));
}
function applyResearch(company, invest){
  let p = {...company};
  let rpGain = GameData.rpFromInvestment(invest || 0);
  // RP is cumulative across the whole game. Tech thresholds are total RP targets,
  // not per-level costs. This keeps R&D pacing visible and fast enough for 12 quarters.
  let rp = Number(p.rp || 0) + rpGain;
  let level = Number(p.techLevel || 0);
  const notices = [];
  while(true){
    const next = GameData.nextTechTier({techLevel:level});
    if(!next || rp < next.rpRequired) break;
    level += 1;
    const unlocked = GameData.UNIT_TYPES.filter(u=>!u.hidden && next.unlockIds.includes(u.id));
    notices.push({companyId:p.id, companyName:p.name, level, unlocked});
  }
  return {...p, rp:Math.round(rp), techLevel:level, lastRpGain:rpGain, techNotices:notices};
}
function techProgressHTML(company){
  const next = GameData.nextTechTier(company);
  const level = Number(company.techLevel || 0);
  if(!next) return `<div class="tech-progress"><b>R&D Lv.${level}</b><span>ปลดล็อกเทคโนโลยีครบแล้ว</span><div class="tech-bar"><i style="width:100%"></i></div></div>`;
  const rp = Number(company.rp || 0);
  const pct = Math.max(0, Math.min(100, Math.round(rp / next.rpRequired * 100)));
  const names = GameData.UNIT_TYPES.filter(u=>!u.hidden && next.unlockIds.includes(u.id)).map(u=>u.name).join(' / ');
  return `<div class="tech-progress"><b>R&D Lv.${level} · ${rp}/${next.rpRequired} RP</b><span>อีก ${Math.max(0,next.rpRequired-rp)} RP ปลดล็อก ${esc(names || 'เทคโนโลยีใหม่')}</span><div class="tech-bar"><i style="width:${pct}%"></i></div></div>`;
}
function technologyHangarHTML(company){
  const ids = new Set(GameData.unlockedUnitIds(company));
  const selected = state.decision?.unitId || 'z1';
  const visibleUnits = GameData.UNIT_TYPES.filter(u=>!u.hidden);
  return `<div class="production-line-grid">${visibleUnits.map(u=>{
    const unlocked = ids.has(u.id);
    const active = selected === u.id;
    const next = GameData.nextTechTier(company);
    const isNext = next && next.unlockIds.includes(u.id);
    const progress = isNext ? `${Math.max(0, Number(company.rp||0))}/${next.rpRequired} RP` : (unlocked ? `ใช้ ${u.cpCost} CP` : `R&D Lv.${u.tier}`);
    return `<button class="production-unit ${unlocked?'unlocked':'locked'} ${active?'active':''}" ${unlocked?`data-unit="${u.id}"`:''} ${unlocked?'':'disabled'}>
      <div class="tech-sprite" id="tech-${u.id}"></div>
      <b>${esc(u.name)}</b>
      <small>${unlocked ? progress : `🔒 ${progress}`}</small>
    </button>`;
  }).join('')}</div>`;
}
function renderTechnologySprites(company){
  const ids = new Set(GameData.unlockedUnitIds(company));
  GameData.UNIT_TYPES.forEach(u=>{
    const el = document.getElementById(`tech-${u.id}`);
    if(el){ el.innerHTML=''; el.appendChild(Sprites.render(ids.has(u.id) ? u : {...u, primary:'#364352', visor:'#74808f'}, 2)); }
  });
}
function unitSelectHTML(company, selectedId){
  const units = availableUnitsFor(company);
  return `<div class="control unit-select-control"><label>รุ่นที่ผลิต <small>เลือกได้เฉพาะที่ปลดล็อกด้วย R&D</small></label><select class="field unit-select" id="unitSelect">${units.map(u=>`<option value="${u.id}" ${u.id===selectedId?'selected':''}>${esc(GameData.qualityVariant(u, state.decision?.quality || 50).name)} · ${u.cpCost} CP</option>`).join('')}</select></div>`;
}
function techNoticeHTML(){
  const notices = (state.techNotices || []).filter(n=>n.companyId==='you');
  if(!notices.length) return '';
  return `<div class="unlock-pop"><div class="unlock-card"><div class="kicker">NEW TECHNOLOGY</div><h2>${notices.flatMap(n=>n.unlocked).map(u=>esc(u.name)).join(' / ')}</h2><p>ปลดล็อกการผลิตแล้ว</p><button class="btn gold" id="dismissTech">Continue</button></div></div>`;
}
function renderDecide(){
  ensureQuarterSetup();
  state.currentEvent = ensureMarketEvent(state.currentEvent);
  if(!state.mobilePhase) state.mobilePhase = 'briefing';
  normalizeDecisionUnit();
  const market = state.currentEvent;
  const me = player(); const d = state.decision;
  const unitBase = GameData.getUnit(d.quality,d.priceStrategy,d.unitId,me);
  const unit = GameData.qualityVariant(unitBase, d.quality);
  const production = plannedUnits(me, d);
  const cpUse = production * Math.max(1, unitBase.cpCost || 1);
  const econ = GameData.unitEconomics(d.quality,d.priceStrategy,market.costMult || 1,d.prodPct,production,unitBase.id,me);
  const upfront = production*econ.unitCost + d.lobby + d.factoryInvest + (d.rndInvest || 0);
  const gain = Math.round(d.factoryInvest / GameData.EXPANSION_COST_PER_UNIT);
  const risk = upfront > me.funds ? 'เงินสดไม่พอ เสี่ยงกู้ฉุกเฉิน' : econ.margin < 0 ? 'ราคาขายต่ำกว่าต้นทุน' : d.prodPct > 115 ? 'เร่งผลิตสูง เสี่ยงต้นทุนบาน' : 'พร้อมส่งแผนประมูล';
  const deliveryLoss = Math.round((market.damageChance || 0) * 100);
  const expectedDeliverable = Math.round(production * (1 - (market.damageChance || 0)));
  const rumoredUnit = market.rumorUnitId ? GameData.UNIT_TYPES.find(u=>u.id===market.rumorUnitId) : null;
  const intelType = market.id === 'ace-pilot-trend' ? '📡 ข่าววงใน' : (state.round <= 1 ? '📄 ตลาดปกติ' : '📢 ข่าวสาธารณะ');
  const marketCards = market.id === 'ace-pilot-trend' ? [
    { label:'ประเภทข่าว', value: intelType, detail: 'ข้อมูลจากสายข่าว อาจคลาดเคลื่อนได้' },
    { label:'รายงานสายข่าว', value: rumoredUnit ? rumoredUnit.name : 'ไม่ทราบรุ่น', detail: 'กองทัพอาจสนใจรุ่นนี้เป็นพิเศษ' },
    { label:'ถ้าคาดถูก', value: 'โบนัสราคาขาย +10%', detail: 'เฉลยรุ่นที่ต้องการจริงหลังจบไตรมาส' }
  ] : [
    { label:'ประเภทข่าว', value: intelType, detail: state.round <= 1 ? 'ไม่มีเหตุการณ์พิเศษในไตรมาสแรก' : 'ข่าวนี้เกิดขึ้นจริงและมีผลกับทุกบริษัท' },
    { label:'สถานการณ์', value: market.name, detail: market.summary },
    { label:'ผลกระทบ', value: market.effect || 'Normal', detail: market.desc },
    { label:'ข้อเสนอแนะ', value: market.advice || 'วางแผนตามปกติ', detail: deliveryLoss ? `ผลิต ${production} อาจส่งมอบได้ประมาณ ${expectedDeliverable}` : 'อ่านตลาดก่อนยืนยันแผน' }
  ];
  const invRows = inventoryRows(me);
  const invSummary = invRows.length ? invRows.map(x=>`<div class="mobile-inv-row"><span>${esc(x.unit.name)}</span><b>${x.qty}</b></div>`).join('') : `<div class="mobile-inv-empty">ไม่มีสินค้าคงเหลือ</div>`;
  const phaseTabs = `<div class="mobile-tabs"><span class="${state.mobilePhase==='briefing'?'active':''}">1 Briefing</span><span class="${state.mobilePhase==='command'?'active':''}">2 Command</span><span>3 Report</span></div>`;

  if(state.mobilePhase === 'briefing'){
    shell(`<div class="mobile-v2">
      ${phaseTabs}
      <section class="mobile-card briefing-hero ${market.tone || 'info'}">
        <div class="mobile-card-head">
          <div><div class="kicker">MISSION BRIEFING</div><h2>สถานการณ์ไตรมาส ${state.round}</h2></div>
          <span class="status-tag">Q${String(state.round).padStart(2,'0')}</span>
        </div>
        <div class="mobile-intel-title"><span>${market.icon || '◆'}</span><b>${market.id === 'ace-pilot-trend' ? 'ข่าววงใน' : 'ข่าวตลาด'}</b></div>
        <h3>${esc(market.name)}</h3>
        <p>${esc(market.summary)}</p>
        <div class="mobile-intel-grid">${marketCards.map(c=>`<article><span>${esc(c.label)}</span><b>${esc(c.value)}</b><small>${esc(c.detail)}</small></article>`).join('')}</div>
      </section>

      <section class="mobile-card">
        <div class="mobile-card-head"><h2>สถานะบริษัท</h2><b class="gold">${esc(me.name)}</b></div>
        <div class="mobile-stat-grid">
          <article><span>เงินสด</span><b>${fmt(me.funds)} Cr.</b></article>
          <article><span>ชื่อเสียง</span><b>${reputationTitle(me.reputation || 0)}</b></article>
          <article><span>Capacity</span><b>${me.capacity} CP</b></article>
          <article><span>หนี้สิน</span><b>${fmt(me.debt || 0)} Cr.</b></article>
        </div>
      </section>

      <section class="mobile-card">
        <div class="mobile-card-head"><h2>Inventory</h2><span class="muted small">สินค้าคงเหลือแยกตามรุ่น</span></div>
        <div class="mobile-inventory-list">${invSummary}</div>
      </section>

      ${renderSpecialOfferPanel()}
      <button class="btn gold mobile-primary" id="goCommand">ไปหน้าคำสั่ง</button>
      ${techNoticeHTML()}
    </div>`);
    $('#goCommand').onclick = () => { state.mobilePhase='command'; save(); renderDecide(); };
    const dismiss = $('#dismissTech'); if(dismiss) dismiss.onclick = () => { state.techNotices=[]; save(); renderDecide(); };
    bindSpecialOfferButtons();
    if(state.special && state.special.offer) renderPilot('offerPilot', state.special.offer.eventId, 3);
    return;
  }

  shell(`<div class="mobile-v2 command-v2-compact">
    ${phaseTabs}
    <section class="mobile-card command-hero command-compact-card">
      <div class="mobile-card-head compact-head">
        <div><div class="kicker">PRODUCTION COMMAND</div><h2>${esc(unit.name)}</h2><p class="muted small">${esc(unit.tag)}</p></div>
        <span class="status-tag">${production} เครื่อง · ${cpUse}/${me.capacity} CP</span>
      </div>
      <div class="mobile-command-layout compact-command-layout">
        <div class="mech-stage mobile-sprite-stage compact-sprite-stage" id="sprite"></div>
        <div class="command-side-panel">
          <div class="mobile-order-summary compact-summary">
            ${row('รุ่นผลิต', esc(unit.name))}
            ${row('ใช้ Capacity', `${unitBase.cpCost} CP/เครื่อง`)}
            ${row('ผลิต', `${production} เครื่อง`)}
            ${deliveryLoss ? row('ส่งมอบคาดการณ์', `${expectedDeliverable} (-${deliveryLoss}%)`, 'red') : ''}
            ${row('ต้นทุน/เครื่อง', `${econ.unitCost} Cr.`)}
            ${row('ราคา/เครื่อง', `${econ.unitPrice} Cr.`)}
            ${row('คงเหลือรุ่นนี้', `${playerInventoryValue(me, unitBase.id).qty} เครื่อง`, 'gold')}
            ${row('เงินลงทุนรอบนี้', `${fmt(upfront)} Cr.`, upfront>me.funds?'red':'cyan')}
            ${row('สถานะ', risk, upfront>me.funds?'red':'gold')}
          </div>
          <div class="command-controls compact-controls">
            <div class="control-group-title">นโยบายบริษัท</div>
            ${slider('✨ คุณภาพ','quality',d.quality)}
            ${slider('💰 ราคา','priceStrategy',d.priceStrategy,0,100,market)}
            ${slider('🏭 การผลิต','prodPct',d.prodPct,0,150)}
            <div class="control-group-title investment-title">การลงทุน</div>
            <div class="compact-number-grid">
              ${numberField('งบ R&D (Cr.)','rndInvest',d.rndInvest)}
              ${numberField('โฆษณา (Cr.)','lobby',d.lobby)}
              ${numberField('ขยายโรงงาน (Cr.)','factoryInvest',d.factoryInvest)}
            </div>
            <div class="rd-mini">${techProgressHTML(me)}<small>งบ R&D รอบนี้ +${GameData.rpFromInvestment(d.rndInvest)} RP</small></div>
          </div>
        </div>
      </div>
    </section>

    <section class="mobile-card production-line-panel">
      <div class="mobile-card-head"><h2>Available Production</h2><span class="muted small">เลือกสายการผลิตจากรุ่นที่ปลดล็อกแล้ว</span></div>
      ${techProgressHTML(me)}
      ${technologyHangarHTML(me)}
    </section>

    <div class="command-bottom-grid">
      ${renderInventoryPanel(me, unitBase)}
      ${renderSpecialOfferPanel()}
    </div>
    <div class="command-resource-bar">
      <article><span>Capacity หลังลงทุน</span><b>${gain?`${me.capacity} + ${gain}`:`${me.capacity}`} CP</b></article>
      <article><span>เงินสด</span><b>${fmt(me.funds)} Cr.</b></article>
      <article><span>เงินลงทุนรอบนี้</span><b class="${upfront>me.funds?'red':'cyan'}">${fmt(upfront)} Cr.</b></article>
      <article><span>สถานะ</span><b class="${upfront>me.funds?'red':'gold'}">${risk}</b></article>
    </div>
    <div class="mobile-action-row"><button class="btn" id="backBriefing">กลับ Briefing</button>${button('ยืนยันคำสั่ง','red','submit')}</div>
    ${techNoticeHTML()}
  </div>`);
  renderSprite('sprite',unit,6);
  renderTechnologySprites(me);
  document.querySelectorAll('[data-slider]').forEach(el=>{
    const key=el.dataset.slider;
    const valueEl=el.parentElement.querySelector('.value,output,[data-value],label b');
    el.oninput=e=>{
      state.decision[key]=+e.target.value;
      if(valueEl){valueEl.textContent=`${e.target.value}%`;}
    };
    el.onchange=()=>renderDecide();
  });
  document.querySelectorAll('[data-num]').forEach(el=>{
    // Investment fields are typed values. Do not re-render the whole command screen
    // on every keypress; Safari can crash when the DOM is rebuilt while the user is
    // editing a number field. Store the draft value and refresh only after editing.
    const commitNumber = () => {
      const key = el.dataset.num;
      const raw = String(el.value || '').trim();
      const value = raw === '' ? 0 : Math.max(0, Math.min(9999, Number(raw) || 0));
      state.decision[key] = value;
      el.value = value;
    };
    el.oninput = () => {
      const key = el.dataset.num;
      const raw = String(el.value || '').trim();
      state.decision[key] = raw === '' ? 0 : Math.max(0, Math.min(9999, Number(raw) || 0));
    };
    el.onchange = () => { commitNumber(); save(); renderDecide(); };
    el.onblur = () => { commitNumber(); save(); renderDecide(); };
  });
  document.querySelectorAll('[data-unit]').forEach(btn=>{ btn.onclick=()=>{ state.decision.unitId = btn.dataset.unit; save(); renderDecide(); }; });
  $('#backBriefing').onclick=()=>{state.mobilePhase='briefing'; save(); renderDecide();};
  $('#submit').onclick=submitRound;
  const dismiss = $('#dismissTech'); if(dismiss) dismiss.onclick = () => { state.techNotices=[]; save(); renderDecide(); };
  document.querySelectorAll('[data-scrap]').forEach(btn=>btn.onclick=()=>scrapInventory(btn.dataset.scrap));
  bindSpecialOfferButtons();
  if(state.special && state.special.offer) renderPilot('offerPilot', state.special.offer.eventId, 3);
}

function navItem(icon,label,active=false,badge=''){return `<div class="nav-item ${active?'active':''}"><span class="nav-icon">${icon}</span><span>${label}</span>${badge?`<b class="badge">${badge}</b>`:''}</div>`}
function componentRow(name,on,pct){return `<div class="row"><span>${name}</span><b><span class="blocks">${Array.from({length:10},(_,i)=>`<i class="${i<on?'on':''}"></i>`).join('')}</span>${pct}%</b></div>`}
function radarSvg(){return `<div class="radar"><svg viewBox="0 0 220 190" aria-hidden="true"><polygon points="110,20 175,55 175,130 110,170 45,130 45,55" fill="none" stroke="#e8f8ff" stroke-width="3"/><polygon points="110,42 154,66 154,119 110,146 66,119 66,66" fill="none" stroke="#4baeff" stroke-width="1" opacity=".7"/><polygon points="110,58 143,74 150,118 110,135 74,118 70,74" fill="#8c56ff" opacity=".62" stroke="#d6a8ff" stroke-width="2"/><line x1="110" y1="20" x2="110" y2="170" stroke="#7de5ff" opacity=".55"/><line x1="45" y1="55" x2="175" y2="130" stroke="#7de5ff" opacity=".45"/><line x1="175" y1="55" x2="45" y2="130" stroke="#7de5ff" opacity=".45"/><text x="110" y="13" text-anchor="middle" fill="#ffd43a" font-size="18">A</text><text x="184" y="54" fill="#8cff4c" font-size="16">A</text><text x="182" y="135" fill="#66b7ff" font-size="16">A-</text><text x="110" y="188" text-anchor="middle" fill="#ffd43a" font-size="18">B+</text><text x="24" y="135" fill="#ffd43a" font-size="16">B+</text><text x="28" y="54" fill="#8cff4c" font-size="16">A</text></svg></div>`}
function slider(label,key,val,min=0,max=100,market=null){
  const colorClass = key === 'prodPct' ? 'prod-value' : key === 'quality' ? 'quality-value' : key === 'priceStrategy' ? 'price-value' : '';
  return `<div class="control slider-control ${key}"><label><span>${label}</span><b class="${colorClass}">${val}%</b></label><div class="slider-help">${sliderHelp(key, market)}</div><input data-slider="${key}" type="range" min="${min}" max="${max}" value="${val}"></div>`
}
function marketPriceAveragePercent(market){
  if(!market || !market.id) return 50;
  const table = {
    'frontline-surge': 56,
    'temporary-truce': 42,
    'rare-mineral-shortage': 61,
    'space-pirates': 48,
    'ace-pilot-trend': 53,
    'factory-audit': 50,
    'annual-expo': 61,
    'stable-market': 50
  };
  return table[market.id] ?? 50;
}
function sliderHelp(key, market=null){
  if(key === 'prodPct') return 'การผลิตที่ 90% : คือต้นทุนการผลิตที่ต่ำที่สุด';
  if(key === 'quality') return 'คุณภาพ 70% ขึ้นไป : เป็นการผลิตหุ่นรุ่นพิเศษ';
  if(key === 'priceStrategy') return `ราคาตลาดเฉลี่ยขณะนี้ : ${marketPriceAveragePercent(market)}%`;
  return '';
}
function numberField(label,key,val){return `<div class="control number-control"><label>${label}</label><input class="field" data-num="${key}" type="number" min="0" max="9999" value="${val}"></div>`}
function submitRound(){
  const submissions = {};
  const me = player(); const d = state.decision;
  normalizeDecisionUnit();
  submissions[me.id] = {...d, production:plannedUnits(me,d)};
  state.players.slice(1).forEach(p=> submissions[p.id]=GameData.botDecision(p.funds, p.capacity, state.currentEvent, p));
  const {event, results} = GameData.resolveRound(state.players,submissions,state.currentEvent);
  const notices = [];
  state.players = state.players.map(p=>{
    const r = results.find(x=>x.player.id===p.id); let funds=p.funds+r.profit; let debt=p.debt||0;
    if(funds<0){debt += -funds; funds=0;} if(debt>0 && funds>0){const pay=Math.min(funds,debt); debt-=pay; funds-=pay;}
    debt = Math.round(debt*1.08*100)/100;
    let updated = {...p, inventory:r.endingInventory || {}, funds:Math.round(funds), debt:Math.round(debt), reputation:Math.round((p.reputation+r.repDelta)*10)/10, capacity:Math.max(1,(p.capacity||GameData.START_CAPACITY)+Math.round((r.sub.factoryInvest||0)/GameData.EXPANSION_COST_PER_UNIT))};
    updated = applyResearch(updated, r.sub.rndInvest || 0);
    notices.push(...(updated.techNotices || []));
    delete updated.techNotices;
    return updated;
  });
  state.techNotices = notices;
  state.lastReport = {event, results:results.map(r=>({playerId:r.player.id, name:r.player.name, unit:r.unit, share:r.share, production:r.sub.production, unitsSold:r.unitsSold, fromStock:r.fromStock, freshDeliverable:r.freshDeliverable, leftoverFresh:r.leftoverFresh, inventoryQty:r.inventoryQty, inventoryCost:r.inventoryCost, inventoryRate:r.inventoryRate, revenue:r.revenue, cost:r.cost, profit:r.profit, repDelta:r.repDelta, marketBonus:r.marketBonus||0, contractBonus:r.contractBonus||0, performanceBonus:r.performanceBonus||0, perfTriggered:!!r.perfTriggered, crowdKey:r.crowdKey||r.unit?.id, crowdCount:r.crowdCount||1, crowdMult:r.crowdMult||1, matchedPreferred:!!r.matchedPreferred}))};
  state.history.push(state.lastReport); state.screen='reveal'; save(); render();
}

function renderIntelReveal(event){
  if(!event || event.id !== 'ace-pilot-trend') {
    return `<section class="card intel-reveal intel-placeholder"><h3>เฉลยข่าววงใน</h3><p class="muted small">ไตรมาสนี้ไม่มีข่าววงในให้เฉลย</p>${row('ประเภทข่าว', 'ข่าวสาธารณะ', 'cyan')}${row('สถานะ', 'ข้อมูลเกิดขึ้นจริงกับทุกบริษัท', 'green')}</section>`;
  }
  const rumored = GameData.UNIT_TYPES.find(u=>u.id===event.rumorUnitId);
  const actual = GameData.UNIT_TYPES.find(u=>u.id===event.preferredUnitId);
  const correct = event.rumorUnitId && event.preferredUnitId && event.rumorUnitId === event.preferredUnitId;
  return `<section class="card intel-reveal"><h3>เฉลยข่าววงใน</h3>${row('สายข่าวรายงานว่า', esc(rumored?.name || 'ไม่ทราบรุ่น'))}${row('กองทัพต้องการจริง', esc(actual?.name || 'ไม่ทราบรุ่น'), correct?'green':'red')}${row('ผลลัพธ์', correct ? 'ข่าวนี้แม่นยำ' : 'ข่าวนี้คลาดเคลื่อน')}${row('โบนัสตลาด', 'บริษัทที่ผลิตตรงรุ่นได้รับ +10% ราคาขาย')}</section>`;
}

function reportRowFor(r, i){
  const company = state.players.find(p => p.id === r.playerId) || {};
  const isYou = r.playerId === 'you';
  const rankLine = `${isYou ? '★ บริษัทของคุณ' : `#${i+1} คู่แข่ง`} · ${esc(r.name)}`;
  const profitClass = r.profit < 0 ? 'red' : 'cyan';
  const contract = firstActiveContract(company);
  const pilot = activePilotText(company) || r.pilotContract || r.pilot || '';
  if(isYou){
    return `<div class="card result-card player-result"><div class="mech-stage" style="min-height:155px" id="r${i}"></div><div><div class="rank">${rankLine}</div><h3>${esc(r.unit.name)}</h3>${contract ? pilotBadgeHTML(contract, `pilotResult${i}`) : ''}${pilot ? row('สัญญานักบินเอซ', esc(pilot), 'gold') : ''}${row('ส่วนแบ่งสัญญา',`${Math.round(r.share*1000)/10}%`)}${row('ผลิต / ขายได้',`${r.production} / ${r.unitsSold}`)}${r.crowdCount>1 ? row('ตลาดชนกัน', `${r.crowdCount} บริษัทผลิตรุ่นนี้ · ยอดขาย -${Math.round((1-r.crowdMult)*100)}%`, 'red') : row('ความแตกต่าง', 'ไม่มีคู่แข่งผลิตรุ่นเดียวกัน', 'green')}${row('คงเหลือใหม่',`${r.leftoverFresh||0} เครื่อง`)}${row('ค่าดูแลคลัง',`${fmt(r.inventoryCost||0)} Cr.`)}${r.marketBonus ? row('โบนัสข่าววงใน', `+${Math.round(r.marketBonus*100)}% ราคาขาย`, 'green') : ''}${r.contractBonus ? row('โบนัสสัญญานักบิน', `+${Math.round(r.contractBonus*100)}% ราคาขาย`, 'green') : ''}${r.performanceBonus ? row('Performance Bonus', `+${fmt(r.performanceBonus)} Cr.`, 'green') : ''}${row('กำไรสุทธิ',`${r.profit>=0?'+':''}${fmt(r.profit)} Cr.`,profitClass)}${row('ชื่อเสียง', reputationTitle(company.reputation ?? 0))}</div></div>`;
  }
  return `<div class="card rival-result"><div class="rival-head"><div class="rival-unit-sprite" id="rival${i}"></div><div><div class="rank">${rankLine}</div><h3>${esc(r.unit.name)}</h3>${contract ? pilotBadgeHTML(contract, `pilotRival${i}`) : ''}</div><b class="${profitClass}">${r.profit>=0?'+':''}${fmt(r.profit)} Cr.</b></div><div class="rival-summary">${row('ผลิต', `${r.production} เครื่อง`)}${row('ชื่อเสียง', reputationTitle(company.reputation ?? 0))}${row('กำไร/ขาดทุน', `${r.profit>=0?'+':''}${fmt(r.profit)} Cr.`, profitClass)}${r.performanceBonus ? row('Performance Bonus', `+${fmt(r.performanceBonus)} Cr.`, 'green') : ''}${r.crowdCount>1 ? row('ตลาดชนกัน', `${r.crowdCount} บริษัท`, 'red') : ''}${pilot ? row('สัญญานักบินเอซ', esc(pilot), 'gold') : ''}</div></div>`;
}

function renderCrowdingAnalysis(results){
  const groups = {};
  (results || []).forEach(r => {
    const id = r.crowdKey || r.unit?.id || 'unknown';
    groups[id] = groups[id] || {unit:r.unit, count:0, mult:r.crowdMult || 1};
    groups[id].count += 1;
    groups[id].mult = Math.min(groups[id].mult, r.crowdMult || 1);
  });
  const rows = Object.values(groups).sort((a,b)=>b.count-a.count).map(g => {
    if(g.count <= 1) return `<div class="market-crowd-line green">${esc(g.unit.name)}: มีผู้ผลิตรายเดียว ได้เปรียบด้านความแตกต่าง</div>`;
    return `<div class="market-crowd-line red">${esc(g.unit.name)}: ผลิตโดย ${g.count} บริษัท ยอดขายลดลง ${Math.round((1-g.mult)*100)}%</div>`;
  }).join('');
  return `<section class="card crowding-panel"><h3>วิเคราะห์ตลาดชนกัน</h3>${rows}</section>`;
}

function renderReveal(){
  const rep = state.lastReport;
  const sorted=[...rep.results].sort((a,b)=>b.share-a.share);
  const palette = ['#31c8ff','#ffd43a','#8cff4c','#ff4b3d','#ff4fd8','#b6a47b'];
  let cursor = 0;
  const pieStops = sorted.map((r,i)=>{
    const start = cursor;
    cursor += Math.max(0, r.share) * 100;
    return `${palette[i % palette.length]} ${start}% ${cursor}%`;
  }).join(', ');
  const leader = sorted[0];
  const you = sorted.find(r => r.playerId === 'you');
  const rivals = sorted.filter(r => r.playerId !== 'you');
  shell(`<div class="panel reveal-screen report-v2-compact">
    <h2>รายงานผลไตรมาสที่ ${state.round}</h2>
    <section class="report-top-grid">
      <article class="card report-event-card"><h3>เหตุการณ์ไตรมาสนี้</h3><b class="gold">${rep.event.name}</b><p>${rep.event.desc}</p></article>
      <div class="report-analysis-stack">
        ${renderIntelReveal(rep.event)}
        ${renderCrowdingAnalysis(rep.results)}
      </div>
    </section>

    <section class="market-share-panel">
      <div>
        <div class="section-title"><span>◉</span> MARKET SHARE</div>
        <p class="muted small">สัดส่วนตลาดจากคะแนนประมูลของแต่ละบริษัทในไตรมาสนี้</p>
        <div class="market-leader">ผู้นำตลาด: <b>${esc(leader.name)}</b> <span>${Math.round(leader.share*1000)/10}%</span></div>
      </div>
      <div class="share-chart-wrap">
        <div class="share-pie" style="background:conic-gradient(${pieStops});"><span>Q${String(state.round).padStart(2,'0')}</span></div>
        <div class="share-legend">
          ${sorted.map((r,i)=>`<div class="share-key ${r.playerId==='you'?'you-key':''}"><i style="background:${palette[i % palette.length]}"></i><span>${r.playerId==='you'?'★ ':''}${esc(r.name)}</span><b>${Math.round(r.share*1000)/10}%</b></div>`).join('')}
        </div>
      </div>
    </section>

    <section class="results-split">
      <div>
        <div class="section-title"><span>★</span> YOUR COMPANY</div>
        <div class="results">${you ? reportRowFor(you, sorted.indexOf(you)) : ''}</div>
      </div>
      <div>
        <div class="section-title"><span>◆</span> RIVAL SUMMARY</div>
        <div class="rival-list">${rivals.map(r=>reportRowFor(r, sorted.indexOf(r))).join('')}</div>
      </div>
    </section>
    <div class="footer-actions">${button(state.round>=GameData.MAX_ROUNDS?'ดูผลจบเกม':'ไปไตรมาสถัดไป','gold','next')}</div>
  </div>`);
  sorted.forEach((r,i)=>{
    const company = state.players.find(p => p.id === r.playerId) || {};
    const contract = firstActiveContract(company);
    if(r.playerId === 'you') { renderSprite(`r${i}`,r.unit,5); if(contract) renderPilot(`pilotResult${i}`, contract.eventId, 2); }
    else { renderSprite(`rival${i}`,r.unit,3); if(contract) renderPilot(`pilotRival${i}`, contract.eventId, 2); }
  });
  $('#next').onclick=()=>{ if(state.round>=GameData.MAX_ROUNDS){state.screen='end'} else {state.round++; state.screen='decide'; state.mobilePhase='briefing'; state.currentEvent = prepareMarketEvent(state.round, player()?.reputation || 0); state.decision={
      unitId:GameData.unlockedUnits(player())[0]?.id || 'z1',
      // Company policy persists across quarters until the player changes it.
      quality:state.decision?.quality ?? 50,
      priceStrategy:state.decision?.priceStrategy ?? 50,
      prodPct:state.decision?.prodPct ?? 70,
      // Quarterly investments reset each round.
      lobby:0,
      factoryInvest:0,
      rndInvest:0
    };} save(); render(); };
}
function renderEnd(){
  const ranks=[...state.players].map(p=>({...p,score:p.funds + p.reputation*20 - (p.debt||0)})).sort((a,b)=>b.score-a.score);
  shell(`<div class="panel center"><h2>สงครามจบลงแล้ว</h2><p class="muted">อันดับบริษัทผู้ผลิตโมบิลสูท</p><div class="contract-grid">${ranks.map((p,i)=>`<div class="card"><div class="rank">#${i+1}</div><h3>${esc(p.name)}</h3><div class="big-number">${fmt(p.score)}</div>${row('Cash',`${fmt(p.funds)} Cr.`)}${row('ชื่อเสียง',reputationTitle(p.reputation))}${row('Debt',`${fmt(p.debt||0)} Cr.`)}</div>`).join('')}</div><div class="footer-actions">${button('เริ่มเกมใหม่','gold','new')}</div></div>`);
  $('#new').onclick=()=>{localStorage.removeItem('msc-vanilla-save'); location.reload();};
}
function render(){
  if(state.screen==='home') renderHome(); else if(state.screen==='story') renderStory(); else if(state.screen==='decide') renderDecide(); else if(state.screen==='reveal') renderReveal(); else if(state.screen==='end') renderEnd();
}

window.addEventListener('error', e => { app.innerHTML = `<div class="shell"><div class="panel"><h2 class="red">Game error</h2><pre>${esc(e.message)}\n${esc(e.filename)}:${e.lineno}</pre></div></div>`; });
render();
