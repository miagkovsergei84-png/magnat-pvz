// Presentation only: the caller owns the contract event and deduplication.
globalThis.PptContractCelebration = (() => {
  const duration = 1800;
  let active = null;

  function stop() {
    if (!active) return;
    const current = active;
    active = null;
    try { current.win.cancelAnimationFrame(current.frame); } catch (e) {}
    try { current.doc.removeEventListener('visibilitychange', current.onVisibility); } catch (e) {}
    try { current.win.removeEventListener('resize', current.onResize); } catch (e) {}
    try { current.canvas.remove(); } catch (e) {}
  }

  function play(doc = document, win = window) {
    stop();
    try {
    if (doc.hidden || !doc.body) return false;
    const canvas = doc.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {position:'fixed', inset:'0', width:'100%', height:'100%',
      pointerEvents:'none', zIndex:'2147483647', background:'transparent', borderRadius:'0'});
    const state = {doc, win, canvas, frame:0, started:null, onVisibility:null, onResize:null, bounds:null};
    active = state;
    doc.body.appendChild(canvas);
    const reduced = !!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    state.onVisibility = () => { if (doc.hidden) stop(); };
    doc.addEventListener('visibilitychange', state.onVisibility);
    // Measure once and on resize, never force layout on each animation frame.
    state.onResize = () => {
      const w = Math.max(1, win.innerWidth), h = Math.max(1, win.innerHeight);
      try {
        const r = doc.querySelector('#ov .card')?.getBoundingClientRect();
        if (r && [r.left,r.right,r.top,r.bottom].every(Number.isFinite)) {
          const left=Math.max(0,r.left), right=Math.min(w,r.right);
          const top=Math.max(0,r.top), bottom=Math.min(h,r.bottom);
          if (right>left && bottom>top) { state.bounds={left,right,top,bottom}; return; }
        }
      } catch (e) {}
      state.bounds={left:w*.2,right:w*.8,top:h*.15,bottom:h*.85};
    };
    state.onResize();
    win.addEventListener('resize', state.onResize);

    function draw(now) {
      if (active !== state) return;
      try {
      if (state.started === null) state.started = now;
      const progress = Math.max(0, (now - state.started) / duration);
      if (progress >= 1) { stop(); return; }
      const w = Math.max(1, win.innerWidth), h = Math.max(1, win.innerHeight);
      const dpr = Math.min(2, Math.max(1, win.devicePixelRatio || 1), Math.sqrt(4000000/(w*h)));
      const pw = Math.max(1,Math.min(4000000,Math.floor(w*dpr)));
      const ph = Math.max(1,Math.min(Math.floor(h*dpr),Math.floor(4000000/pw)));
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      ctx.setTransform(pw/w,0,0,ph/h,0,0);
      ctx.clearRect(0,0,w,h);
      // Draw only outside the visible summary card, including its controls.
      const fade = reduced ? .45 : Math.min(1, progress * 5) * Math.min(1, (1-progress)*3);
      const colors = ['#f4c85c','#6ed9cb','#ffe7a2'];
      const b=state.bounds, count = reduced ? 8 : 32;
      ctx.save(); ctx.beginPath(); ctx.rect(0,0,w,h);
      ctx.rect(b.left,b.top,b.right-b.left,b.bottom-b.top); ctx.clip('evenodd');
      for (let i=0; i<count; i++) {
        const side = i%2 ? 1 : -1;
        const edge=side<0?b.left:b.right;
        const room=side<0?b.left:w-b.right;
        const travel=Math.min(120,Math.max(0,room-4));
        const phase=reduced?.45:Math.min(1,progress*2.1);
        const x=edge+side*(4+travel*(.12+(i%8)/9)*phase);
        const baseY=b.top+(b.bottom-b.top)*(.16+((i*7)%17)/25);
        const y=Math.max(4,Math.min(h-4,baseY+(reduced?0:(progress-.35)*((i%5)-2)*22)));
        const size=3+(i%3)*1.5;
        ctx.globalAlpha=fade*.85;
        ctx.fillStyle = colors[i%colors.length];
        ctx.save(); ctx.translate(x,y);
        ctx.rotate(reduced ? (i%3)*.2 : i*.7+progress*2);
        if(i%4===0){ctx.beginPath();for(let j=0;j<8;j++){const a=j*Math.PI/4,r=j%2?size*.38:size;const px=Math.cos(a)*r,py=Math.sin(a)*r;if(j===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();}
        else ctx.fillRect(-size/2,-size/2,size,(i%3===0 ? size*2.3 : size));
        ctx.restore();
      }
      ctx.globalAlpha = 1; ctx.restore();
      state.frame = win.requestAnimationFrame(draw);
      } catch (e) { stop(); }
    }
    state.frame = win.requestAnimationFrame(draw);
    return true;
    } catch (e) { stop(); return false; }
  }
  return {play, stop};
})();
