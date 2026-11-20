// One in-game art sample. Images supply material only; layout/input/symbols
// stay in the existing game code. Failed images make these hooks return false.
globalThis.PptEnvironmentSample=(()=>{
  const files={
    floor:{file:'assets/environment/sample-v1/floor-sample-v1.png',width:128,height:128},
    counter:{file:'assets/environment/sample-v1/counter-sample-v1.png',width:128,height:64},
    shelf:{file:'assets/environment/sample-v4/shelf-sample-v4.png',width:308,height:132},
    parcelRed:{file:'assets/environment/sample-v4/parcel-red-sample-v4.png',width:48,height:48},
    parcelBlue:{file:'assets/environment/sample-v4/parcel-blue-sample-v4.png',width:48,height:48},
    parcelYellow:{file:'assets/environment/sample-v4/parcel-yellow-sample-v4.png',width:48,height:48},
    parcelGreen:{file:'assets/environment/sample-v4/parcel-green-sample-v4.png',width:48,height:48},
    parcelReturn:{file:'assets/environment/sample-v3/parcel-sample-v3.png',width:48,height:48},
    truck:{file:'assets/environment/truck-v3/truck-v3-576.png',width:576,height:192},
    fridge:{file:'assets/environment/storage-service-v1/fridge-v1.png',width:396,height:320},
    xlRack:{file:'assets/environment/storage-service-v1/xl-rack-v1.png',width:184,height:384},
    locker:{file:'assets/environment/storage-service-v1/locker-v1.png',width:328,height:128},
    conveyor:{file:'assets/environment/storage-service-v1/conveyor-v1.png',width:104,height:208},
    ai:{file:'assets/environment/comfort-ai-v1/ai-front.png',width:272,height:362},
    loadingDock:{file:'assets/environment/loading-dock-v1/loading-dock-v1.png',width:656,height:224},
    cooler:{file:'assets/environment/comfort-ai-v1/cooler.png',width:48,height:96},
    coffee:{file:'assets/environment/comfort-ai-v1/coffee.png',width:56,height:64},
    tv:{file:'assets/environment/comfort-ai-v1/tv.png',width:160,height:88}
  };
  let revision=0,redraw=null;
  function changed(){revision++;redraw?.();}
  for(const asset of Object.values(files)){
    const image=new Image();asset.image=image;asset.ready=false;asset.failed=false;
    image.onerror=()=>{asset.ready=false;asset.failed=true;changed();};
    image.onload=()=>{asset.ready=!asset.failed&&image.naturalWidth===asset.width&&image.naturalHeight===asset.height;if(!asset.ready)asset.failed=true;changed();};
    image.src=asset.file;
  }
  function draw(key,ctx,paint){
    const asset=files[key];if(!asset.ready||!asset.image.complete)return false;
    try{paint(asset.image);return true;}
    catch(error){asset.ready=false;asset.failed=true;changed();return false;}
  }
  function floor(ctx,x,y,width,height){return draw('floor',ctx,image=>{
    const tile=64;
    for(let top=Math.floor(y/tile)*tile;top<y+height;top+=tile)for(let left=Math.floor(x/tile)*tile;left<x+width;left+=tile){
      const dx=Math.max(x,left),dy=Math.max(y,top),w=Math.min(x+width,left+tile)-dx,h=Math.min(y+height,top+tile)-dy;
      ctx.drawImage(image,(dx-left)*2,(dy-top)*2,w*2,h*2,dx,dy,w,h);
    }
  });}
  function counter(ctx,width,y,height,windows){return draw('counter',ctx,image=>{
    const panel=width/windows;
    for(let i=0;i<windows;i++)ctx.drawImage(image,0,14,128,36,i*panel,y,panel,height);
  });}
  function shelf(ctx,r){return draw('shelf',ctx,image=>{
    // A single cavity is fitted to the unchanged code cells. Its bottom rail
    // begins at y+61, exactly after the 42-high cells that start at y+19.
    const sx=[9,33,274,299],sy=[14,46,91,119];
    const dx=[r.x,r.x+5,r.x+149,r.x+154],dy=[r.y,r.y+19,r.y+61,r.y+66];
    for(let row=0;row<3;row++)for(let col=0;col<3;col++)
      ctx.drawImage(image,sx[col],sy[row],sx[col+1]-sx[col],sy[row+1]-sy[row],dx[col],dy[row],dx[col+1]-dx[col],dy[row+1]-dy[row]);
  });}
  function paintParcel(ctx,image,x,y,size){
    // Keep the entire antialiased canvas and its original centre anchor.
    // Colour-specific v4 canvases retain their original framing and pixels.
    const extent=size*1.2;ctx.drawImage(image,0,0,48,48,x-extent/2,y-extent/2,extent,extent);
  }
  function parcel(ctx,x,y,size,color,imageOverride){
    if(imageOverride){
      if(!imageOverride.complete||imageOverride.naturalWidth!==48||imageOverride.naturalHeight!==48)return false;
      paintParcel(ctx,imageOverride,x,y,size);return true;
    }
    const key=['parcelRed','parcelBlue','parcelYellow','parcelGreen'][color];
    return key?draw(key,ctx,image=>paintParcel(ctx,image,x,y,size)):false;
  }
  function parcelReturn(ctx,x,y,size){return draw('parcelReturn',ctx,image=>paintParcel(ctx,image,x,y,size));}
  function parcelWide(ctx,x,y,size,color){
    const key=['parcelRed','parcelBlue','parcelYellow','parcelGreen'][color];
    // The complete source fits the original wide parcel rect, without crops.
    return key?draw(key,ctx,image=>ctx.drawImage(image,0,0,48,48,x-size*.68,y-size*.5,size*1.36,size)):false;
  }
  function truck(ctx,r){return draw('truck',ctx,image=>{
    // Crop only the original canvas margins; retain the complete vehicle.
    // The reviewed [190,0,1800,724] source rect scales with the whole-canvas export.
    const scale=image.naturalWidth/2172;
    ctx.drawImage(image,190*scale,0,1800*scale,image.naturalHeight,r.x,r.y,r.w,r.h);
  });}
  function material(key,ctx,original,source,r){return draw(key,ctx,image=>{
    const sx=image.naturalWidth/original[0],sy=image.naturalHeight/original[1];
    ctx.save();
    try{ctx.drawImage(image,source[0]*sx,source[1]*sy,source[2]*sx,source[3]*sy,r.x,r.y,r.w,r.h);}
    finally{ctx.restore();}
  });}
  const fridge=(ctx,r)=>material('fridge',ctx,[1395,1127],[0,0,1395,1127],r);
  const xlRack=(ctx,r)=>material('xlRack',ctx,[869,1810],[132,102,606,1622],r);
  const locker=(ctx,x,y,w,h)=>material('locker',ctx,[2005,784],[0,0,2005,784],{x,y,w,h});
  const conveyor=(ctx,x,y,w,h)=>material('conveyor',ctx,[887,1774],[33,50,822,1680],{x,y,w,h});
  // Joint outlines in pixels of the shipped 272 × 362 transparent painting.
  // Adjacent pieces overlap at the shoulders, neck and hips.
  const armOutline=[[20,181],[96,181],[92,204],[86,227],[80,246],[85,268],[81,295],[20,295]];
  const legOutline=[[84,251],[109,249],[136,266],[136,361],[58,361],[58,292],[78,290]];
  const chestOutline=[[94,180],[178,180],[183,205],[188,230],[181,254],[162,268],[136,278],[109,269],[89,256],[84,233],[89,204]];
  const headOutline=[[20,0],[250,0],[250,181],[160,181],[157,188],[112,188],[110,181],[20,181]];
  const mirror=points=>points.map(([x,y])=>[272-x,y]);
  const rightArm=mirror(armOutline),rightLeg=mirror(legOutline);
  function joint(ctx,image,outline,x,y,angle,lift=0,stretch=1){
    ctx.save();
    try{
      ctx.translate(x,y+lift);ctx.rotate(angle);ctx.scale(1,stretch);ctx.translate(-x,-y);
      ctx.beginPath();ctx.moveTo(...outline[0]);
      for(let i=1;i<outline.length;i++)ctx.lineTo(...outline[i]);
      ctx.closePath();ctx.clip();ctx.drawImage(image,0,0);
    }finally{ctx.restore();}
  }
  function ai(ctx,x,y,motion='still',time=0,carrying=false,reduced=false){
    const w=54,h=w*1390/830,rect={x:x-w/2,y:y+10.75-h,w,h};
    if(motion==='still'||(reduced&&motion==='idle'&&!carrying))return material('ai',ctx,[1086,1448],[130,30,830,1390],rect);
    return draw('ai',ctx,image=>{
      const step=motion==='walk' ? (reduced ? .65*Math.sin(time*7) : Math.sin(time*10)) : 0;
      const picking=motion==='interact',serving=motion==='service';
      const reach=picking||serving ? .32+(reduced?0:.12*Math.cos(time*16)) : carrying ? .24 : 0;
      const bob=reduced ? 0 : motion==='walk' ? -4*Math.abs(step) : Math.sin(time*2.5)*1.7+(picking?4:0);
      const tilt=picking ? .055 : serving ? -.06 : reduced ? 0 : .022*(Math.sin(time*2.5)+step);
      ctx.save();
      try{
        ctx.translate(rect.x,rect.y);
        ctx.scale(w*1086/(830*272),h*1448/(1390*362));
        ctx.translate(-130*272/1086,-30*362/1448);
        joint(ctx,image,legOutline,108,255,.075*step,0,1-.21*Math.max(0,step));
        joint(ctx,image,rightLeg,164,255,-.075*step,0,1-.21*Math.max(0,-step));
        joint(ctx,image,chestOutline,136,256,.012*step,bob);
        joint(ctx,image,armOutline,91,193,-reach+.18*step,bob-5*reach);
        joint(ctx,image,rightArm,181,193,(serving?-1.4:1)*reach+.18*step,bob-5*reach);
        joint(ctx,image,headOutline,136,184,tilt,bob+(picking?3:0));
      }finally{ctx.restore();}
    });
  }
  const cooler=(ctx,x,y)=>material('cooler',ctx,[887,1774],[0,0,887,1774],{x,y,w:18,h:36});
  const coffee=(ctx,x,y)=>material('coffee',ctx,[1173,1341],[0,0,1173,1341],{x,y,w:20,h:23});
  const tv=(ctx,x,y)=>material('tv',ctx,[1691,930],[0,0,1691,930],{x,y,w:40,h:22});
  function loadingDock(ctx){return draw('loadingDock',ctx,image=>{
    const sx=image.naturalWidth/2146,sy=image.naturalHeight/733;
    ctx.drawImage(image,51*sx,74*sy,2047*sx,583*sy,98,526,164,56);
  });}
  return {floor,counter,shelf,parcel,parcelReturn,parcelWide,truck,fridge,xlRack,locker,conveyor,ai,loadingDock,cooler,coffee,tv,get revision(){return revision;},setRedraw(callback){redraw=callback;}};
})();
