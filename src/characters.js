// Visual assets are kept separate from the simulation. Staff action atlases
// come from PptCharacterAtlases; the format/shipping loader owns error fallback.
globalThis.PptCharacters = (() => {
  const WIDTH = 58.5, HEIGHT = 87.75;
  // Keep approved child art at its existing size; every adult actor uses the
  // same uniform scale relative to the ground contact point.
  const ADULT_SCALE = 1.2, FOOT_Y = 9.5;
  const assets=globalThis.PptCharacterAssets;
  function imageFor(file){
    if(assets)return assets.image(file);
    const image=new Image();image.src=file;return image;
  }
  const ready=image=>assets?assets.ready(image):image.complete&&image.naturalWidth>0;
  const oldWorker = imageFor('assets/characters/warehouse-worker-idle.png');
  const uniformWorkers = ['uniform-a.png', 'uniform-b.png', 'uniform-c.png']
    .map(name => imageFor('assets/characters/' + name));
  const hiVisWorkers = ['worker-hi-vis-a.png', 'worker-hi-vis-b.png', 'worker-hi-vis-c.png']
    .map(name => imageFor('assets/characters/' + name));
  const femaleUniformWorkers = ['uniform-female-a.png', 'uniform-female-b.png', 'uniform-female-c.png']
    .map(name => imageFor('assets/characters/' + name));
  const femaleHiVisWorkers = ['worker-hi-vis-female-a.png', 'worker-hi-vis-female-b.png', 'worker-hi-vis-female-c.png']
    .map(name => imageFor('assets/characters/' + name));
  const customers = ['girl-hoodie-idle.png', 'boy-idle.png', 'bearded-idle.png']
    .map(name => imageFor('assets/characters/' + name));
  const customerKeys=['girl-hoodie-idle','boy-idle','bearded-idle'];
  const grandma = imageFor('assets/characters/grandma-idle.png');
  // Transparent local-visitor sheets are independent of the legacy character
  // registry. Only the locations that use a sheet request it, and a failed or
  // incomplete image falls back to the neutral procedural visitor in main.js.
  const TOWN_VISITORS={file:'assets/campaign/visitors-town-20261111.webp',width:720,height:360,
    front:[[42,3,101,175],[227,0,85,177],[401,4,96,173],[581,2,95,175]],
    rear:[[44,183,98,175],[228,181,84,177],[403,183,94,174],[581,183,96,175]]};
  const CITY_VISITORS={file:'assets/campaign/visitors-city-20261111.webp',width:720,height:360,
    front:[[56,2,82,173],[225,6,86,170],[404,6,89,170],[588,2,78,174]],
    rear:[[54,182,84,175],[230,184,82,173],[407,186,87,170],[589,182,78,175]]};
  const CITY_EXTRA_VISITORS={file:'assets/campaign/visitors-city-extra-20261111.webp',width:720,height:360,
    front:[[56,4,79,174],[227,2,81,176],[411,2,77,176],[582,1,86,177]],
    rear:[[56,185,79,174],[228,181,80,178],[413,181,76,178],[582,183,85,176]]};
  const CITY_CENTER_VISITORS={file:'assets/campaign/metropolis-center-visitors-20261111.webp',width:720,height:360,
    front:[[60,5,81,172],[231,4,83,173],[410,9,73,168],[577,4,85,173]],
    rear:[[60,185,82,169],[230,181,86,174],[409,185,76,170],[577,182,85,173]]};
  const CAPITAL_OUTSKIRTS_VISITORS={file:'assets/campaign/visitors-capital-20261111.webp',width:720,height:360,
    front:[[64,2,81,177],[232,2,84,177],[389,3,110,176],[571,2,84,177]],
    rear:[[66,182,79,176],[233,182,83,176],[388,182,112,176],[571,182,85,176]]};
  const CAPITAL_CENTER_VISITORS={file:'assets/campaign/capital-center-visitors-20261111.webp',width:720,height:360,
    front:[[59,3,85,176],[228,6,86,173],[405,3,78,176],[574,1,83,178]],
    rear:[[64,182,80,177],[230,183,81,176],[404,181,79,178],[576,180,83,179]]};
  const PHOTO_VISITORS={file:'assets/campaign/visitors-photo-20261111.webp',width:720,height:480,
    front:[[89,26,103,211],[308,2,104,235],[523,11,120,226]],
    rear:[[88,261,103,214],[306,240,105,235],[523,248,120,227]]};
  const VILLAGE_VISITORS={file:'assets/campaign/visitors-village-20261111.webp',width:720,height:480,
    front:[[52,5,104,231],[214,12,112,225],[394,3,102,234],[564,11,102,226]],
    rear:[[54,244,100,234],[214,251,112,227],[393,243,103,235],[563,251,105,227]]};
  const VILLAGE_ELDER={file:'assets/campaign/visitors-village-elder-20261111.webp',width:720,height:360,
    front:[[118,8,153,341]],rear:[[448,8,153,341]]};
  // The photo-based couple is one customer and one drawable in both views.
  const VILLAGE_ELDER_COUPLE={file:'assets/campaign/village-photo-elder-couple-walk-20261112.webp',width:1024,height:512,
    front:[[56,8,157,238]],rear:[[54,261,161,240]]};
  const MORE_PHOTO_VISITORS={file:'assets/campaign/visitors-photo-two-more-20261111.webp',width:720,height:960,
    front:[[85,16,229,453],[391,11,246,457]],rear:[[85,491,233,459],[390,493,244,457]]};
  const PHOTO_OUTFITS={file:'assets/campaign/visitors-photo-outfits-20261111.webp',width:720,height:480,
    front:[[87,26,107,210],[305,2,109,235],[522,2,110,235]],rear:[[88,260,105,214],[305,240,108,235],[523,239,108,236]]};
  const localVisitorImages=new Map();
  const walkVisitorImages=new Map();
  let walkChapter=null;
  function localVisitorImage(spec){
    let image=localVisitorImages.get(spec.file);
    if(!image){image=new Image();image.src=spec.file;localVisitorImages.set(spec.file,image);}
    return image;
  }
  function drawLocalWalk(ctx,x,y,seconds,variant,facing,key,child,size=1){
    const spec=globalThis.PptVisitorWalkAtlases?.[key];
    if(!spec||!Array.isArray(spec.front)||!Array.isArray(spec.rear)||spec.front.length!==4||spec.rear.length!==4)return false;
    let image=walkVisitorImages.get(spec.file);
    if(!image){image=new Image();image.src=spec.file;walkVisitorImages.set(spec.file,image);}
    if(!image.complete||image.naturalWidth!==spec.width||image.naturalHeight!==spec.height)return false;
    const time=Number.isFinite(seconds)?Math.max(0,seconds):0,frame=Math.floor(time*7+variant*.37)%4;
    const rear=facing==='rear',box=(rear?spec.rear:spec.front)[frame],targetHeight=(child?70.5:78.5)*size;
    if(!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite))return false;
    ctx.save();ctx.translate(x,y);
    if(spec.kind==='grid'){
      const cell=spec.cell,all=[...spec.front,...spec.rear];
      if(!Number.isFinite(cell)||cell<=0||spec.width!==cell*4||spec.height!==cell*2||all.some(b=>
        !Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[0]<0||b[1]<0||b[2]<b[0]||b[3]<b[1]||b[2]>=cell||b[3]>=cell)) {ctx.restore();return false;}
      const maxH=Math.max(...all.map(b=>b[3]-b[1]+1)),maxW=Math.max(...all.map(b=>b[2]-b[0]+1));
      if(maxH<=0||maxW<=0){ctx.restore();return false;}
      const scale=Math.min(targetHeight/maxH,52*size/maxW),anchorX=(box[0]+box[2]+1)/2,anchorY=box[3]+1;
      ctx.drawImage(image,frame*cell,rear?cell:0,cell,cell,-anchorX*scale,9.5-anchorY*scale,cell*scale,cell*scale);
    }else{
      const [left,top,width,height]=box;
      if(width<=0||height<=0||left<0||top<0||left+width>spec.width||top+height>spec.height){ctx.restore();return false;}
      const bounds=spec.bounds;
      if(!Array.isArray(bounds)||bounds.length!==8||bounds.some(b=>!Array.isArray(b)||b.length!==4||!b.every(Number.isFinite)||b[2]<=0||b[3]<=0)){ctx.restore();return false;}
      const actual=bounds[(rear?4:0)+frame],maxW=Math.max(...bounds.map(b=>b[2])),maxH=Math.max(...bounds.map(b=>b[3]));
      const scale=Math.min(52*size/maxW,targetHeight/maxH),anchorX=actual[0]+actual[2]/2-left,anchorY=actual[1]+actual[3]-top;
      ctx.drawImage(image,left,top,width,height,-anchorX*scale,9.5-anchorY*scale,width*scale,height*scale);
    }
    ctx.restore();return true;
  }
  function drawLocalVisitor(ctx,x,y,mode,seconds,variant,facing,spec,index,child=false,size=1){
    const image=localVisitorImage(spec);
    if(!image.complete||image.naturalWidth!==spec.width||image.naturalHeight!==spec.height)return false;
    const [left,top,width,height]=(facing==='rear'?spec.rear:spec.front)[index];
    const targetHeight=(child?70.5:78.5)*size,scale=Math.min(52*size/width,targetHeight/height);
    const drawW=width*scale,drawH=height*scale;
    let side=0,lift=0,lean=0;if(mode!=='idle')({side,lift,lean}=pose(mode,seconds,variant*.37));
    ctx.save();ctx.translate(x+side,y+lift);ctx.rotate(lean);
    ctx.drawImage(image,left,top,width,height,-drawW/2,9.5-drawH,drawW,drawH);
    ctx.restore();return true;
  }
  const PLAYER_ATLAS_PATH='assets/characters/player-actions-a.png';
  const playerAtlas = imageFor(PLAYER_ATLAS_PATH);
  const ACTIONS={idle:[0,4],walk:[1,8],interact:[2,6],service:[3,6]};
  // 1024 × 1536 atlas. These are the alpha >= 180 bounds in row-major order
  // [x,y,width,height]. Row 0 shoes cross the nominal 384 px grid boundary,
  // so source rectangles must follow the artwork rather than the grid.
  const PLAYER_BOUNDS=[
    [55,19,190,369],[298,18,187,370],[538,18,189,370],[779,18,190,370],
    [54,397,188,362],[296,397,187,364],[539,397,188,365],[780,397,187,362],
    [54,772,188,366],[295,773,187,365],[540,772,188,366],[781,772,189,365],
    [54,1143,188,366],[295,1144,187,364],[540,1143,187,365],[781,1143,189,365]
  ];
  const PLAYER_ATLAS_FALLBACK={file:PLAYER_ATLAS_PATH,width:1024,height:1536,
    bounds:PLAYER_BOUNDS,draw:[37.5,78.5,9.5]};
  const atlasImages=new Map();
  function atlasImage(file) {
    if(file===PLAYER_ATLAS_PATH)return playerAtlas;
    let image=atlasImages.get(file);
    if(!image){image=imageFor(file);atlasImages.set(file,image);}
    return image;
  }
  function drawAtlas(ctx,x,y,mode,seconds,meta,beforeDraw,size=1) {
    if(!meta||typeof meta.file!=='string'||!Number.isInteger(meta.width)||!Number.isInteger(meta.height)
      ||!Array.isArray(meta.bounds)||meta.bounds.length!==16||!Array.isArray(meta.draw)||meta.draw.length!==3)return false;
    const image=atlasImage(meta.file);
    if(!ready(image)||image.naturalWidth!==meta.width||image.naturalHeight!==meta.height)return false;
    const [row,fps]=Object.prototype.hasOwnProperty.call(ACTIONS,mode)?ACTIONS[mode]:ACTIONS.idle;
    const time=Number.isFinite(seconds)?Math.max(0,seconds):0;
    // The supplied idle poses change silhouette and arm position noticeably.
    // Hold a stable pose while stationary; animated rows remain unchanged.
    const tick=time*fps,frame=row===0?0:Number.isFinite(tick)?Math.floor(tick)%4:0;
    const box=meta.bounds[row*4+frame],margin=2;
    if(!Array.isArray(box)||box.length!==4||!box.every(Number.isFinite))return false;
    const [left,top,width,height]=box,[baseW,baseH,baseFootY]=meta.draw;
    const drawW=baseW*size,drawH=baseH*size,footY=FOOT_Y+(baseFootY-FOOT_Y)*size;
    if(left<margin||top<margin||width<=0||height<=0||left+width+margin>meta.width
      ||top+height+margin>meta.height||!Number.isFinite(drawW)||!Number.isFinite(drawH)
      ||!Number.isFinite(footY)||drawW<=0||drawH<=0)return false;
    if(typeof beforeDraw==='function')beforeDraw();
    ctx.save();ctx.translate(x,y);
    // Metadata matches the occupied body inside the approved 58.5 × 87.75
    // static sprite box; no procedural shift is added to atlas frames.
    ctx.drawImage(image,left-margin,top-margin,width+2*margin,height+2*margin,
      -drawW/2+(Number.isFinite(meta.offsetX)?meta.offsetX*size:0),footY-drawH,drawW,drawH);
    ctx.restore();
    return true;
  }
  function pose(mode,seconds,phase=0) {
    const t = seconds + phase;
    let side = 0, lift = 0, lean = 0;
    if (mode === 'walk') {
      const step = Math.sin(t * 12);
      side = step * 1.1;
      lift = -Math.abs(step) * 1.6;
      lean = Math.sin(t * 6) * 0.025;
    } else if (mode === 'interact') {
      side = Math.sin(t * 5) * 0.55;
      lift = -0.5 - Math.sin(t * 5) * 0.35;
      lean = Math.sin(t * 5) * 0.012;
    } else if (mode === 'service') {
      side = Math.sin(t * 7) * 0.4;
      lift = -0.8 - Math.abs(Math.sin(t * 7)) * 0.55;
      lean = Math.sin(t * 7) * 0.02;
    } else {
      lift = -Math.sin(t * 2.2) * 0.45;
      lean = Math.sin(t * 1.6) * 0.006;
    }
    return {side,lift,lean};
  }
  function drawRearSprite(ctx,x,y,mode,seconds,meta,phase=0,beforeDraw,size=1) {
    if(!meta||typeof meta.file!=='string'||!Array.isArray(meta.bounds)||meta.bounds.length!==4
      ||!Array.isArray(meta.draw)||meta.draw.length!==3)return false;
    const image=atlasImage(meta.file);
    if(!ready(image)||image.naturalWidth!==meta.width||image.naturalHeight!==meta.height)return false;
    const [left,top,width,height]=meta.bounds,[baseW,baseH,baseFootY]=meta.draw,margin=2;
    const drawW=baseW*size,drawH=baseH*size,footY=FOOT_Y+(baseFootY-FOOT_Y)*size;
    if(!meta.bounds.every(Number.isFinite)||!meta.draw.every(Number.isFinite)
      ||left<margin||top<margin||width<=0||height<=0||left+width+margin>meta.width
      ||top+height+margin>meta.height||drawW<=0||drawH<=0)return false;
    const {side,lift,lean}=pose(mode,seconds,phase);
    if(typeof beforeDraw==='function')beforeDraw();
    ctx.save();ctx.translate(x+side,y+lift);ctx.rotate(lean);
    ctx.drawImage(image,left-margin,top-margin,width+2*margin,height+2*margin,
      -drawW/2+(Number.isFinite(meta.offsetX)?meta.offsetX*size:0),footY-drawH,drawW,drawH);
    ctx.restore();
    return true;
  }
  function drawSprite(ctx, image, x, y, mode = 'idle', seconds = 0, phase = 0, size = 1) {
    if (!ready(image)) return false;
    const {side,lift,lean}=pose(mode,seconds,phase);
    ctx.save();
    ctx.translate(x + side, y + lift);
    ctx.rotate(lean);
    // Keep the same source proportions and scale around the feet.
    const foot=FOOT_Y+(14-FOOT_Y)*size;
    ctx.drawImage(image, -WIDTH*size/2, foot-HEIGHT*size, WIDTH*size, HEIGHT*size);
    ctx.restore();
    return true;
  }
  // Returns 'rear' when the back view was painted, true for the front view
  // (also while rear art is still loading) and false when nothing was drawn.
  // beforeRear paints carried parcels only after a usable rear image is found.
  function drawPlayer(ctx, x, y, mode, seconds, facing='front', beforeRear) {
    const meta=globalThis.PptCharacterAtlases?.['uniform-a']||PLAYER_ATLAS_FALLBACK;
    if(facing==='rear'&&(drawAtlas(ctx,x,y,mode,seconds,meta.rearAtlas,beforeRear,ADULT_SCALE)
      ||drawRearSprite(ctx,x,y,mode,seconds,meta.rear,0,beforeRear,ADULT_SCALE)))return 'rear';
    const drawn=(facing!=='rear'&&drawAtlas(ctx,x,y,mode,seconds,meta,undefined,ADULT_SCALE))
      ||drawSprite(ctx,uniformWorkers[0],x,y,mode,seconds,0,ADULT_SCALE)
      ||drawSprite(ctx,oldWorker,x,y,mode,seconds,0,ADULT_SCALE);
    if(drawn&&facing!=='rear')drawCapRole(ctx,x,y,'player',ADULT_SCALE);
    return drawn;
  }
  function workerVariant(person) {
    const id=person?.id,n=Number(id==null?person?.n:id);
    if(Number.isFinite(n))return Math.abs(Math.trunc(n-(id==null?0:1)))%uniformWorkers.length;
    const key=String(id==null?person?.n??'':id);let hash=0;
    for(let i=0;i<key.length;i++)hash=(Math.imul(hash,31)+key.charCodeAt(i))|0;
    return Math.abs(hash)%uniformWorkers.length;
  }
  // Staff records store a roster-name index rather than gender. Use that
  // stable saved index; only the ambiguous Sasha uses the saved id as a tie.
  function femaleWorker(person) {
    if(typeof person?.female==='boolean')return person.female;
    const explicit=String(person?.gender??person?.sex??'').toLowerCase();
    if(['female','f','woman','женский','ж'].includes(explicit))return true;
    if(['male','m','man','мужской','м'].includes(explicit))return false;
    const n=Number(person?.n);
    if(!Number.isInteger(n)||person?.n==null)return false;
    if(n===15){const id=Number(person?.id);return Number.isInteger(id)&&id%2===0;}
    return [0,2,4,6,8,10,12,14,17,19].includes(n);
  }
  function drawCapRole(ctx,x,y,role,size=1) {
    const colors={player:'#8b3db5',cash:'#248f72',load:'#247bb1',sort:'#8651ad'};
    if(!colors[role])return;
    ctx.save();ctx.translate(x,y+FOOT_Y+(-58-FOOT_Y)*size);ctx.scale(size,size);
    // A small stitched badge follows the curvature of the cap instead of
    // covering most of it with an oversized sticker.
    ctx.fillStyle=colors[role];ctx.beginPath();ctx.arc(0,0,5.2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=.6;ctx.stroke();
    ctx.strokeStyle='#fff';ctx.fillStyle='#fff';ctx.lineWidth=1.05;
    if(role==='cash'){
      ctx.beginPath();ctx.arc(0,0,2.5,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(-1.3,0);ctx.lineTo(1.3,0);ctx.stroke();
    }else if(role==='load'){
      ctx.strokeRect(-2.3,-1.5,4.6,3.8);
      ctx.beginPath();ctx.moveTo(0,-3.8);ctx.lineTo(0,-1.5);ctx.moveTo(-1.5,-2.7);ctx.lineTo(0,-1.2);ctx.lineTo(1.5,-2.7);ctx.stroke();
    }else if(role==='sort'){
      for(const [bx,by] of [[-2.7,-2.7],[.4,-2.7],[-2.7,.4],[.4,.4]])ctx.fillRect(bx,by,2.3,2.3);
    }else{
      ctx.strokeRect(-2.3,-2.3,4.6,4.6);
      ctx.beginPath();ctx.moveTo(-2.3,-.8);ctx.lineTo(0,.8);ctx.lineTo(2.3,-.8);ctx.stroke();
    }
    ctx.restore();
  }
  // Returns 'rear' when the back view was painted, true for the front view
  // (also while rear art is still loading) and false when nothing was drawn.
  function drawWorker(ctx,x,y,person,role,motion,seconds,facing='front',beforeRear) {
    const variant=workerVariant(person),female=femaleWorker(person),vest=role==='load'||role==='sort';
    const key=(vest?'worker-hi-vis':'uniform')+(female?'-female':'')+'-'+String.fromCharCode(97+variant);
    const meta=globalThis.PptCharacterAtlases?.[key];
    const image=(role==='load'||role==='sort'
      ? female?femaleHiVisWorkers:hiVisWorkers
      : female?femaleUniformWorkers:uniformWorkers)[variant];
    if(facing==='rear'&&(drawAtlas(ctx,x,y,motion,seconds,meta?.rearAtlas,beforeRear,ADULT_SCALE)
      ||drawRearSprite(ctx,x,y,motion,seconds,meta?.rear,variant*.19,beforeRear,ADULT_SCALE)))return 'rear';
    const atlasDrawn=facing!=='rear'&&drawAtlas(ctx,x,y,motion,seconds,meta,undefined,ADULT_SCALE);
    if(!atlasDrawn&&!drawSprite(ctx,image,x,y,motion,seconds,variant*.19,ADULT_SCALE))return false;
    // Female action crops include the ponytail left of the cap, shifting the
    // crop's center about 4 world pixels away from the cap's actual center.
    if(facing!=='rear')drawCapRole(ctx,x+(atlasDrawn&&female?4*ADULT_SCALE:0),y,role,ADULT_SCALE);
    return true;
  }
  function drawLegacyCustomer(ctx, x, y, variant, vip, mode, seconds, facing, size=1) {
    const granny=vip==='granny',index=variant%customers.length;
    const key=granny?'grandma-idle':customerKeys[index],image=granny?grandma:customers[index];
    const meta=globalThis.PptCharacterAtlases?.[key];
    return (facing==='rear'&&(drawAtlas(ctx,x,y,mode,seconds,meta?.rearAtlas,undefined,size)
      ||drawRearSprite(ctx,x,y,mode,seconds,meta?.rear,variant*.37,undefined,size)))
      ||(facing!=='rear'&&drawAtlas(ctx,x,y,mode,seconds,meta,undefined,size))
      ||drawSprite(ctx,image,x,y,mode,seconds,variant*.37,size);
  }
  const VILLAGE_CUSTOMER_STYLES=['maya','redcap','photo-child-a','village-0','village-1','village-2','village-3',null,'photo-elder-man','photo-child-b','village-photo-elder-couple'];
  const TOWN_CUSTOMER_STYLES=['town-0','town-1','town-2','photo-woman-a','photo-young','ilya','photo-cap-man',null,'photo-woman-b','photo-woman-c'];
  const CITY_CUSTOMER_STYLES=['city-1','city-3','city-extra-0','city-extra-1','city-extra-2','city-extra-3','city-1',null,'city-3','city-extra-0'];
  const CITY_CENTER_CUSTOMER_STYLES=['city-center-0','city-center-1','city-center-2','city-center-3','city-center-0','city-center-1','city-center-2',null,'city-center-3','city-center-0'];
  const CAPITAL_OUTSKIRTS_CUSTOMER_STYLES=['capital-0','capital-1','capital-2','capital-3','capital-0','capital-1','capital-2',null,'capital-3','capital-0'];
  const CAPITAL_CENTER_CUSTOMER_STYLES=['capital-center-0','capital-center-1','capital-center-2','capital-center-3','capital-center-0','capital-center-1','capital-center-2',null,'capital-center-3','capital-center-0'];
  const CUSTOMER_IDENTITIES=Object.freeze({anna:'anna',maya:'maya',redcap:'redcap',ilya:'ilya',
    'photo-elder-man':'alex','photo-young':'vlad','photo-cap-man':'serge',
    'photo-child-a':'andrey','photo-child-b':'andrey','photo-woman-a':'mary','photo-woman-b':'mary','photo-woman-c':'mary','city-blogger':'blogger',
    'village-photo-elder-couple':'village-photo-elder-couple'});
  // This same stable key is used for rendering and for reserving an identity
  // when a new customer enters, with no additional random draws or save fields.
  function customerVisualKey(variant,vip,chapter){
    if(!chapter)return null;
    if(chapter==='village'){
      if(vip==='granny')return variant===7?'village-granny-fallback':'anna';
      return VILLAGE_CUSTOMER_STYLES[variant]||'maya';
    }
    if(chapter==='town'){
      if(vip==='granny')return 'town-elder';
      return TOWN_CUSTOMER_STYLES[variant]||'town-0';
    }
    if(chapter==='city'){
      if(vip==='blogger')return 'city-blogger';
      if(vip==='granny')return 'city-elder';
      return CITY_CUSTOMER_STYLES[variant]||'city-1';
    }
    if(chapter==='city-center')return CITY_CENTER_CUSTOMER_STYLES[variant]||'city-center-0';
    if(chapter==='capital-outskirts')return CAPITAL_OUTSKIRTS_CUSTOMER_STYLES[variant]||'capital-0';
    if(chapter==='capital-center')return CAPITAL_CENTER_CUSTOMER_STYLES[variant]||'capital-center-0';
    return 'unknown-chapter';
  }
  function customerIdentityKey(key){
    return Object.prototype.hasOwnProperty.call(CUSTOMER_IDENTITIES,key)?CUSTOMER_IDENTITIES[key]:null;
  }
  const CHILD_VISUALS=new Set(['maya','redcap','photo-child-a','photo-child-b','photo-young']);
  // Legacy free play also renders the first two legacy sprite variants as
  // children; the bearded variant and every granny are adults.
  function customerScale(variant,vip,chapter){
    const key=customerVisualKey(variant,vip,chapter);
    if(key===null)return vip==='granny'||variant%customers.length===2?ADULT_SCALE:1;
    return CHILD_VISUALS.has(key)?1:ADULT_SCALE;
  }
  function drawCustomer(ctx,x,y,variant,vip,mode,seconds,facing='front',chapter=null){
    // A story location is no longer visible after a move. Releasing its lazy
    // walk sheets prevents decoded animation art accumulating across chapters.
    // Both capital districts are rendered together in the same network frame.
    // They must share the chapter cache; clearing it on each district switch
    // recreates Images before their asynchronous loads can finish.
    const cacheChapter=chapter==='capital-outskirts'||chapter==='capital-center'?'capital':chapter;
    if(cacheChapter!==walkChapter){walkVisitorImages.clear();walkChapter=cacheChapter;}
    const key=customerVisualKey(variant,vip,chapter),size=customerScale(variant,vip,chapter);
    if(mode==='walk'&&drawLocalWalk(ctx,x,y,seconds,variant,facing,key,key==='photo-child-a'||key==='photo-child-b',size))return true;
    if(key===null)return drawLegacyCustomer(ctx,x,y,variant,vip,mode,seconds,facing,size);
    if(key==='anna')return drawLegacyCustomer(ctx,x,y,0,'granny',mode,seconds,facing,size);
    if(key==='maya')return drawLegacyCustomer(ctx,x,y,0,null,mode,seconds,facing,size);
    if(key==='redcap')return drawLegacyCustomer(ctx,x,y,1,null,mode,seconds,facing,size);
    if(key==='ilya')return drawLegacyCustomer(ctx,x,y,2,null,mode,seconds,facing,size);
    const local=(spec,index,child=false)=>drawLocalVisitor(ctx,x,y,mode,seconds,variant,facing,spec,index,child,size);
    if(key==='photo-child-a')return local(PHOTO_VISITORS,0,true);
    if(key==='photo-child-b')return local(PHOTO_OUTFITS,0,true);
    if(key==='photo-woman-a')return local(PHOTO_VISITORS,1);
    if(key==='photo-woman-b')return local(PHOTO_OUTFITS,1);
    if(key==='photo-woman-c')return local(PHOTO_OUTFITS,2);
    if(key==='photo-young')return local(PHOTO_VISITORS,2);
    if(key==='photo-elder-man')return local(MORE_PHOTO_VISITORS,0);
    if(key==='photo-cap-man')return local(MORE_PHOTO_VISITORS,1);
    if(key==='village-photo-elder-couple')return local(VILLAGE_ELDER_COUPLE,0);
    if(key==='town-elder')return local(TOWN_VISITORS,3);
    if(key==='village-granny-fallback')return local(VILLAGE_ELDER,0);
    if(key==='city-blogger')return local(CITY_VISITORS,0);
    if(key==='city-elder')return local(CITY_VISITORS,2);
    if(key==='city-1'||key==='city-3')return local(CITY_VISITORS,Number(key.slice(-1)));
    if(key.startsWith('city-extra-'))return local(CITY_EXTRA_VISITORS,Number(key.slice(-1)));
    if(/^city-center-[0-3]$/.test(key))return local(CITY_CENTER_VISITORS,Number(key.slice(-1)));
    if(/^capital-[0-3]$/.test(key))return local(CAPITAL_OUTSKIRTS_VISITORS,Number(key.slice(-1)));
    if(/^capital-center-[0-3]$/.test(key))return local(CAPITAL_CENTER_VISITORS,Number(key.slice(-1)));
    if(key.startsWith('town-'))return local(TOWN_VISITORS,Number(key.slice(-1)));
    if(key.startsWith('village-')&&key.length===9)return local(VILLAGE_VISITORS,Number(key.slice(-1)));
    return false;
  }
  return { drawPlayer, drawWorker, drawCustomer, customerVisualKey, customerIdentityKey, customerScale, adultScale:ADULT_SCALE, supportsRearCarryHook:true };
})();
