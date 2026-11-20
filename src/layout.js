// Static field geometry. Runtime positions remain in the game's 360×600 world;
// the extra visible strip and queue projection affect drawing and input only.
globalThis.PptLayout = (() => {
  const W=360,H=600,WAIT_EXT=60,VIEW_H=H+WAIT_EXT;
  const COUNTER_Y=140,COUNTER_H=32,SERVE_Y=190,Q_Y=[118,84,50];
  // Bodies overlap; faces, crowns and patience bars retain their own space.
  const queueDrawY=y=>Q_Y[0]+(y-Q_Y[0])*41/(Q_Y[0]-Q_Y[1]);
  const QUEUE_BAR_Y=100,queueBarX=x=>x-31,QUEUE_BAR_W=20;
  const queueBarY=y=>Math.max(-WAIT_EXT+2,y-QUEUE_BAR_Y);
  function shelfRect(c){const col=c%2,row=c>>1;return{x:18+col*170,y:206+row*84,w:154,h:66};}
  function cellRect(c,s){const r=shelfRect(c);return{x:r.x+5+s*37,y:r.y+19,w:33,h:42};}
  function cellStand(c,s){const r=cellRect(c,s);return{x:r.x+r.w/2,y:r.y+r.h+14};}
  const HEAP={x:52,y:472,r:32};
  const FRIDGE={x:4,y:358,w:99,h:80},FRIDGE_STAND={x:54,y:430};
  function fzRect(i){return{x:FRIDGE.x+(i%3)*33,y:FRIDGE.y+14+Math.floor(i/3)*33,w:33,h:33};}
  function bigRect(c){return{x:308,y:375+c*24,w:46,h:24};}
  // Six by four floor spots with 34 px pitch and 24 px parcel sprites.
  const FLOOR=[];for(let r=0;r<4;r++)for(let c=0;c<6;c++)FLOOR.push({x:120+c*34,y:390+r*34});
  const STACK_DX=6,STACK_DY=-7;
  const TRUCK={x:W/2-72,y:530,w:144,h:48};
  const ROBOT_HOME={x:300,y:366};
  return {W,H,WAIT_EXT,VIEW_H,COUNTER_Y,COUNTER_H,SERVE_Y,Q_Y,
    queueDrawY,QUEUE_BAR_Y,queueBarX,queueBarY,QUEUE_BAR_W,
    shelfRect,cellRect,cellStand,HEAP,FRIDGE,FRIDGE_STAND,fzRect,bigRect,
    FLOOR,STACK_DX,STACK_DY,TRUCK,ROBOT_HOME};
})();
