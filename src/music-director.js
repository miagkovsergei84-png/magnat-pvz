// Music director: one theme, many arrangements. Chooses the bed for the current game scene, switches beds on a
// bar boundary of the outgoing loop and keeps holiday stems in sync. A VIP theme has the music bus to itself.
// PptAudio starts and stops the director on the music bus (hard holds, mute, dispose), and
// files are fetched and decoded lazily, only after the first trusted gesture created the context.
globalThis.PptMusicDirector=(()=>{
  const TRACKS=Object.freeze({
    menu:{file:'assets/audio/music/menu.ogg',bpm:92,bars:8},
    shift:{file:'assets/audio/music/shift.ogg',bpm:118,bars:16},
    rush:{file:'assets/audio/music/rush.ogg',bpm:136,bars:8},
    pause:{file:'assets/audio/music/pause.ogg',bpm:80,bars:8},
    search:{file:'assets/audio/music/search.ogg',bpm:72,bars:12},
    granny:{file:'assets/audio/music/granny.ogg',sting:true,cooldown:90000},
    blogger:{file:'assets/audio/music/blogger.ogg',sting:true,cooldown:8000},
    ny:{file:'assets/audio/music/ny.ogg',layer:true},
    sale11:{file:'assets/audio/music/sale11.ogg',layer:true},
    sept:{file:'assets/audio/music/sept.ogg',layer:true}
  });
  const LAYER_BEDS=new Set(['shift']);
  const LEAD=.03,FADE_IN=.25,FADE_OUT=.5,FIRST_FADE=.15,LAYER_FADE=.3,MAX_WAIT=1.5;
  const VIP_FADE_OUT=.14,VIP_RETURN=.3,VIP_CUT=.06;
  const CACHE_SECONDS=100,RETRY_MS=60000;
  const quiet=fn=>{try{return fn();}catch{return undefined;}};
  function create(options={}){
    const tracks=options.tracks||TRACKS;
    const now=typeof options.now==='function'?options.now:()=>globalThis.performance?.now?.()??Date.now();
    const fetchFn=typeof options.fetch==='function'?options.fetch:url=>globalThis.fetch(url);
    let context=null,out=null,background=null,active=false,disposed=false,generation=0,pendingBed=null,pendingLayer=null;
    const want={scene:null,layer:null},lastSting=new Map(),cache=new Map();
    let bed=null,layer=null,sting=null,pendingSting=null,backgroundReadyAt=0;
    const shiftMusic=scene=>scene==='shift'||scene==='rush';
    function decode(ctx,data){
      return new Promise(resolve=>{
        let result;
        try{result=ctx.decodeAudioData(data,resolve,()=>resolve(null));}catch{resolve(null);return;}
        if(result&&typeof result.then==='function')result.then(resolve,()=>resolve(null));
      });
    }
    const valid=buffer=>quiet(()=>!!buffer&&buffer.length>0&&Number.isFinite(buffer.duration)&&buffer.duration>0)===true;
    // Fetch + decode once per key; failures are remembered for a minute so a missing file costs one request.
    function load(key){
      const track=tracks[key];if(!track||!context)return Promise.resolve(null);
      let entry=cache.get(key);
      if(entry?.buffer){entry.used=now();return Promise.resolve(entry.buffer);}
      if(entry?.promise)return entry.promise;
      if(entry&&entry.failedAt!=null&&now()-entry.failedAt<RETRY_MS)return Promise.resolve(null);
      const ctx=context;entry={promise:null,buffer:null,failedAt:null,used:now()};cache.set(key,entry);
      entry.promise=Promise.resolve().then(()=>fetchFn(track.file)).then(response=>{
        if(!response||response.ok===false)throw Error('fetch failed');return response.arrayBuffer();
      }).then(data=>decode(ctx,data)).then(buffer=>{
        entry.promise=null;
        if(!valid(buffer)||ctx!==context){entry.failedAt=now();return null;}
        entry.buffer=buffer;entry.used=now();return buffer;
      },()=>{entry.promise=null;entry.failedAt=now();return null;});
      return entry.promise;
    }
    function trim(){
      const keep=new Set([bed?.key,layer?.key,want.scene,want.layer,...Object.keys(tracks).filter(key=>tracks[key].sting)]);
      const entries=[...cache].filter(([,entry])=>entry.buffer).sort((a,b)=>a[1].used-b[1].used);
      let total=entries.reduce((sum,[,entry])=>sum+entry.buffer.duration,0);
      for(const [key,entry] of entries){if(total<=CACHE_SECONDS)break;if(keep.has(key))continue;total-=entry.buffer.duration;cache.delete(key);}
    }
    const position=(part,time)=>{const d=part.buffer.duration;return (((time-part.startedAt+part.offset)%d)+d)%d;};
    // Next bar of the outgoing bed, or its next beat when the bar is more than MAX_WAIT away.
    function boundary(part,time){
      const from=time+LEAD;if(from<part.startedAt)return part.startedAt;
      const beat=60/(tracks[part.key]?.bpm||120),bar=beat*4,pos=position(part,from);
      let next=Math.ceil(pos/bar-1e-6)*bar;if(next-pos>MAX_WAIT)next=Math.ceil(pos/beat-1e-6)*beat;
      return from+Math.max(0,next-pos);
    }
    function startLoop(key,buffer,at,offset,fade,destination){
      const gain=context.createGain();gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(1,at+fade);gain.connect(destination);
      const source=context.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);
      const part={key,source,gain,buffer,startedAt:at,offset,fadeIn:fade};
      source.onended=()=>{quiet(()=>source.disconnect());quiet(()=>gain.disconnect());};
      source.start(at,offset);return part;
    }
    function release(part,at,fade){
      if(!part)return;
      // A rapid scene change can interrupt a newly scheduled fade-in. Jumping
      // the gain to 1 here produces a click; continue from its actual envelope.
      const level=part.fadeIn>0?Math.max(0,Math.min(1,(at-part.startedAt)/part.fadeIn)):1;
      quiet(()=>{
        const param=part.gain.gain;
        param.cancelScheduledValues(at);
        // Canceling an in-progress scheduled ramp also removes its end point;
        // replace it with a ramp up to the held level instead of a hard step.
        if(at>part.startedAt&&at<part.startedAt+part.fadeIn)param.linearRampToValueAtTime(level,at);
        else param.setValueAtTime(level,at);
        param.linearRampToValueAtTime(0,at+fade);
      });
      quiet(()=>part.source.stop(at+fade+.05));
    }
    function kill(part){if(!part)return;quiet(()=>{part.source.onended=null;});quiet(()=>part.source.stop());quiet(()=>part.source.disconnect());quiet(()=>part.gain.disconnect());}
    function fadeOutBed(){
      if(!bed&&!layer)return;const at=context.currentTime+LEAD;
      release(bed,at,FADE_OUT);release(layer,at,FADE_OUT);bed=null;layer=null;
    }
    function switchTo(key,buffer){
      if(bed&&bed.key===key)return;
      const at=bed?boundary(bed,context.currentTime):context.currentTime+LEAD,previous=bed,previousLayer=layer;
      bed=startLoop(key,buffer,at,0,previous?FADE_IN:FIRST_FADE,background);layer=null;
      release(previous,at,FADE_OUT);release(previousLayer,at,FADE_OUT);
      syncLayer();trim();
      // Stingers are short; have them ready before the first VIP walks in.
      if(shiftMusic(key))for(const stingKey of Object.keys(tracks))if(tracks[stingKey].sting)void load(stingKey);
    }
    function apply(){
      if(!active||disposed)return;
      const scene=want.scene;
      if(!scene||!tracks[scene]||tracks[scene].sting||tracks[scene].layer){fadeOutBed();return;}
      if(bed&&bed.key===scene){syncLayer();return;}
      if(pendingBed===scene)return;
      pendingBed=scene;const gen=generation;
      load(scene).then(buffer=>{
        if(pendingBed===scene)pendingBed=null;
        if(gen!==generation||!active)return;
        if(want.scene!==scene){apply();return;}
        if(!buffer){fadeOutBed();return;}
        switchTo(scene,buffer);
      });
    }
    function syncLayer(){
      const wanted=bed&&LAYER_BEDS.has(bed.key)&&want.layer&&tracks[want.layer]?.layer?want.layer:null;
      if(layer&&layer.key===wanted)return;
      if(layer){release(layer,context.currentTime+LEAD,LAYER_FADE);layer=null;}
      if(!wanted||pendingLayer===wanted)return;
      pendingLayer=wanted;const gen=generation,forBed=bed;
      load(wanted).then(buffer=>{
        if(pendingLayer===wanted)pendingLayer=null;
        if(gen!==generation||!active||!buffer)return;
        if(bed!==forBed||want.layer!==wanted){syncLayer();return;}
        const start=Math.max(context.currentTime+LEAD,bed.startedAt),offset=position(bed,start)%buffer.duration;
        layer=startLoop(wanted,buffer,start,offset,start>context.currentTime+LEAD?FADE_IN:LAYER_FADE,background);
      });
    }
    function restoreBackground(at){
      backgroundReadyAt=at+VIP_RETURN;
      background.gain.setValueAtTime(0,at);
      background.gain.linearRampToValueAtTime(1,backgroundReadyAt);
    }
    function leaveShiftMusic(){
      pendingSting=null;
      if(!sting||sting.interrupted||context.currentTime>=sting.endsAt)return;
      sting.interrupted=true;
      const now=context.currentTime,end=Math.min(sting.endsAt,now+VIP_CUT);
      sting.gain.gain.setValueAtTime(1,now);
      sting.gain.gain.linearRampToValueAtTime(0,end);
      quiet(()=>sting.source.stop(end));
      // Keep the already scheduled fade to silence. The next scene can fade back in
      // as soon as that fade and the interrupted VIP have both finished.
      background.gain.cancelScheduledValues(sting.endsAt);
      restoreBackground(Math.max(sting.startedAt,end));
      sting.endsAt=end;
    }
    function stopAll(){
      generation++;active=false;pendingBed=null;pendingLayer=null;pendingSting=null;
      kill(bed);kill(layer);kill(sting);bed=null;layer=null;sting=null;
      if(background)quiet(()=>background.disconnect());background=null;backgroundReadyAt=0;
    }
    return Object.freeze({
      tracks,
      start(ctx,destination){
        if(disposed||!ctx||!destination)return false;
        if(ctx!==context){cache.clear();context=ctx;}
        if(active&&out===destination)return true;
        if(active)stopAll();
        out=destination;
        try{background=context.createGain();background.gain.setValueAtTime(1,context.currentTime);background.connect(out);}catch{background=null;return false;}
        active=true;generation++;apply();return true;
      },
      stop(){if(active)stopAll();},
      isActive(){return active&&!!bed;},
      setState(value={}){
        if(disposed)return;
        const scene=typeof value.scene==='string'&&tracks[value.scene]&&!tracks[value.scene].sting&&!tracks[value.scene].layer?value.scene:null;
        const layerKey=typeof value.layer==='string'&&tracks[value.layer]?.layer?value.layer:null;
        if(scene===want.scene&&layerKey===want.layer)return;
        if(shiftMusic(want.scene)&&!shiftMusic(scene))leaveShiftMusic();
        want.scene=scene;want.layer=layerKey;apply();
      },
      // Reserve the slot during decoding too. A scene change or stop invalidates the ticket.
      sting(key){
        const track=tracks[key];
        if(disposed||!active||!bed||!track?.sting||!shiftMusic(want.scene)||pendingSting)return false;
        const time=now();if(!Number.isFinite(time))return false;
        if(lastSting.has(key)&&time-lastSting.get(key)<(track.cooldown||0))return false;
        if(sting&&sting.endsAt>context.currentTime)return false;
        const ticket={};pendingSting=ticket;
        load(key).then(buffer=>{
          if(pendingSting!==ticket)return;
          pendingSting=null;
          if(!buffer)return;
          const fadeAt=Math.max(context.currentTime+LEAD,backgroundReadyAt);
          const at=fadeAt+VIP_FADE_OUT,end=at+buffer.duration;
          try{
            const gain=context.createGain();gain.connect(out);
            const source=context.createBufferSource();source.buffer=buffer;source.connect(gain);
            const part={key,source,gain,startedAt:at,endsAt:end};
            source.onended=()=>{quiet(()=>source.disconnect());quiet(()=>gain.disconnect());if(sting===part)sting=null;};
            source.start(at);sting=part;
            background.gain.setValueAtTime(1,fadeAt);
            background.gain.linearRampToValueAtTime(0,at);
            restoreBackground(end);
            lastSting.set(key,now());
          }catch{}
        });
        return true;
      },
      snapshot(){
        return Object.freeze({active,scene:bed?.key??null,layer:layer?.key??null,sting:sting?.key??null,wanted:Object.freeze({...want}),
          loaded:Object.freeze([...cache].filter(([,entry])=>entry.buffer).map(([key])=>key)),failed:Object.freeze([...cache].filter(([,entry])=>entry.failedAt!=null).map(([key])=>key)),
          bedStartedAt:bed?.startedAt??null,layerOffset:layer?.offset??null});
      },
      dispose(){if(disposed)return;disposed=true;stopAll();cache.clear();context=null;out=null;}
    });
  }
  return Object.freeze({create,tracks:TRACKS});
})();
