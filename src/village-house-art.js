// Paints the five independently purchased parts of an owned village house.
globalThis.PptVillageHouseArt=(()=>{
  'use strict';
  const styles=['before','diy','cozy','office','barn','garden'];
  const plates={
    linden: {
      yard: [
        'assets/village-houses/linden-before.webp',
        'assets/village-houses/linden-diy.webp',
        'assets/village-houses/linden-cozy.webp',
        'assets/village-houses/linden-office.webp',
        'assets/village-houses/linden-barn.webp',
        'assets/village-houses/linden-garden.webp'
      ],
      roof: [
        'assets/village-houses/linden-roof-before.webp',
        'assets/village-houses/linden-roof-diy.webp',
        'assets/village-houses/linden-roof-cozy.webp',
        'assets/village-houses/linden-roof-office.webp',
        'assets/village-houses/linden-roof-barn.webp',
        'assets/village-houses/linden-roof-garden.webp'
      ],
      wall: [
        'assets/village-houses/linden-wall-before.webp',
        'assets/village-houses/linden-wall-diy.webp',
        'assets/village-houses/linden-wall-cozy.webp',
        'assets/village-houses/linden-wall-office.webp',
        'assets/village-houses/linden-wall-barn.webp',
        'assets/village-houses/linden-wall-garden.webp'
      ],
      floor: [
        'assets/village-houses/linden-floor-before.webp',
        'assets/village-houses/linden-floor-diy.webp',
        'assets/village-houses/linden-floor-cozy.webp',
        'assets/village-houses/linden-floor-office.webp',
        'assets/village-houses/linden-floor-barn.webp',
        'assets/village-houses/linden-floor-garden.webp'
      ],
      solar:'assets/village-houses/linden-solar.webp'
    },
    bakery: {
      yard: [
        'assets/village-houses/bakery-before.webp',
        'assets/village-houses/bakery-diy.webp',
        'assets/village-houses/bakery-cozy.webp',
        'assets/village-houses/bakery-office.webp',
        'assets/village-houses/bakery-barn.webp',
        'assets/village-houses/bakery-garden.webp'
      ],
      roof: [
        'assets/village-houses/bakery-roof-before.webp',
        'assets/village-houses/bakery-roof-diy.webp',
        'assets/village-houses/bakery-roof-cozy.webp',
        'assets/village-houses/bakery-roof-office.webp',
        'assets/village-houses/bakery-roof-barn.webp',
        'assets/village-houses/bakery-roof-garden.webp'
      ],
      wall: [
        'assets/village-houses/bakery-wall-before.webp',
        'assets/village-houses/bakery-wall-diy.webp',
        'assets/village-houses/bakery-wall-cozy.webp',
        'assets/village-houses/bakery-wall-office.webp',
        'assets/village-houses/bakery-wall-barn.webp',
        'assets/village-houses/bakery-wall-garden.webp'
      ],
      floor: [
        'assets/village-houses/bakery-floor-before.webp',
        'assets/village-houses/bakery-floor-diy.webp',
        'assets/village-houses/bakery-floor-cozy.webp',
        'assets/village-houses/bakery-floor-office.webp',
        'assets/village-houses/bakery-floor-barn.webp',
        'assets/village-houses/bakery-floor-garden.webp'
      ],
      solar:'assets/village-houses/bakery-solar.webp'
    },
    station: {
      yard: [
        'assets/village-houses/station-before.webp',
        'assets/village-houses/station-diy.webp',
        'assets/village-houses/station-cozy.webp',
        'assets/village-houses/station-office.webp',
        'assets/village-houses/station-barn.webp',
        'assets/village-houses/station-garden.webp'
      ],
      roof: [
        'assets/village-houses/station-roof-before.webp',
        'assets/village-houses/station-roof-diy.webp',
        'assets/village-houses/station-roof-cozy.webp',
        'assets/village-houses/station-roof-office.webp',
        'assets/village-houses/station-roof-barn.webp',
        'assets/village-houses/station-roof-garden.webp'
      ],
      wall: [
        'assets/village-houses/station-wall-before.webp',
        'assets/village-houses/station-wall-diy.webp',
        'assets/village-houses/station-wall-cozy.webp',
        'assets/village-houses/station-wall-office.webp',
        'assets/village-houses/station-wall-barn.webp',
        'assets/village-houses/station-wall-garden.webp'
      ],
      floor: [
        'assets/village-houses/station-floor-before.webp',
        'assets/village-houses/station-floor-diy.webp',
        'assets/village-houses/station-floor-cozy.webp',
        'assets/village-houses/station-floor-office.webp',
        'assets/village-houses/station-floor-barn.webp',
        'assets/village-houses/station-floor-garden.webp'
      ],
      solar:'assets/village-houses/station-solar.webp'
    }
  };
  const light=[null,
    'assets/village-houses/light-diy.webp',
    'assets/village-houses/light-cozy.webp',
    'assets/village-houses/light-office.webp',
    'assets/village-houses/light-barn.webp',
    'assets/village-houses/light-garden.webp'
  ];
  const layers=['roof','wall','floor','light','yard'];
  const pictures=new Map();
  function levelStyle(style){return Math.max(0,styles.indexOf(style));}
  function preview(house,level,style){
    if(!Object.hasOwn(plates,house)||!Number.isInteger(level)||level<0||level>4)return '';
    const i=levelStyle(style);
    return level===3?light[i]||plates[house].wall[0]:plates[house][layers[level]][i];
  }
  function thumbnail(house){return Object.hasOwn(plates,house)?plates[house].yard[0]:'';}
  function picture(path){
    let p=pictures.get(path);
    if(!p){
      if(!path||typeof Image!=='function')return null;
      p=new Image();pictures.set(path,p);p.src=path;
    }
    return p.complete&&p.naturalWidth?p:null;
  }
  function sourcesFor(home){
    const sources=layers.map((_,i)=>preview(home.house,i,home.choices[i]));
    const windows=windowDonor(home);
    if(windows)sources.push(windows);
    if(home.choices[0]&&!home.choices[4]&&home.house!=='linden')sources.push(preview(home.house,4,'diy'));
    if(home.choices[0]==='barn'){
      sources.push(preview(home.house,0,'cozy'));
      if(home.house!=='station')sources.push(preview(home.house,4,'cozy'));
    }
    if(home.choices[4]==='barn'&&home.house!=='station')sources.push(preview(home.house,4,home.house==='linden'?'cozy':'diy'));
    if(home.choices[3]==='garden')sources.push(plates[home.house].solar);
    return sources;
  }
  function ready(home){
    return !!home&&Object.hasOwn(plates,home.house)&&sourcesFor(home).map(picture).every(Boolean);
  }
  async function loadPicture(path){
    if(picture(path))return;
    const img=pictures.get(path);
    try{await img.decode();}
    catch(error){if(pictures.get(path)===img)pictures.delete(path);throw error;}
  }
  function load(home){
    return Promise.all([...new Set(sourcesFor(home))].map(loadPicture));
  }
  const solarBounds={
    linden:[.415278,.281944,.584722,.363889],
    bakery:[.700000,.406944,.848611,.479167],
    station:[.704167,.365278,.813889,.426389]
  };
  const lampSites={
    linden:{pendants:[170,280],radio:[304,91],barn:[134,222],garden:[304,28],sign:[314,107]},
    bakery:{pendants:[25,335],radio:[302,59],barn:[122,266],garden:[306,47],sign:[304,94]},
    station:{pendants:[58,335],radio:[306,69],barn:[125,249],garden:[306,48],sign:[304,94]}
  };
  const timerSites={
    linden:{centers:[.370,.457,.543,.630],cy:.627,font:12},
    bakery:{centers:[.770,.813,.856,.899],cy:.528,font:8.5},
    station:{centers:[.793,.839,.885,.931],cy:.580,font:8.5}
  };
  function indicators(ctx,house,runtime,comfort){
    const timer=timerSites[house],cy=timer.cy;
    let centers=timer.centers,font=timer.font;
    if(runtime?.q.length===5){
      const gap=centers[1]-centers[0],left=centers[0]-gap*.49,width=gap*3.98;
      centers=Array.from({length:5},(_,i)=>left+width*(i+.5)/5);
      ctx.fillStyle='#515749';ctx.fillRect(left*360,cy*120-9,width*360,18);
      ctx.fillStyle='#26312b';for(const x of centers)ctx.fillRect(x*360-width*36+1,cy*120-7.8,width*72-2,15.6);
      font=Math.min(font,width*360/5*.7);
    }else if(house==='station'){
      ctx.fillStyle='#4e554a';ctx.fillRect(278,58,65,24);
      ctx.fillStyle='#252f2b';for(const x of centers)ctx.fillRect(x*360-7,cy*120-8,14,16);
    }
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+font+'px sans-serif';ctx.fillStyle='#fff2c6';
    centers.forEach((x,i)=>{
      const first=runtime?.q[i]?.[0];
      ctx.fillText(first?String(Math.max(0,Math.ceil(first.pt/comfort))):'–',x*360,cy*120);
    });
  }
  function circle(ctx,x,y,r,color){
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }
  function paintLights(ctx,home,runtime){
    const wall=home.choices[1],lights=home.choices[3];
    const site=lampSites[home.house];
    if(!lights){
      if(!wall&&home.house!=='station')return;
      ctx.fillStyle='#53483b';ctx.fillRect(296,0,1.25,30);ctx.fillRect(294.4,28,4.5,4);
      circle(ctx,296.5,35,3.8,'#f8db9a');return;
    }
    const atlas=picture(light[levelStyle(lights)]);
    if(!atlas)return;
    const scale=atlas.naturalWidth/2172;
    function part(l,t,r,b,x,y,w,h){
      ctx.drawImage(atlas,l*scale,t*scale,(r-l)*scale,(b-t)*scale,x,y,w,h);
    }
    if(lights==='diy'){
      ctx.strokeStyle='#594735';ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(24,21);ctx.lineTo(24,6);ctx.lineTo(331,6);ctx.stroke();
      part(8,181,230,440,19,18,11,13);
      [416,644,875,1108,1331,1567,1801,2045].forEach((c,i)=>{
        const x=47+i*39;
        part(c-35,181,c+35,258,x-1.6,4,3.2,3.5);
        part(c-100,272,c+100,582,x-4.4,6,8.8,14);
      });
    }else if(lights==='cozy'){
      site.pendants.forEach((x,i)=>part(i?780:6,8,i?1545:770,705,x-13,5,26,24));
      const x=site.radio[0];
      const y=wall==='office'&&home.house!=='linden'?98:site.radio[1];
      if(wall!=='cozy'){
        ctx.fillStyle='#594539';ctx.fillRect(x-17,y,34,3);ctx.fillRect(x-13,y+3,3,4);ctx.fillRect(x+10,y+3,3,4);
      }
      part(1582,263,2124,594,x-12.5,y-15.3,25,15.3);
    }else if(lights==='office'){
      for(const x of [25,330]){
        part(340,60,466,274,x-13,3,2.6,5);part(1700,60,1828,274,x+10.5,3,2.6,5);
        part(75,272,2098,362,x-14,8,28,3);
      }
      const [x,y]=site.sign;
      part(540,420,1637,659,x-20,y-4.5,40,9);
      const called=Number.isInteger(runtime?.houseCalledWindow)?runtime.houseCalledWindow:runtime?.q.findIndex(q=>q[0]?.prime);
      ctx.fillStyle='#ffd180';ctx.font='bold 8px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(called>=0?String(called+1):'–',x,y);
    }else if(lights==='barn'){
      for(const x of site.barn){
        part(110,88,185,242,x-2,3,4,8);part(436,143,606,286,x-4,9,8,7);
        part(100,270,940,652,x-16,15,32,14.5);
      }
    }else if(lights==='garden'){
      const x=site.garden[0],y=wall==='office'&&home.house!=='linden'?25:site.garden[1];
      ctx.strokeStyle='#625849';ctx.lineWidth=.8;ctx.beginPath();
      ctx.moveTo(x-5,0);ctx.lineTo(x-5,y-10);ctx.lineTo(x,y-10);ctx.stroke();
      ctx.beginPath();ctx.moveTo(x+8,y-4);ctx.lineTo(x+16,y-4);ctx.lineTo(x+16,y+3);ctx.lineTo(x+23,y+3);ctx.stroke();
      part(1080,330,1340,549,x+23,y-1,9,7.6);part(1580,26,2138,672,x-12,y-14,24,28);
    }
  }
  function paintWall(ctx,home,top,height,runtime,comfort){
    const wall=picture(preview(home.house,1,home.choices[1]));
    ctx.save();ctx.translate(0,top);ctx.scale(1,height/120);
    if(wall)ctx.drawImage(wall,0,0,360,120);
    if(home.choices[1]==='office')indicators(ctx,home.house,runtime,comfort);
    paintLights(ctx,home,runtime);
    ctx.restore();
  }
  function room(ctx,home,extension,runtime,comfort){
    const wallHeight=Math.min(120,extension-5);
    const floor=picture(preview(home.house,2,home.choices[2]));
    if(floor)ctx.drawImage(floor,0,-5,360,528);
    paintWall(ctx,home,-5-wallHeight,wallHeight,runtime,comfort);
    if(runtime && runtime.houseFaultUntil>runtime.clock){
      ctx.fillStyle='rgba(32,36,43,.44)';ctx.fillRect(0,-5-wallHeight,360,528+wallHeight);
    }
    ctx.fillStyle='#755235';ctx.fillRect(0,44,4,35);
    ctx.fillStyle='#d2ab76';ctx.fillRect(1,50,2,23);
  }
  // This crop removes only the stretched sky margin of the square source.
  // The full horizontal span, the ridge, the entrance and yard stay in shot.
  const photoTop=41,exteriorHeight=315;
  function installationHeight(level){return level===1||level===5?exteriorHeight:480;}
  function installationView(ctx,home,level,hoistProgress=1){
    const scene=housePainting(home);
    if(!scene)return;
    // Interior art includes transparent trim. Back it with shaded wood,
    // including the fractional seam between the three sources on cards.
    ctx.fillStyle='#695343';ctx.fillRect(0,0,360,installationHeight(level));
    ctx.save();ctx.beginPath();ctx.rect(0,0,360,exteriorHeight);ctx.clip();
    ctx.drawImage(scene,0,-photoTop,360,360);
    ctx.restore();
    drawInstallationHoist(ctx,home,hoistProgress);
    if(installationHeight(level)===exteriorHeight)return;
    const wall=level===3?65:113;
    paintWall(ctx,home,exteriorHeight,wall,null,1);
    const top=exteriorHeight+wall,height=480-top;
    const floor=picture(preview(home.house,2,home.choices[2]));
    if(floor){
      const sourceHeight=Math.min(floor.naturalHeight,height/360*floor.naturalWidth*(level===3?1.32:1));
      const y=home.choices[2]==='barn'?floor.naturalHeight-sourceHeight:0;
      ctx.drawImage(floor,0,y,floor.naturalWidth,sourceHeight,0,top,360,height);
    }
  }
  async function paintRepairCard(canvas,home,level){
    await Promise.allSettled([...new Set(sourcesFor(home))].map(loadPicture));
    if(!canvas.isConnected)return;
    const ctx=canvas.getContext('2d');
    ctx.save();ctx.scale(canvas.width/360,canvas.width/360);
    installationView(ctx,home,level);
    ctx.restore();
    if(picture(preview(home.house,4,home.choices[4])))canvas.dataset.ready='true';
  }
  const repairedWindows={
    linden:[[.105,.44,.487,.22]],
    bakery:[[.10,.435,.197,.234]],
    station:[[.110,.465,.122,.145],[.797,.494,.11,.126]]
  };
  function windowDonor(home){
    if(!home.choices[1])return '';
    // After the yard work the linden and bakery fronts keep the same window
    // openings, so the windows chosen at repair II stay. The finished railway
    // plates frame the windows differently and keep their own.
    if(home.choices[4]&&(home.house==='station'||home.choices[4]===home.choices[1]))return '';
    // The later railway yards move the entire front gable. Its original
    // frame matches the early restoration plate until that work is done.
    const style=home.house==='station'?'diy':home.choices[1];
    return preview(home.house,4,style);
  }
  function featheredDetail(ctx,donor,[x,y,w,h],source=[x,y,w,h],mirror=false){
    const stamp=document.createElement('canvas');
    stamp.width=Math.ceil(w*donor.naturalWidth);stamp.height=Math.ceil(h*donor.naturalHeight);
    const c=stamp.getContext('2d'),iw=stamp.width,ih=stamp.height;
    const [sx,sy,sw,sh]=source;
    c.save();
    if(mirror){c.translate(iw,0);c.scale(-1,1);}
    c.drawImage(donor,sx*donor.naturalWidth,sy*donor.naturalHeight,sw*donor.naturalWidth,sh*donor.naturalHeight,0,0,iw,ih);
    c.restore();
    c.globalCompositeOperation='destination-in';c.filter='blur(2px)';c.fillStyle='#fff';c.fillRect(3,3,iw-6,ih-6);
    ctx.drawImage(stamp,x,y,w,h);
  }
  const villageLandscape='assets/campaign/wallpaper-village.jpg';
  // The original roof masks end above the low eave. Cover the remaining
  // broken rafters of the purchased bakery and track keeper's house.
  const underEaves={
    bakery:[[.535,.430],[.968,.488],[.993,.513],[.992,.552],[.960,.562],[.651,.551],[.623,.524],[.545,.51]],
    station:[[.30,.369],[.892,.418],[.964,.469],[.966,.511],[.908,.516],[.364,.468],[.308,.447]]
  };
  function paintEaves(ctx,home){
    const eave=underEaves[home.house];
    if(!eave||!home.choices[0]||home.choices[4])return;
    const closed=picture(preview(home.house,4,'diy'));
    if(!closed)return;
    ctx.save();ctx.beginPath();
    for(const [x,y] of eave)ctx.lineTo(x,y);
    ctx.closePath();ctx.clip();ctx.drawImage(closed,0,0,1,1);ctx.restore();
  }
  const lindenJib=[.640,.232,.232,.214];
  function clearYardRig(ctx,home,yard){
    if(home.choices[4]!=='barn')return;
    const donor=home.house!=='station'&&picture(preview(home.house,4,home.house==='linden'?'cozy':'diy'));
    if(home.house!=='station'&&!donor)return;
    if(home.house==='linden'){
      featheredDetail(ctx,donor,lindenJib);
    }else if(home.house==='bakery'){
      // Keep the pair of timber loading doors. The original chain, its
      // pulley and suspended crate are painted across the right-hand leaf.
      featheredDetail(ctx,donor,[.773,.474,.171,.082]);
      featheredDetail(ctx,yard,[.772,.536,.133,.211],[.644,.536,.127,.211],true);
    }else{
      // Neighbouring timber above the railway freight door and shelving
      // behind it replace the old central block and dangling chain.
      featheredDetail(ctx,yard,[.605,.523,.065,.045],[.535,.523,.061,.045]);
      featheredDetail(ctx,yard,[.613,.552,.050,.119],[.553,.552,.047,.119]);
    }
  }
  const cleanRoofPlates=new WeakMap();
  function roofPlate(home){
    const roof=picture(preview(home.house,0,home.choices[0]));
    if(!roof||home.choices[0]!=='barn')return roof;
    const cached=cleanRoofPlates.get(roof);
    if(cached)return cached;
    const regular=picture(preview(home.house,0,'cozy')),donor=home.house!=='station'&&picture(preview(home.house,4,'cozy'));
    if(!regular||(home.house!=='station'&&!donor))return null;
    const plate=document.createElement('canvas');
    plate.width=roof.naturalWidth;plate.height=roof.naturalHeight;
    const c=plate.getContext('2d');c.scale(plate.width,plate.height);
    c.drawImage(roof,0,0,1,1);
    // Bulky parts baked into the roof plate lie below the normal eave:
    // chains, hooks, hanging parcels, and a fragment of the station sign.
    // First re-tile the smaller section of beam that crosses the roof plane.
    if(home.house==='linden')featheredDetail(c,donor,lindenJib);
    if(home.house==='bakery')featheredDetail(c,donor,[.768,.466,.182,.069]);
    c.globalCompositeOperation='destination-in';c.drawImage(regular,0,0,1,1);
    cleanRoofPlates.set(roof,plate);
    return plate;
  }
  // The landscape behind each exterior is cut back to the roof line on wide
  // shots. Keep the chimney, tree at the linden house and ground beneath the
  // porch; let the village road continue naturally towards the speaker.
  const yardOutline={
    linden:[[0,.53],[.04,.36],[.06,.25],[.12,.17],[.29,.12],[.36,.16],[.34,.22],[.37,.22],[.55,.28],[.56,.228],[.66,.226],[.66,.299],[.91,.365],[1,.46],[1,.64],[.976,.78],[.96,.90],[.79,.98],[.29,.99],[.05,.87],[0,.73]],
    bakery:[[.006,.47],[.202,.235],[.503,.303],[.507,.215],[.584,.214],[.596,.315],[.89,.423],[.998,.519],[.995,.66],[.965,.84],[.88,.945],[.23,.995],[.028,.903],[.001,.65]],
    station:[[.026,.45],[.188,.231],[.553,.296],[.563,.235],[.641,.24],[.641,.318],[.883,.396],[.97,.469],[.982,.57],[.964,.77],[.888,.908],[.251,.991],[.017,.90],[.006,.698]]
  };
  function housePainting(home){
    const base=picture(preview(home.house,4,home.choices[4]));
    if(!base)return null;
    const scene=document.createElement('canvas');scene.width=base.naturalWidth;scene.height=base.naturalHeight;
    const ctx=scene.getContext('2d');ctx.scale(scene.width,scene.height);
    ctx.drawImage(base,0,0,1,1);
    clearYardRig(ctx,home,base);
    paintEaves(ctx,home);
    const windows=windowDonor(home);
    const donor=windows&&picture(windows);
    if(donor)for(const rect of repairedWindows[home.house])featheredDetail(ctx,donor,rect);
    // The street front keeps its own windows. Interior repairs (walls, floor,
    // lights) are shown only in the room below the exterior, never as a cut-out.
    const roof=roofPlate(home);
    if(roof)ctx.drawImage(roof,0,0,1,1);
    if(home.choices[3]==='garden'){
      const panel=picture(plates[home.house].solar),[x,y,r,b]=solarBounds[home.house];
      if(panel)ctx.drawImage(panel,x,y,r-x,b-y);
    }
    return scene;
  }
  const hoistMounts={linden:[265,160],bakery:[267,177],station:[270,162]};
  // A braced timber jib with steel shoes, a blue-grey iron sheave, linked
  // chains and an open hook. Coordinates are in the 360-unit exterior.
  function drawHoist(c,home,progress){
    if(home.choices[0]!=='barn'||progress<=0)return;
    const [x,y]=hoistMounts[home.house];
    const rig=Math.min(1,progress*2.25),drop=Math.min(1,Math.max(0,(progress-.37)/.63));
    c.save();c.translate(x,y);
    c.globalAlpha=rig;
    c.translate(0,9*(1-rig));c.rotate((1-rig)*.12);
    function path(points,fill,edge='#3b2c21',weight=1.5){
      c.beginPath();c.moveTo(points[0],points[1]);
      for(let i=2;i<points.length;i+=2)c.lineTo(points[i],points[i+1]);
      c.closePath();c.fillStyle=fill;c.fill();
      c.strokeStyle=edge;c.lineWidth=weight;c.stroke();
    }
    function line(x1,y1,x2,y2,color,width){
      c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();
    }
    c.lineJoin='round';c.lineCap='round';
    // Distinct light, bevel and shaded faces keep the arm legible against a
    // dark barn or a bright brick gable at thumbnail size.
    path([-4,-8,4,-9,4,43,-4,45],'#996333');
    path([4,-9,8,-7,8,40,4,43],'#624427');
    path([2,29,42,-5,48,-5,4,37],'#be965e');
    line(6,28,40,-1,'#e5c28b',1.15);
    path([-8,-10,58,-16,63,-13,-4,-6],'#ddbc85');
    path([-4,-6,63,-13,63,-5,-4,2],'#a26c3b');
    line(5,-4,54,-9,'#d1a26c',.85);
    line(7,-2,52,-7,'#674a32',.65);
    for(const height of [4,35]){
      path([-5,height,8,height-2,8,height+3,-5,height+5],'#555954','#343833',.8);
      circle(c,0,height+2,1.35,'#c4b79b');
    }
    path([48,-15,55,-16,55,-5,49,-4],'#69716a','#383c38',.9);
    if(drop>0){
      const end=8+50*drop;
      // The return falls in a loop beside the shorter load chain.
      c.strokeStyle='#333d3d';c.lineWidth=1.9;
      c.beginPath();c.moveTo(47,1);c.lineTo(42,5+26*drop);c.bezierCurveTo(41,12+26*drop,46,12+26*drop,46,5+26*drop);
      c.lineTo(50,2);c.stroke();
      for(let cy=3;cy<end;cy+=3.1){
        c.beginPath();c.ellipse(53,cy,1.4,2.2,-.15,0,Math.PI*2);
        c.strokeStyle='#303738';c.lineWidth=1.1;c.stroke();
        line(52,cy-.7,52,cy+.65,'#d7ccaf',.8);
      }
      path([49,end-2,56,end-2,56,end+2,49,end+3],'#b79048','#53432d',.8);
      c.beginPath();c.moveTo(53,end+2);c.bezierCurveTo(53,end+7,47,end+6,47,end+12);
      c.bezierCurveTo(47,end+18,56,end+19,58,end+10);
      c.strokeStyle='#353e3c';c.lineWidth=4.4;c.stroke();
      c.strokeStyle='#ceba90';c.lineWidth=1.65;c.stroke();
    }
    line(52,-6,52,1,'#353a37',3.2);
    circle(c,52,2,6,'#393d37');circle(c,52,2,4.7,'#77796e');circle(c,52,2,2.3,'#a9864d');circle(c,51.6,1.5,1.15,'#eacb85');
    c.restore();
  }
  function drawInstallationHoist(ctx,home,progress=1){
    ctx.save();ctx.translate(0,-photoTop);drawHoist(ctx,home,progress);ctx.restore();
  }
  function mountDialogue(canvas,home){
    if(!canvas||!home||!Object.hasOwn(plates,home.house)||!Array.isArray(home.choices))return;
    let observer=null,disposed=false,complete=false,scene=null;
    function draw(){
      if(disposed||!canvas.isConnected||!scene)return;
      const w=canvas.clientWidth,h=canvas.clientHeight;
      if(!w||!h)return;
      const dpr=Math.min(window.devicePixelRatio||1,2,2200/Math.max(w,h));
      canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));
      const ctx=canvas.getContext('2d');ctx.scale(canvas.width/w,canvas.height/h);
      const landscape=picture(villageLandscape);
      // Extend only the distant fields and village road. The other shops at
      // the edges of the landscape never appear behind the purchased house.
      ctx.fillStyle='#bbac7a';ctx.fillRect(0,0,w,h);
      if(landscape){
        const iw=landscape.naturalWidth,ih=landscape.naturalHeight;
        const sw=iw*.397,sh=Math.min(ih,sw*h/w);
        const sy=Math.max(0,Math.min(ih-sh,ih*.40-sh*.42));
        ctx.drawImage(landscape,iw*.296,sy,sw,sh,0,0,w,h);
      }
      const size=Math.min(w*1.10,h*1.42);
      const wide=w/h>1.45;
      const left=wide?(w-size)*.80:(w-size)/2;
      const top=wide?-size*.155:Math.min(-size*.103,h*.43-size*.50);
      // Keep the feature itself sharp while feathering its environment into
      // the hills. On portrait screens the roof sits above the speaker.
      const mask=document.createElement('canvas');mask.width=scene.width;mask.height=scene.height;
      const m=mask.getContext('2d');m.drawImage(scene,0,0);
      m.globalCompositeOperation='destination-in';
      if(wide){
        const shape=document.createElement('canvas');shape.width=mask.width;shape.height=mask.height;
        const cut=shape.getContext('2d');cut.filter='blur(5px)';cut.fillStyle='#fff';cut.beginPath();
        for(const [x,y] of yardOutline[home.house])cut.lineTo(x*shape.width,y*shape.height);
        cut.closePath();cut.fill();
        m.drawImage(shape,0,0);
        const edge=m.createLinearGradient(0,0,mask.width,0);
        edge.addColorStop(0,'transparent');edge.addColorStop(.045,'#fff');
        edge.addColorStop(.957,'#fff');edge.addColorStop(1,'transparent');
        m.fillStyle=edge;m.fillRect(0,0,mask.width,mask.height);
      }
      if(top+size<h){
        const edge=m.createLinearGradient(0,mask.height*.86,0,mask.height);
        edge.addColorStop(0,'#fff');edge.addColorStop(1,'transparent');
        m.fillStyle=edge;m.fillRect(0,0,mask.width,mask.height);
      }
      ctx.drawImage(mask,left,top,size,size);
      if(complete)canvas.dataset.ready='true';
    }
    const sources=[...new Set([...sourcesFor(home),villageLandscape])];
    function repaint(){
      if(disposed||!canvas.isConnected)return;
      scene=housePainting(home);
      if(scene&&home.choices[0]==='barn'){
        const c=scene.getContext('2d');c.save();c.setTransform(scene.width/360,0,0,scene.height/360,0,0);
        drawHoist(c,home,1);c.restore();
      }
      draw();
    }
    const pending=sources.filter(path=>!picture(path));
    complete=!pending.length;repaint();
    if(pending.length)Promise.allSettled(pending.map(loadPicture)).then(()=>{
      complete=true;repaint();
    });
    observer=new ResizeObserver(draw);observer.observe(canvas);
    return ()=>{disposed=true;observer.disconnect();};
  }
  function counter(ctx,home,y,h,wins){
    if(home.choices[3]!=='barn')return;
    const first=Math.floor((wins-2)/2),cx=(first+.5)*360/wins,dx=360/wins;
    const lip=y+h-5;
    ctx.save();ctx.lineCap='round';ctx.strokeStyle='#725b3d';ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(cx-13,lip);ctx.lineTo(cx+dx+13,lip);ctx.stroke();
    ctx.strokeStyle='#e3ba75';ctx.lineWidth=.8;ctx.stroke();
    for(const x of [cx,cx+dx])circle(ctx,x,lip,2.5,'#ffe4a1');
    ctx.restore();
  }
  function wetCells(ctx,runtime,cellRect){
    if(!runtime?.houseRainWet)return;
    ctx.save();
    for(const s of [0,1]){
      const {x,y,w,h}=cellRect(0,s);
      ctx.fillStyle='rgba(65,150,190,.28)';ctx.fillRect(x,y,w,h);
      ctx.strokeStyle='#72d2ec';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
      const px=x+w-6,py=y+7;ctx.fillStyle='#caf4ff';ctx.beginPath();
      ctx.moveTo(px,py-4);ctx.quadraticCurveTo(px+6,py+4,px,py+5);ctx.quadraticCurveTo(px-6,py+4,px,py-4);ctx.fill();
    }
    ctx.restore();
  }
  return Object.freeze({thumbnail,preview,ready,load,installationHeight,installationView,paintRepairCard,drawInstallationHoist,mountDialogue,room,counter,wetCells});
})();
