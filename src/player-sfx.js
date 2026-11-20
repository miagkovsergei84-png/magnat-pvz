// Original, short non-melodic action and interface cues. No files, loops, speech or music.
globalThis.PptPlayerSfx=(()=>{
  const RATE=22050;
  const DURATIONS={take:.065,place:.085,success:.115,error:.145,tick:.055,truck:.28,warn:.17,shift:.42};
  // Interface cues (button confirm, shift end) stay audible in menus; game cues never do.
  const UI=new Set(['tick','shift']);
  const SOFT_HOLDS=['menu','overlay','manual'];
  const LIMITS={tick:80,truck:1000,warn:1000,shift:2000,error:500,success:250};
  const TAU=2*Math.PI;
  function lcg(){let seed=1789;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};}
  // Legacy four action cues: the exact formulas accepted into the runtime on 08.11.2026.
  function action(key,duration,data){
    const next=lcg();let low=0,phase=0;
    for(let i=0;i<data.length;i++){
      const noise=next(),t=i/RATE,u=t/duration;
      low+=.18*(noise-low);
      const envelope=Math.min(1,t/.003)*Math.pow(1-u,3);
      const frequency=key==='take'?470:key==='place'?160:key==='success'?720:110;
      phase+=TAU*frequency*(1-.35*u)/RATE;
      const body=Math.sin(phase)*Math.exp(-t*45);
      data[i]=envelope*(key==='error'?.22*low+.09*body:key==='success'?.09*low+.18*body:.2*low+.14*body);
    }
  }
  // A short, soft confirmation tone. Avoid noise transients that can sound
  // like crackling when buttons are pressed repeatedly in story screens.
  function tick(duration,data){
    let phase=0;
    for(let i=0;i<data.length;i++){
      const t=i/RATE,u=t/duration;
      phase+=TAU*660/RATE;
      const envelope=Math.min(1,t/.008)*Math.pow(1-u,2)*Math.exp(-t*20);
      data[i]=.105*envelope*(Math.sin(phase)+.15*Math.sin(phase*2));
    }
  }
  // Truck at the dock: one low soft thump and a short air-brake breath, no horn or engine.
  function truck(duration,data){
    const next=lcg();let low=0,slow=0,phase=0;
    for(let i=0;i<data.length;i++){
      const t=i/RATE,u=t/duration,noise=next();low+=.45*(noise-low);slow+=.06*(noise-slow);
      phase+=TAU*78*(1-.3*u)/RATE;
      const thump=.26*Math.sin(phase)*Math.exp(-t*16);
      const breath=.09*(low-slow)*Math.min(1,t/.05)*Math.exp(-Math.max(0,t-.05)*9);
      data[i]=Math.min(1,t/.003)*Math.pow(1-u,2)*(thump+breath);
    }
  }
  // Two gentle descending tones for a spoiled parcel or a customer who gave up.
  function warn(duration,data){
    let p1=0,p2=0;
    for(let i=0;i<data.length;i++){
      const t=i/RATE,u=t/duration;p1+=TAU*392/RATE;p2+=TAU*311/RATE;
      const e1=Math.min(1,t/.008)*Math.exp(-Math.max(0,t-.06)*45);
      const e2=t<.075?0:Math.min(1,(t-.075)/.008)*Math.exp(-Math.max(0,t-.14)*40);
      data[i]=Math.pow(1-u,1.5)*.17*((Math.sin(p1)+.2*Math.sin(3*p1))*e1+(Math.sin(p2)+.2*Math.sin(3*p2))*e2);
    }
  }
  // Shift over: three rising mallet notes (C5 E5 G5), one short phrase before the summary.
  function shift(duration,data){
    const notes=[[0,523.25],[.12,659.25],[.24,783.99]];
    for(let i=0;i<data.length;i++){
      const t=i/RATE,u=t/duration;let value=0;
      for(const [at,frequency] of notes){const dt=t-at;if(dt<0)continue;const p=TAU*frequency*dt;value+=(Math.sin(p)+.12*Math.sin(4*p)*Math.exp(-dt*60))*Math.exp(-dt*9)*Math.min(1,dt/.003);}
      data[i]=Math.pow(1-u,2)*.17*value;
    }
  }
  const SYNTH={tick,truck,warn,shift};
  function create(options={}){
    const audio=options.controller||PptAudio.create({enabled:true,storage:options.storage,softHolds:SOFT_HOLDS});
    const buffers=new Map(),lastCue=new Map();let attempted=false;
    const now=options.now||(()=>globalThis.performance?.now?.()??Date.now());
    function prepare(){
      if(attempted)return;attempted=true;
      try{
        const make=options.bufferFactory||(spec=>new globalThis.AudioBuffer(spec));
        for(const [key,duration] of Object.entries(DURATIONS)){
          const buffer=make({numberOfChannels:1,length:Math.ceil(RATE*duration),sampleRate:RATE}),data=buffer.getChannelData(0);
          // Deterministic noise sources avoid consuming the game's RNG.
          if(SYNTH[key])SYNTH[key](duration,data);else action(key,duration,data);
          buffers.set(key,buffer);
        }
      }catch{buffers.clear();} // Unsupported audio is a quiet fallback.
    }
    return Object.freeze({
      unlock(event){try{if(event?.isTrusted!==true)return Promise.resolve(false);const result=audio.unlock(event);prepare();return Promise.resolve(result).catch(()=>false);}catch{return Promise.resolve(false);}},
      sync(value){try{audio.setActivity(value);}catch{}},
      cue(key){try{const time=now(),limit=LIMITS[key]||120;if(!Number.isFinite(time)||!buffers.has(key)||lastCue.has(key)&&time-lastCue.get(key)<limit)return false;const played=audio.playSfx(buffers.get(key),{key,ui:UI.has(key)});if(played)lastCue.set(key,time);return played;}catch{return false;}},
      setPreferences(value){try{return audio.setPreferences({sfxMuted:value.sfxMuted,sfxVolume:value.sfxVolume});}catch{return this.snapshot().preferences;}},
      snapshot(){return audio.snapshot();},
      dispose(){try{audio.dispose();}catch{}buffers.clear();}
    });
  }
  return Object.freeze({create,keys:Object.freeze(Object.keys(DURATIONS)),softHolds:Object.freeze([...SOFT_HOLDS])});
})();
