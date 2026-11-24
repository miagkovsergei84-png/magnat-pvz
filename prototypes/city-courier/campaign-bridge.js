'use strict';
(function(root){
  const query=new URLSearchParams(location.search);
  const requested=query.get('campaign')==='1',token=query.get('token')||'';
  const embedded=requested&&root.parent!==root&&/^https?:$/.test(location.protocol)&&/^[A-Za-z0-9_-]{1,128}$/.test(token);
  const origin=location.origin,prefix='ppt-city-courier-';
  // «Срочная доставка» (set B, 24.11.2026): four stems of one 16-bar loop at 128 BPM, started together.
  // The run begins with the first layer; each of the first three deliveries adds one on the next bar line.
  const STEMS=Object.freeze([{file:'../../assets/audio/music/express-run.ogg'},{file:'../../assets/audio/music/express-rhythm.ogg'},
    {file:'../../assets/audio/music/express-harmony.ogg'},{file:'../../assets/audio/music/express-drive.ogg'}].map(stem=>stem.file));
  const BAR=240/128,FADE=.25,RETRY_MS=60000;
  let prefs={musicMuted:false,musicVolume:.3},playing=false,delivered=0;
  let context=null,out=null,buffers=null,loading=false,failedAt=-Infinity,voices=null,startedAt=0,offset=0,level=0;
  function send(type,details={}){
    if(!embedded)return false;
    root.parent.postMessage({...details,type:prefix+type,token},origin);
    return true;
  }
  const layers=()=>Math.min(STEMS.length,1+delivered);
  const quiet=fn=>{try{return fn();}catch{return undefined;}};
  function decode(data){
    return new Promise((resolve,reject)=>{const result=context.decodeAudioData(data,resolve,reject);if(result&&typeof result.then==='function')result.then(resolve,reject);});
  }
  function load(){
    if(buffers||loading||Date.now()-failedAt<RETRY_MS)return;
    loading=true;const ctx=context;
    Promise.all(STEMS.map(file=>fetch(file).then(response=>{if(!response.ok)throw Error(file);return response.arrayBuffer();}).then(decode)))
      .then(list=>{if(ctx===context&&list.every(buffer=>buffer?.duration>0))buffers=list;else failedAt=Date.now();},()=>{failedAt=Date.now();})
      .finally(()=>{loading=false;syncAudio();});
  }
  // Song position on the shared clock; layer changes wait for the next bar so the groove never stumbles.
  const position=time=>(offset+time-startedAt)%buffers[0].duration;
  function nextBar(time){const pos=position(time);return time+Math.ceil(pos/BAR-1e-6)*BAR-pos;}
  function applyLayers(){
    if(!voices)return;
    const count=layers(),now=context.currentTime,at=Math.max(now,nextBar(now+.02));
    voices.forEach((voice,index)=>{
      const target=index<count?1:0;if(voice.target===target)return;voice.target=target;
      quiet(()=>{voice.gain.gain.cancelScheduledValues(at);voice.gain.gain.setTargetAtTime(target,at,.04);});
    });
  }
  function stopVoices(){
    if(!voices)return;
    const now=context.currentTime,list=voices;voices=null;
    offset=position(now);
    quiet(()=>{out.gain.cancelScheduledValues(now);out.gain.setValueAtTime(out.gain.value,now);out.gain.linearRampToValueAtTime(0,now+.2);});
    for(const voice of list){voice.source.onended=()=>{quiet(()=>voice.source.disconnect());quiet(()=>voice.gain.disconnect());};quiet(()=>voice.source.stop(now+.25));}
  }
  function syncAudio(){
    if(!embedded)return;
    const wanted=!playing||document.hidden||prefs.musicMuted?0:prefs.musicVolume;
    if(wanted<=0){stopVoices();level=0;return;}
    if(!context){
      const Context=root.AudioContext||root.webkitAudioContext;if(!Context)return;
      try{context=new Context();out=context.createGain();out.gain.value=0;out.connect(context.destination);}catch{context=null;return;}
    }
    if(context.state==='suspended')context.resume().then(syncAudio,()=>{});
    if(!buffers){load();return;}
    if(context.state!=='running')return;
    const now=context.currentTime;
    if(!voices){
      const at=now+.03;startedAt=at;
      voices=buffers.map((buffer,index)=>{
        const gain=context.createGain();gain.gain.value=index<layers()?1:0;gain.connect(out);
        const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);
        source.start(at,offset%buffer.duration);return {source,gain,target:gain.gain.value};
      });
      out.gain.cancelScheduledValues(now);out.gain.setValueAtTime(0,now);out.gain.linearRampToValueAtTime(wanted,at+FADE);level=wanted;
    }else if(level!==wanted){out.gain.cancelScheduledValues(now);out.gain.setTargetAtTime(wanted,now,.05);level=wanted;}
    applyLayers();
  }
  function setPlaying(value){if(!embedded||playing===value)return;playing=value;syncAudio();}
  // Called with the number of handed-over parcels: on start, on restore and every frame of the run.
  function setDelivered(count){
    const next=Math.max(0,Math.min(STEMS.length,Math.floor(Number(count)||0)));
    if(next===delivered)return;
    delivered=next;applyLayers();
  }
  function music(){
    return Object.freeze({context:context?.state??null,loaded:!!buffers,failed:!buffers&&Number.isFinite(failedAt),playing:!!voices,
      layers:layers(),audible:voices?voices.filter(voice=>voice.target===1).length:0,level,
      position:voices?position(context.currentTime):null,files:STEMS.map(file=>file.split('/').pop())});
  }
  function setPrefs(data){
    if(typeof data.musicMuted==='boolean')prefs.musicMuted=data.musicMuted;
    if(typeof data.musicVolume==='number'&&Number.isFinite(data.musicVolume))prefs.musicVolume=Math.min(1,Math.max(0,data.musicVolume));
    syncAudio();
  }
  function connect(handlers){
    if(!embedded)return false;
    let initialized=false;
    root.addEventListener('message',event=>{
      if(event.source!==root.parent||event.origin!==origin||event.data?.token!==token)return;
      const data=event.data;
      switch(data.type){
        case prefix+'init':
          if(initialized)return;
          initialized=true;setPrefs(data);handlers.init(data);break;
        case prefix+'settings':
          if(initialized){setPrefs(data);handlers.settings(data);}break;
        case prefix+'pause':
          if(initialized){setPlaying(false);handlers.pause();}break;
        case prefix+'back':
          if(initialized)handlers.back();
          break;
        case prefix+'save-result':
          if(initialized&&['checkpoint','exit','complete'].includes(data.request)&&typeof data.ok==='boolean')handlers.saveResult(data);
          break;
      }
    });
    document.addEventListener('visibilitychange',syncAudio);
    root.addEventListener('pagehide',()=>setPlaying(false));
    send('ready');
    return true;
  }
  root.CourierCampaign=Object.freeze({requested,embedded,connect,send,setPlaying,setDelivered,music});
})(globalThis);
