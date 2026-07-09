const Sprites = (() => {
  // 32x32 true pixel sprites. Priority: readable SD mecha silhouette, especially the head.
  // Gundam-type units use a large helmet, thick V-fin, green twin eyes, red chin,
  // side cheek vents, blue chest, yellow vents, shield, rifle, and chunky SD limbs.
  const W = 32, H = 32;

  const BASE = {
    '.':'transparent',
    O:'#05070b',      // hard outline
    K:'#101722',      // deep shadow
    D:'#313944',      // weapon / inner frame
    G:'#6f7b86',      // grey armor shadow
    L:'#c8d0d6',      // light armor shadow
    W:'#f3efe2',      // white armor
    R:'#e23a34',      // red armor
    B:'#145bd8',      // blue armor
    Y:'#ffd43d',      // yellow vents
    V:'#43ff93',      // eyes / mono eye
    C:'#7cc7ff'       // pale sensor blue
  };

  function shade(hex, amount = .35){
    const n = hex.replace('#','');
    const r = Math.max(0, Math.round(parseInt(n.slice(0,2),16)*(1-amount)));
    const g = Math.max(0, Math.round(parseInt(n.slice(2,4),16)*(1-amount)));
    const b = Math.max(0, Math.round(parseInt(n.slice(4,6),16)*(1-amount)));
    return `rgb(${r},${g},${b})`;
  }

  function render(unit, size = 6){
    const el = document.createElement('div');
    el.className = `mech-sprite unit-${unit.id} ${unit.horn === 'vfin' ? 'vfin' : 'mono'}`;
    el.style.gridTemplateColumns = `repeat(${W}, ${size}px)`;
    el.style.gridTemplateRows = `repeat(${H}, ${size}px)`;

    const g = Array.from({length:H},()=>Array(W).fill('.'));
    const px=(x,y,c)=>{ if(x>=0&&x<W&&y>=0&&y<H) g[y][x]=c; };
    const rect=(x,y,w,h,c)=>{ for(let yy=y; yy<y+h; yy++) for(let xx=x; xx<x+w; xx++) px(xx,yy,c); };
    const box=(x,y,w,h,fill)=>{ rect(x,y,w,h,'O'); if(w>2&&h>2) rect(x+1,y+1,w-2,h-2,fill); };
    const line=(x1,y1,x2,y2,c)=>{
      const dx=Math.abs(x2-x1), dy=-Math.abs(y2-y1);
      const sx=x1<x2?1:-1, sy=y1<y2?1:-1; let err=dx+dy, x=x1, y=y1;
      while(true){ px(x,y,c); if(x===x2&&y===y2) break; const e2=2*err; if(e2>=dy){err+=dy;x+=sx;} if(e2<=dx){err+=dx;y+=sy;} }
    };

    const primary = unit.primary || '#145bd8';
    const isWhiteType = unit.horn === 'vfin';
    const pal = {
      ...BASE,
      A: primary,
      a: shade(primary,.36),
      h: unit.hornColor || '#ffd43d',
      V: unit.visor || '#43ff93'
    };

    if(unit.kind === 'ball' || unit.horn === 'ball'){
      drawBallType();
    } else if(isWhiteType){
      drawGundamType();
    } else {
      drawMonoEyeType();
    }

    function drawBallType(){
      // RB-79 Ball / Space Coffin: round pod, tiny cockpit, single manipulator, cannon.
      // Keep it very readable at 32x32: one big sphere with a top cannon.
      rect(14,3,4,3,'O'); rect(15,1,2,4,'D'); rect(13,2,6,1,'O');
      rect(12,6,8,2,'O'); rect(10,8,12,2,'O'); rect(8,10,16,3,'O');
      rect(6,13,20,8,'O'); rect(8,21,16,4,'O'); rect(11,25,10,2,'O');
      // Round hull fill.
      rect(11,8,10,1,'W'); rect(9,10,14,3,'W'); rect(7,13,18,8,'W'); rect(9,21,14,3,'W'); rect(12,25,8,1,'W');
      rect(8,14,4,6,'L'); rect(20,14,4,6,'G'); rect(10,22,11,1,'L');
      // Tiny cockpit window.
      rect(13,12,6,4,'O'); rect(14,13,4,2,'C'); px(18,13,'V');
      // Danger red maintenance stripe.
      rect(9,18,14,1,'R');
      // Manipulator arms.
      rect(3,16,5,2,'O'); rect(2,17,2,3,'D'); rect(24,16,5,2,'O'); rect(28,17,2,3,'D');
      rect(1,20,4,2,'O'); rect(27,20,4,2,'O');
      // Thrusters.
      rect(11,27,3,3,'O'); rect(18,27,3,3,'O'); rect(12,28,1,2,'B'); rect(19,28,1,2,'B');
      // Make high quality Ball Kai stand out if primary is bright/gold-ish.
      if(unit.name && unit.name.includes('Kai')){
        rect(7,11,3,2,'Y'); rect(22,11,3,2,'Y'); rect(14,16,4,1,'V');
      }
    }

    function drawGundamType(){
      // External weapon silhouettes first.
      // Rifle on left: large black vertical mass, so it reads as weapon not arm.
      rect(2,15,3,10,'O'); rect(3,15,1,9,'D'); rect(1,23,4,2,'O'); rect(4,14,3,2,'O'); rect(5,13,2,1,'D');
      // Shield on right: slab shape, separated from body.
      rect(26,12,5,13,'O'); rect(27,13,3,11,'B'); rect(30,14,1,9,'R'); rect(27,13,1,10,'W'); rect(28,18,2,1,'Y');

      // Feet: wide red slippers, classic SD proportion.
      rect(7,29,8,2,'O'); rect(18,29,8,2,'O'); rect(8,29,7,1,'R'); rect(19,29,7,1,'R');
      // Short chunky legs.
      box(9,23,5,6,'W'); box(19,23,5,6,'W');
      rect(10,24,3,2,'L'); rect(20,24,3,2,'L');
      rect(10,26,3,2,'B'); rect(20,26,3,2,'B');

      // Skirt / waist. Blocky, not human hips.
      rect(9,20,15,4,'O'); rect(10,21,4,2,'W'); rect(14,21,2,2,'Y'); rect(16,21,2,2,'R'); rect(19,21,4,2,'W'); rect(11,23,2,1,'L'); rect(21,23,2,1,'L');

      // Torso: compact blue cockpit block with yellow vents.
      rect(10,13,13,8,'O');
      rect(11,14,11,2,'B'); rect(12,16,9,2,'B');
      rect(12,17,3,2,'Y'); rect(18,17,3,2,'Y');
      rect(15,15,3,5,'R'); rect(14,19,5,1,'W');

      // Big shoulders and arms. Shoulders sit under head, wide silhouette.
      box(5,13,6,5,'W'); box(22,13,5,5,'W');
      rect(6,14,4,1,'L'); rect(23,14,3,1,'L');
      rect(6,18,4,6,'O'); rect(7,18,2,5,'L'); rect(23,18,3,6,'O'); rect(24,18,1,5,'L');
      rect(6,23,3,2,'D'); rect(23,23,3,2,'D');

      // -------------------------------
      // IMPORTANT: SD GUNDAM HEAD BLOCK
      // -------------------------------
      // Side cheek/ear blocks, like SD Gundam reference. These make the head read correctly.
      rect(7,7,4,5,'O'); rect(8,8,2,3,'W'); rect(10,9,1,2,'G');
      rect(21,7,4,5,'O'); rect(22,8,2,3,'W'); rect(21,9,1,2,'G');

      // Main helmet: intentionally oversized compared with the body.
      rect(10,4,12,9,'O');
      rect(11,5,10,1,'W');
      rect(11,6,10,2,'L');
      rect(12,8,8,2,'W');
      rect(13,10,6,1,'L');

      // Face mask / black eye slit / twin green eyes.
      rect(11,8,10,3,'O');
      px(12,9,'V'); px(13,9,'V'); px(18,9,'V'); px(19,9,'V');
      rect(14,10,4,1,'W');
      rect(15,11,3,3,'R'); // red chin, very visible.
      rect(13,11,2,1,'W'); rect(18,11,2,1,'W');

      // Forehead camera and red crest.
      rect(15,3,3,2,'R'); rect(15,5,3,1,'V');

      // Thick V-fin. The previous version looked like antennae; this is bolder and lower.
      line(15,5,7,1,'h'); line(16,5,8,1,'h');
      line(17,5,25,1,'h'); line(16,5,24,1,'h');
      px(8,2,'h'); px(24,2,'h'); px(9,3,'h'); px(23,3,'h');
      // Small white helmet top after V-fin.
      px(14,4,'W'); px(18,4,'W');

      // Unit variants: GM / white prototype / gold type.
      if(unit.id === 'z4'){
        // GM-ish head: no strong red chin, big visor. Keep weak antenna so it still fits lineup.
        rect(12,8,8,2,'V'); rect(15,10,3,2,'W'); rect(15,12,3,1,'L');
        rect(12,17,3,2,'Y'); rect(18,17,3,2,'Y');
      }
      if(unit.id === 'z8'){
        // NT style: cooler blue chest, pale sensor.
        rect(12,16,9,2,'A'); rect(15,3,3,2,'C'); rect(15,5,3,1,'V');
      }
      if(unit.id === 'z9'){
        // Gold type: white armor becomes gold accents but keeps gundam head silhouette.
        rect(11,14,11,2,'A'); rect(10,21,4,2,'A'); rect(19,21,4,2,'A');
        rect(9,23,5,5,'A'); rect(19,23,5,5,'A');
        rect(8,8,2,3,'A'); rect(22,8,2,3,'A');
        rect(11,5,10,1,'A'); rect(11,6,10,2,'A');
      }
    }

    function drawMonoEyeType(){
      // Weapon.
      rect(2,16,3,9,'O'); rect(3,16,1,8,'D'); rect(1,24,4,2,'O');
      // Big rounded mono-eye helmet.
      rect(9,5,14,8,'O'); rect(10,6,12,2,'A'); rect(10,8,12,3,'a'); rect(12,9,8,1,'O'); px(16,9,'V'); rect(13,11,6,1,'D');
      // Commander antenna or horn.
      if(['z3','z6'].includes(unit.id)){ line(16,5,16,1,'h'); px(15,2,'h'); px(17,2,'h'); }
      // Shoulders/spikes.
      box(5,13,7,6,'A'); box(21,13,6,6,'A'); px(4,13,'O'); px(28,13,'O'); px(5,12,'O'); px(27,12,'O');
      // Torso.
      rect(10,13,13,8,'O'); rect(12,14,9,4,'A'); rect(13,18,7,2,'a'); rect(16,15,2,2,'D');
      // Arms.
      rect(6,19,4,6,'O'); rect(7,19,2,5,'a'); rect(23,19,3,6,'O'); rect(24,19,1,5,'a');
      rect(6,24,3,2,'D'); rect(23,24,3,2,'D');
      // Waist/legs/feet.
      rect(10,21,13,3,'O'); rect(12,21,9,1,'a');
      box(9,24,5,5,'A'); box(19,24,5,5,'A');
      rect(8,29,7,2,'O'); rect(18,29,7,2,'O'); rect(8,29,7,1,'a'); rect(18,29,7,1,'a');
      if(['z5','z6'].includes(unit.id)){ rect(27,14,4,10,'O'); rect(28,15,2,8,'A'); }
    }

    g.flat().forEach(ch=>{
      const s=document.createElement('span');
      s.style.background = pal[ch] || 'transparent';
      el.appendChild(s);
    });
    return el;
  }


  // 16x16 pilot portraits for special-event cards and result summaries.
  // Intentionally tiny, flat-color pixel art so it matches the 8-bit UI.
  function renderPilot(eventId, size = 3){
    const Wp = 16, Hp = 16;
    const el = document.createElement('div');
    el.className = `pilot-sprite pilot-${eventId || 'generic'}`;
    el.style.gridTemplateColumns = `repeat(${Wp}, ${size}px)`;
    el.style.gridTemplateRows = `repeat(${Hp}, ${size}px)`;
    const base = {
      '.':'transparent', O:'#05070b', S:'#f1c49d', s:'#b87b58',
      H:'#4a2a18', h:'#f4d25b', B:'#1d63d8', b:'#0b2e78',
      R:'#d73535', r:'#7d1622', W:'#f4efe1', V:'#39ff88', G:'#6f7b86'
    };
    const grid = Array.from({length:Hp},()=>Array(Wp).fill('.'));
    const px=(x,y,c)=>{ if(x>=0&&x<Wp&&y>=0&&y<Hp) grid[y][x]=c; };
    const rect=(x,y,w,h,c)=>{ for(let yy=y; yy<y+h; yy++) for(let xx=x; xx<x+w; xx++) px(xx,yy,c); };
    const isZaza = eventId === 'zaza-impossible';
    const isAmuro = eventId === 'amuro-bay';
    const suit = isZaza ? 'R' : isAmuro ? 'B' : 'G';
    const suitDark = isZaza ? 'r' : isAmuro ? 'b' : 'G';
    const hair = isZaza ? 'h' : isAmuro ? 'H' : 'H';

    // shoulders / pilot suit
    rect(3,11,10,4,'O'); rect(4,11,8,4,suit); rect(5,13,6,2,suitDark);
    rect(6,10,4,2,'W'); rect(7,11,2,1,'S');

    // face and ears
    rect(4,4,8,7,'O'); rect(5,5,6,6,'S'); px(4,7,'S'); px(11,7,'S');
    // hair silhouettes
    rect(4,3,8,3,'O'); rect(5,3,6,3,hair); rect(3,5,2,3,'O'); rect(11,5,2,3,'O');
    if(isZaza){
      // blond longer side hair, sharper red ace look
      rect(3,5,2,5,'h'); rect(11,5,2,5,'h'); px(5,3,'W'); px(10,3,'W');
      px(6,7,'O'); px(10,7,'O'); px(7,7,'V'); px(9,7,'V');
      rect(7,9,3,1,'r');
    } else {
      // blue-suit calm pilot
      px(6,7,'O'); px(9,7,'O'); px(7,7,'V'); px(10,7,'V');
      rect(7,9,3,1,'s'); px(6,4,'H'); px(9,4,'H');
    }
    // helmet/collar pixels
    px(4,10,'W'); px(11,10,'W'); px(5,12,'W'); px(10,12,'W');

    grid.flat().forEach(ch=>{
      const s=document.createElement('span');
      s.style.background = base[ch] || 'transparent';
      el.appendChild(s);
    });
    return el;
  }

  return { render, renderPilot };
})();
