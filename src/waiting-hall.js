// The appliances of the waiting area: a cooler, a coffee machine and a TV of its own for
// every location (approved sheet, 25.11.2026; tools/build-waiting-hall.py). They stand on
// the floor at the back wall and may cover what hangs there; customers are painted after
// them and may cover them. A set loads when its location is first drawn. Until then, and
// if an image fails, draw() returns false and the earlier small pictures are used.
globalThis.PptWaitingHall=(()=>{
  // Where the front feet touch the floor. A customer is about 90 units tall.
  const FLOOR=12;
  const art={
    village:{
      cooler:{file:'assets/environment/waiting-hall-v1/village-cooler.webp',h:63},
      coffee:{file:'assets/environment/waiting-hall-v1/village-coffee.webp',h:70},
      tv:{file:'assets/environment/waiting-hall-v1/village-tv.webp',w:62}
    },
    town:{
      cooler:{file:'assets/environment/waiting-hall-v1/town-cooler.webp',h:61},
      coffee:{file:'assets/environment/waiting-hall-v1/town-coffee.webp',h:68},
      tv:{file:'assets/environment/waiting-hall-v1/town-tv.webp',w:58,cabinet:['#5d646f','#3c424b','#2a2f36']}
    },
    city:{
      cooler:{file:'assets/environment/waiting-hall-v1/city-cooler.webp',h:62},
      coffee:{file:'assets/environment/waiting-hall-v1/city-coffee.webp',h:69},
      tv:{file:'assets/environment/waiting-hall-v1/city-tv.webp',w:62}
    },
    capital:{
      cooler:{file:'assets/environment/waiting-hall-v1/capital-cooler.webp',h:63},
      coffee:{file:'assets/environment/waiting-hall-v1/capital-coffee.webp',h:70},
      tv:{file:'assets/environment/waiting-hall-v1/capital-tv.webp',w:66,cabinet:['#cfc5bd','#a0958d','#6f6660']}
    }
  };
  function load(item){
    if(item.image)return item;
    const image=item.image=new Image();
    image.onload=()=>{item.ready=!item.failed&&image.naturalWidth>0&&image.naturalHeight>0;};
    image.onerror=()=>{item.ready=false;item.failed=true;};
    image.src=item.file;
    return item;
  }
  // The cooler stands in the left corner, the coffee machine between the first two
  // lines, the TV between the last two.
  function place(kind,windows,width){
    const step=width/windows;
    return kind==='cooler'?Math.min(21,step*.5):kind==='coffee'?step:width-step;
  }
  function draw(ctx,kind,chapter,windows,width){
    // 'city-center', 'capital-outskirts' and 'capital-center' share their city's set.
    const item=(art[String(chapter||'').split('-')[0]]||art.village)[kind];
    if(!item)return false;
    load(item);
    if(!item.ready||item.failed||!item.image.complete)return false;
    const ratio=item.image.naturalWidth/item.image.naturalHeight;
    const h=item.h||item.w/ratio,w=item.w||item.h*ratio,x=place(kind,windows,width);
    ctx.save();
    try{
      ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();ctx.ellipse(x+2,FLOOR-1.5,w*(item.cabinet?.4:.5),4.5,0,0,Math.PI*2);ctx.fill();
      let foot=FLOOR;
      if(item.cabinet){
        const cw=w*.74,top=FLOOR-15,left=x-cw/2,[light,body,dark]=item.cabinet;
        ctx.fillStyle=body;ctx.fillRect(left,top,cw,14);
        ctx.fillStyle=light;ctx.fillRect(left-1,top-2,cw+2,3);
        ctx.fillStyle=dark;ctx.fillRect(x-.5,top+3,1,9);ctx.fillRect(left,FLOOR-2,cw,1.5);
        ctx.fillRect(x-6,top+6,3,1.2);ctx.fillRect(x+3,top+6,3,1.2);
        foot=top-1;
      }
      ctx.drawImage(item.image,0,0,item.image.naturalWidth,item.image.naturalHeight,x-w/2,foot-h,w,h);
      return true;
    }catch(error){item.ready=false;item.failed=true;return false;}
    finally{ctx.restore();}
  }
  return Object.freeze({draw,place,FLOOR,files:Object.freeze(Object.values(art).flatMap(set=>Object.values(set).map(item=>item.file)))});
})();
