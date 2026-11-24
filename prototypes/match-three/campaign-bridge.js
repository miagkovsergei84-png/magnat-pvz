// Same-origin campaign transport. The standalone preview does not save to, or
// navigate, the host. Only fully settled validated checkpoints are sent.
(function(root){'use strict';
  const query=new URLSearchParams(location.search),token=query.get('token')||'';
  const requested=query.get('campaign')==='1';
  const embedded=requested&&root.parent!==root&&/^https?:$/.test(location.protocol)&&/^[A-Za-z0-9_-]{1,128}$/.test(token);
  const prefix='ppt-match-three-',origin=location.origin;
  if(!embedded)return;
  const api=root.__matchPreview,check=root.PptMatchThreeCheckpoint;
  if(!api||!check)return;
  const $=id=>document.getElementById(id),exit=$('campaignExit'),retry=$('campaignRetrySave'),status=$('campaignSaveStatus');
  let initialized=false,externalPaused=true,blocked=false,restoreFailure=false,leaveRequested=false,terminal=false,pending=null,latest=null,lang='ru',queue=[];
  const tr=key=>root.PptMatchThreeI18n?.text(key,lang)??key;
  const setStatus=key=>{status.hidden=!key;status.dataset.statusKey=key||'';status.textContent=key?tr(key):'';};
  function send(type,details={}){root.parent.postMessage({...details,type:prefix+type,token},origin);}
  function lock(){api.setCampaignPaused(externalPaused||blocked||restoreFailure||leaveRequested||terminal||!initialized);exit.disabled=!initialized||terminal||leaveRequested||restoreFailure&&!latest;retry.hidden=!blocked;retry.disabled=externalPaused;}
  function pump(){
    if(!initialized||pending||blocked||!queue.length)return;
    const item=queue[0];if(externalPaused&&item.request!=='checkpoint')return;
    pending=item;send(item.request,{state:item.state});
  }
  function enqueue(request,state){
    const normalized=check.validate(state),signature=JSON.stringify(normalized);
    if(request==='checkpoint'&&queue.some(item=>item.request==='checkpoint'&&item.signature===signature))return;
    queue.push({request,state:normalized,signature});pump();
  }
  function fail(){blocked=true;pending=null;setStatus('Не удалось сохранить прогресс. Повтори попытку.');lock();}
  function finishOrExit(state){
    if(terminal)return;
    if(check.complete(state)){terminal=true;leaveRequested=false;enqueue('complete',state);lock();return;}
    if(leaveRequested){terminal=true;enqueue('exit',state);lock();}
  }
  function onCheckpoint(state){
    if(!initialized||!state||terminal)return;
    try{latest=check.validate(state);enqueue('checkpoint',latest);finishOrExit(latest);}catch(error){console.error('Unable to checkpoint sorting center',error);fail();}
  }
  function requestExit(){
    if(!initialized||terminal)return;
    if(restoreFailure){if(latest){leaveRequested=terminal=true;enqueue('exit',latest);lock();}return;}
    leaveRequested=true;lock();
    // The game keeps an in-flight cascade alive until settled. Only then is
    // the exact resulting grid eligible for exit or completion.
    const state=api.checkpoint();if(state)onCheckpoint(state);
  }
  function refreshLanguage(value){if(value!=='ru'&&value!=='en')return;lang=value;api.setCampaignLanguage(lang);if(status.dataset.statusKey)setStatus(status.dataset.statusKey);}
  exit.hidden=false;retry.hidden=true;setStatus('Загрузка сортировочного центра…');
  api.setCampaignMode({lang,paused:true,onCheckpoint,onStageComplete:(n,state)=>{if(n===2&&state&&!terminal)onCheckpoint(state);},onExit:requestExit});lock();
  exit.addEventListener('click',requestExit);
  retry.addEventListener('click',()=>{if(!blocked||externalPaused)return;blocked=false;setStatus('');lock();pump();});
  root.addEventListener('message',event=>{
    const data=event.data;if(event.source!==root.parent||event.origin!==origin||data?.token!==token)return;
    switch(data.type){
      case prefix+'init':{
        if(initialized)return;
        refreshLanguage(data.lang);externalPaused=!!data.paused;
        let valid=true;if(data.state!==null){try{latest=check.validate(data.state);valid=api.restoreCheckpoint(latest)===true;}catch(error){console.error('Invalid sorting checkpoint',error);valid=false;}}
        initialized=true;setStatus('');
        if(!valid){setStatus('Не удалось восстановить сортировочный центр. Вернись в ПВЗ.');restoreFailure=true;lock();return;}
        lock();const state=api.checkpoint();if(state)onCheckpoint(state);break;
      }
      case prefix+'settings':if(initialized)refreshLanguage(data.lang);break;
      case prefix+'pause':if(initialized&&typeof data.paused==='boolean'){externalPaused=data.paused;lock();pump();}break;
      case prefix+'back':if(initialized)requestExit();break;
      case prefix+'save-result':{
        if(!initialized||!pending||data.request!==pending.request||typeof data.ok!=='boolean')return;
        if(!data.ok){fail();return;}
        queue.shift();pending=null;setStatus('');lock();pump();break;
      }
    }
  });
  send('ready');
})(globalThis);
