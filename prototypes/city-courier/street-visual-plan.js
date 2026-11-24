'use strict';
(function(root){
  const PER_THEME=28, APPROVED_FIRST=4, HALF_JOIN=12, MAX_REPEAT=.30;
  const artId=(theme,n)=>'abc'[theme]+String(n+1).padStart(2,'0');
  const ease=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};

  function plan(streets){
    const segments=streets.map((s,i)=>({index:i,theme:s.theme,start:s.start,end:s.end,stop:s.stop,
      joinAfter:s.stop==null&&streets[i+1]?.theme===s.theme,art:null,repeat:false}));
    const groups=[[],[],[]];for(const s of segments)groups[s.theme].push(s);
    const themes=groups.map((group,theme)=>{
      const width=s=>s.end-s.start;
      // Charge the entire blended overlap against any reused image as well.
      // Sort the extra occurrences by this conservative distance, not by count.
      const withJoin=s=>width(s)+(segments[s.index-1]?.joinAfter?HALF_JOIN:0)+(s.joinAfter?HALF_JOIN:0);
      const repeats=new Set(group.slice(APPROVED_FIRST).sort((a,b)=>withJoin(a)-withJoin(b)||b.index-a.index)
        .slice(0,Math.max(0,group.length-PER_THEME)).map(s=>s.index));
      const lastUsed=new Map();let fresh=0,last=null,repeatDistance=0,guardedDistance=0;
      for(const s of group){
        s.repeat=repeats.has(s.index);
        if(s.repeat){
          s.art=[...lastUsed.keys()].filter(id=>id!==last).sort((a,b)=>lastUsed.get(a)-lastUsed.get(b))[0];
          repeatDistance+=width(s);guardedDistance+=withJoin(s);
        }else s.art=artId(theme,fresh++);
        lastUsed.set(s.art,s.index);last=s.art;
      }
      const distance=group.reduce((sum,s)=>sum+width(s),0),guardRatio=distance?guardedDistance/distance:0;
      if(guardedDistance*10>distance*3)throw new Error('Street theme repeat budget exceeded: '+theme+' ('+guardRatio+')');
      return {theme,distance,repeatDistance,guardedDistance,ratio:distance?repeatDistance/distance:0,guardRatio,distinct:fresh};
    });
    return {segments,themes};
  }

  function frame(visualPlan,distance,index,handoff=false){
    const all=visualPlan.segments;if(!all.length)return null;
    const i=Math.max(0,Math.min(index-(handoff?1:0),all.length-1)),here=all[i],prev=all[i-1],next=all[i+1];
    if(!handoff){
      if(prev?.joinAfter&&distance<here.start+HALF_JOIN)return {index:i,from:prev.art,to:here.art,mix:ease((distance-here.start+HALF_JOIN)/(2*HALF_JOIN)),seam:here.start};
      if(here.joinAfter&&distance>here.end-HALF_JOIN)return {index:i,from:here.art,to:next.art,mix:ease((distance-here.end+HALF_JOIN)/(2*HALF_JOIN)),seam:here.end};
    }
    return {index:i,from:here.art,to:null,mix:0,seam:null};
  }

  const api=Object.freeze({PER_THEME,APPROVED_FIRST,HALF_JOIN,MAX_REPEAT,artId,plan,frame});
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CourierStreetVisuals=api;
})(globalThis);
