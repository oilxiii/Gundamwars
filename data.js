const GameData = (() => {
  const MAX_ROUNDS = 12;
  const START_FUNDS = 1000;
  const BASE_POOL = 100;
  const BASE_PRICE = 8;
  const BASE_COST = 6;
  const START_CAPACITY = 27;
  const EXPANSION_COST_PER_UNIT = 20;
  const SCRAP_RATE = 0.25;

  const UNIT_TYPES = [
    { id: 'z1', tier:0, cpCost:1, baseCost:3.0, basePrice:5.2, rnd:'low', price:'low', name:'RB-79 Ball', tag:'โลงศพอวกาศ ต้นทุนต่ำ ผลิตได้จำนวนมาก', primary:'#d7d2c6', visor:'#7cc7ff', hornColor:'#9aa0a6', horn:'ball', kind:'ball' },
    { id: 'z4', tier:1, cpCost:2, baseCost:7.0, basePrice:11.0, rnd:'mid', price:'low', name:'หุ่นรุ่นผลิตจำนวนมาก', tag:'ซาคุมาตรฐาน ใช้ได้ทุกสมรภูมิ', primary:'#4a7a3e', visor:'#c0392b', hornColor:'#33502a', horn:'mono' },
    { id: 'z5', tier:1, cpCost:2, baseCost:8.5, basePrice:13.0, rnd:'mid', price:'mid', name:'กุ๊กวัน', tag:'รุ่นจู่โจมมาตรฐาน สมดุลราคาและสมรรถนะ', primary:'#6b4c3a', visor:'#c0392b', hornColor:'#432f24', horn:'mono' },
    { id: 'z6', hidden:true, tier:2, cpCost:3, baseCost:12.0, basePrice:18.0, rnd:'mid', price:'high', name:'กุ๊กทู', tag:'รุ่นผู้บังคับบัญชา ใช้กำลังผลิตมากขึ้น', primary:'#7d3c98', visor:'#ffd54f', hornColor:'#4e2761', horn:'mono' },
    { id: 'z7', tier:2, cpCost:3, baseCost:13.0, basePrice:19.5, rnd:'high', price:'low', name:'หุ่นอาร์เอ็กซ์ รุ่นทดสอบ', tag:'ต้นแบบเทคโนโลยีใหม่ ต้นทุนสูง', primary:'#e8e8e8', visor:'#2ecc71', hornColor:'#c0392b', horn:'vfin' },
    { id: 'z8', tier:3, cpCost:4, baseCost:17.0, basePrice:26.0, rnd:'high', price:'mid', name:'หุ่นอาร์เอ็กซ์ รุ่นเอซ', tag:'รุ่นสมรรถนะสูง ผลิตได้ไม่มาก', primary:'#dfe6f0', visor:'#4a6fa5', hornColor:'#b0bfd6', horn:'vfin' },
    { id: 'z9', hidden:true, tier:4, cpCost:6, baseCost:25.0, basePrice:40.0, rnd:'high', price:'high', name:'หุ่นอาร์เอ็กซ์ รุ่นลิมิเต็ด', tag:'รุ่นพิเศษผลิตจำกัด ใช้ Capacity สูงมาก', primary:'#d4af37', visor:'#c0392b', hornColor:'#8a6d1f', horn:'vfin' },
  ];

  const TECH_TIERS = [
    { level:0, name:'พื้นฐาน', rpRequired:0, unlockIds:['z1'] },
    { level:1, name:'Mobile Suit Mass Production', rpRequired:60, unlockIds:['z4','z5'] },
    { level:2, name:'Commander Platform', rpRequired:140, unlockIds:['z7'] },
    { level:3, name:'Ace Frame', rpRequired:240, unlockIds:['z8'] },
  ];

  const EVENTS = [
    {
      id:'frontline-surge', icon:'▲', tone:'good', priority:5,
      name: 'แนวรบปะทุกะทันหัน',
      summary: 'คำสั่งซื้อฉุกเฉินเพิ่มขึ้นทั่วตลาด',
      desc: 'แนวรบร้อนระอุ กองทัพเร่งสั่งซื้อโมบิลสูท ตลาดรวมขยายตัว +50%',
      effect: 'Demand +50%', advice: 'เร่งผลิตได้ ถ้าเงินสดและกำลังผลิตพอ',
      poolMult: 1.5, repAll: 0
    },
    {
      id:'temporary-truce', icon:'▼', tone:'bad', priority:4,
      name: 'สงบศึกชั่วคราว',
      summary: 'คำสั่งซื้อหดตัว กองทัพชะลอรับมอบ',
      desc: 'การรบสงบลงชั่วคราว คำสั่งซื้อรวมของตลาดลดลง -40%',
      effect: 'Demand -40%', advice: 'ลดกำลังผลิตหรือเน้นราคาเพื่อกันของค้าง',
      poolMult: 0.6, repAll: 0
    },
    {
      id:'rare-mineral-shortage', icon:'⚠', tone:'warn', priority:5,
      name: 'ขาดแคลนแร่หายาก',
      summary: 'วัตถุดิบหลักขาดตลาด ต้นทุนทุกบริษัทเพิ่มขึ้น',
      desc: 'เหมืองแร่ในเขตอาณานิคมส่งมอบล่าช้า ต้นทุนผลิตทุกบริษัทเพิ่ม 25%',
      effect: 'Cost +25%', advice: 'ระวังตั้งราคาต่ำเกินทุน และชะลอแผนเสี่ยง',
      poolMult: 0.85, repAll: 0, costMult: 1.25
    },
    {
      id:'space-pirates', icon:'☠', tone:'bad', priority:5,
      name: 'โจรสลัดอวกาศบุกเส้นทางขนส่ง',
      summary: 'สินค้าทุกบริษัทมีโอกาสเสียหายระหว่างส่งมอบ',
      desc: 'กลุ่มโจรสลัดอวกาศโจมตีเส้นทางลูนาร์ สินค้าที่ผลิตแล้วเสียหายเฉลี่ย 20% ก่อนส่งมอบ',
      effect: 'Delivery Loss 20%', advice: 'อย่าผลิตเกินตัวมากเกินไป เพราะอาจขายได้ไม่ครบ',
      poolMult: 1.05, repAll: 0, damageChance: 0.20
    },
    {
      id:'ace-pilot-trend', icon:'★', tone:'good', priority:3,
      name: 'ข่าววงใน: ความต้องการของกองทัพ',
      summary: 'มีข่าวว่ากองทัพกำลังสนใจหุ่นบางรุ่นเป็นพิเศษ',
      desc: 'ข่าวจากสายข่าวระบุว่ากองทัพกำลังสนใจหุ่นบางรุ่นเป็นพิเศษ แต่ข้อมูลอาจคลาดเคลื่อนได้ตามคุณภาพเครือข่ายข่าวกรองของบริษัท',
      effect: 'Insider Intel', advice: 'ข่าววงในไม่แม่นยำ 100% ใช้ประกอบการตัดสินใจเท่านั้น',
      poolMult: 1
    },
    {
      id:'factory-audit', icon:'!', tone:'warn', priority:4,
      name: 'ตรวจสอบสายการผลิต',
      summary: 'บริษัทที่ผลิตมากที่สุดเสี่ยงเสียชื่อเสียง',
      desc: 'หน่วยตรวจสอบกองทัพจับตาโรงงานที่เร่งผลิตเกินมาตรฐาน บริษัทที่ผลิตมากที่สุดเสียชื่อเสียง',
      effect: 'Most Production Rep -10', advice: 'อย่าเร่งผลิตสุดตัวถ้าไม่จำเป็น',
      poolMult: 1, penaltyMostProduced: -10
    },
    {
      id:'annual-expo', icon:'◆', tone:'good', priority:3,
      name: 'งานแถลงเทคโนโลยีประจำปี',
      summary: 'ตลาดคึกคักและทุกบริษัทได้ชื่อเสียงเพิ่ม',
      desc: 'งานแสดงเทคโนโลยีอาวุธทำให้ตลาดคึกคัก ทุกบริษัทได้ชื่อเสียงเพิ่ม',
      effect: 'Demand +25%, Rep +2', advice: 'เหมาะกับการโชว์รุ่นคุณภาพหรือเพิ่ม PR',
      poolMult: 1.25, repAll: 2
    },
    {
      id:'stable-market', icon:'●', tone:'info', priority:2,
      name: 'ตลาดทรงตัว',
      summary: 'ไม่มีเหตุการณ์พิเศษ การแข่งขันขึ้นกับแผนของแต่ละบริษัท',
      desc: 'ไม่มีเหตุการณ์พิเศษ ทุกอย่างเป็นไปตามปกติ',
      effect: 'Normal Market', advice: 'เล่นตามกลยุทธ์หลักของบริษัทได้เลย',
      poolMult: 1, repAll: 0
    },
  ];


  const SPECIAL_EVENTS = [
    { id:'amuro-bay', tier:2, name:'อามุโล่ เบย์', role:'นักบินเอซ', unitIds:['z7','z8','z9'], targetLabel:'ตระกูลอาร์เอ็กซ์', priceBonus:0.10, duration:3, baseWeight:10, startRound:5, pricePct:0.15,
      pitch:'นักบินระดับตำนานสนใจหุ่นตระกูลอาร์เอ็กซ์ของบริษัทคุณ' },
    { id:'zaza-impossible', tier:2, name:'ซาซ่า อิมพอสสิเบิล', role:'นักบินเอซ', unitIds:['z4'], targetLabel:'ดาวตกสีแดง / Commander Type', priceBonus:0.15, duration:3, baseWeight:10, startRound:5, pricePct:0.16,
      pitch:'นักบินชื่อดังชื่นชอบดาวตกสีแดงและต้องการเป็นพรีเซ็นเตอร์' },
    { id:'rookie-pilot', tier:1, name:'นักบินดาวรุ่ง', role:'นักบินเอซ', unitIds:['z5','z6'], targetLabel:'กุ๊กวัน / กุ๊กทู', priceBonus:0.08, duration:3, baseWeight:14, startRound:3, pricePct:0.10,
      pitch:'นักบินดาวรุ่งกำลังมองหาบริษัทที่กล้าดันหุ่นสายกุ๊ก' },
    { id:'military-reviewer', tier:1, name:'นักรีวิวสายทหาร', role:'ผู้เชี่ยวชาญภาคสนาม', unitIds:['z1'], targetLabel:'RB-79 Ball' , priceBonus:0.07, duration:3, baseWeight:14, startRound:3, pricePct:0.08,
      pitch:'นักรีวิวภาคสนามสนใจทำแคมเปญให้ RB-79 Ball' },
    { id:'legend-test-pilot', tier:3, name:'นักบินทดสอบระดับตำนาน', role:'นักบินเอซ', unitIds:['z8','z9'], targetLabel:'อาร์เอ็กซ์รุ่นเอซ / ลิมิเต็ด', priceBonus:0.18, duration:3, baseWeight:8, startRound:8, pricePct:0.20,
      pitch:'นักบินทดสอบระดับตำนานพร้อมยกระดับภาพลักษณ์ของหุ่นอาร์เอ็กซ์รุ่นสูง' }
  ];

  function getSpecialEventById(id) { return SPECIAL_EVENTS.find(e => e.id === id); }
  function activeUnitContractBonus(player, unitId) {
    const contracts = (player && player.activeContracts) || [];
    return contracts.filter(c => c.remaining > 0 && c.unitIds && c.unitIds.includes(unitId)).reduce((sum,c)=> sum + (c.priceBonus || 0), 0);
  }

  const BOT_NAMES = ['Anaheim', 'Zeonic', 'MIP Works', 'Luna Steel'];

  function band(v) { return v < 34 ? 'low' : v < 67 ? 'mid' : 'high'; }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function tierForTechLevel(level) { return TECH_TIERS[Math.max(0, Math.min(TECH_TIERS.length - 1, Number(level || 0)))] || TECH_TIERS[0]; }
  function unlockedUnitIds(player) {
    const maxLevel = Math.max(...TECH_TIERS.map(t => t.level));
    const level = Math.max(0, Math.min(maxLevel, Number((player && player.techLevel) || 0)));
    return TECH_TIERS.filter(t => t.level <= level).flatMap(t => t.unlockIds);
  }
  function unlockedUnits(player) {
    const ids = new Set(unlockedUnitIds(player));
    return UNIT_TYPES.filter(u => !u.hidden && ids.has(u.id));
  }
  function nextTechTier(player) {
    const maxLevel = Math.max(...TECH_TIERS.map(t => t.level));
    const level = Math.max(0, Math.min(maxLevel, Number((player && player.techLevel) || 0)));
    return TECH_TIERS.find(t => t.level === level + 1) || null;
  }
  function getUnit(_qualityOrRnd, priceStrategy, unitId = null, player = null) {
    if (unitId) return UNIT_TYPES.find(u => u.id === unitId) || UNIT_TYPES[0];
    const available = player ? unlockedUnits(player) : UNIT_TYPES;
    const priceBand = band(priceStrategy || 50);
    return available.find(u => u.price === priceBand) || available[Math.min(available.length - 1, 0)] || UNIT_TYPES[0];
  }
  function qualityCostMultiplier(quality = 50) {
    const q = clamp(Number(quality || 0), 0, 100) / 100;
    return 1 + 0.15 * Math.pow(q, 1.6);
  }
  function qualityPerformanceChance(quality = 50) {
    const q = clamp(Number(quality || 0), 0, 100);
    return Math.round(q * 0.20) / 100;
  }
  function qualityVariant(unit, quality = 50) {
    const q = clamp(Number(quality || 0), 0, 100);
    let u = { ...unit };

    // Quality 70%+ turns the current production model into its high-quality secret variant.
    // These variants are NOT separate tech unlocks and should not appear in Available Production.
    if (q >= 70) {
      if (unit.kind === 'ball') {
        u = { ...u, name:'RB-79K Ball Kai', tag:'โลงศพอวกาศรุ่นปรับปรุงจากสายการผลิตคุณภาพสูง', primary:'#f2e9cf', visor:'#8df7ff' };
      } else if (unit.id === 'z4') {
        u = { ...u, name:'ดาวตกสีแดง', tag:'รุ่น Commander คุณภาพสูงจากสายการผลิตระดับ Elite', primary:'#c0392b', visor:'#ffd54f', hornColor:'#7a1f14' };
      } else if (unit.id === 'z5') {
        u = { ...u, name:'กุ๊กทู', tag:'รุ่นผู้บังคับบัญชาจากสายการผลิตคุณภาพสูง', primary:'#a64fe0', visor:'#ffd54f', hornColor:'#4e2761' };
      } else if (unit.horn === 'vfin') {
        u = { ...u, name: `${unit.name} รุ่นทอง`, tag:'รุ่นคุณภาพสูงจากสายการผลิตระดับ Ace', primary:'#d4af37', visor:'#c0392b', hornColor:'#8a6d1f' };
      }
    }
    u.variantQuality = q;
    u.variantTier = q >= 70 ? 'high' : 'standard';
    return u;
  }

  function utilizationMultiplier(prodPct) {
    const p = Math.max(0, prodPct) / 100;
    const sweet = 0.9;
    const diff = p - sweet;
    if (diff >= 0) return 1 + Math.pow(diff / 0.1, 2) * 0.15;
    return 1 + Math.pow(Math.abs(diff) / 0.4, 1.5) * 0.25;
  }
  function volumeDiscount(units) {
    if (units <= 0) return 1;
    return 1 / (1 + Math.log(1 + units) * 0.035);
  }
  function unitEconomics(quality, priceStrategy, costMult = 1, prodPct = 90, productionUnits = 0, unitId = null, player = null) {
    const unit = getUnit(quality, priceStrategy, unitId, player);
    const utilMult = utilizationMultiplier(prodPct);
    const scaleMult = volumeDiscount(productionUnits);
    const qMult = qualityCostMultiplier(quality);
    const unitCost = Math.round((unit.baseCost || BASE_COST) * costMult * utilMult * scaleMult * qMult * 10) / 10;
    const pricePolicy = 0.78 + (clamp(priceStrategy || 50, 0, 100) / 100) * 0.62;
    const unitPrice = Math.round((unit.basePrice || BASE_PRICE) * pricePolicy * 10) / 10;
    return { unitCost, unitPrice, margin: Math.round((unitPrice - unitCost) * 10) / 10, utilMult: Math.round(utilMult * 100) / 100, scaleMult: Math.round(scaleMult * 100) / 100, qualityCostMult: Math.round(qMult*100)/100, cpCost: unit.cpCost || 1 };
  }
  function unitToFocus(unitId) {
    const u = UNIT_TYPES.find(x => x.id === unitId) || UNIT_TYPES[0];
    const priceMap = { low: 22, mid: 50, high: 78 };
    return { unitId:u.id, quality: 50, priceStrategy: priceMap[u.price] || 50 };
  }

  function rpFromInvestment(amount) {
    const a = Math.max(0, Number(amount || 0));
    if (a <= 0) return 0;
    // Diminishing return: enough to unlock all tech around Q8 with steady investment,
    // around Q6 with heavy focus, while still making small R&D budgets meaningful.
    return Math.min(120, Math.round(32 * Math.pow(a / 100, 0.82)));
  }
  function botDecision(funds, capacity, event = null, player = null) {
    const rep = Number((player && player.reputation) || 0);
    const cash = Math.max(0, Number(funds || 0));
    const cap = Math.max(1, Number(capacity || START_CAPACITY));
    const invQty = inventoryTotals(player || {}).qty || 0;
    const available = unlockedUnits(player || { techLevel:0 });

    let quality = 38 + Math.random() * 30;
    let priceStrategy = 42 + Math.random() * 24;
    let preferred = null;
    if (event && event.id === 'ace-pilot-trend' && event.rumorUnitId && Math.random() < 0.62) {
      const ids = new Set(available.map(u=>u.id));
      if (ids.has(event.rumorUnitId)) preferred = event.rumorUnitId;
      const target = unitToFocus(event.rumorUnitId);
      priceStrategy = target.priceStrategy + (Math.random() - 0.5) * 16;
    }
    if (!preferred) {
      const sorted = [...available].sort((a,b)=>{
        const score = (b.basePrice-b.baseCost)/(b.cpCost||1) - (a.basePrice-a.baseCost)/(a.cpCost||1);
        return score + (Math.random()-0.5)*2;
      });
      preferred = (event && event.poolMult < 0.8) ? sorted.find(u=>u.cpCost<=2)?.id || sorted[0].id : sorted[0].id;
    }
    if (event && event.costMult > 1.1) priceStrategy += 10 + Math.random() * 8;
    if (event && event.poolMult < 0.8) priceStrategy -= 8 + Math.random() * 10;
    if (event && event.poolMult >= 1.2) quality += 5 + Math.random() * 8;
    quality = Math.round(clamp(quality, 12, 92));
    priceStrategy = Math.round(clamp(priceStrategy, 12, 88));
    const unit = getUnit(quality, priceStrategy, preferred, player);

    let prodPct = 78 + Math.random() * 22;
    if (event && event.poolMult >= 1.2) prodPct += 10 + Math.random() * 12;
    if (event && event.poolMult < 0.8) prodPct -= 16 + Math.random() * 10;
    if (event && event.damageChance) prodPct -= 4 + Math.random() * 8;
    if (invQty > cap * 0.25) prodPct -= 10;
    if (cash < 260) prodPct -= 10;
    prodPct = Math.round(clamp(prodPct, 45, 118));

    let production = Math.floor((cap * prodPct / 100) / Math.max(1, unit.cpCost || 1));
    const econ = unitEconomics(quality, priceStrategy, (event && event.costMult) || 1, prodPct, production, unit.id, player);
    let plannedCost = production * econ.unitCost;

    if (plannedCost > cash * 0.78) {
      const affordableUnits = Math.max(1, Math.floor((cash * 0.72) / Math.max(1, econ.unitCost)));
      const cpUse = affordableUnits * Math.max(1, unit.cpCost || 1);
      prodPct = Math.round(clamp((cpUse / cap) * 100, 25, 105));
      production = Math.floor((cap * prodPct / 100) / Math.max(1, unit.cpCost || 1));
      plannedCost = Math.round(production * econ.unitCost);
    }

    const lobbyBase = event && event.id === 'ace-pilot-trend' ? 0.045 : 0.028;
    const lobby = Math.round(clamp(cash * (lobbyBase + rep / 5200) * (0.75 + Math.random() * 0.6), 0, Math.min(50, cash * 0.09)));

    let factoryInvest = 0;
    let rndInvest = 0;
    const next = nextTechTier(player || {});
    const spareCash = cash - plannedCost - lobby;
    const personality = (player && player.aiStyle) || (Math.random() < 0.33 ? 'research' : Math.random() < 0.66 ? 'mass' : 'balanced');
    if (next && spareCash > 180 && personality !== 'mass') rndInvest = Math.round(clamp(spareCash * (personality === 'research' ? 0.16 : 0.08), 0, Math.min(140, spareCash*0.24)));
    if (spareCash - rndInvest > 420 && cap < 65 && Math.random() < (personality === 'mass' ? 0.58 : 0.34)) {
      factoryInvest = Math.round(clamp((spareCash-rndInvest) * (0.08 + Math.random() * 0.10), 0, Math.min(90, (spareCash-rndInvest) * 0.20)));
    }

    return { unitId: unit.id, quality, priceStrategy, prodPct, production, lobby, factoryInvest, rndInvest };
  }
  function pickMarketEvent() {
    const total = EVENTS.reduce((s,e)=>s+(e.priority||1),0);
    let roll = Math.random()*total;
    for (const e of EVENTS) { roll -= (e.priority||1); if (roll <= 0) return {...e}; }
    return {...EVENTS[EVENTS.length-1]};
  }

  function getEventById(id) { return EVENTS.find(e=>e.id===id) || EVENTS[EVENTS.length-1]; }

  function getInventoryBatches(player, unitId) {
    const inv = (player && player.inventory) || {};
    const batches = inv[unitId] || [];
    return Array.isArray(batches) ? batches.map(b => ({...b, qty: Math.max(0, Math.round(b.qty || 0)), unitCost: Number(b.unitCost || 0)})).filter(b => b.qty > 0) : [];
  }
  function inventoryTotals(player) {
    const inv = (player && player.inventory) || {};
    let qty = 0, value = 0;
    Object.values(inv).forEach(batches => (Array.isArray(batches) ? batches : []).forEach(b => {
      qty += Math.max(0, Math.round(b.qty || 0));
      value += Math.max(0, Math.round(b.qty || 0)) * Number(b.unitCost || 0);
    }));
    return { qty, value: Math.round(value * 10) / 10 };
  }
  function inventoryRate(player) {
    const totals = inventoryTotals(player);
    if (totals.qty <= 0) return 0;
    const capacity = Math.max(1, player.capacity || START_CAPACITY);
    const step = Math.max(1, capacity * 0.10);
    return Math.ceil(totals.qty / step) / 100;
  }
  function inventoryHoldingCost(player) {
    const totals = inventoryTotals(player);
    const rate = inventoryRate(player);
    return { ...totals, rate, cost: Math.round(totals.value * rate * 10) / 10 };
  }
  function consumeInventoryFIFO(batches, need) {
    const used = [];
    const left = [];
    let remaining = Math.max(0, Math.round(need || 0));
    for (const batch of batches) {
      const qty = Math.max(0, Math.round(batch.qty || 0));
      if (qty <= 0) continue;
      if (remaining <= 0) { left.push({...batch, qty}); continue; }
      const take = Math.min(qty, remaining);
      used.push({...batch, qty: take});
      remaining -= take;
      const rest = qty - take;
      if (rest > 0) left.push({...batch, qty: rest});
    }
    return { used, left, taken: used.reduce((s,b)=>s+b.qty,0) };
  }
  function resolveRound(players, submissions, forcedEvent = null) {
    const event = forcedEvent ? (typeof forcedEvent === 'string' ? {...getEventById(forcedEvent)} : {...getEventById(forcedEvent.id), ...forcedEvent}) : pickMarketEvent();
    const costMult = event.costMult || 1;
    const pool = BASE_POOL * (event.poolMult || 1);
    const rows = players.map(p => {
      const sub = submissions[p.id];
      const baseUnit = getUnit(sub.quality ?? sub.rndFocus, sub.priceStrategy, sub.unitId, p);
      const unit = qualityVariant(baseUnit, sub.quality ?? sub.rndFocus ?? 50);
      const econ = unitEconomics(sub.quality ?? sub.rndFocus ?? 50, sub.priceStrategy, costMult, sub.prodPct, sub.production, baseUnit.id, p);
      const currentStockBatches = getInventoryBatches(p, unit.id);
      const currentStock = currentStockBatches.reduce((s,b)=>s+b.qty,0);
      const priceAppeal = (100 - sub.priceStrategy) / 100;
      const qualityAppeal = (sub.quality ?? sub.rndFocus ?? 50) / 100;
      const availableSignal = sub.production + currentStock * 0.6;
      const appeal = Math.max(0.0001, availableSignal * (0.4 + priceAppeal) + sub.lobby * 2 + qualityAppeal * 35 + p.reputation * 0.3);
      return { player: p, sub, unit, econ, appeal, currentStockBatches, currentStock };
    });
    const crowdKeyFor = (r) => `${r.unit.id}::q${Number(r.sub.quality ?? r.sub.rndFocus ?? 50) >= 70 ? 'high' : 'std'}`;
    const crowdCounts = rows.reduce((m,r)=>{ const key = crowdKeyFor(r); m[key] = (m[key] || 0) + 1; return m; }, {});
    const crowdMultFor = (count) => count <= 1 ? 1 : count === 2 ? 0.90 : count === 3 ? 0.80 : 0.70;
    const totalAppeal = rows.reduce((s, r) => s + r.appeal, 0) || 1;
    const results = rows.map(r => {
      const share = r.appeal / totalAppeal;
      const crowdKey = crowdKeyFor(r);
      const crowdCount = crowdCounts[crowdKey] || 1;
      const crowdMult = crowdMultFor(crowdCount);
      const contractsWon = share * pool;
      const adjustedContractsWon = contractsWon * crowdMult;
      const freshDeliverable = Math.max(0, Math.round(r.sub.production * (1 - (event.damageChance || 0))));
      const availableUnits = r.currentStock + freshDeliverable;
      const unitsSold = Math.round(Math.min(adjustedContractsWon, availableUnits));
      const fromStock = Math.min(unitsSold, r.currentStock);
      const stockUse = consumeInventoryFIFO(r.currentStockBatches, fromStock);
      const soldFresh = Math.max(0, unitsSold - stockUse.taken);
      const leftoverFresh = Math.max(0, freshDeliverable - soldFresh);
      const leftoverBatches = [...stockUse.left];
      if (leftoverFresh > 0) leftoverBatches.push({ qty: leftoverFresh, unitCost: r.econ.unitCost, round: 0 });
      const endingInventory = { ...((r.player && r.player.inventory) || {}) };
      if (leftoverBatches.length) endingInventory[r.unit.id] = leftoverBatches;
      else delete endingInventory[r.unit.id];
      const tempPlayer = { ...r.player, inventory: endingInventory };
      const holding = inventoryHoldingCost(tempPlayer);
      const matchedPreferred = !!(event.preferredUnitId && event.preferredUnitId === r.unit.id);
      const marketBonus = matchedPreferred ? 0.10 : 0;
      const contractBonus = activeUnitContractBonus(r.player, r.unit.id);
      const revenue = unitsSold * r.econ.unitPrice * (1 + marketBonus + contractBonus);
      const productionCost = r.sub.production * r.econ.unitCost;
      const perfChance = qualityPerformanceChance(r.sub.quality ?? r.sub.rndFocus ?? 50);
      const perfTriggered = unitsSold > 0 && Math.random() < perfChance;
      const performanceBonus = perfTriggered ? Math.round(revenue * (0.05 + Math.random()*0.10)) : 0;
      const cost = productionCost + r.sub.lobby + (r.sub.factoryInvest || 0) + (r.sub.rndInvest || 0) + holding.cost;
      const profit = revenue + performanceBonus - cost;
      const repDelta = (share * 100 - 100 / rows.length) * 0.6 + (event.repAll || 0) + (perfTriggered ? 1.5 : 0);
      return { ...r, share, contractsWon, adjustedContractsWon, crowdKey, crowdCount, crowdMult, unitsSold, fromStock: stockUse.taken, soldFresh, freshDeliverable, leftoverFresh, leftoverBatches, endingInventory, inventoryQty: holding.qty, inventoryValue: holding.value, inventoryRate: holding.rate, inventoryCost: holding.cost, revenue, productionCost, cost, profit, repDelta, matchedPreferred, marketBonus, contractBonus, performanceBonus, perfTriggered };
    });
    if (event.boostTop) [...results].sort((a,b) => b.share - a.share)[0].repDelta += event.boostTop;
    if (event.penaltyMostProduced) [...results].sort((a,b) => b.sub.production - a.sub.production)[0].repDelta += event.penaltyMostProduced;
    return { event, results };
  }

  return { MAX_ROUNDS, START_FUNDS, BASE_POOL, BASE_PRICE, BASE_COST, START_CAPACITY, EXPANSION_COST_PER_UNIT, SCRAP_RATE, UNIT_TYPES, TECH_TIERS, EVENTS, SPECIAL_EVENTS, BOT_NAMES, getUnit, unitEconomics, qualityVariant, qualityPerformanceChance, rpFromInvestment, unlockedUnits, unlockedUnitIds, nextTechTier, botDecision, pickMarketEvent, getEventById, getSpecialEventById, inventoryTotals, inventoryRate, inventoryHoldingCost, resolveRound };
})();
