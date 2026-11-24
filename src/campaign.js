// Pure, serializable story-campaign rules. No DOM, persistence, RNG or SDK.
// Numerical goals and restart support are preliminary playtest hypotheses.
globalThis.PptCampaign = (() => {
  const VERSION = 1;
  const CITY_PROMOTION_RATING = 4.8;
  // Provisional goals for the playable route into the capital. They can be
  // tuned after a human playthrough without changing older saved configs.
  const CITY_COMPLETION_SHIFTS = 6;
  // Workable defaults for the second district; tune with human playtesting.
  const CITY_CENTER_SHIFTS = 2, CITY_CENTER_LOCKER_PICKUPS = 1;
  const CAPITAL_RATING = 4.5, CAPITAL_STREAK = 2;
  // A staff-room expansion represents a real renovation, so successive
  // levels unlock only after four more calendar days. Legacy saves did not
  // record a purchase day: retain owned levels and use the earliest possible
  // second-level day rather than fabricating a new waiting period on load.
  const STAFFROOM_INTERVAL = 4;
  function staffRoomUnlockDay(state, firstDay = 12) {
    if (!state || typeof state !== 'object' || !Number.isSafeInteger(firstDay) || firstDay < 1)
      throw new TypeError('Invalid staff room state');
    const level = Number.isSafeInteger(state.up?.staffroom) ? state.up.staffroom : 0;
    if (level < 1) return firstDay;
    const recorded = Number.isSafeInteger(state.staffroomNextDay) && state.staffroomNextDay > 0 ? state.staffroomNextDay : firstDay + STAFFROOM_INTERVAL;
    return Math.max(firstDay + STAFFROOM_INTERVAL, recorded);
  }
  function recordStaffRoomPurchase(state, day = state?.day) {
    if (!state || !Number.isSafeInteger(day) || day < 1 || day > Number.MAX_SAFE_INTEGER - STAFFROOM_INTERVAL)
      throw new TypeError('Invalid staff room purchase day');
    state.staffroomNextDay = day + STAFFROOM_INTERVAL;
  }
  const emptyCapitalBranches = () => ({1:{lastDay:null,streak:0},2:{lastDay:null,streak:0}});
  const DEFAULTS = Object.freeze({
    village: Object.freeze({ shifts: 5, served: 50, rating: 4.0, streak: 2, staff: 1, cash: 500 }),
    town: Object.freeze({ shifts: 6, served: 70, rating: 4.0, streak: 3, staff: 1, cash: 500 })
  });
  const clone = value => JSON.parse(JSON.stringify(value));
  const finite = (value, name) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`Invalid ${name}`);
    return value;
  };
  const nonnegative = (value, name) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`Invalid ${name}`);
    return value;
  };
  function normalizeConfig(config = DEFAULTS) {
    const result = {};
    for (const chapter of ['village', 'town']) {
      const source = config?.[chapter];
      if (!source || typeof source !== 'object') throw new TypeError(`Missing ${chapter} goals`);
      const rating = finite(source.rating, 'rating target');
      if (rating < 1 || rating > 5) throw new TypeError('Invalid rating target');
      result[chapter] = {
        shifts: nonnegative(source.shifts, 'shift target'),
        served: nonnegative(source.served, 'customer target'),
        rating,
        streak: nonnegative(source.streak, 'streak target'),
        staff: nonnegative(source.staff, 'staff target'),
        cash: nonnegative(source.cash, 'cash target')
      };
    }
    return result;
  }
  function create(config = DEFAULTS) {
    return { version: VERSION, chapter: 'village', status: 'active', shifts: 0,
      served: 0, ratingStreak: 0, lastRating: null, config: normalizeConfig(config) };
  }
  function assertCampaign(campaign) {
    if (!campaign || campaign.version !== VERSION || !['village', 'town', 'city', 'capital'].includes(campaign.chapter) ||
        !['active', 'complete'].includes(campaign.status) ||
        !Number.isSafeInteger(campaign.shifts) || campaign.shifts < 0 ||
        !Number.isSafeInteger(campaign.served) || campaign.served < 0 ||
        !Number.isSafeInteger(campaign.ratingStreak) || campaign.ratingStreak < 0 ||
        (campaign.lastRating !== null && (!Number.isFinite(campaign.lastRating) || campaign.lastRating < 1 || campaign.lastRating > 5))) {
      throw new TypeError('Invalid campaign');
    }
    normalizeConfig(campaign.config);
    if ('townProgress' in campaign) {
      const progress = campaign.townProgress;
      if (campaign.chapter !== 'town' || !progress || typeof progress !== 'object' || Array.isArray(progress) ||
          progress.version !== 1 || !((typeof progress.carriedEmployeeId === 'string' && progress.carriedEmployeeId.length > 0) ||
          Number.isSafeInteger(progress.carriedEmployeeId))) throw new TypeError('Invalid town progress');
      nonnegative(progress.revenue, 'town revenue');
    }
    if (campaign.chapter === 'city') {
      const progress = campaign.cityProgress;
      if (!progress || typeof progress !== 'object' || Array.isArray(progress) || progress.version !== 1 ||
          typeof progress.promotionSeen !== 'boolean' || typeof progress.bloggerVisited !== 'boolean' ||
          (progress.bloggerVisited && !progress.promotionSeen)) throw new TypeError('Invalid city progress');
      // New fields are optional for city saves written before the technology
      // quest was added; the runtime migrates them without changing old money.
      for (const field of ['technologySeen','aiIntroduced'])
        if (field in progress && typeof progress[field] !== 'boolean') throw new TypeError('Invalid city progress');
      if ('lastAiTipShift' in progress && (!Number.isSafeInteger(progress.lastAiTipShift) || progress.lastAiTipShift < 0 || progress.lastAiTipShift > campaign.shifts)) throw new TypeError('Invalid city tip shift');
      if ('nextAiTipIndex' in progress && (!Number.isSafeInteger(progress.nextAiTipIndex) || progress.nextAiTipIndex < 0 || progress.nextAiTipIndex > 3)) throw new TypeError('Invalid city tip index');
      // Released city saves have no district field: they are on the outskirts.
      // Completed old city saves must stay complete and remain able to move on.
      if ('district' in progress && !['outskirts','center'].includes(progress.district)) throw new TypeError('Invalid city district');
      if (progress.district === 'center' &&
          (!Number.isSafeInteger(progress.centerShifts) || progress.centerShifts < 0 || progress.centerShifts > campaign.shifts ||
           typeof progress.centerIntroSeen !== 'boolean' || typeof progress.lockerPickupSeen !== 'boolean' ||
           (!progress.centerIntroSeen && (progress.centerShifts > 0 || progress.lockerPickupSeen))))
        throw new TypeError('Invalid city center progress');
    } else if ('cityProgress' in campaign) throw new TypeError('City progress outside city');
    if (campaign.chapter === 'capital') {
      const progress = campaign.capitalProgress;
      if (!progress || typeof progress !== 'object' || Array.isArray(progress) || progress.version !== 1 ||
          typeof progress.aiIntroduced !== 'boolean' ||
          !Number.isSafeInteger(progress.lastAiTipShift) || progress.lastAiTipShift < 0 || progress.lastAiTipShift > campaign.shifts ||
          !Number.isSafeInteger(progress.nextAiTipIndex) || progress.nextAiTipIndex < 0 || progress.nextAiTipIndex > 3)
        throw new TypeError('Invalid capital progress');
      // Older test saves did not track the two points yet. Their goals start
      // from zero; existing cash, shifts and advice state are not changed.
      if ('branchProgress' in progress) {
        const branches=progress.branchProgress;
        if (!branches || typeof branches!=='object' || Array.isArray(branches) ||
            Object.keys(branches).length!==2 || ![1,2].every(id=>{
              const item=branches[id];
              return item && typeof item==='object' && !Array.isArray(item) &&
                (item.lastDay===null||(Number.isSafeInteger(item.lastDay)&&item.lastDay>=1)) &&
                Number.isSafeInteger(item.streak) && item.streak>=0 && item.streak<=CAPITAL_STREAK &&
                (item.lastDay!==null||item.streak===0);
            })) throw new TypeError('Invalid capital branch progress');
      }
    } else if ('capitalProgress' in campaign) throw new TypeError('Capital progress outside capital');
    return campaign;
  }
  // shiftId is the durable 1-based shift number within this chapter. Replays
  // are ignored, gaps are errors, and a stale chapter cannot change progress.
  function recordShift(campaign, { chapter, shiftId, rating, served, revenue = 0 } = {}) {
    assertCampaign(campaign);
    if (campaign.status !== 'active' || chapter !== campaign.chapter) throw new Error('Inactive or wrong chapter');
    if (!Number.isSafeInteger(shiftId) || shiftId < 1) throw new TypeError('Invalid shift ID');
    if (shiftId <= campaign.shifts) return { campaign: clone(campaign), recorded: false };
    if (shiftId !== campaign.shifts + 1) throw new Error('Missing prior shift');
    if (campaign.chapter === 'city' && campaign.cityProgress.district === 'center' && !campaign.cityProgress.centerIntroSeen)
      throw new Error('City center introduction is not complete');
    rating = finite(rating, 'rating');
    if (rating < 1 || rating > 5) throw new TypeError('Invalid rating');
    nonnegative(served, 'served customers');
    if (!Number.isSafeInteger(campaign.served + served)) throw new RangeError('Customer count overflow');
    if (campaign.townProgress) {
      nonnegative(revenue, 'shift revenue');
      if (!Number.isSafeInteger(campaign.townProgress.revenue + revenue)) throw new RangeError('Town revenue overflow');
    }
    const next = clone(campaign), target = next.chapter === 'city' ? {rating:CITY_PROMOTION_RATING} :
      next.chapter === 'capital' ? {rating:4.0} : next.config[next.chapter];
    next.shifts = shiftId;
    next.served += served;
    if (next.townProgress) next.townProgress.revenue += revenue;
    if (next.chapter === 'city' && next.cityProgress.district === 'center') next.cityProgress.centerShifts++;
    next.lastRating = rating;
    // First shift is an introduction; start the streak at the second result.
    next.ratingStreak = shiftId >= 2 && rating >= target.rating ? next.ratingStreak + 1 : 0;
    return { campaign: next, recorded: true };
  }
  // Record each capital location against its own local day. Only shifts made
  // while both locations participate contribute to the final streaks. The
  // outskirts also owns the chapter shift counter used by the AI advice.
  function recordCapitalShift(campaign, { branchId, day, rating, served, together } = {}) {
    assertCampaign(campaign);
    if (campaign.chapter!=='capital'||campaign.status!=='active') throw new Error('Capital is not active');
    if (![1,2].includes(branchId)||!Number.isSafeInteger(day)||day<1||typeof together!=='boolean')
      throw new TypeError('Invalid capital shift');
    rating=finite(rating,'rating');if(rating<1||rating>5)throw new TypeError('Invalid rating');
    nonnegative(served,'served customers');
    const progress=campaign.capitalProgress.branchProgress||emptyCapitalBranches(),previous=progress[branchId];
    if(previous.lastDay!==null&&day<=previous.lastDay)return {campaign:clone(campaign),recorded:false};
    if(previous.lastDay!==null&&day!==previous.lastDay+1)throw new Error('Missing prior capital shift');
    const next=branchId===1?recordShift(campaign,{chapter:'capital',shiftId:campaign.shifts+1,rating,served}).campaign:clone(campaign);
    if(!next.capitalProgress.branchProgress)next.capitalProgress.branchProgress=emptyCapitalBranches();
    const item=next.capitalProgress.branchProgress[branchId];item.lastDay=day;
    item.streak=together&&rating>=CAPITAL_RATING?Math.min(CAPITAL_STREAK,item.streak+1):0;
    return {campaign:next,recorded:true};
  }
  function goals(campaign, { cash, staff, rating, aiLevel = 0, branchCount = 1, branches } = {}) {
    assertCampaign(campaign);
    finite(cash, 'cash');
    if (!Array.isArray(staff) || staff.some(person => !person ||
        !(typeof person.id === 'string' && person.id.length > 0) && !Number.isSafeInteger(person.id)) ||
        new Set(staff.map(person => person.id)).size !== staff.length) throw new TypeError('Invalid staff');
    if (campaign.chapter === 'city') {
      const current = rating === undefined ? campaign.lastRating : finite(rating, 'current rating');
      if (current !== null && (current < 1 || current > 5)) throw new TypeError('Invalid current rating');
      nonnegative(aiLevel, 'AI level');
      if (aiLevel > 2) throw new TypeError('Invalid AI level');
      if (campaign.cityProgress.district === 'center') {
        const progress=campaign.cityProgress;
        const checks={
          centerShifts:{current:progress.centerShifts,target:CITY_CENTER_SHIFTS,met:progress.centerShifts>=CITY_CENTER_SHIFTS},
          staff:{current:staff.length,target:1,met:staff.length>=1}
        };
        return {checks,ready:campaign.status==='active'&&progress.centerIntroSeen&&progress.aiIntroduced===true&&aiLevel>0&&
          Object.values(checks).every(check=>check.met)};
      }
      const checks={promotion:{current,minimum:CITY_PROMOTION_RATING,
        met:campaign.cityProgress.bloggerVisited,introduced:campaign.cityProgress.promotionSeen},
        shifts:{current:campaign.shifts,target:CITY_COMPLETION_SHIFTS,met:campaign.shifts>=CITY_COMPLETION_SHIFTS},
        staff:{current:staff.length,target:1,met:staff.length>=1}};
      if(campaign.cityProgress.technologySeen)checks.ai={current:Math.min(aiLevel,1),target:1,met:aiLevel>0};
      // Do not allow the meeting to be bypassed immediately after the purchase;
      // the presentation persists independently until its final line is read.
      const introduced=campaign.cityProgress.technologySeen===true&&campaign.cityProgress.aiIntroduced===true;
      return {checks,ready:campaign.status==='active'&&introduced&&aiLevel>0&&Object.values(checks).every(check=>check.met)};
    }
    if (campaign.chapter === 'capital') {
      if (!Number.isSafeInteger(branchCount) || branchCount < 1 || branchCount > 2) throw new TypeError('Invalid branch count');
      if(branches!==undefined&&(!Array.isArray(branches)||branches.length!==branchCount||
          branches.some(branch=>!branch||![1,2].includes(branch.id)||!['brief','play','summary','shop','team','over'].includes(branch.status))||
          new Set(branches.map(branch=>branch.id)).size!==branches.length))throw new TypeError('Invalid capital branches');
      const progress=campaign.capitalProgress.branchProgress||emptyCapitalBranches(),bothOpen=branchCount===2&&
        (!branches||branches.every(branch=>branch.status!=='over'));
      const checks={network:{current:branchCount,target:2,met:bothOpen},
        outskirts:{current:progress[1].streak,target:CAPITAL_STREAK,minimum:CAPITAL_RATING,met:progress[1].streak>=CAPITAL_STREAK},
        center:{current:progress[2].streak,target:CAPITAL_STREAK,minimum:CAPITAL_RATING,met:progress[2].streak>=CAPITAL_STREAK}};
      const idle=!!branches&&bothOpen&&branches.every(branch=>branch.status!=='play');
      return {checks,ready:campaign.status==='active'&&idle&&Object.values(checks).every(check=>check.met)};
    }
    const target = campaign.config[campaign.chapter];
    const townProgress = campaign.townProgress;
    const newStaff = townProgress ? staff.filter(person => person.id !== townProgress.carriedEmployeeId).length : 0;
    const checks = {
      shifts: { current: campaign.shifts, target: target.shifts, met: campaign.shifts >= target.shifts },
      served: { current: campaign.served, target: target.served, met: campaign.served >= target.served },
      rating: { current: campaign.lastRating, minimum: target.rating, streak: campaign.ratingStreak,
        target: target.streak, met: campaign.ratingStreak >= target.streak },
      staff: townProgress ? { current: newStaff, target: target.staff, met: newStaff >= target.staff, kind: 'new_hire' } :
        { current: staff.length, target: target.staff, met: staff.length >= target.staff },
      cash: townProgress ? { current: townProgress.revenue, target: target.cash, met: townProgress.revenue >= target.cash, kind: 'town_revenue' } :
        { current: cash, target: target.cash, met: cash >= target.cash }
    };
    return { checks, ready: campaign.status === 'active' && Object.values(checks).every(check => check.met) };
  }
  // The owner persists the resulting campaign, carried money and worker as one
  // atomic state transition. No transition fee is charged.
  function advance(campaign, { cash, staff, selectedId, rating, aiLevel, branchCount, branches } = {}) {
    const check = goals(campaign, { cash, staff, rating, aiLevel, branchCount, branches });
    if (!check.ready) throw new Error('Chapter goals are not complete');
    // On the outskirts "ready" means the central district can be opened,
    // not that the city chapter can be skipped.
    if (campaign.chapter === 'city' && campaign.cityProgress.district !== 'center') throw new Error('Move to city center first');
    const next = clone(campaign);
    if (next.chapter === 'town' || next.chapter === 'city' || next.chapter === 'capital') {
      next.status = 'complete';
      return { campaign: next, cash, person: null };
    }
    const matches = staff.filter(person => person && (typeof person.id === 'string' || Number.isSafeInteger(person.id)) && person.id === selectedId);
    if (matches.length !== 1) throw new Error('Choose one current staff member');
    const person = clone(matches[0]);
    next.chapter = 'town';
    next.shifts = 0;
    next.served = 0;
    next.ratingStreak = 0;
    next.lastRating = null;
    next.townProgress = { version: 1, carriedEmployeeId: person.id, revenue: 0 };
    return { campaign: next, cash, person };
  }
  // Existing saves already ended the first test at the town finale. A
  // deliberate second step starts city and selects exactly one current worker.
  function beginCity(campaign, { cash, staff, selectedId } = {}) {
    assertCampaign(campaign);
    finite(cash, 'cash');
    if (campaign.chapter !== 'town' || campaign.status !== 'complete') throw new Error('Town is not complete');
    goals(campaign, {cash,staff});
    const matches = staff.filter(person => person && (typeof person.id === 'string' || Number.isSafeInteger(person.id)) && person.id === selectedId);
    if (matches.length !== 1) throw new Error('Choose one current staff member');
    const next = clone(campaign), person = clone(matches[0]);
    next.chapter = 'city';next.status = 'active';next.shifts = 0;next.served = 0;next.ratingStreak = 0;next.lastRating = null;
    delete next.townProgress;
    next.cityProgress = {version:1,promotionSeen:false,bloggerVisited:false,technologySeen:false,
      aiIntroduced:false,lastAiTipShift:0,nextAiTipIndex:0};
    return {campaign:next,cash,person};
  }
  // This is a move within the chapter, not another branch. The caller commits
  // the returned campaign together with its one existing branch and money.
  function beginCityCenter(campaign, { cash, staff, rating, aiLevel = 0 } = {}) {
    assertCampaign(campaign);
    if (campaign.chapter !== 'city' || campaign.status !== 'active' || campaign.cityProgress.district === 'center')
      throw new Error('City outskirts are not active');
    if (!goals(campaign,{cash,staff,rating,aiLevel}).ready) throw new Error('City outskirts goals are not complete');
    const next=clone(campaign);
    Object.assign(next.cityProgress,{district:'center',centerShifts:0,centerIntroSeen:false,lockerPickupSeen:false});
    assertCampaign(next);
    return {campaign:next,cash};
  }
  function markCityCenterIntroduction(campaign) {
    assertCampaign(campaign);
    if (campaign.chapter !== 'city' || campaign.status !== 'active' || campaign.cityProgress.district !== 'center')
      throw new Error('City center is not active');
    const next=clone(campaign),changed=!next.cityProgress.centerIntroSeen;
    next.cityProgress.centerIntroSeen=true;
    return {campaign:next,changed};
  }
  // Called on a real handoff, in the same saved graph as payment and removal.
  // A boolean deliberately makes repeated notifications harmless.
  function recordCityLockerPickup(campaign) {
    assertCampaign(campaign);
    if (campaign.chapter !== 'city' || campaign.status !== 'active' || campaign.cityProgress.district !== 'center' ||
        !campaign.cityProgress.centerIntroSeen) throw new Error('City center locker is not introduced');
    const next=clone(campaign),recorded=!next.cityProgress.lockerPickupSeen;
    next.cityProgress.lockerPickupSeen=true;
    return {campaign:next,recorded};
  }
  // Complete city on the current checkpoint first, then deliberately select
  // exactly one employee. The owner persists the returned campaign, worker,
  // cash and fresh branch together; this function never mutates the old save.
  function beginCapital(campaign, { cash, staff, selectedId, rating, aiLevel = 0 } = {}) {
    assertCampaign(campaign);
    finite(cash, 'cash');
    if (campaign.chapter !== 'city' || campaign.status !== 'complete') throw new Error('City is not complete');
    const active = clone(campaign);active.status='active';
    // A released save may already be at the city departure screen, before
    // district tracking existed. Keep its completed transition valid.
    const legacyComplete=!Object.prototype.hasOwnProperty.call(campaign.cityProgress,'district');
    if ((!legacyComplete&&campaign.cityProgress.district!=='center')||!goals(active,{cash,staff,rating,aiLevel}).ready)
      throw new Error('City goals are not complete');
    const matches=staff.filter(person=>person && (typeof person.id==='string' || Number.isSafeInteger(person.id)) && person.id===selectedId);
    if (matches.length!==1) throw new Error('Choose one current staff member');
    const next=clone(campaign),person=clone(matches[0]),progress=next.cityProgress;
    next.chapter='capital';next.status='active';next.shifts=0;next.served=0;next.ratingStreak=0;next.lastRating=null;
    next.capitalProgress={version:1,aiIntroduced:progress.aiIntroduced===true,
      lastAiTipShift:0,nextAiTipIndex:progress.nextAiTipIndex??0,branchProgress:emptyCapitalBranches()};
    delete next.cityProgress;
    return {campaign:next,cash,person};
  }
  function cityBloggerEligible(campaign, rating) {
    assertCampaign(campaign);
    rating = finite(rating, 'current rating');
    if (rating < 1 || rating > 5) throw new TypeError('Invalid current rating');
    return campaign.chapter === 'city' && campaign.status === 'active' &&
      campaign.cityProgress.promotionSeen && rating >= CITY_PROMOTION_RATING;
  }
  // Restart uses current cash, never the original chapter balance: repeated
  // failures cannot recover money by restoring a checkpoint. A small safety
  // grant avoids an unplayable negative or tiny balance and is reported as such.
  function restart(campaign, { cash } = {}) {
    assertCampaign(campaign);
    if (campaign.status !== 'active') throw new Error('Campaign already complete');
    finite(cash, 'cash');
    const available = Math.max(0, cash), penalty = Math.floor(available * 0.1);
    const afterPenalty = available - penalty, support = Math.max(0, 60 - afterPenalty);
    const next = clone(campaign);
    next.shifts = 0;
    next.served = 0;
    next.ratingStreak = 0;
    next.lastRating = null;
    if (next.townProgress) next.townProgress.revenue = 0;
    if (next.cityProgress) {
      const city=next.cityProgress,center=city.district==='center';
      next.cityProgress = {version:1,promotionSeen:city.promotionSeen,bloggerVisited:center?city.bloggerVisited:false,
        technologySeen:city.technologySeen===true,aiIntroduced:city.aiIntroduced===true,
        lastAiTipShift:0,nextAiTipIndex:city.nextAiTipIndex??0};
      if(center)Object.assign(next.cityProgress,{district:'center',centerShifts:0,
        centerIntroSeen:city.centerIntroSeen,lockerPickupSeen:false});
      else if(city.district==='outskirts')next.cityProgress.district='outskirts';
    }
    if (next.capitalProgress) next.capitalProgress = {version:1,aiIntroduced:next.capitalProgress.aiIntroduced,
      lastAiTipShift:0,nextAiTipIndex:next.capitalProgress.nextAiTipIndex,branchProgress:emptyCapitalBranches()};
    return { campaign: next, cash: afterPenalty + support, penalty, support, clearedDebt: Math.max(0, -cash) };
  }
  return Object.freeze({ VERSION, DEFAULTS, CITY_PROMOTION_RATING, CITY_COMPLETION_SHIFTS, CITY_CENTER_SHIFTS, CITY_CENTER_LOCKER_PICKUPS, CAPITAL_RATING, CAPITAL_STREAK, STAFFROOM_INTERVAL, staffRoomUnlockDay, recordStaffRoomPurchase,
    create, assertCampaign, recordShift, recordCapitalShift, goals, advance, beginCity, beginCityCenter, markCityCenterIntroduction, recordCityLockerPickup, beginCapital, cityBloggerEligible, restart });
})();
