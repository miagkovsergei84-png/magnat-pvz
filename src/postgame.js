// Pure rules of the game after the story: recognition points, away shifts,
// their goals and rewards. No DOM, persistence, RNG or SDK. Every number here
// is a starting value for playtests, not a confirmed balance.
globalThis.PptPostgame = (() => {
  const VERSION = 1;
  // The capital is the player's home after the finale, so it is not a trip.
  const LOCATIONS = Object.freeze(['village', 'town', 'city', 'city-center']);
  // flow: customer and supply multiplier; patience: waiting time multiplier;
  // goal: share of the mean demand asked by the main goal; personal: share of
  // the main goal the owner is asked to hand out personally.
  const LEVELS = Object.freeze({
    calm: Object.freeze({ flow: 0.85, patience: 1.15, goal: 0.55, points: 1, share: 0.15, cap: 100, personal: 0.2, checks: 2 }),
    normal: Object.freeze({ flow: 1, patience: 1, goal: 0.7, points: 2, share: 0.25, cap: 200, personal: 0.3, checks: 3 }),
    challenge: Object.freeze({ flow: 1.2, patience: 0.9, goal: 0.85, points: 3, share: 0.35, cap: 300, personal: 0.4, checks: 4 })
  });
  const LEVEL_IDS = Object.freeze(Object.keys(LEVELS));
  const RANKS = Object.freeze([0, 10, 25, 50]);
  const GOAL_IDS = Object.freeze(['served', 'noAngry', 'fewMistakes', 'unloadAll', 'noBroken', 'personal', 'checks']);
  const count = (value, name) => {
    if (!Number.isSafeInteger(value) || value < 0) throw new TypeError(`Invalid ${name}`);
    return value;
  };
  const level = id => {
    if (!Object.prototype.hasOwnProperty.call(LEVELS, id)) throw new TypeError('Invalid away level');
    return LEVELS[id];
  };
  const place = id => {
    const index = LOCATIONS.indexOf(id);
    if (index < 0) throw new TypeError('Invalid away location');
    return index;
  };
  function create() { return { version: VERSION, points: 0, trips: 0 }; }
  // The section exists only after the capital finale; older saves have none.
  function assertPostgame(postgame, campaign) {
    if (!postgame || typeof postgame !== 'object' || Array.isArray(postgame) || postgame.version !== VERSION ||
        Object.keys(postgame).some(key => !['version', 'points', 'trips'].includes(key)))
      throw new TypeError('Invalid postgame');
    count(postgame.points, 'recognition points');
    count(postgame.trips, 'trip count');
    if (!campaign || campaign.chapter !== 'capital' || campaign.status !== 'complete')
      throw new TypeError('Postgame before the finale');
    return postgame;
  }
  // A stand-in chapter state: the visited point reuses the story rules for its
  // backdrop, visitors, difficulty and available technology. It is never saved.
  function campaignFor(location) {
    place(location);
    const campaign = globalThis.PptCampaign.create();
    if (location === 'village') campaign.shifts = 5;
    else if (location === 'town') { campaign.chapter = 'town'; campaign.shifts = 3; }
    else {
      const center = location === 'city-center';
      campaign.chapter = 'city';
      campaign.shifts = center ? 8 : 6;
      campaign.cityProgress = { version: 1, promotionSeen: true, bloggerVisited: true, technologySeen: true,
        aiIntroduced: true, lastAiTipShift: campaign.shifts, nextAiTipIndex: 0, district: center ? 'center' : 'outskirts' };
      if (center) Object.assign(campaign.cityProgress, { centerShifts: 2, centerIntroSeen: true, lockerPickupSeen: true });
    }
    return globalThis.PptCampaign.assertCampaign(campaign);
  }
  // Applies a level to an already built shift configuration. Supply grows with
  // the flow, and the main goal never exceeds what can arrive or be delivered.
  function tune(config, levelId) {
    const rule = level(levelId);
    if (!config || !Number.isFinite(config.cust) || config.cust <= 0 || !Number.isFinite(config.pat) || config.pat <= 0 ||
        !Number.isFinite(config.cargo) || config.cargo <= 0 || !Array.isArray(config.trucks) || !config.trucks.length ||
        !Number.isFinite(config.ret) || config.ret < 0 || config.ret > 1 || !Number.isFinite(config.multi) || config.multi < 0)
      throw new TypeError('Invalid shift configuration');
    const next = { ...config, trucks: config.trucks.slice() };
    next.cust = config.cust / rule.flow;
    next.pat = config.pat * rule.patience;
    next.cargo = Math.max(5, Math.round(config.cargo * rule.flow));
    const arrivals = Math.ceil(114 / next.cust);
    const demand = arrivals * (1 - next.ret) * (1 + next.multi), supply = next.cargo * next.trucks.length;
    next.goal = Math.max(1, Math.floor(Math.min(demand, supply) * rule.goal));
    return next;
  }
  // Deterministic for a place, a level and the number of finished trips, so
  // reopening the screen or changing the language never rerolls the goals.
  function goalsFor({ location, level: levelId, trips, config } = {}) {
    const index = place(location), rule = level(levelId);
    count(trips, 'trip count');
    if (!config || !Number.isSafeInteger(config.goal) || config.goal < 1) throw new TypeError('Invalid shift configuration');
    const quality = ['noAngry', 'fewMistakes', 'unloadAll'];
    if (config.frag > 0) quality.push('noBroken');
    const active = ['personal'];
    // Personal checks are offered only where the story introduced them.
    const arrivals = Math.ceil(114 / config.cust), marks = Math.floor(arrivals * (1 - config.ret) / 3 * 0.6);
    if (location.startsWith('city') && marks >= 1) active.push('checks');
    const turn = trips + index, pick = active[turn % active.length];
    return [
      { id: 'served', target: config.goal },
      { id: quality[turn % quality.length] },
      pick === 'checks' ? { id: 'checks', target: Math.max(1, Math.min(rule.checks, marks)) }
        : { id: 'personal', target: Math.max(2, Math.round(config.goal * rule.personal)) }
    ];
  }
  const qualityLimits = {
    noAngry: ['angry', 0], fewMistakes: ['mistakes', 1], unloadAll: ['sentBack', 0], noBroken: ['broken', 0]
  };
  function progress(goals, stats) {
    if (!Array.isArray(goals) || goals.length !== 3 || !stats || typeof stats !== 'object') throw new TypeError('Invalid away result');
    for (const name of ['served', 'angry', 'mistakes', 'broken', 'sentBack', 'personal', 'checks']) count(stats[name], name);
    return goals.map(goal => {
      if (!goal || !GOAL_IDS.includes(goal.id)) throw new TypeError('Invalid away goal');
      const limit = qualityLimits[goal.id];
      if (limit) {
        const [key,maximum] = limit;
        return {value:stats[key],target:maximum,limit:true,met:stats[key]<=maximum};
      }
      return {value:stats[goal.id],target:goal.target,limit:false,met:stats[goal.id]>=goal.target};
    });
  }
  function evaluate(goals,stats) { return progress(goals,stats).map(item=>item.met); }
  // The bonus is a share of the shift revenue with a ceiling; the visited
  // point keeps its own income. A missed goal takes nothing away.
  function reward(levelId, met, revenue) {
    const rule = level(levelId);
    if (!Array.isArray(met) || met.length !== 3 || met.some(value => typeof value !== 'boolean')) throw new TypeError('Invalid away result');
    if (!Number.isFinite(revenue) || revenue < 0) throw new TypeError('Invalid away revenue');
    return { points: (met[0] ? rule.points : 0) + (met[1] ? 1 : 0) + (met[2] ? 1 : 0),
      bonus: met[0] ? Math.min(rule.cap, Math.round(revenue * rule.share)) : 0 };
  }
  // Returns a new section; the caller saves it together with the bonus.
  function settle(postgame, result) {
    if (!postgame || postgame.version !== VERSION) throw new TypeError('Invalid postgame');
    count(postgame.points, 'recognition points'); count(postgame.trips, 'trip count');
    count(result?.points, 'reward points'); count(result?.bonus, 'reward bonus');
    if (!Number.isSafeInteger(postgame.points + result.points) || !Number.isSafeInteger(postgame.trips + 1)) throw new RangeError('Postgame overflow');
    return { version: VERSION, points: postgame.points + result.points, trips: postgame.trips + 1 };
  }
  function rank(points) {
    count(points, 'recognition points');
    let index = 0;
    while (index + 1 < RANKS.length && points >= RANKS[index + 1]) index++;
    return { index, next: index + 1 < RANKS.length ? RANKS[index + 1] : null };
  }
  return Object.freeze({ VERSION, LOCATIONS, LEVELS, LEVEL_IDS, RANKS, create, assertPostgame, campaignFor, tune, goalsFor, progress, evaluate, reward, settle, rank });
})();
