// 25 RADAX radar (live from your Pi's aircraft.json)
const canvas=document.getElementById('radar'); const ctx=canvas.getContext('2d');
let W,H,CX,CY; let sweep=0; let targets=new Map();
const clockEl=document.getElementById('clock'), acCountEl=document.getElementById('acCount'), msgRateEl=document.getElementById('msgRate'), rangeEl=document.getElementById('range');
const blipAudio=(()=>{const a=new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABYBHQBTU1NTU1NTU1M='); return a;})();

function resize(){ canvas.width=innerWidth; canvas.height=innerHeight; W=canvas.width; H=canvas.height; CX=W/2; CY=H/2; } window.addEventListener('resize',resize); resize();
function toRad(d){return d*Math.PI/180;} function toDeg(r){return r*180/Math.PI;}
function hav(lat1,lon1,lat2,lon2){ const R=6371; const dLat=toRad(lat2-lat1), dLon=toRad(lon2-lon1); const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2; return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
function brg(lat1,lon1,lat2,lon2){ const y=Math.sin(toRad(lon2-lon1))*Math.cos(toRad(lat2)); const x=Math.cos(toRad(lat1))*Math.sin(toRad(lat2))-Math.sin(toRad(lat1))*Math.cos(toRad(lat2))*Math.cos(toRad(lon2-lon1)); return (toDeg(Math.atan2(y,x))+360)%360; }
function project(lat,lon){ const dist=hav(CONFIG.HOME.lat,CONFIG.HOME.lon,lat,lon); const B=brg(CONFIG.HOME.lat,CONFIG.HOME.lon,lat,lon); const r=(Math.min(W,H)/2-40)*(dist/CONFIG.MAX_RANGE_KM); const ang=toRad(B-CONFIG.UP_BEARING_DEG-90); return {x:CX+r*Math.cos(ang), y:CY+r*Math.sin(ang), dist, bearing:B}; }

function drawGrid(){
  ctx.clearRect(0,0,W,H);
  // glow
  const g=ctx.createRadialGradient(CX,CY,0,CX,CY,Math.max(W,H)/1.2); g.addColorStop(0,'#001a00'); g.addColorStop(1,'#000'); ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // rings
  ctx.strokeStyle='#1f3d1f'; ctx.lineWidth=1; for(let i=1;i<=6;i++){ const r=(Math.min(W,H)/2-40)*i/6; ctx.beginPath(); ctx.arc(CX,CY,r,0,Math.PI*2); ctx.stroke(); }
  // radials
  for(let d=0; d<360; d+=30){ const a=toRad(d-CONFIG.UP_BEARING_DEG-90); ctx.beginPath(); ctx.moveTo(CX,CY); ctx.lineTo(CX+(Math.min(W,H)/2-40)*Math.cos(a), CY+(Math.min(W,H)/2-40)*Math.sin(a)); ctx.stroke(); }
  // sweep
  const s=ctx.createRadialGradient(CX,CY,0,CX,CY,Math.min(W,H)/2); s.addColorStop(0,'rgba(0,255,0,.12)'); s.addColorStop(1,'rgba(0,255,0,0)'); ctx.fillStyle=s;
  ctx.beginPath(); ctx.moveTo(CX,CY); ctx.arc(CX,CY,Math.min(W,H)/2,toRad(sweep-3),toRad(sweep+3)); ctx.closePath(); ctx.fill();
}

function drawLabel(x,y,text){ const el=document.createElement('div'); el.className='label'; el.textContent=text; el.style.left=x+'px'; el.style.top=y+'px'; document.body.appendChild(el); requestAnimationFrame(()=>el.remove()); }

function drawTargets(){
  const now=performance.now(); let count=0; let maxR=0;
  targets.forEach((t,hex)=>{
    if(now-t.lastSeen>60000){ targets.delete(hex); return; }
    count++; maxR=Math.max(maxR,t.lastData.dist||0);
    // trail
    if(CONFIG.SHOW_TRAILS){ ctx.strokeStyle='rgba(105,255,105,.7)'; ctx.lineWidth=2; ctx.beginPath(); let started=false; t.history.forEach(p=>{ if(now-p.t<CONFIG.TRAIL_SECONDS*1000){ if(!started){ ctx.moveTo(p.x,p.y); started=true;} else ctx.lineTo(p.x,p.y);} }); if(started) ctx.stroke(); }
    // blip
    ctx.fillStyle = t.lastData.isMil ? '#00e5ff' : '#69ff69'; ctx.beginPath(); ctx.arc(t.lastData.x,t.lastData.y,4,0,Math.PI*2); ctx.fill();
    // label
    drawLabel(t.lastData.x+8, t.lastData.y-8, t.lastData.text);
  });
  acCountEl.textContent='ACFT: '+count; rangeEl.textContent='MAX RNG: '+(maxR?Math.round(maxR):'--')+' km';
}

let lastMsgs=0, lastT=performance.now();
async function fetchData(){
  let data;
  try{ const res=await fetch(CONFIG.DUMP1090_URL, {cache:'no-store'}); data=await res.json(); }
  catch{ data={now:Date.now(), messages:lastMsgs+10, aircraft: demoAircraft()}; }
  const now=performance.now(); const dt=(now-lastT)/1000; if(dt>0){ const rate=Math.max(0,(data.messages||0-lastMsgs)/dt); msgRateEl.textContent='MSG/s: '+rate.toFixed(0); } lastMsgs=data.messages||lastMsgs; lastT=now;
  const ac=(data.aircraft||[]).filter(a=>a.lat&&a.lon); const seen=new Set();
  ac.forEach(a=>{
    const hex=a.hex||a.icao||Math.random().toString(16).slice(2,8);
    const pos=project(a.lat,a.lon);
    const isMil = (a.t && a.t.toLowerCase().includes('mil')) || (a.sqk && a.sqk.startsWith('73')) || false;
    const fl = a.alt_baro?Math.round(a.alt_baro/100):(a.alt_geom?Math.round(a.alt_geom/100):0);
    const text=[(a.flight||hex).trim(), fl?'FL'+fl:'', a.gs?Math.round(a.gs)+'kt':''].filter(Boolean).join('  ');
    let t=targets.get(hex); if(!t){ t={history:[],lastSeen:now,lastData:{}}; targets.set(hex,t); if(CONFIG.AUDIO_ON_NEW) blipAudio.play().catch(()=>{}); }
    t.history.push({x:pos.x,y:pos.y,t:now}); if(t.history.length>400) t.history=t.history.slice(-400);
    t.lastSeen=now; t.lastData={x:pos.x,y:pos.y,text,dist:pos.dist,isMil};
    seen.add(hex);
  });
  targets.forEach((t,hex)=>{ if(!seen.has(hex) && (now-t.lastSeen)>60000) targets.delete(hex); });
}

function demoAircraft(){
  const out=[]; const n=12; const base=Date.now()/1000;
  for(let i=0;i<n;i++){ const ang=(base*10+i*30)%360; const r=50+(i*20)%220; const br=(ang+CONFIG.UP_BEARING_DEG+90)*Math.PI/180; const R=6371, d=r/R;
    const lat1=CONFIG.HOME.lat*Math.PI/180, lon1=CONFIG.HOME.lon*Math.PI/180;
    const lat2=Math.asin(Math.sin(lat1)*Math.cos(d)+Math.cos(lat1)*Math.sin(d)*Math.cos(br));
    const lon2=lon1+Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(lat1), Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));
    out.push({hex:'demo'+i,lat:lat2*180/Math.PI,lon:lon2*180/Math.PI,flight:['TUI94D','DLH2VY','KLM1622','HZSKI','LOT336','GOGSK'][i%6],alt_baro:34000-(i%5)*2000,gs:420+(i%7)*10,t:(i%3===0)?'MIL':'CIV'});
  } return out;
}

function tick(){ clockEl.textContent=new Date().toLocaleTimeString(); sweep=(sweep+2)%360; drawGrid(); drawTargets(); requestAnimationFrame(tick); }
setInterval(fetchData, CONFIG.FETCH_MS); tick();
