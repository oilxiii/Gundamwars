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
    { id: 'z1', rnd: 'low', price: 'low', name: 'หุ่นรุ่นผลิตจำนวนมาก รุ่นเก่า', tag: 'ต้นทุนต่ำ ผลิตง่าย', primary: '#8a7355', visor: '#c0392b', hornColor: '#5b4a35', horn: 'mono' },
    { id: 'z2', rnd: 'low', price: 'mid', name: 'หุ่นรุ่นผลิตจำนวนมาก', tag: 'รุ่นมาตรฐานของตลาด', primary: '#4a7a3e', visor: '#c0392b', hornColor: '#33502a', horn: 'mono' },
    { id: 'z3', rnd: 'low', price: 'high', name: 'ดาวตกสีแดง', tag: 'รุ่นเอซความเร็วสูง', primary: '#c0392b', visor: '#ffd54f', hornColor: '#7a1f14', horn: 'mono' },
    { id: 'z4', rnd: 'mid', price: 'low', name: 'หุ่นรุ่นผลิตจำนวนมาก รุ่นปรับปรุง', tag: 'สมดุล ผลิตง่าย', primary: '#4a6fa5', visor: '#2ecc71', hornColor: '#7f97b8', horn: 'vfin' },
    { id: 'z5', rnd: 'mid', price: 'mid', name: 'กุ๊กวัน', tag: 'รุ่นจู่โจมมาตรฐาน', primary: '#6b4c3a', visor: '#c0392b', hornColor: '#432f24', horn: 'mono' },
    { id: 'z6', rnd: 'mid', price: 'high', name: 'กุ๊กทู', tag: 'รุ่นผู้บังคับบัญชา', primary: '#7d3c98', visor: '#ffd54f', hornColor: '#4e2761', horn: 'mono' },
    { id: 'z7', rnd: 'high', price: 'low', name: 'หุ่นอาร์เอ็กซ์ รุ่นทดสอบ', tag: 'ต้นแบบเทคโนโลยีใหม่', primary: '#e8e8e8', visor: '#2ecc71', hornColor: '#c0392b', horn: 'vfin' },
    { id: 'z8', rnd: 'high', price: 'mid', name: 'หุ่นอาร์เอ็กซ์ รุ่นเอซ', tag: 'รุ่นสมรรถนะสูง', primary: '#dfe6f0', visor: '#4a6fa5', hornColor: '#b0bfd6', horn: 'vfin' },
    { id: 'z9', rnd: 'high', price: 'high', name: 'หุ่นอาร์เอ็กซ์ รุ่นลิมิเต็ด', tag: 'รุ่นพิเศษผลิตจำกัด', primary: '#d4af37', visor: '#c0392b', hornColor: '#8a6d1f', horn: 'vfin' },
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
    { id:'zaza-impossible', tier:2, name:'ซาซ่า อิมพอสสิเบิล', role:'นักบินเอซ', unitIds:['z3'], targetLabel:'ดาวตกสีแดง', priceBonus:0.15, duration:3, baseWeight:10, startRound:5, pricePct:0.16,
      pitch:'นักบินชื่อดังชื่นชอบดาวตกสีแดงและต้องการเป็นพรีเซ็นเตอร์' },
    { id:'rookie-pilot', tier:1, name:'นักบินดาวรุ่ง', role:'นักบินเอซ', unitIds:['z5','z6'], targetLabel:'กุ๊กวัน / กุ๊กทู', priceBonus:0.08, duration:3, baseWeight:14, startRound:3, pricePct:0.10,
      pitch:'นักบินดาวรุ่งกำลังมองหาบริษัทที่กล้าดันหุ่นสายกุ๊ก' },
    { id:'military-reviewer', tier:1, name:'นักรีวิวสายทหาร', role:'ผู้เชี่ยวชาญภาคสนาม', unitIds:['z1','z2','z4'], targetLabel:'หุ่นรุ่นผลิตจำนวนมาก', priceBonus:0.07, duration:3, baseWeight:14, startRound:3, pricePct:0.08,
      pitch:'นักรีวิวภาคสนามสนใจทำแคมเปญให้หุ่นรุ่นผลิตจำนวนมาก' },
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
  function getUnit(rndFocus, priceStrategy) {
    return UNIT_TYPES.find(u => u.rnd === band(rndFocus) && u.price === band(priceStrategy)) || UNIT_TYPES[4];
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
    return 1 / (1 + Math.log(1 + units) * 0.05);
  }
  function unitEconomics(rndFocus, priceStrategy, costMult = 1, prodPct = 90, productionUnits = 0) {
    const baseUnitCost = BASE_COST * (1 + (rndFocus / 100) * 1.6);
    const utilMult = utilizationMultiplier(prodPct);
    const scaleMult = volumeDiscount(productionUnits);
    const unitCost = Math.round(baseUnitCost * costMult * utilMult * scaleMult * 10) / 10;
    const unitPrice = Math.round(BASE_PRICE * (1 + (priceStrategy / 100) * 1.8) * 10) / 10;
    return { unitCost, unitPrice, margin: Math.round((unitPrice - unitCost) * 10) / 10, utilMult: Math.round(utilMult * 100) / 100, scaleMult: Math.round(scaleMult * 100) / 100 };
  }
  function botDecision(funds, capacity) {
    const rndFocus = Math.round(20 + Math.random() * 60);
    const priceStrategy = Math.round(20 + Math.random() * 60);
    const prodPct = Math.round(70 + Math.random() * 40);
    const production = Math.round((capacity * prodPct) / 100);
    const lobby = Math.round(Math.random() * Math.max(0, Math.min(funds * 0.15, 40)));
    const factoryInvest = Math.random() < 0.4 ? Math.round(Math.random() * Math.max(0, Math.min(funds * 0.1, 100))) : 0;
    return { rndFocus, priceStrategy, prodPct, production, lobby, factoryInvest };
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
      const unit = getUnit(sub.rndFocus, sub.priceStrategy);
      const econ = unitEconomics(sub.rndFocus, sub.priceStrategy, costMult, sub.prodPct, sub.production);
      const currentStockBatches = getInventoryBatches(p, unit.id);
      const currentStock = currentStockBatches.reduce((s,b)=>s+b.qty,0);
      const priceAppeal = (100 - sub.priceStrategy) / 100;
      const availableSignal = sub.production + currentStock * 0.6;
      const appeal = Math.max(0.0001, availableSignal * (0.4 + priceAppeal) + sub.lobby * 2 + sub.rndFocus * 0.4 + p.reputation * 0.3);
      return { player: p, sub, unit, econ, appeal, currentStockBatches, currentStock };
    });
    const crowdCounts = rows.reduce((m,r)=>{ m[r.unit.id] = (m[r.unit.id] || 0) + 1; return m; }, {});
    const crowdMultFor = (count) => count <= 1 ? 1 : count === 2 ? 0.90 : count === 3 ? 0.80 : 0.70;
    const totalAppeal = rows.reduce((s, r) => s + r.appeal, 0) || 1;
    const results = rows.map(r => {
      const share = r.appeal / totalAppeal;
      const crowdCount = crowdCounts[r.unit.id] || 1;
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
      const cost = productionCost + r.sub.lobby + (r.sub.factoryInvest || 0) + holding.cost;
      const profit = revenue - cost;
      const repDelta = (share * 100 - 100 / rows.length) * 0.6 + (event.repAll || 0);
      return { ...r, share, contractsWon, adjustedContractsWon, crowdCount, crowdMult, unitsSold, fromStock: stockUse.taken, soldFresh, freshDeliverable, leftoverFresh, leftoverBatches, endingInventory, inventoryQty: holding.qty, inventoryValue: holding.value, inventoryRate: holding.rate, inventoryCost: holding.cost, revenue, productionCost, cost, profit, repDelta, matchedPreferred, marketBonus, contractBonus };
    });
    if (event.boostTop) [...results].sort((a,b) => b.share - a.share)[0].repDelta += event.boostTop;
    if (event.penaltyMostProduced) [...results].sort((a,b) => b.sub.production - a.sub.production)[0].repDelta += event.penaltyMostProduced;
    return { event, results };
  }

  return { MAX_ROUNDS, START_FUNDS, BASE_POOL, BASE_PRICE, BASE_COST, START_CAPACITY, EXPANSION_COST_PER_UNIT, SCRAP_RATE, UNIT_TYPES, EVENTS, SPECIAL_EVENTS, BOT_NAMES, getUnit, unitEconomics, botDecision, pickMarketEvent, getEventById, getSpecialEventById, inventoryTotals, inventoryRate, inventoryHoldingCost, resolveRound };
})();
