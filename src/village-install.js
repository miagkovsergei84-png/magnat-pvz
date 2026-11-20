// The saved choice is already in the house. Animate only the difference from
// the preceding level and leave the campaign in charge of the Continue button.
globalThis.PptVillageInstall = (() => {
  'use strict';
  const width = 720;
  const motion = [[0,-58], [-52,0], [0,56], [0,-44], [54,8]];
  const escape = text => String(text).replace(/[&<>"']/g, ch =>
    ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[ch]);

  function markup(home, lang) {
    const label = VillageHouseUI.renovationLabel(home, lang);
    if (!label) return '';
    const photo = escape(PptVillageHouseArt.thumbnail(home.house));
    const frameHeight=PptVillageHouseArt.installationHeight(home.choices.length);
    return '<section class="vInstall" role="dialog" aria-modal="true" aria-labelledby="vInstallTitle" aria-describedby="vInstallPerk">'+
      '<img class="vInstall__backdrop" src="'+photo+'" alt="">'+
      '<div class="vInstall__layout"><div class="vInstall__picture" style="--frame-ratio:'+(360/frameHeight)+'">'+
      '<canvas width="'+width+'" height="'+(2*frameHeight)+'" aria-hidden="true"></canvas>'+
      '<p class="vInstall__loading" role="status">'+(lang==='ru'?'Готовим дом к ремонту…':'Preparing the house…')+'</p></div>'+
      '<div class="vInstall__detail"><p class="vInstall__house">'+escape(label.house)+'</p>'+
      '<p class="vInstall__level">'+escape(label.level)+' · '+escape(label.style)+'</p>'+
      '<h2 id="vInstallTitle">'+escape(label.name)+'</h2><p class="vInstall__perk" id="vInstallPerk">'+escape(label.perk)+'</p>'+
      '<button type="button" class="campaignButton" data-a="villageInstallNext">'+
      (lang==='ru'?'Далее':'Next')+'</button></div></div></section>';
  }

  function frame(home, level, hoistProgress = 1) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = 2*PptVillageHouseArt.installationHeight(level);
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    ctx.scale(2,2);
    PptVillageHouseArt.installationView(ctx, home, level, hoistProgress);
    return canvas;
  }

  function movingPart(before, after) {
    // Art plates are also opaque in areas where timber or masonry replaces the
    // old finish. Drop matching pixels so the rest of the house stays still.
    const canvas = document.createElement('canvas');
    const height = after.height;
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    const old = before.getContext('2d').getImageData(0,0,width,height).data;
    const part = after.getContext('2d').getImageData(0,0,width,height);
    const data = part.data;
    for(let i=0;i<data.length;i+=4){
      if(Math.abs(data[i]-old[i])+Math.abs(data[i+1]-old[i+1])+Math.abs(data[i+2]-old[i+2])<=8)
        data[i+3]=0;
    }
    ctx.putImageData(part,0,0);
    return canvas;
  }

  // The camera stays on the house while successive sections of the changed
  // material settle into place. Keep the rest of the painting stationary.
  function fitSections(ctx, part, after, level, progress) {
    const vertical = level === 3 || level === 4;
    const height = after.height;
    const [dx,dy] = motion[level-1];
    for(let i=0;i<4;i++){
      const p=Math.max(0,Math.min(1,(progress-i*.105)/.685));
      if(!p) continue;
      const eased=1-(1-p)**3;
      ctx.save();
      ctx.beginPath();
      if(vertical)ctx.rect(0,i*height/4,width,height/4);
      else ctx.rect(i*width/4,0,width/4,height);
      ctx.clip();
      ctx.globalAlpha=Math.min(1,p*2);
      if(part)ctx.drawImage(part,dx*(1-eased),dy*(1-eased));
      else ctx.drawImage(after,0,0);
      ctx.restore();
    }
  }

  async function mount(element, home) {
    const canvas = element?.querySelector('.vInstall canvas');
    if(!canvas||canvas.dataset.mounted)return;
    canvas.dataset.mounted='true';
    element.querySelector('.vInstall button')?.focus({preventScroll:true});
    const level=home.choices.length;
    const previous={...home,choices:home.choices.slice(0,-1)};
    const loading=element.querySelector('.vInstall__loading');
    try {
      await Promise.all([PptVillageHouseArt.load(previous),PptVillageHouseArt.load(home)]);
      if(!canvas.isConnected)return;
      const ctx=canvas.getContext('2d');
      const after=frame(home,level);
      loading.hidden=true;
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        ctx.drawImage(after,0,0);canvas.dataset.ready='true';canvas.dataset.finished='true';return;
      }
      const hoist=level===1 && home.choices[0]==='barn';
      const fitted=hoist?frame(home,level,0):after;
      const before=frame(previous,level);
      let part;
      try {part=movingPart(before,fitted);} catch { /* The clip animation also works with file-based images. */ }
      ctx.drawImage(before,0,0);canvas.dataset.ready='true';
      let lastFrame=null,elapsed=0;
      const settle=hoist?1000:1900, startWork=350, hoistTime=1800;
      function draw(now){
        if(!canvas.isConnected)return;
        if(lastFrame!==null && !document.hidden)elapsed+=Math.min(100,now-lastFrame);
        lastFrame=now;
        const progress=Math.max(0,(elapsed-startWork)/settle);
        if(progress<1){
          ctx.drawImage(before,0,0);
          fitSections(ctx,part,fitted,level,progress);
        }else if(hoist && elapsed<startWork+settle+hoistTime){
          ctx.drawImage(fitted,0,0);
          ctx.save();
          ctx.scale(2,2);
          PptVillageHouseArt.drawInstallationHoist(ctx,home,(elapsed-startWork-settle)/hoistTime);
          ctx.restore();
        }else{
          ctx.drawImage(after,0,0);
          canvas.dataset.finished='true';
          return;
        }
        requestAnimationFrame(draw);
      }
      requestAnimationFrame(draw);
    } catch {
      if(!canvas.isConnected)return;
      const ru=element.querySelector('[data-a="villageInstallNext"]').textContent==='Далее';
      loading.hidden=false;
      loading.textContent=ru?'Не удалось загрузить изображение дома.':'The house picture could not be loaded.';
      const retry=document.createElement('button');
      retry.type='button';retry.className='campaignButton';
      retry.textContent=ru?'Загрузить ещё раз':'Retry loading';
      loading.append(retry);
      retry.onclick=()=>{
        loading.textContent=ru?'Загружаем дом…':'Loading the house…';
        delete canvas.dataset.mounted;
        mount(element,home);
      };
    }
  }
  return Object.freeze({markup,mount});
})();
