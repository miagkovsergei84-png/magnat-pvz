// Default-off audio core; player-sfx explicitly enables action cues only.
// options.softHolds: hold reasons that silence game sound but keep short interface cues audible.
// Caller owns game and host lifecycle. No music is selected by this module.
globalThis.PptAudio = (() => {
  const KEY='ppt.audio.v1';
  const DEFAULTS={musicMuted:false,sfxMuted:false,musicVolume:.3,sfxVolume:.55};
  const quiet=fn=>{try{return fn();}catch{return undefined;}};
  const settle=value=>Promise.resolve(value).catch(()=>undefined);
  function preferences(value,base=DEFAULTS){
    const result={...base};
    if(!value||typeof value!=='object'||Array.isArray(value))return result;
    for(const key of ['musicMuted','sfxMuted'])if(typeof value[key]==='boolean')result[key]=value[key];
    for(const key of ['musicVolume','sfxVolume'])if(typeof value[key]==='number'&&Number.isFinite(value[key]))result[key]=Math.max(0,Math.min(1,value[key]));
    return result;
  }
  function validBuffer(buffer){return quiet(()=>!!buffer&&Number.isInteger(buffer.length)&&buffer.length>0&&Number.isInteger(buffer.numberOfChannels)&&buffer.numberOfChannels>0&&Number.isFinite(buffer.sampleRate)&&buffer.sampleRate>0&&Number.isFinite(buffer.duration)&&buffer.duration>0)===true;}
  function create(options={}){
    let enabled=options.enabled===true,disposed=false,activePlay=false,epoch=0,context=null,attempted=false,unlocked=false,resumePromise=null,suspendPromise=null;
    let musicGain=null,sfxGain=null,musicBuffer=null,musicSource=null,musicOffset=0,musicStartedAt=0;
    const holds=new Set(),voices=new Set(),uiVoices=new Set(),lastCue=new Map(),storage=options.storage;
    const softHolds=new Set(Array.isArray(options.softHolds)?options.softHolds.filter(reason=>typeof reason==='string'&&reason.trim()):[]);
    const now=typeof options.now==='function'?options.now:()=>globalThis.performance?.now?.()??Date.now();
    const stored=quiet(()=>JSON.parse(storage?.getItem(KEY)));
    let prefs=preferences(stored?.version===1?stored:null);
    let musicEngine=null;
    const allowed=()=>!disposed&&enabled&&activePlay&&!holds.size;
    // Interface cues ignore soft holds (menus, overlays, manual pause) but never hard ones (hidden, blur, ads, recovery).
    const hardHeld=()=>[...holds].some(reason=>!softHolds.has(reason));
    // With soft holds configured, music follows the same rule: menus and between-shift screens keep it, hard holds silence it.
    const musicAllowed=()=>!disposed&&enabled&&!prefs.musicMuted&&prefs.musicVolume>0&&(allowed()||softHolds.size>0&&!hardHeld());
    const sfxAllowed=()=>allowed()&&!prefs.sfxMuted&&prefs.sfxVolume>0;
    const uiAllowed=()=>!disposed&&enabled&&softHolds.size>0&&!hardHeld()&&!prefs.sfxMuted&&prefs.sfxVolume>0;
    const awake=()=>allowed()||uiAllowed()||musicAllowed();
    function disconnect(node){if(node)quiet(()=>node.disconnect());}
    function stopNode(node){if(!node)return;quiet(()=>{node.onended=null;});quiet(()=>node.stop());disconnect(node);}
    function stopMusic(preserve=true){
      if(musicEngine)quiet(()=>musicEngine.stop());
      if(musicSource&&preserve&&context&&musicBuffer){const duration=musicBuffer.duration;musicOffset=((musicOffset+Math.max(0,context.currentTime-musicStartedAt))%duration+duration)%duration;}
      const source=musicSource;musicSource=null;stopNode(source);
    }
    function stopVoices(all=true){for(const source of voices)stopNode(source);voices.clear();if(all)stopUiVoices();}
    function stopUiVoices(){for(const source of uiVoices)stopNode(source);uiVoices.clear();}
    function suspend(){
      if(!context||context.state==='closed'||suspendPromise)return;
      let request;try{request=context.suspend();}catch{return;}
      const pending=Promise.resolve(request).then(()=>true,()=>false);suspendPromise=pending;
      pending.then(()=>{if(suspendPromise===pending)suspendPromise=null;if(disposed)close();});
    }
    function close(){if(context&&context.state!=='closed')settle(quiet(()=>context.close()));}
    function gains(){
      for(const [node,value] of [[musicGain,musicAllowed()?prefs.musicVolume:0],[sfxGain,sfxAllowed()||uiAllowed()?prefs.sfxVolume:0]])if(node)quiet(()=>{node.gain.setValueAtTime(value,context.currentTime);});
    }
    function startMusic(){
      if(!musicAllowed()||!context||!musicGain||context.state!=='running')return;
      // An attached engine owns its sources; start is idempotent on its side.
      if(musicEngine){quiet(()=>musicEngine.start(context,musicGain));return;}
      if(!musicBuffer||musicSource)return;
      let source;
      try{
        source=context.createBufferSource();source.buffer=musicBuffer;source.loop=true;source.connect(musicGain);
        source.onended=()=>{if(musicSource===source)musicSource=null;disconnect(source);};
        musicSource=source;musicStartedAt=context.currentTime;source.start(0,musicOffset);
      }catch{if(musicSource===source)musicSource=null;stopNode(source);}
    }
    function enforceSilence(){
      gains();
      if(!musicAllowed())stopMusic();
      if(!sfxAllowed())stopVoices(false);
      if(!uiAllowed())stopUiVoices();
      if(!awake()){stopVoices();suspend();}
    }
    function resume(){
      if(!context||!unlocked||!awake())return Promise.resolve(false);
      const requestedEpoch=epoch;
      // Do not start against a still-running state if an older suspend is queued.
      if(suspendPromise)return suspendPromise.then(()=>!disposed&&requestedEpoch===epoch&&awake()?resume():false);
      if(context.state==='running'){gains();startMusic();return Promise.resolve(true);}
      if(context.state==='closed')return Promise.resolve(false);
      if(!resumePromise){
        // Call resume synchronously within unlock's trusted event when applicable.
        let request;try{request=context.resume();}catch{return Promise.resolve(false);}
        const pending=Promise.resolve(request).then(()=>context.state==='running',()=>false);
        resumePromise=pending;
        pending.then(()=>{if(resumePromise===pending)resumePromise=null;});
      }
      return resumePromise.then(running=>{
        if(disposed){close();return false;}
        if(requestedEpoch!==epoch||!awake()){enforceSilence();return false;}
        if(running){gains();startMusic();}
        return running;
      }).catch(()=>false);
    }
    function reconcile(){enforceSilence();if(awake()&&context&&unlocked)void resume();}
    function change(){epoch++;reconcile();}
    function initialize(){
      if(attempted)return !!context&&!!musicGain&&!!sfxGain;
      attempted=true;
      try{
        const factory=options.contextFactory||(()=>{const Constructor=globalThis.AudioContext||globalThis.webkitAudioContext;return Constructor?new Constructor():null;});
        context=factory();if(!context)return false;
        musicGain=context.createGain();sfxGain=context.createGain();gains();musicGain.connect(context.destination);sfxGain.connect(context.destination);
        return true;
      }catch{disconnect(musicGain);disconnect(sfxGain);musicGain=null;sfxGain=null;close();return false;}
    }
    function decode(data){
      if(disposed||!enabled||!unlocked||!context||!awake()||!(data instanceof ArrayBuffer))return Promise.resolve(null);
      const requestedEpoch=epoch;
      let result;
      try{result=context.decodeAudioData(data.slice(0));}catch{return Promise.resolve(null);}
      return Promise.resolve(result).then(buffer=>!disposed&&enabled&&awake()&&requestedEpoch===epoch&&validBuffer(buffer)?buffer:null,()=>null);
    }
    return Object.freeze({
      enable(value){if(disposed)return false;const next=value===true;if(next!==enabled){enabled=next;change();}return enabled;},
      // Some hosts permit music on launch, while browsers may create a
      // suspended context until a trusted gesture. Never wait on a blocked
      // resume promise here: a later pointer/keyboard event must be free to
      // call resume synchronously.
      tryAutoplay(){
        if(disposed||!enabled||!musicAllowed()||!initialize()||context.state!=='running')return false;
        unlocked=true;reconcile();return true;
      },
      unlock(event){
        if(disposed||!enabled||!event||event.isTrusted!==true)return Promise.resolve(false);
        if(!initialize())return Promise.resolve(false);
        unlocked=true;reconcile();return resume();
      },
      setActivity(value={}){
        if(disposed)return;
        let changed=false;
        if(typeof value.activePlay==='boolean'&&value.activePlay!==activePlay){activePlay=value.activePlay;changed=true;}
        if(Array.isArray(value.holds)){
          const next=new Set(value.holds.filter(reason=>typeof reason==='string'&&reason.trim()));
          if(next.size!==holds.size||[...next].some(reason=>!holds.has(reason))){holds.clear();for(const reason of next)holds.add(reason);changed=true;}
        }
        if(changed)change();
      },
      setHold(reason,held){if(disposed||typeof reason!=='string'||!reason.trim()||typeof held!=='boolean')return;const before=holds.has(reason);if(held)holds.add(reason);else holds.delete(reason);if(before!==holds.has(reason))change();},
      setPreferences(value){
        if(disposed)return {...prefs};const next=preferences(value,prefs);
        if(Object.keys(next).some(key=>next[key]!==prefs[key])){prefs=next;quiet(()=>storage?.setItem(KEY,JSON.stringify({version:1,...prefs})));change();}
        return {...prefs};
      },
      setMusic(buffer){
        if(disposed||buffer!==null&&!validBuffer(buffer))return false;
        if(buffer!==musicBuffer){stopMusic(false);musicBuffer=buffer;musicOffset=0;change();}return true;
      },
      // engine: {start(context,destination),stop(),isActive()} — a music director that schedules its own sources on the music bus.
      setMusicEngine(engine){
        if(disposed)return false;
        const next=engine&&typeof engine.start==='function'&&typeof engine.stop==='function'?engine:null;
        if(next===musicEngine)return !!next;
        stopMusic(false);musicEngine=next;change();return !!next;
      },
      decode,
      playSfx(buffer,{key=buffer,ui=false}={}){
        const pool=ui===true?uiVoices:voices;
        if(!(ui===true?uiAllowed():sfxAllowed())||!context||!unlocked||context.state!=='running'||!validBuffer(buffer)||pool.size>=(ui===true?3:4))return false;
        const time=quiet(now);if(!Number.isFinite(time))return false;
        if(lastCue.has(key)&&time-lastCue.get(key)<120)return false;
        let source;
        try{
          source=context.createBufferSource();source.buffer=buffer;source.connect(sfxGain);pool.add(source);
          source.onended=()=>{pool.delete(source);disconnect(source);};source.start();
          lastCue.delete(key);lastCue.set(key,time);if(lastCue.size>64)lastCue.delete(lastCue.keys().next().value);
          return true;
        }catch{pool.delete(source);stopNode(source);return false;}
      },
      stop(){if(disposed)return;activePlay=false;musicBuffer=null;musicOffset=0;lastCue.clear();epoch++;stopMusic(false);stopVoices();gains();suspend();},
      dispose(){if(disposed)return;disposed=true;enabled=false;activePlay=false;epoch++;stopMusic(false);stopVoices();musicBuffer=null;musicEngine=null;lastCue.clear();disconnect(musicGain);disconnect(sfxGain);musicGain=null;sfxGain=null;close();},
      snapshot(){return Object.freeze({enabled,disposed,unlocked,activePlay,holds:Object.freeze([...holds]),contextState:context?.state??null,musicPlaying:!!musicSource||(musicEngine?quiet(()=>musicEngine.isActive?.()===true)===true:false),sfxPlaying:voices.size,uiPlaying:uiVoices.size,preferences:Object.freeze({...prefs})});}
    });
  }
  return Object.freeze({create,key:KEY});
})();
