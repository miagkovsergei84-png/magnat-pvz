'use strict';
(function(root){
  // Perspective renderer: the approved empty street plates move around their
  // vanishing points. Asphalt detail, lane dashes and gameplay sprites share
  // one world-distance projection. Sidewalk scenery stays baked into the art.
  const W=360,H=600,FOOT=496,LANE=118,NEAR=52,HERO=104,R=root.CourierRunner;
  const russianStops=['А','Б','В','Г'],local=root.CourierText,L=local?.choose||((ru)=>ru);
  const stopName=local?.stop||(index=>russianStops[index]);
  // Plates have different curb slopes; use each curb to place its delivery sign.
  // road is the lateral span inside the painted curb lines in world units.
  const views=[{name:'street-a',x:199,y:160,curb:305,road:[-236,277]},{name:'street-b',x:172,y:155,curb:347,road:[-280,291]},{name:'street-c',x:188,y:160,curb:315,road:[-255,266]}];
  const runNames=Array.from({length:8},(_,i)=>'hero-run-v3-'+i),heroNames=['jump','slide'].flatMap(kind=>Array.from({length:4},(_,i)=>'hero-'+kind+'-'+i));
  const names=[...views.map(v=>v.name),...runNames,...heroNames,...Object.values(R.VEHICLES).flat(),'obstacle-box','obstacle-puddle','obstacle-cart','obstacle-gate-v3',...Array.from({length:4},(_,i)=>'handoff-'+i)];
  const art=Object.create(null),handoffPanels=[];const oldPoseScale=HERO/327.5;let loaded=false,loadError=null,runScale=1,register=null,scene={x:180,y:160,curb:347};
  const visual=root.CourierStreetVisuals,streetCache=new Map();let streamProgram=null,streamIndex=-1,peak=0,misses=0,draws=0,blends=0;
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const fleetSet=new Set(Object.values(R.VEHICLES).flat());
  const widthOf=image=>image.naturalWidth??image.width,heightOf=image=>image.naturalHeight??image.height;
  async function renderSource(image){
    if(typeof createImageBitmap==='function')try{return await createImageBitmap(image);}catch{}
    return image;
  }
  async function load(name){
    const im=new Image(),fleet=fleetSet.has(name);
    im.src=(fleet?'art-v4/':name.includes('-v3')?'art-v3/':'art-v2/')+name+'.webp';
    await im.decode();
    // Keep the small shared fleet rasterized. A truck can enter the frame
    // for the first time after many crossings, not just at level start.
    art[name]=fleet?await renderSource(im):im;
  }
  function cover(c,im,x,y,w,h){const s=Math.max(w/im.naturalWidth,h/im.naturalHeight),iw=im.naturalWidth*s,ih=im.naturalHeight*s;c.drawImage(im,x+(w-iw)/2,y+(h-ih)/2,iw,ih);}
  function makeHandoffPanel(im){const cv=document.createElement('canvas');cv.width=720;cv.height=1200;const c=cv.getContext('2d');c.filter='blur(18px)';cover(c,im,-22,-22,764,1244);c.filter='none';const s=Math.min(cv.width/im.naturalWidth,cv.height/im.naturalHeight),w=im.naturalWidth*s,h=im.naturalHeight*s,y=(cv.height-h)/2;c.drawImage(im,(cv.width-w)/2,y,w,h);const shade=c.createLinearGradient(0,0,0,cv.height);shade.addColorStop(0,'#172b4088');shade.addColorStop(.12,'#172b4000');shade.addColorStop(.88,'#172b4000');shade.addColorStop(1,'#172b4099');c.fillStyle=shade;c.fillRect(0,0,cv.width,cv.height);return cv;}
  const ready=Promise.all(names.map(load)).then(()=>{register=root.CourierRunRegistration;if(register?.run?.length!==runNames.length||!register.run.every(r=>Number.isFinite(r.anchorX)&&r.anchorGround>0)||!(register.gate?.clearance>0))throw Error('Missing run registration');runScale=HERO/(register.run.reduce((s,r)=>s+r.anchorGround,0)/register.run.length);for(let i=0;i<4;i++)handoffPanels.push(makeHandoffPanel(art['handoff-'+i]));loaded=true;return true;}).catch(e=>{loadError=e;throw e;});
  ready.catch(()=>{});
  function discardPlate(id,entry){
    entry.image.close?.();streetCache.delete(id);
  }
  function fetchPlate(id){
    if(streetCache.has(id))return streetCache.get(id);
    const image=new Image(),entry={image,decoded:false};image.decoding='async';image.src='art-v5-streets/'+id+'.webp';
    entry.promise=image.decode().then(async()=>{
      // Realize the decoded source before the reveal rather than bringing a
      // fresh HTMLImageElement into the canvas for the first time at a seam.
      // Retain the full native-size pixels in the bounded look-ahead cache.
      const source=await renderSource(image);
      if(streetCache.get(id)!==entry){source.close?.();return entry;}
      entry.image=source;
      entry.decoded=true;return entry;
    });
    entry.promise.catch(()=>{});streetCache.set(id,entry);peak=Math.max(peak,streetCache.size);return entry;
  }
  function preloadAt(program,index=0){
    const all=program.visualPlan?.segments;if(!all?.length)return Promise.resolve([]);
    const i=clamp(index,0,all.length-1),keep=new Set(all.slice(Math.max(0,i-1),i+3).map(s=>s.art));
    for(const [id,entry] of streetCache)if(!keep.has(id))discardPlate(id,entry);
    streamProgram=program;streamIndex=i;return Promise.all([...keep].map(id=>fetchPlate(id).promise));
  }
  function releaseRoute(){for(const [id,entry] of streetCache)discardPlate(id,entry);streamProgram=null;streamIndex=-1;}
  function prepareRoute(program,index=0){return Promise.all([ready,preloadAt(program,index)]);}
  function backgroundFrame(g){
    const all=g.program.visualPlan;if(!all?.segments.length)return null;
    const frame=visual.frame(all,g.distance,g.streetIndex,!!g.handoff);
    return {...frame,ready:!!streetCache.get(frame.from)?.decoded&&(!frame.to||!!streetCache.get(frame.to)?.decoded)};
  }
  function project(x,z){const s=NEAR/(NEAR+Math.max(-30,z));return {x:scene.x+(W/2-scene.x+x)*s,y:scene.y+(FOOT-scene.y)*s,scale:s};}
  function appendQuad(c,x1,x2,z1,z2){
    const xn=W/2-scene.x+x1,xf=W/2-scene.x+x2,a=NEAR/(NEAR+Math.max(-30,z1)),b=NEAR/(NEAR+Math.max(-30,z2)),yn=scene.y+(FOOT-scene.y)*a,yf=scene.y+(FOOT-scene.y)*b;
    c.moveTo(scene.x+xn*a,yn);c.lineTo(scene.x+xf*a,yn);c.lineTo(scene.x+xf*b,yf);c.lineTo(scene.x+xn*b,yf);c.closePath();
  }
  function quad(c,x1,x2,z1,z2,fill){c.beginPath();appendQuad(c,x1,x2,z1,z2);c.fillStyle=fill;c.fill();}
  function rounded(c,x,y,w,h,r,fill,stroke=null){c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  function ellipse(c,x,y,rx,ry,fill){c.fillStyle=fill;c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);c.fill();}
  function text(c,s,x,y,size,color='#fff',weight=800){c.font=`${weight} ${size}px "Segoe UI",sans-serif`;c.textAlign='center';c.fillStyle=color;c.fillText(s,x,y);}
  const plaques=new Map();
  function plaque(c,s,x,y,w,fill='#1b3c4ae8',size=11){
    const key=`${s}|${w}|${fill}|${size}`;let bitmap=plaques.get(key);
    if(!bitmap){
      bitmap=document.createElement('canvas');bitmap.width=(w+2)*2;bitmap.height=50;
      const label=bitmap.getContext('2d');label.scale(2,2);rounded(label,1,1,w,23,7,fill,'#ffedbf55');text(label,s,1+w/2,16,size,'#fff6dc');
      if(plaques.size>=40)plaques.delete(plaques.keys().next().value);plaques.set(key,bitmap);
    }
    c.drawImage(bitmap,x-1,y-1,w+2,25);
  }
  const zoomFor=(at,start)=>{const distance=Math.max(0,at-start);return 1+.32*distance/(180+distance);};
  function backdropZoom(g){return zoomFor(g.distance,R.currentLeg(g).start);}
  function drawPlate(c,image,v,zoom){c.drawImage(image,v.x*(1-zoom),v.y*(1-zoom),W*zoom,H*zoom);}
  function blendPlate(c,previous,previousZoom,image,v,zoom,mix){
    if(mix<=0){drawPlate(c,previous,v,previousZoom);return;}
    if(mix>=1){drawPlate(c,image,v,zoom);return;}
    // The near and far reveal bands are drawn directly from the original
    // plates. Only the feather is painted twice; the covered part of the
    // previous plate never hits the framebuffer. No scratch canvas/readback.
    const feather=.11,bands=8,level=mix*(1+feather),core=clamp(level-feather,0,1),above=v.y,below=H-v.y;
    function strip(bitmap,z,top,bottom,alpha){top=Math.round(top);bottom=Math.round(bottom);const h=bottom-top;if(h<=0)return;
      const sx=widthOf(bitmap)/(W*z),sy=heightOf(bitmap)/(H*z);
      c.globalAlpha=alpha;c.drawImage(bitmap,v.x*(z-1)*sx,(top-v.y*(1-z))*sy,W*sx,h*sy,0,top,W,h);
    }
    const coreTop=Math.round(v.y-above*core),coreBottom=Math.round(v.y+below*core);
    if(coreBottom>coreTop){strip(previous,previousZoom,0,coreTop,1);strip(previous,previousZoom,coreBottom,H,1);strip(image,zoom,coreTop,coreBottom,1);}
    else drawPlate(c,previous,v,previousZoom);
    for(let i=0;i<bands;i++){
      const a=i/bands,b=(i+1)/bands,near=clamp(level-b*feather,0,1),far=clamp(level-a*feather,0,1);
      if(far<=near)continue;
      const alpha=clamp((level-(near+far)*.5)/feather,0,1);
      strip(image,zoom,v.y-above*far,v.y-above*near,alpha);strip(image,zoom,v.y+below*near,v.y+below*far,alpha);
    }
    c.globalAlpha=1;
  }
  function backdrop(c,g){
    const leg=R.currentLeg(g),v=views[leg.theme%3],all=g.program.visualPlan?.segments,frame=backgroundFrame(g);draws++;
    if(!frame){scene=v;drawPlate(c,art[v.name],v,backdropZoom(g));return;}
    // The previous window already includes both sides of this join. Do not
    // decode the next look-ahead image alongside the heaviest painted frames.
    if(streamProgram!==g.program||streamIndex!==frame.index&&!frame.to)preloadAt(g.program,frame.index).catch(()=>{});
    const from=streetCache.get(frame.from),to=frame.to?streetCache.get(frame.to):null;
    if(g.status==='play'&&(!from?.decoded||frame.to&&!to?.decoded)){misses++;}
    if(!from?.decoded&&!to?.decoded){scene=v;drawPlate(c,art[v.name],v,backdropZoom(g));return;}
    // All new plates share the same horizon and curb geometry. The soft
    // reveal affects artwork only: details, marks, actor and hazards draw once.
    scene=root.CourierStreetArt?.[frame.from]||{x:180,y:172,curb:330,road:[-282,282]};
    const here=all[frame.index],before=frame.to&&g.distance>=frame.seam?all[frame.index-1]:here;
    const after=frame.to&&g.distance<frame.seam?all[frame.index+1]:here;
    if(from?.decoded&&to?.decoded){blendPlate(c,from.image,zoomFor(g.distance,before.start),to.image,scene,zoomFor(g.distance,after.start),frame.mix);blends++;}
    else if(from?.decoded)drawPlate(c,from.image,scene,zoomFor(g.distance,before.start));
    else drawPlate(c,to.image,scene,zoomFor(g.distance,after.start));
  }
  const grain=(i,salt)=>((Math.imul(i+7919*salt,2654435761)>>>0)%65521)/65521,grainCache=Array(48);
  function textureRow(row){const slot=row%grainCache.length;return grainCache[slot]?.row===row?grainCache[slot]:(grainCache[slot]={row,values:Array.from({length:10},(_,i)=>grain(row,i+1))});}
  function asphalt(c,distance){
    const [left,right]=scene.road,step=14,first=Math.floor((distance-15)/step),last=Math.floor((distance+215)/step);
    // Details belong to the road plane and have stable world coordinates.
    // No detached objects, and no looping/reset of the painted street.
    c.save();for(let row=last;row>=first;row--){if(row<0)continue;const {values}=textureRow(row),z=row*step+values[0]*7-distance,fade=clamp((210-z)/140,0,1);
      if(z<-15||fade===0)continue;
      c.globalAlpha=.15*fade;
      for(let j=0;j<3;j++){
        const x=left+30+(j+values[j+1])*(right-left-85)/3,w=18+values[j+4]*28;
        quad(c,x,x+w,z,z+.7+values[j+7]*1.5,j===1?'#92939a':'#383845');
      }
      c.globalAlpha=.22*fade;
      c.beginPath();appendQuad(c,left+1,left+13,z,z+1.3);appendQuad(c,right-13,right-1,z,z+1.3);c.fillStyle='#c0aa88';c.fill();
    }c.restore();
  }
  function markings(c,g){const offset=g.distance%22;
    c.beginPath();for(let z=-28-offset;z<450;z+=22){const near=Math.max(z,-28),far=Math.max(z+9,-28);if(far<=near)continue;appendQuad(c,-LANE/2-1.8,-LANE/2+1.8,near,far);appendQuad(c,LANE/2-1.8,LANE/2+1.8,near,far);}
    c.fillStyle='#ecece4ef';c.fill();
  }
  function sprite(c,name,x,y,w,h){const im=art[name];c.drawImage(im,x-w/2,y-h,w,h);}
  function hazardAsset(h){if(h.vehicle&&R.VEHICLES[h.kind]?.includes(h.vehicle))return h.vehicle;if(h.kind==='parked')return h.color%2?'van-yellow':'car-red';if(h.kind==='moving')return h.color%2?'car-blue':'car-teal';return h.kind==='gate'?'obstacle-gate-v3':'obstacle-'+h.kind;}
  const hazardSizes=new Map();
  function hazardSize(h){const name=hazardAsset(h);if(hazardSizes.has(name))return hazardSizes.get(name);
    const im=art[name],car=h.kind==='parked'||h.kind==='moving',width=car?118:h.kind==='gate'?114:h.kind==='puddle'?106:h.kind==='cart'?85:89;let height=width*heightOf(im)/widthOf(im);
    if(car)height=Math.max(R.LONG_SECONDS[name]?198:name==='van-yellow'?160:140,height);if(h.kind==='gate')height=Math.max(128,94/(register?.gate?.clearance||.74));if(h.kind==='puddle')height=Math.min(height,31);if(h.kind==='cart')height=Math.min(height,79);
    const size=Object.freeze({name,width,height,car,long:!!R.LONG_SECONDS[name]});if(loaded)hazardSizes.set(name,size);return size;}
  function hazard(c,h,g){let z=h.at-g.distance;if(z<-28||z>210)return;if(h.kind==='moving')z*=1.28;const p=project((h.lane-1)*LANE,z),{name,width,height,car}=hazardSize(h);
    const w=width*p.scale,hh=height*p.scale;
    if(h.kind!=='puddle')ellipse(c,p.x,p.y+2*p.scale,w*.42,6*p.scale,'#1c283865');sprite(c,name,p.x,p.y,w,hh);
    if(z>9&&z<58&&!car){const icon=h.kind==='gate'?'↓':'↑';rounded(c,p.x-8*p.scale,p.y-hh-15*p.scale,16*p.scale,15*p.scale,4*p.scale,'#254653e6');text(c,icon,p.x,p.y-hh-4*p.scale,12*p.scale,'#fff0ae');}
  }
  function stop(c,g){const s=g.program.streets.find(x=>x.stop!==null&&x.end>=g.distance);if(!s)return;const z=s.end-g.distance;if(z>150||z<-1)return;const p=project(scene.curb*.93,z),scl=p.scale,letter=stopName(g.program.stops.indexOf(s.stop));
    c.save();c.translate(p.x,p.y);c.scale(scl,scl);rounded(c,-3,-90,6,93,2,'#76595b');rounded(c,-42,-105,77,33,7,'#803bc3','#f5d38a');text(c,L('ПВЗ ','Stop ')+letter,-4,-84,17,'#fff9e9');c.restore();if(z<23)quad(c,-143,143,z,z+1.4,'#79f7b7b0');}
  const runFrameFor=g=>Math.floor(g.distance/2.7)%8;
  // While passing beneath a gate, both the crossbar and the posts must be
  // drawn in FRONT of the courier. The true transparent opening remains clear.
  const underGate=(g,h)=>h.kind==='gate'&&Math.abs(g.xLane-h.lane)<.58&&h.at-g.distance>=-13&&h.at-g.distance<=10;
  function lowerObstacle(hazards,at,strict=false){let lo=0,hi=hazards.length;while(lo<hi){const i=(lo+hi)>>>1;if(hazards[i].at<at||strict&&hazards[i].at===at)lo=i+1;else hi=i;}return lo;}
  function drawObstacles(c,g,hazards,lo,hi,front,slide){
    // The model emits obstacles in distance order. Walk only visible rows
    // in reverse depth, keeping the original order within a tied row.
    for(let end=hi;end>lo;){let start=end-1;while(start>lo&&hazards[start-1].at===hazards[end-1].at)start--;
      for(let i=start;i<end;i++){const h=hazards[i];if((h.at<=g.distance||slide&&underGate(g,h))===front)hazard(c,h,g);}
      end=start;
    }
  }
  function hero(c,g,pose,gateForeground){const x=project((g.xLane-1)*LANE,0).x,runFrame=runFrameFor(g);let frame=runFrame,kind='run',lift=0;
    if(pose.kind==='jump'){kind='jump';frame=pose.progress<.15?0:pose.progress<.40?1:pose.progress<.75?2:3;lift=pose.height*82;}
    if(pose.kind==='slide'){kind='slide';frame=gateForeground?2:pose.progress<.12?0:pose.progress<.38?1:pose.progress<.85?2:3;lift=0;}
    ellipse(c,x,FOOT+4,(kind==='slide'?30:24)*HERO/124,6,'#202d435c');c.save();if(g.elapsed<g.shieldUntil&&Math.floor(g.elapsed*12)%2===0)c.globalAlpha=.50;
    if(kind==='run'){const meta=register.run[frame],im=art[runNames[frame]];c.drawImage(im,x-meta.anchorX*runScale,FOOT-meta.anchorGround*runScale,im.naturalWidth*runScale,im.naturalHeight*runScale);}
    else{const name='hero-'+kind+'-'+frame,im=art[name],h=im.naturalHeight*oldPoseScale,w=im.naturalWidth*oldPoseScale;sprite(c,name,x,FOOT-lift,w,h);}c.restore();
  }
  function drawHandoff(c,g){const h=g.handoff,t=clamp(h.elapsed/h.duration,0,1),p=t*4,frame=Math.min(3,Math.floor(p)),phase=p-frame;const fade=frame>0?ease(phase/.28):1;
    if(frame>0&&fade<1){c.drawImage(handoffPanels[frame-1],0,0,W,H);c.save();c.globalAlpha=fade;c.drawImage(handoffPanels[frame],0,0,W,H);c.restore();}else c.drawImage(handoffPanels[frame],0,0,W,H);
    const letter=stopName(g.program.stops.indexOf(h.stop)),count=g.delivered.length+1;
    plaque(c,L('ПВЗ ','PICKUP ')+letter+L(' · ДОСТАВКА ',' · DELIVERY ')+count+'/4',66,12,228,'#35465fe8',12);
    if(frame>=2)plaque(c,count<4?L('Посылка принята! Скорость ','Parcel accepted! Speed ')+Math.round(R.SPEED_FACTORS[count]*100)+'%':L('Все посылки приняты!','All parcels accepted!'),55,H-42,250,'#1f7658ed',12);
  }
  // Every branch paints an opaque background, so don't clear and repaint a
  // second time or pay for an extra transparent canvas compositing layer.
  function draw(canvas,g){const c=canvas.getContext('2d',{alpha:false});c.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);
    if(!loaded){c.fillStyle='#1c3a50';c.fillRect(0,0,W,H);text(c,loadError?L('Рисунки не загрузились','Couldn’t load the artwork'):L('Загружаем мегаполис…','Loading the city…'),W/2,H/2,17,'#ffe6b6');return;}
    if(g.handoff){drawHandoff(c,g);return;}
    const st=R.currentStreet(g);backdrop(c,g);asphalt(c,g.distance);markings(c,g);stop(c,g);
    const hazards=g.program.obstacles,lo=lowerObstacle(hazards,g.distance-28),hi=lowerObstacle(hazards,g.distance+210,true),pose=R.pose(g),slide=pose.kind==='slide';
    let gateForeground=false;if(slide)for(let i=lo;i<hi;i++)if(underGate(g,hazards[i])){gateForeground=true;break;}
    drawObstacles(c,g,hazards,lo,hi,false,slide);hero(c,g,pose,gateForeground);drawObstacles(c,g,hazards,lo,hi,true,slide);
    if(g.elapsed<g.shieldUntil&&g.status==='play'&&g.lastHit){c.fillStyle='#ffaf9d13';c.fillRect(0,0,W,H);}
    plaque(c,st.busy?L('ОЖИВЛЁННАЯ УЛИЦА','BUSY STREET'):L('ТИХАЯ УЛИЦА','QUIET STREET'),8,10,st.busy?125:98,st.busy?'#66491fe8':'#1b6253e8',st.busy?9:10);
    plaque(c,L('Скорость ','Speed ')+Math.round(R.factor(g)*100)+'%',W-104,10,96,'#27384be8',10);
    if(g.notice&&g.elapsed<g.noticeUntil)plaque(c,local?.notice(g)||g.notice,20,41,W-40,g.lastHit&&g.elapsed<g.shieldUntil?'#923b42e6':'#236d58e8',11);
  }
  root.CourierRunnerView=Object.freeze({draw,W,H,ready,isReady:()=>loaded,assetCount:()=>names.length,prepareRoute,preloadAt,releaseRoute,backgroundStats:()=>({decoded:[...streetCache.values()].filter(e=>e.decoded).length,peak,misses,draws,blends}),visualState:g=>{const pose=R.pose(g).kind;return {theme:R.currentLeg(g).theme,background:backgroundFrame(g),backdropZoom:backdropZoom(g),runFrame:runFrameFor(g),pose,gateForeground:pose==='slide'?g.program.obstacles.filter(h=>underGate(g,h)).map(h=>h.id):[]};},scaleInfo:()=>({hero:HERO,lane:LANE,car:hazardSize({kind:'parked',color:0}),fleet:Object.entries(R.VEHICLES).flatMap(([kind,vehicles])=>vehicles.map(vehicle=>hazardSize({kind,vehicle}))),gate:hazardSize({kind:'gate',color:0}),slideHeight:art['hero-slide-2'].naturalHeight*oldPoseScale,gateClearance:hazardSize({kind:'gate',color:0}).height*register.gate.clearance})});
})(globalThis);
