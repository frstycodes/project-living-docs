const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- clock + countdown ---------- */
const standup = new Date(2026,6,24,21,15,0);
const two = n => String(n).padStart(2,'0');
function tick(){
  const now = new Date();
  const h24 = now.getHours(), ap = h24 < 12 ? 'AM' : 'PM', h12 = h24 % 12 || 12;
  document.getElementById('clock').textContent = two(h12)+':'+two(now.getMinutes())+' '+ap;
  const diff = standup - now, el = document.getElementById('countdown');
  if(!el) return;
  if(diff > 0){
    const h = Math.floor(diff/3.6e6), m = Math.floor(diff%3.6e6/6e4);
    el.innerHTML = 'in <b>'+h+'h '+two(m)+'m</b> from now';
  } else if(diff > -45*6e4){ el.innerHTML = '<b>happening now</b>'; }
  else { el.textContent = 'wrapped for the day'; }
}
tick(); setInterval(tick, 15000);

/* ---------- check / uncheck blip ---------- */
function playPop(checked){
  if(reduceMotion) return;
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const t=ctx.currentTime;
    const gain=ctx.createGain(); gain.connect(ctx.destination);
    const osc=ctx.createOscillator(); osc.type='sine';
    if(checked){
      osc.frequency.setValueAtTime(400,t);
      osc.frequency.exponentialRampToValueAtTime(800,t+0.025);
      osc.frequency.exponentialRampToValueAtTime(600,t+0.05);
      gain.gain.setValueAtTime(0.12,t);
      gain.gain.exponentialRampToValueAtTime(0.001,t+0.06);
      osc.connect(gain); osc.start(t); osc.stop(t+0.06);
    } else {
      osc.frequency.setValueAtTime(600,t);
      osc.frequency.exponentialRampToValueAtTime(350,t+0.04);
      gain.gain.setValueAtTime(0.07,t);
      gain.gain.exponentialRampToValueAtTime(0.001,t+0.05);
      osc.connect(gain); osc.start(t); osc.stop(t+0.05);
    }
    setTimeout(()=>ctx.close(),200);
  }catch{}
}

/* ---------- confetti ---------- */
function burst(x,y,colors=['#FFE501','#F0F0F0','#99938A'],n=26){
  if(reduceMotion) return;
  const cv=document.createElement('canvas'), dpr=devicePixelRatio||1;
  Object.assign(cv.style,{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:60});
  cv.width=innerWidth*dpr; cv.height=innerHeight*dpr;
  document.body.appendChild(cv);
  const c=cv.getContext('2d'); c.scale(dpr,dpr);
  const bits=Array.from({length:n},()=>{
    const a=Math.random()*Math.PI*2, s=3+Math.random()*6;
    return {x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-3,r:2+Math.random()*3.5,
      rot:Math.random()*Math.PI,vr:(Math.random()-.5)*.5,
      col:colors[(Math.random()*colors.length)|0],life:1};
  });
  (function frame(){
    c.clearRect(0,0,innerWidth,innerHeight);
    let alive=0;
    for(const b of bits){
      b.vy+=.28; b.vx*=.99; b.x+=b.vx; b.y+=b.vy; b.rot+=b.vr; b.life-=.016;
      if(b.life<=0) continue;
      alive++;
      c.save(); c.globalAlpha=Math.max(b.life,0);
      c.translate(b.x,b.y); c.rotate(b.rot); c.fillStyle=b.col;
      c.fillRect(-b.r,-b.r*.6,b.r*2,b.r*1.2); c.restore();
    }
    alive?requestAnimationFrame(frame):cv.remove();
  })();
}

/* ---------- completion fanfare ---------- */
function playCompletionFanfare(){
  if(reduceMotion) return;
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const t=ctx.currentTime;
    const master=ctx.createGain();
    master.gain.setValueAtTime(0.18,t);
    master.gain.exponentialRampToValueAtTime(0.001,t+0.85);
    master.connect(ctx.destination);
    const notes=[
      {freq:523.25,type:'sine',    at:0,   dur:0.28},
      {freq:659.25,type:'sine',    at:0.09,dur:0.28},
      {freq:783.99,type:'sine',    at:0.18,dur:0.28},
      {freq:1046.5,type:'triangle',at:0.28,dur:0.42},
    ];
    for(const {freq,type,at,dur} of notes){
      const osc=ctx.createOscillator(), g=ctx.createGain();
      osc.type=type; osc.frequency.value=freq;
      const start=t+at;
      g.gain.setValueAtTime(0,start);
      g.gain.linearRampToValueAtTime(type==='triangle'?0.55:0.4,start+0.02);
      g.gain.exponentialRampToValueAtTime(0.001,start+dur);
      osc.connect(g); g.connect(master);
      osc.start(start); osc.stop(start+dur+0.02);
    }
    const shimmer=ctx.createOscillator(), sg=ctx.createGain();
    shimmer.type='sine';
    shimmer.frequency.setValueAtTime(1318,t+0.32);
    shimmer.frequency.exponentialRampToValueAtTime(2093,t+0.58);
    sg.gain.setValueAtTime(0.12,t+0.32);
    sg.gain.exponentialRampToValueAtTime(0.001,t+0.62);
    shimmer.connect(sg); sg.connect(master);
    shimmer.start(t+0.32); shimmer.stop(t+0.64);
    setTimeout(()=>ctx.close(),900);
  }catch{}
}

/* ---------- todos ---------- */
const todos=document.getElementById('todos');
if(todos){
const boxes=[...todos.querySelectorAll('input[type=checkbox]')];
const allDone=document.getElementById('alldone');

/* click anywhere on the row toggles it (links, buttons and the checkbox itself excepted) */
todos.addEventListener('click',e=>{
  if(e.target.closest('a,button,.chk')) return;
  const item=e.target.closest('.item'); if(!item) return;
  const box=item.querySelector('input[type=checkbox]'); if(!box) return;
  box.checked=!box.checked;
  box.dispatchEvent(new Event('change',{bubbles:true}));
});

todos.addEventListener('change',e=>{
  const box=e.target; if(box.type!=='checkbox') return;
  const item=box.closest('.item');
  item.classList.toggle('is-done',box.checked);
  playPop(box.checked);
  if(box.checked){
    const r=box.getBoundingClientRect();
    burst(r.left+r.width/2, r.top+r.height/2);
    if(boxes.every(b=>b.checked)){
      setTimeout(()=>{
        todos.classList.add('is-all-done');
        const c=allDone.getBoundingClientRect();
        burst(c.left+c.width/2, c.top+c.height/2, ['#FFE501','#F0F0F0','#99938A'], 70);
        playCompletionFanfare();
      },240);
    }
  } else { todos.classList.remove('is-all-done'); }
});
document.getElementById('alldoneClose')?.addEventListener('click',()=>{
  todos.classList.remove('is-all-done');
});
}

/* ---------- avatar fallback ---------- */
for(const img of document.querySelectorAll('img.ava')){
  img.addEventListener('error',()=>{
    const s=document.createElement('span');
    s.className='ava mono';
    s.textContent=img.dataset.initial||(img.alt||'?').charAt(0);
    img.replaceWith(s);
  });
}

/* ---------- schedule ---------- */
const schedList=document.getElementById('schedList');
if(schedList){
  schedList.addEventListener('click',e=>{
    const btn=e.target.closest('.sched-item'); if(!btn) return;
    for(const b of schedList.querySelectorAll('.sched-item')) b.classList.remove('is-active');
    btn.classList.add('is-active');
  });
}

/* ---------- shared star tooltip ---------- */
const tipEl=document.getElementById('startip');
const tipHead=document.getElementById('startipHead');
const tipBody=document.getElementById('startipBody');
// position:fixed is resolved against the nearest transformed ancestor, not the
// viewport — and in project-doc this tooltip lives inside the animated .panel,
// so its coords would land far from the button. Reparent to <body> to escape any
// transformed ancestor, the same reason the citation card appends to body.
if(tipEl&&tipEl.parentNode!==document.body) document.body.appendChild(tipEl);
function showTip(el){
  tipHead.textContent=el.dataset.tipHead||'';
  tipBody.textContent=el.dataset.prompt||'';
  tipEl.setAttribute('aria-hidden','false');
  const r=el.getBoundingClientRect(), t=tipEl.getBoundingClientRect();
  let left=r.left+r.width/2-t.width/2;
  left=Math.max(12, Math.min(left, innerWidth-t.width-12));
  let top=r.top-t.height-12;
  if(top<12) top=r.bottom+12;
  tipEl.style.left=left+'px'; tipEl.style.top=top+'px';
}
function hideTip(){ tipEl.setAttribute('aria-hidden','true'); }
/* Clipboard ladder — the async Clipboard API needs a clipboard-write permission
   grant that a sandboxed iframe (a hosted Artifact) does not give, so it rejects
   there. Fall back to execCommand('copy') on a temp textarea, which rides the
   user gesture and works in most sandboxes and on file://. If even that fails,
   leave the text selected so ⌘C works. Never a dead "copy failed". */
async function copyText(text){
  try{
    if(navigator.clipboard&&window.isSecureContext){
      await navigator.clipboard.writeText(text); return true;
    }
  }catch{}
  const ta=document.createElement('textarea');
  ta.value=text;
  ta.setAttribute('readonly','');
  ta.style.cssText='position:fixed;top:0;left:0;opacity:0;pointer-events:none';
  document.body.appendChild(ta);
  ta.focus(); ta.select();
  let ok=false;
  try{ ok=document.execCommand('copy'); }catch{ ok=false; }
  document.body.removeChild(ta);
  return ok;
}
for(const btn of document.querySelectorAll('.star')){
  btn.addEventListener('mouseenter',()=>showTip(btn));
  btn.addEventListener('focus',()=>showTip(btn));
  btn.addEventListener('mouseleave',hideTip);
  btn.addEventListener('blur',hideTip);
  btn.addEventListener('click',async()=>{
    const txt=btn.querySelector('.star-txt'); const orig=txt.innerHTML;
    const ok=await copyText(btn.dataset.prompt);
    txt.textContent = ok ? 'copied ✓' : 'press ⌘C';
    setTimeout(()=>{ txt.innerHTML=orig; },1600);
  });
}

/* ---------- brand-icon tilts ---------- */
for(const s of document.querySelectorAll('.sico,.fsrc')){
  s.style.setProperty('--tilt',(Math.random()*3-1.5).toFixed(2)+'deg');
  s.style.setProperty('--htilt',(Math.random()*20-10).toFixed(1)+'deg');
}

/* ---------- load-in ---------- */
const rises=[...document.querySelectorAll('.rise')];
if(!reduceMotion) rises.slice(0,8).forEach((el,i)=>setTimeout(()=>el.classList.add('in'), 40*i));
rises.forEach(el=>el.classList.add('in'));
