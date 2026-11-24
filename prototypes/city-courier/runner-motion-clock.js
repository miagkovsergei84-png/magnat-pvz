'use strict';
(function(root){
  const visuals=typeof module==='object'&&module.exports?require('./street-visual-plan.js'):root.CourierStreetVisuals;
  const MAX_JOIN_STEP=.040,RECOVERY_FRACTION=.12,MAX_RECOVERY_STEP=.004;

  function nearJoin(g,advanceDistance){
    if(g?.status!=='play')return false;
    const all=g.program.visualPlan?.segments,i=g.streetIndex,seg=all?.[i];if(!seg)return false;
    const d=g.distance,half=visuals.HALF_JOIN;
    return !!all[i-1]?.joinAfter&&d<seg.start+half ||
      seg.joinAfter&&d<seg.end&&d+advanceDistance>seg.end-half;
  }

  function create(){let deferred=0;
    return Object.freeze({
      step(seconds,g,speed){
        if(!Number.isFinite(seconds)||seconds<=0)return 0;
        // Normal frame deltas are untouched. At a stitch, amortize the time
        // of a late callback instead of jumping past blend and road frames.
        // Recovery never creates another big move, and all gameplay and
        // artwork share the same simulation clock and crossing position.
        const recovery=Math.min(deferred,MAX_RECOVERY_STEP,seconds*RECOVERY_FRACTION,Math.max(0,MAX_JOIN_STEP-seconds));
        const wanted=seconds+recovery,used=nearJoin(g,wanted*speed)?Math.min(wanted,MAX_JOIN_STEP):wanted;
        deferred=Math.max(0,deferred+seconds-used);if(deferred<1e-8)deferred=0;
        return used;
      },
      pending:()=>deferred,
      reset(){deferred=0;}
    });
  }

  const api=Object.freeze({create,nearJoin,MAX_JOIN_STEP,MAX_RECOVERY_STEP});
  if(typeof module==='object'&&module.exports)module.exports=api;else root.CourierMotionClock=api;
})(globalThis);
