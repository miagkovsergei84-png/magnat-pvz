// A real bootstrap indicator: it disappears only after both window.load and
// explicit game initialization. No timeout, simulated percentage or delay.
globalThis.PptLoadingScreen = (() => {
  let root=null, status=null, retry=null, pageLoaded=false, gameReady=false, failed=false, loadBound=false;
  const messages={
    ru:{loading:'Загрузка игры…',error:'Не удалось загрузить игру.',retry:'Попробовать снова'},
    en:{loading:'Loading game…',error:'Could not load the game.',retry:'Try again'}
  };
  function language(explicit){
    if(explicit==='ru'||explicit==='en')return explicit;
    try{const saved=globalThis.localStorage?.getItem('ppt-lang');if(saved==='ru'||saved==='en')return saved;}catch{}
    // Match the main menu when no valid saved choice is available.
    return 'ru';
  }
  let current=messages.ru;
  function clearIfReady(){
    if(!root||failed||!gameReady||!pageLoaded)return false;
    root.remove();root=null;status=null;retry=null;return true;
  }
  function onLoad(){pageLoaded=true;clearIfReady();}
  function mount({lang}={}){
    if(root)return root;
    current=messages[language(lang)];
    pageLoaded=pageLoaded||document.readyState==='complete';
    if(!loadBound&&!pageLoaded){window.addEventListener('load',onLoad,{once:true});loadBound=true;}
    root=document.createElement('div');root.id='pptLoading';root.className='pptLoading';
    root.setAttribute('aria-label',current.loading);
    const picture=document.createElement('div');picture.className='pptLoading__picture';
    const img=document.createElement('img');img.className='pptLoading__art';img.alt='';
    img.src='assets/campaign/loading-screen-photo-refined-20261111.jpg';img.decoding='async';
    status=document.createElement('div');status.className='pptLoading__status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    const spinner=document.createElement('span');spinner.className='pptLoading__spinner';spinner.setAttribute('aria-hidden','true');
    const label=document.createElement('span');label.className='pptLoading__label';label.textContent=current.loading;
    status.appendChild(spinner);status.appendChild(label);picture.appendChild(img);picture.appendChild(status);root.appendChild(picture);
    document.body.appendChild(root);
    clearIfReady();return root;
  }
  function ready(){gameReady=true;return clearIfReady();}
  function fail(){
    if(!root)mount();
    if(!root)return false;
    failed=true;root.classList.add('pptLoading--failed');
    status.textContent=current.error;status.setAttribute('role','alert');
    if(!retry){retry=document.createElement('button');retry.type='button';retry.className='pptLoading__retry';retry.textContent=current.retry;
      retry.addEventListener('click',()=>globalThis.location?.reload());status.parentNode.appendChild(retry);}
    return true;
  }
  return Object.freeze({mount,ready,fail});
})();
