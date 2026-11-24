// Approved facade panels are reused as art layers; nothing is painted onto
// the working shift board. Mixed choices survive in cards and conversations.
globalThis.PptTownUI=(()=>{
  const files=[
    ['assets/campaign/town/facade-1-0.webp','assets/campaign/town/facade-1-1.webp','assets/campaign/town/facade-1-2.webp'],
    ['assets/campaign/town/facade-2-0.webp','assets/campaign/town/facade-2-1.webp','assets/campaign/town/facade-2-2.webp'],
    ['assets/campaign/town/facade-3-0.webp','assets/campaign/town/facade-3-1.webp','assets/campaign/town/facade-3-2.webp'],
    ['assets/campaign/town/facade-4-0.webp','assets/campaign/town/facade-4-1.webp','assets/campaign/town/facade-4-2.webp'],
    ['assets/campaign/town/facade-5-0.webp','assets/campaign/town/facade-5-1.webp','assets/campaign/town/facade-5-2.webp']
  ];
  const orig='assets/campaign/town-dialogue.jpg',cache=new Map();
  const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function image(path){if(!cache.has(path))cache.set(path,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=path;}));return cache.get(path);}
  const chosen=(level,style)=>files[level-1][PptTownRenovation.styles.indexOf(style)];
  // Normalized, clipped patches from the approved panels. The later expanded
  // wing uses its own framing; each earlier detail is scaled into its bay.
  function patch(ctx,img,src,dst,polygon=null){
    const [sx,sy,sw,sh]=src,[dx,dy,dw,dh]=dst,N=660;
    ctx.save();if(polygon){ctx.beginPath();polygon.forEach(([x,y],i)=>i?ctx.lineTo((dx+x*dw)*N,(dy+y*dh)*N):ctx.moveTo((dx+x*dw)*N,(dy+y*dh)*N));ctx.closePath();ctx.clip();}
    ctx.drawImage(img,sx*img.naturalWidth,sy*img.naturalHeight,sw*img.naturalWidth,sh*img.naturalHeight,dx*N,dy*N,dw*N,dh*N);ctx.restore();
  }
  async function draw(canvas,choices){
    const ctx=canvas.getContext('2d'),N=660,level=choices.length;canvas.width=N;canvas.height=N;
    if(!level){const img=await image(orig);const scale=Math.max(N/img.naturalWidth,N/img.naturalHeight);ctx.drawImage(img,(N-img.naturalWidth*scale)/2,(N-img.naturalHeight*scale)/2,img.naturalWidth*scale,img.naturalHeight*scale);return;}
    const baseLevel=Math.min(4,level),base=await image(chosen(baseLevel,choices[baseLevel-1]));ctx.drawImage(base,0,0,N,N);
    if(level>=3){const src=await image(chosen(2,choices[1]));patch(ctx,src,[.375,.40,.285,.232],baseLevel>=4?[.356,.405,.225,.214]:[.382,.40,.278,.232],[[0,.14],[.2,0],[.8,0],[1,.16],[1,1],[0,1]]);}
    if(level>=4){const src=await image(chosen(3,choices[2]));patch(ctx,src,[.08,.40,.20,.385],[.078,.41,.19,.33],[[0,.13],[.15,0],[.95,0],[1,.2],[.99,.87],[.78,1],[0,.98]]);}
    if(level>=2){const src=await image(chosen(1,choices[0]));
      if(choices[0]!=='cozy')patch(ctx,src,[.48,.284,.24,.12],baseLevel>=4?[.41,.305,.215,.105]:[.48,.292,.24,.12],[[0,.29],[.24,.19],[.3,0],[.73,0],[.82,.23],[1,.32],[1,.79],[.75,.85],[.68,1],[.3,1],[.22,.79],[0,.74]]);
      else patch(ctx,src,[.31,.57,.385,.172],baseLevel>=4?[.30,.616,.295,.125]:[.31,.62,.385,.151],[[0,.12],[.63,0],[.67,.25],[.93,.05],[1,.43],[.94,.9],[.09,1],[0,.8]]);
    }
    if(level===5){const src=await image(chosen(5,choices[4]));
      if(choices[4]==='cozy')patch(ctx,src,[.49,.371,.296,.37],[.49,.371,.296,.37],[[0,.23],[.3,.093],[.56,0],[.83,.07],[1,.30],[.88,.35],[.86,.97],[.13,1],[.09,.30]]);
      if(choices[4]==='express')patch(ctx,src,[.29,.405,.158,.215],[.29,.405,.158,.215],[[.13,0],[.87,0],[1,.16],[1,.91],[.88,1],[.1,1],[0,.85],[0,.18]]);
      if(choices[4]==='logistics')patch(ctx,src,[.69,.557,.31,.206],[.69,.557,.31,.206],[[.64,0],[.76,0],[.79,.31],[.89,.48],[1,.74],[1,.94],[.21,1],[0,.72],[.18,.61],[.34,.62],[.34,.25],[.58,.25]]);
    }
  }
  function canvas(choices,cls='townArt'){return '<canvas class="'+cls+'" data-town-art="'+esc(choices.join(','))+'" aria-hidden="true"></canvas>';}
  function mount(root){for(const c of root.querySelectorAll?.('[data-town-art]')||[]){const choices=(c.dataset.townArt||'').split(',').filter(Boolean);draw(c,choices).then(()=>{if(c.isConnected)c.dataset.ready='1';}).catch(e=>{console.error('Town facade art',e);});}}
  function choicesMarkup(home,level,lang){const ru=lang==='ru',R=PptTownRenovation;
    return '<section class="townRepair"><div class="townRepair__title"><small>'+(ru?'Ремонт':'Repair')+' '+level+'/5</small><h2>'+esc(R.stages[level-1][lang==='en'?'en':'ru'])+'</h2><p>'+(ru?'Выбери одно улучшение. Остальные варианты закроются до следующего прохождения.':'Choose one improvement. Other options are locked until a new run.')+'</p>'+(level>1?'<small>'+(ru?'Повтор направления: +$5 за смену':'Matching direction: +$5 per shift')+'</small>':'')+'</div><div class="townRepair__options">'+R.styles.map(style=>{const t=R.text(level,style,lang);return '<button class="townRepair__choice" data-a="townRepair" data-v="'+style+'">'+canvas([...home.choices,style])+'<span class="townRepair__style">'+esc(t.style)+(home.choices.includes(style)?' · +$5':'')+'</span><strong>'+esc(t.name)+'</strong><span>'+esc(t.perk)+'</span><b>'+(ru?'Выбрать':'Choose')+'</b></button>';}).join('')+'</div></section>';
  }
  function installMarkup(home,lang){const ru=lang==='ru',level=home.choices.length,t=PptTownRenovation.text(level,home.choices.at(-1),lang);
    return '<section class="townInstall"><div class="townInstall__visual" data-level="'+level+'">'+canvas(home.choices.slice(0,-1),'townArt townInstall__old')+canvas(home.choices,'townArt townInstall__new')+'</div><div class="townInstall__caption"><small>'+(ru?'Ремонт завершён':'Repair complete')+' · '+level+'/5</small><h2>'+esc(t.name)+'</h2><p>'+esc(t.perk)+'</p><button class="btn" data-a="townInstallNext">'+(ru?'Далее':'Continue')+'</button></div></section>';
  }
  function basementMarkup(episode,lang,prefs,restore=false){const values=new URLSearchParams({campaign:'1',episode:String(episode),lang:lang==='en'?'en':'ru',restore:restore?'1':'0',musicMuted:prefs?.musicMuted?'1':'0',sfxMuted:prefs?.sfxMuted?'1':'0',musicVolume:String(prefs?.musicVolume??.3),sfxVolume:String(prefs?.sfxVolume??.55)});
    const url='prototypes/town-basement/index.html?'+values.toString();
    return '<iframe class="townBasementFrame" data-restore="'+(restore?'1':'0')+'" title="'+(lang==='ru'?'Расчистка подвала':'Basement cleanup')+'" src="'+url+'" allow="autoplay"></iframe>';
  }
  return Object.freeze({draw,mount,canvas,choicesMarkup,installMarkup,basementMarkup,esc});
})();
