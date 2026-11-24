'use strict';
(function(root){
  let lang='ru';
  const ru=['А','Б','В','Г'],en=['A','B','C','D'],originals=new WeakMap();
  const choose=(ru,en)=>lang==='en'?en:ru;
  const stop=index=>(lang==='en'?en:ru)[index]||'—';
  function set(value){
    const next=value==='en'?'en':'ru';
    if(next===lang)return false;
    lang=next;document.documentElement.lang=lang;
    document.title=choose('Мегаполис · Срочная доставка','Metropolis · Express delivery');
    for(const el of document.querySelectorAll('[data-en],[data-en-aria],[data-en-title]')){
      if(!originals.has(el))originals.set(el,{text:el.textContent,aria:el.getAttribute('aria-label'),title:el.getAttribute('title')});
      const base=originals.get(el);
      if(el.dataset.en!==undefined)el.textContent=choose(base.text,el.dataset.en);
      if(el.dataset.enAria!==undefined)el.setAttribute('aria-label',choose(base.aria,el.dataset.enAria));
      if(el.dataset.enTitle!==undefined)el.title=choose(base.title,el.dataset.enTitle);
    }
    return true;
  }
  function notice(g){
    if(lang==='ru')return g.notice;
    switch(g.noticeKind){
      case 'lane':return 'Car ahead — change lanes!';
      case 'jump':return 'Jump over the obstacle!';
      case 'slide':return 'Slide under the barrier!';
      case 'all':return 'All four parcels delivered!';
      case 'handoff':return 'Pickup '+stop(g.program.stops.indexOf(g.delivered.at(-1)))+' • speed '+Math.round(root.CourierRunner.factor(g)*100)+'%';
      default:return '';
    }
  }
  set(new URLSearchParams(location.search).get('lang'));
  root.CourierText=Object.freeze({choose,stop,set,notice});
})(globalThis);
