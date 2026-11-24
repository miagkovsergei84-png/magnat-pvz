(function(root){
  'use strict';
  const W=7,H=8,RETURN=16,SPOILED=17,GOLD=18,WRAPPED=19;
  // Every type is an existing colour/shape pair from the main game's drawBox.
  const TYPES=[{c:0,s:0},{c:1,s:1},{c:2,s:2},{c:3,s:3},{c:0,s:2},{c:2,s:0},{c:1,s:3},{c:3,s:1}];
  for(let c=0;c<4;c++)for(let s=0;s<4;s++)if(!TYPES.some(t=>t.c===c&&t.s===s))TYPES.push({c,s});
  const LEVELS=[{name:'Первая партия',moves:32,count:120,returns:0,spoiled:0,wrapped:0,types:6},{name:'Возвраты',moves:36,count:0,returns:3,spoiled:0,wrapped:0,types:6},{name:'Завал на складе',moves:42,count:0,returns:2,spoiled:3,wrapped:2,types:7}];
  const isNormal=t=>Number.isInteger(t)&&t>=0&&t<TYPES.length;
  function matches(grid){
    const hit=new Set();
    for(let y=0;y<H;y++)for(let x=0;x<W;){let k=y*W+x,t=grid[k],n=1;while(x+n<W&&grid[k+n]===t)n++;if(isNormal(t)&&n>=3)for(let i=0;i<n;i++)hit.add(k+i);x+=n;}
    for(let x=0;x<W;x++)for(let y=0;y<H;){let k=y*W+x,t=grid[k],n=1;while(y+n<H&&grid[k+n*W]===t)n++;if(isNormal(t)&&n>=3)for(let i=0;i<n;i++)hit.add(k+i*W);y+=n;}
    return hit;
  }
  function neighbors(k){const x=k%W,y=Math.floor(k/W),a=[];if(x>0)a.push(k-1);if(x<W-1)a.push(k+1);if(y>0)a.push(k-W);if(y<H-1)a.push(k+W);return a;}
  function exchange(grid,a,b){[grid[a],grid[b]]=[grid[b],grid[a]];}
  function legal(grid,a,b){if(!neighbors(a).includes(b)||grid[a]===grid[b]||[SPOILED,WRAPPED,null].includes(grid[a])||[SPOILED,WRAPPED,null].includes(grid[b]))return false;if(grid[a]===GOLD&&isNormal(grid[b])||grid[b]===GOLD&&isNormal(grid[a]))return true;exchange(grid,a,b);const hit=matches(grid);const good=hit.has(a)||hit.has(b)||(grid[a]===RETURN&&a>=W*(H-1))||(grid[b]===RETURN&&b>=W*(H-1));exchange(grid,a,b);return good;}
  // Player hints look only at visible boxes, never at the random future refill.
  // Prioritise the remaining goals, including clearing support under a return.
  function hintScore(grid,a,b,goals){
    const next=grid.slice();exchange(next,a,b);
    const hits=matches(next),gold=next[a]===GOLD?a:next[b]===GOLD?b:-1,other=gold===a?b:a;
    if(gold>=0&&isNormal(next[other]))for(let k=0;k<next.length;k++)if(k===gold||next[k]===next[other])hits.add(k);
    const removed=clearSet(next,hits),normalWeight=goals.count>0?1:.2;
    let score=longMatch(next)>=0?3:0;
    for(const k of removed){const t=next[k];if(isNormal(t))score+=normalWeight+.025*Math.floor(k/W);else if(t===RETURN&&goals.returns>0)score+=25;else if(t===SPOILED&&goals.spoiled>0||t===WRAPPED&&goals.wrapped>0)score+=12;}
    for(let k=0;k<next.length;k++){
      const t=next[k];if(removed.has(k))continue;
      if(t===RETURN&&goals.returns>0){
        const from=k===a?b:k===b?a:k,r=Math.floor(k/W),c=k%W;
        let below=0,nearest=H;
        for(const j of removed){if(j%W===c&&j>k)below++;if(Math.floor(j/W)>r)nearest=Math.min(nearest,Math.abs(j%W-c));}
        score+=4*(r-Math.floor(from/W)+below)+(r+below===H-1?18:0)+(nearest===1?.5:0);
      }else if(t===SPOILED&&goals.spoiled>0||t===WRAPPED&&goals.wrapped>0){
        let nearest=W+H;for(const j of removed)nearest=Math.min(nearest,Math.abs(k%W-j%W)+Math.abs(Math.floor(k/W)-Math.floor(j/W)));
        score+=nearest<=3?(4-nearest)*.35:0;
      }
    }
    return score;
  }
  function hint(grid,goals=null){let best=null,score=-Infinity;for(let i=0;i<grid.length;i++)for(const j of neighbors(i))if(j>i&&legal(grid,i,j)){if(!goals)return [i,j];const candidate=hintScore(grid,i,j,goals);if(candidate>score){score=candidate;best=[i,j];}}return best;}
  const pick=(n,rng)=>Math.floor(rng()*n);
  function fillGrid(level,rng=Math.random){
    for(let attempts=0;attempts<1000;attempts++){
      const g=[];for(let k=0;k<W*H;k++){const x=k%W,y=Math.floor(k/W);let t;do{t=pick(level.types,rng);}while((x>=2&&g[k-1]===t&&g[k-2]===t)||(y>=2&&g[k-W]===t&&g[k-W*2]===t));g.push(t);}
      const slots=Array.from({length:W*(H-2)},(_,i)=>i+W); // no initial specials on top or bottom
      for(let i=0;i<level.returns+level.spoiled+(level.wrapped||0);i++){const n=pick(slots.length,rng),k=slots.splice(n,1)[0];g[k]=i<level.returns?RETURN:i<level.returns+level.spoiled?SPOILED:WRAPPED;}
      if(hint(g))return g;
    }throw Error('Не удалось собрать поле');
  }
  function clearSet(grid,hit){const removed=new Set(hit);for(const k of hit)for(const n of neighbors(k))if(grid[n]===SPOILED||grid[n]===WRAPPED)removed.add(n);for(let x=0;x<W;x++){const k=(H-1)*W+x;if(grid[k]===RETURN)removed.add(k);}return removed;}
  function longMatch(grid){for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=y*W+x,t=grid[k];if(!isNormal(t))continue;if(x+3<W&&grid[k+1]===t&&grid[k+2]===t&&grid[k+3]===t)return k+1;if(y+3<H&&grid[k+W]===t&&grid[k+2*W]===t&&grid[k+3*W]===t)return k+W;}return -1;}
  // Stable column compaction. Existing items never cross columns or each other.
  function fall(grid,types,rng=Math.random){const next=Array(W*H).fill(null),motion=[];for(let x=0;x<W;x++){let target=H-1;for(let y=H-1;y>=0;y--){const t=grid[y*W+x];if(t!=null){next[target*W+x]=t;motion.push({t,x,from:y,to:target});target--;}}const count=target+1;for(let y=target;y>=0;y--){const t=pick(types,rng);next[y*W+x]=t;motion.push({t,x,from:y-count,to:y});}}return {next,motion};}
  // All parcels travel down together until they meet their individual support.
  // The floor is row H-1; neither interpolation nor overshoot may cross it.
  // Incoming parcels may begin above the board, but their destinations are always on it.
  function fallFrame(motion,q,cellSize=120){const progress=Math.max(0,Math.min(1,q)),distance=Math.max(0,...motion.map(m=>m.to-m.from));return motion.map(m=>{const row=Math.min(H-1,m.to,Math.max(m.from,m.from+progress*progress*distance));return {t:m.t,x:(m.x+.5)*cellSize,y:(row+.5)*cellSize};});}
  function reshuffle(grid,types,rng=Math.random){for(let n=0;n<500;n++){const next=grid.map(t=>isNormal(t)?pick(types,rng):t);if(!matches(next).size&&hint(next))return next;}return null;}
  const api={W,H,RETURN,SPOILED,GOLD,WRAPPED,TYPES,LEVELS,matches,neighbors,exchange,legal,hint,hintScore,fillGrid,clearSet,longMatch,fall,fallFrame,reshuffle,isNormal};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MatchThree=api;
})(globalThis);
