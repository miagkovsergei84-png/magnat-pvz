// Pure presentation for the approved six-door parcel locker. The model owns
// every order and status; drawing must not reserve, load or release anything.
globalThis.PptParcelLockerVisual=(()=>{
  const ASSET='assets/environment/parcel-locker-v2/locker.webp';
  // This is a separate external courier, not one of the player's employees.
  const COURIER_ASSET='assets/campaign/locker-external-courier-20261112.webp';
  const source=globalThis.document?.currentScript?.src;
  const url=source?new URL('../'+ASSET,source).href:ASSET;
  const courierUrl=source?new URL('../'+COURIER_ASSET,source).href:COURIER_ASSET;
  const image=typeof Image==='function'?new Image():null;
  const imageListeners=new Set();
  function notifyImageChange(){for(const listener of imageListeners){try{listener();}catch(_){}}}
  if(image){image.decoding='async';image.onload=notifyImageChange;image.onerror=notifyImageChange;image.src=url;}
  function onImageChange(listener){if(typeof listener!=='function')return()=>{};imageListeners.add(listener);return()=>imageListeners.delete(listener);}
  const positions=[
    [.278,.425],[.647,.419],
    [.278,.594],[.647,.583],
    [.278,.761],[.647,.749]
  ];
  function fit(rect){
    if(!rect||![rect.x,rect.y,rect.w,rect.h].every(Number.isFinite)||rect.w<=0||rect.h<=0)return null;
    const scale=Math.min(rect.w/600,rect.h/941),w=600*scale,h=941*scale;
    return {x:rect.x+(rect.w-w)/2,y:rect.y+(rect.h-h),w,h};
  }
  function mark(ctx,x,y,r,status){
    ctx.save();
    // Cover the permanent light baked into the concept and supply a
    // high-contrast outline plus a distinct shape for every state.
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='#17243b';ctx.fill();
    ctx.lineWidth=Math.max(.8,r*.18);ctx.strokeStyle='#e5f5ff';ctx.stroke();
    if(status==='queued'){
      // Purple clock: the order has a reserved cell but awaits the courier.
      ctx.fillStyle='#a45aef';ctx.beginPath();ctx.arc(x,y,r*.68,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(.9,r*.19);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y-r*.36);ctx.lineTo(x,y);ctx.lineTo(x+r*.3,y+r*.17);ctx.stroke();
    }else if(status==='approaching'){
      // Cyan arrow: the courier is on the way, before loading starts.
      ctx.fillStyle='#57bff2';ctx.beginPath();ctx.moveTo(x+r*.62,y);ctx.lineTo(x-r*.38,y-r*.55);ctx.lineTo(x-r*.38,y+r*.55);ctx.closePath();ctx.fill();
    }else if(status==='loading'){
      ctx.fillStyle='#ffbf37';ctx.beginPath();ctx.moveTo(x,y-r*.62);ctx.lineTo(x+r*.62,y);ctx.lineTo(x,y+r*.62);ctx.lineTo(x-r*.62,y);ctx.closePath();ctx.fill();
    }else if(status==='ready'){
      ctx.fillStyle='#20bd76';ctx.beginPath();ctx.arc(x,y,r*.69,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1,r*.25);ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x-r*.38,y);ctx.lineTo(x-r*.08,y+r*.28);ctx.lineTo(x+r*.44,y-r*.3);ctx.stroke();
    }else if(status==='claimed'){
      ctx.fillStyle='#29aff2';ctx.fillRect(x-r*.48,y-r*.48,r*.96,r*.96);ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1,r*.2);ctx.beginPath();ctx.moveTo(x-r*.3,y);ctx.lineTo(x+r*.3,y);ctx.stroke();
    }else{
      ctx.strokeStyle='#c6d1df';ctx.lineWidth=Math.max(1,r*.22);ctx.beginPath();ctx.arc(x,y,r*.48,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();
  }
  function draw(ctx,rect,cells){
    const box=fit(rect);if(!ctx||!box)return false;
    const {x,y,w,h}=box, ready=!!(image&&image.complete&&image.naturalWidth>0);
    ctx.save();
    if(ready){ctx.drawImage(image,x,y,w,h);}
    else{
      // A compact fallback stays legible even while the image is loading.
      ctx.fillStyle='#303d75';ctx.fillRect(x,y,w,h);ctx.fillStyle='#167ed3';ctx.fillRect(x+w*.12,y+h*.04,w*.8,h*.29);
      for(let i=0;i<6;i++){const px=x+w*(i%2?.58:.2),py=y+h*(.38+Math.floor(i/2)*.17);ctx.fillStyle=i%2?'#1474bf':'#f49a18';ctx.fillRect(px,py,w*.3,h*.14);}
    }
    const list=Array.isArray(cells)?cells:[],radius=Math.max(2.6,Math.min(w*.043,h*.032,7));
    for(let i=0;i<positions.length;i++)mark(ctx,x+w*positions[i][0],y+h*positions[i][1],radius,list[i]?.status||'free');
    ctx.restore();
    return true;
  }
  let courierImage=null;
  const COURIER_BOUNDS=[[74,10,183,247],[74,9,182,245],[74,11,183,248],[74,10,182,245],
    [72,9,182,245],[74,9,182,245],[73,9,182,245],[74,9,182,245]];
  function getCourierImage(){
    if(!courierImage&&typeof Image==='function'){
      courierImage=new Image();courierImage.decoding='async';
      courierImage.onload=notifyImageChange;courierImage.onerror=notifyImageChange;courierImage.src=courierUrl;
    }
    return courierImage;
  }
  function drawCourier(ctx,x,y,motion,seconds,facing='front'){
    if(!ctx||![x,y].every(Number.isFinite))return false;
    const img=getCourierImage(),rear=facing==='rear';
    if(img?.complete&&img.naturalWidth===1024&&img.naturalHeight===512){
      const time=Number.isFinite(seconds)?Math.max(0,seconds):0,tick=time*7;
      const frame=motion==='walk'&&Number.isFinite(tick)?Math.floor(tick)%4:1;
      const [left,top,right,bottom]=COURIER_BOUNDS[(rear?4:0)+frame];
      const maxW=Math.max(...COURIER_BOUNDS.map(b=>b[2]-b[0]+1));
      const maxH=Math.max(...COURIER_BOUNDS.map(b=>b[3]-b[1]+1));
      const scale=Math.min(52*1.2/maxW,78.5*1.2/maxH);
      ctx.save();ctx.translate(x,y);
      ctx.drawImage(img,frame*256,rear?256:0,256,256,-(left+right+1)*scale/2,9.5-(bottom+1)*scale,256*scale,256*scale);
      ctx.restore();return true;
    }
    // A recognisably external teal courier remains while the sheet decodes.
    ctx.save();ctx.translate(x,y+9.5);ctx.scale(1.2,1.2);
    ctx.fillStyle='#343c42';ctx.fillRect(-12,-29,10,25);ctx.fillRect(2,-29,10,25);
    ctx.fillStyle='#e4e1d8';ctx.fillRect(-13,-5,11,5);ctx.fillRect(2,-5,11,5);
    ctx.fillStyle='#175f61';ctx.fillRect(-16,-51,32,25);ctx.fillStyle='#96b6b1';ctx.fillRect(-15,-45,30,3);
    ctx.fillStyle='#d68428';ctx.fillRect(3,-35,12,10);
    ctx.fillStyle='#4a352d';ctx.beginPath();ctx.arc(0,-65,11,0,Math.PI*2);ctx.fill();
    if(!rear){ctx.fillStyle='#e7b996';ctx.beginPath();ctx.arc(0,-62,9,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#302922';ctx.beginPath();ctx.arc(-3,-63,1,0,Math.PI*2);ctx.arc(3,-63,1,0,Math.PI*2);ctx.fill();}
    ctx.restore();return true;
  }
  return Object.freeze({draw,fit,onImageChange,drawCourier,asset:ASSET,courierAsset:COURIER_ASSET,
    isImageReady:()=>!!(image&&image.complete&&image.naturalWidth>0)});
})();
