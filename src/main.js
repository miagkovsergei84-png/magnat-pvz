
(()=>{
const DAY=120,BIG=4,COLD_T=30,STACK=3;
const WORLD_BOX_SIZE=17.5/.71;
const {W,H,WAIT_EXT,VIEW_H,COUNTER_Y,COUNTER_H,SERVE_Y,Q_Y,
  queueDrawY,QUEUE_BAR_Y,queueBarX,queueBarY,QUEUE_BAR_W,
  shelfRect,cellRect,cellStand,HEAP,FRIDGE,FRIDGE_STAND,fzRect,bigRect,
  FLOOR,STACK_DX,STACK_DY,TRUCK,ROBOT_HOME}=PptLayout;
const {COL,COLD,SHIRTS,AIC,SHOP,NAMES,TRAITS,ROLE_COL}=PptCatalog;

const STR=PptStrings;
const storyLockerExplanation=()=>lang==='ru'?'Курьер сам загружает назначенные заказы в шесть ячеек. Клиенты забирают каждый свой заказ; оплата поступает при получении. Если ячейки заняты, остальные заказы идут к обычному окну.':'A courier loads designated orders into six cells. Each customer collects their own order and pays on pickup. When cells are full, other orders go to the regular counter.';

// Russian is the default on a fresh install; an explicit choice is restored below.
let lang='ru';
const pluralRules={ru:new Intl.PluralRules('ru'),en:new Intl.PluralRules('en')};
const formatText=(text,params)=>typeof text==='string'?text.replace(/\{(\d+)\}/g,(token,i)=>params[i]===undefined?token:typeof params[i]==='number'?fmtNum(params[i]):params[i]):text;
function countText(key,fallback,params){
  // Choose grammar from the original count, before localized digit grouping.
  const count=params[0],category=typeof count==='number'&&Number.isFinite(count)?pluralRules[lang].select(count):null;
  const suffix=category?category[0].toUpperCase()+category.slice(1):'';
  return formatText(category?STR[lang][key+suffix]??fallback:fallback,params);
}
const t=(k,...a)=>countText(k,STR[lang][k],a);
const message=(key,...params)=>({key,params});
const messageText=value=>typeof value==='string'?value:t(value.key,...value.params.map(param=>param&&typeof param==='object'&&'staffName' in param?NAMES[lang][param.staffName]:param));
// Text that did not come from the game's own dictionaries (a line kept by an
// older save) is shown as text, never as markup.
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const rnd=n=>Math.floor(Math.random()*n);
const dist=(a,b,c,d)=>Math.hypot(a-c,b-d);
const $=id=>document.getElementById(id);
const KEY=PptSave.key,LKEY='ppt-lang';
// A stamped test build can run a second game in the same tab. Its campaign
// writes, including autosave and recovery, all go to its private slot.
const campaignStorage=()=>globalThis.PptDebugSession?.storage ?? localStorage;
function fresh(){return{day:1,cash:60,up:{},reviews:[5,4,5,4,5],heap:0,stock:[0,1,2,3].map(()=>[[],[],[],[]]),floor:FLOOR.map(()=>[]),evDay:0,ev:null,staff:[],cands:[],nid:1,perm:{pay:0,pat:0},card:null,cardOpts:[],cardDay:0,ctrOpts:[],ctrDay:0,contract:null,saleDay:0,big:[[],[],[],[]],fridge:Array(3).fill(null),locker:Array(6).fill(null)};}
function genCand(state=S){const used=new Set(state.staff.map(x=>x.n).concat(state.cands.map(x=>x.n)));let n;do{n=rnd(20);}while(used.has(n)&&used.size<20);
  return{id:state.nid++,n,trait:TRAITS[rnd(TRAITS.length)],spd:1+rnd(4),acc:1+rnd(4),lvl:1,xp:0,role:'sort'};}
function wage(s){return Math.round((20+7*(s.spd+s.acc)+6*(s.lvl-1)+(s.trait==='careful'?10:s.trait==='fast'?8:0))*(s.trait==='rookie'?.6:1));}
const nameOf=s=>NAMES[lang][s.n];
const calendarDay=(state=S,network=NETWORK)=>PptNetwork.calendarDay(state,network);
const slots=()=>PptNetwork.staffSlots(S,NETWORK);
let S=fresh(),hasSave=false,NETWORK=null,branchRuntime=null;
// An away shift runs in a temporary network that is never saved. The capital
// network owns travel purchases and receives the settled reward and staff experience.
let awayHome=null,awayLevel='normal';
const AWAY_DAY=12;
// loadBroken: the stored save itself could not be read at startup (as opposed
// to a failed write or a failed frame, where the save on disk is good).
let loadFailed=false,loadBroken=false,menuOpen=true,networkPaused=false,networkBatch=false,saveNoticeKey='saveFailed';
let playerAudio=null,audioBlurred=false,audioPageGone=false,settingsOpen=false,soundReturn=null;
let audibleTargets=new WeakSet(),playerInputActive=false,playerActionActive=false,playerActionError=false;
const playerErrorKeys=new Set(['fQueue','fBusy','fHands','fNotShelf','fNoFit','fFull','fFloorFull','fLockerReserved','fBroke','fGloves','fRefund']);
// Transient browser lifecycle holds stay outside the persisted branch model.
const externalPause=(()=>{const gate=PptPlatform.createPauseGate();return Object.freeze({snapshot:gate.snapshot,acquire(reason){const release=gate.acquire(reason);syncAudio();return()=>{const removed=release();syncAudio();return removed;};}});})();
let releaseHiddenPause=null,resetFrameClock=false;
const externallyPaused=()=>externalPause.snapshot().paused;
// Session-only presentation receipts: restored summaries never enter this set.
let contractFxPending=new Map(),contractFxCommitted=new WeakSet(),contractFxConsumed=new WeakSet(),contractFxSummary=null,contractFxQueued=false;
function stopContractFx(){try{globalThis.PptContractCelebration?.stop();}catch(e){}}
function queueContractFx(){
  if(!contractFxSummary||contractFxQueued)return;
  contractFxQueued=true;
  try{requestAnimationFrame(()=>{contractFxQueued=false;showContractFx();});}catch(e){contractFxQueued=false;}
}
function showContractFx(){
  const summary=contractFxSummary;
  if(!summary||summary!==sumData||mode!=='summary'||ov.hidden||document.hidden||menuOpen||networkPaused||paused||loadFailed||externallyPaused()||!branchRuntime.canPresent()||!contractFxCommitted.has(summary)||contractFxConsumed.has(summary))return;
  contractFxConsumed.add(summary);
  try{globalThis.PptContractCelebration?.play();}catch(e){stopContractFx();}
}
function commitContractFx(){
  for(const [branch,summary] of contractFxPending){
    if(NETWORK.branches.includes(branch)&&branch.status==='summary'&&branch.summary===summary)contractFxCommitted.add(summary);
    contractFxPending.delete(branch);
  }
  queueContractFx();
}
let langChosen=false;try{const l=localStorage.getItem(LKEY);if(l==='ru'||l==='en'){lang=l;langChosen=true;}}catch(e){}
// Inside VK the language of the VK interface is the default until the player picks one.
if(!langChosen){const vkLang=globalThis.PptVkRuntime?.language;if(vkLang==='ru'||vkLang==='en')lang=vkLang;}
// vkRuntime is null outside the VK package. savesLocked: a save from VK is
// being put in place and the page is about to reload; nothing may overwrite it.
let vkRuntime=null,savesLocked=false;
function save(){
  if(globalThis.PptDebugSession?.covered)return true;
  if(savesLocked||loadFailed||!NETWORK||!branchRuntime)return false;
  if(NETWORK.away)return true;
  branchRuntime.capture();
  try{PptSave.writeNetwork(campaignStorage(),NETWORK);hasSave=true;$('saveNotice').hidden=true;commitContractFx();try{vkRuntime?.noteSave();}catch{}return true;}
  catch(e){console.error('Save failed:',e);if(e.saveUncertain){loadFailed=true;showStorageError();}saveNoticeKey=e.saveUncertain?'cancelExpansionUncertain':'saveFailed';$('saveNotice').textContent=t(saveNoticeKey);$('saveNotice').hidden=false;return false;}
}
// Equipment bought in older saves is retained. A live robot may finish its
// shift; an old locker remains accessible until its saved parcels are cleared.
// The old window locker drains separately from the automatic story machine.
const storyLockerAvailable=()=>NETWORK?.campaign?.chapter==='capital'||
  (NETWORK?.campaign?.chapter==='city'&&NETWORK.campaign.cityProgress?.district==='center'&&NETWORK.campaign.cityProgress.centerIntroSeen===true);
const campaignTechLocked=id=>!!NETWORK?.campaign&&(
  (['village','town'].includes(NETWORK.campaign.chapter)&&['robot','tune','ai','locker'].includes(id))||
  (['city','capital'].includes(NETWORK.campaign.chapter)&&((id==='locker'&&!storyLockerAvailable())||(NETWORK.campaign.chapter==='city'&&['robot','tune','ai'].includes(id)&&NETWORK.campaign.cityProgress.technologySeen!==true&&!(S.up?.[id]>0)))));
const legacyTechnologyActive=id=>((id==='robot'||id==='tune')&&mode==='play'&&G?.workers?.some(w=>w.kind==='robot'))||
  (id==='locker'&&(S.locker?.some(Boolean)||(mode==='play'&&G?.win?.[0]?.kind==='locker')));
const lv=id=>['shoes','brand'].includes(id)&&NETWORK?.branches?.length>1
  ?Math.max(S.up[id]||0,...NETWORK.branches.map(branch=>branch.state?.up?.[id]||0))
  :campaignTechLocked(id)&&!legacyTechnologyActive(id)?0:(S.up[id]||0);
const cap=()=>1+lv('cart');
const capCell=()=>[3,5,8][lv('shelves')];
const depth=()=>1+lv('queue');
function perksHome(){return globalThis.PptVillagePerks&&typeof activeVillageHome==='function'?activeVillageHome():null;}
function housePerk(level,style){return perksHome()?.choices?.[level-1]===style;}
function activeTownHome(){return !NETWORK?.away&&NETWORK?.campaign?.chapter==='town'&&branchRuntime?.current()?.id===1?NETWORK.townHome:null;}
function townPerk(level,style){return globalThis.PptTownRenovation?.has(activeTownHome(),level,style)===true;}
function housePowerOff(){return (G?.houseFaultUntil||0)>(G?.clock||0);}
const stars=()=>Math.min(5,S.reviews.reduce((a,b)=>a+b,0)/S.reviews.length+(perksHome()?PptVillagePerks.rating(perksHome(),S.day,S.ev):0));
// City starts with a smaller audience; the first story blogger visit removes
// that reduction. The multiplier is an explicit provisional balance value.
const flow=()=>Math.max(.6,Math.min(1.3,.6+(stars()-1)/4*.7))*(NETWORK?.campaign?.chapter==='city'&&!NETWORK.campaign.cityProgress.bloggerVisited ? .7 : 1)*(perksHome()&&!perksHome().choices[4]?0.85:1);
const comfort=()=>(lv('cooler')?.92:1)*(lv('coffee')?.85:1)*(lv('tv')?.8:1);
const nWin=()=>lv('warehouse')?5:4;
const winX=i=>(i+.5)*W/nWin();
const aiWin=()=>lv('ai')?nWin()-1:-1;
// Parcel generation and rack availability must use the same effective day.
// Saved stock remains accessible even when an older save predates that day.
function cityFreight(){return ['city','capital'].includes(NETWORK?.campaign?.chapter);}
function cityColdFreight(){return NETWORK?.campaign?.chapter==='capital'||(NETWORK?.campaign?.chapter==='city'&&NETWORK.campaign.shifts>=2);}
const fridgeOn=()=>cityColdFreight()||storyDifficultyDay(S.day)>=23||S.fridge.some(Boolean),bigOn=()=>cityFreight()||storyDifficultyDay(S.day)>=21||S.big.some(stack=>stack.length>0),
  lockerOn=()=>!NETWORK?.campaign?lv('locker')>0:(mode==='play'&&G?.win?.[0]?.kind==='locker')||!!S.locker?.some(Boolean);
function review(n){S.reviews.push(n);if(S.reviews.length>30)S.reviews.shift();}
const rentFor=d=>Math.round(30+15*d+.15*d*d);

const {cfgFor,dayConfig:baseDayConfig}=PptDayConfig;
// Story chapters without the robot and AI cannot keep up with the endless
// day-based growth of the free game. Their difficulty and rent follow the
// chapter instead: the village stops at its sixth day, the town starts from
// the same level whenever the player arrives and grows for three more shifts.
const STORY_VILLAGE_DAY_CAP=6,STORY_TOWN_BASE_DAY=6,STORY_TOWN_DAY_CAP=9,STORY_CITY_BASE_DAY=7,STORY_CAPITAL_BASE_DAY=9;
function storyDifficultyDay(day,state=S){
  const campaign=NETWORK?.campaign;
  if(!campaign)return day;
  // City begins from a consistent level regardless of how long the player
  // spent in the earlier chapters, then grows with this chapter's shifts.
  if(campaign.chapter==='city')return Math.max(1,day-(state.day-campaign.shifts)+STORY_CITY_BASE_DAY);
  // Capital's two points have independent day numbers. The centre starts on
  // its own day one even if the outskirts already ran several shifts.
  if(campaign.chapter==='capital')return Math.max(1,branchRuntime?.current()?.id===2
    ? day-1+STORY_CAPITAL_BASE_DAY : day-(state.day-campaign.shifts)+STORY_CAPITAL_BASE_DAY);
  if(!campaignTechLocked('robot'))return day;
  if(campaign.chapter==='village')return Math.min(day,STORY_VILLAGE_DAY_CAP);
  const townStart=state.day-campaign.shifts;
  return Math.max(1,Math.min(day-townStart+STORY_TOWN_BASE_DAY,STORY_TOWN_DAY_CAP));
}
function storyDayConfig(day,ev,card,state){
  if(cityFreight())return baseDayConfig(storyDifficultyDay(day,state),ev,card,state,{cityFreight:true,coldFreight:cityColdFreight()});
  if(!campaignTechLocked('robot'))return baseDayConfig(day,ev,card,state);
  return baseDayConfig(storyDifficultyDay(day,state),ev,card,{...state,up:{...state.up,robot:0,tune:0,ai:0}},{softRush:true});
}
function dayConfig(day,ev,card,state){
  const result=storyDayConfig(day,ev,card,state);
  if(!NETWORK?.away)return result;
  const c=PptPostgame.tune(result.c,NETWORK.away.level);
  c.goal=NETWORK.away.goals[0].target;
  return {c,M:result.M};
}
const HOLIDAYS=['bf','sale11','ny','sept'];
function pickEvent(d){if(d===5)return'chaos';if(d%7===0)return HOLIDAYS[(d/7-1)%4];if(d>=8&&Math.random()<.35){const rush=Math.random()<.5;return rush?(campaignTechLocked('robot')?null:'bf'):'chaos';}return null;}

// ---------- runtime ----------
let mode='brief',G=null,paused=false,sumData=null,lockerSettlementDirty=false;
// Pure shift configuration shared by the briefing and live runtime. The
// branch-local day and upgrades are supplied by the current branch state.

function newDay(deferSave=false){
  if(!PptNetwork.readyForFirstShift(branchRuntime.current())){showTeam();return;}
  if(branchRuntime.current().id===2)PptNetwork.expansionLedger(branchRuntime.current()).started=true;
  // A synchronized start can reach this branch before its brief was opened.
  if(S.evDay!==S.day){S.ev=pickEvent(S.day);S.evDay=S.day;}
  const ev=S.ev,{c,M}=dayConfig(S.day,ev,S.card,S);
  if(S.card==='coffee')S.cash-=40;
  if(S.card==='sale')S.saleDay=calendarDay();
  const nw=nWin();
  G={cfg:c,mod:M,ev,clock:0,time:DAY,plan:c.trucks.slice(),truck:null,conv:0,custClock:6,q:Array.from({length:nw},()=>[]),leaving:[],mess:[],floats:[],shake:{},hl:null,
    p:{x:180,y:440,hands:[],act:0,tg:null,busy:0,busyT:null,busyLen:1},
    workers:[],win:Array(nw).fill(null),lockerQ:[],
    gloves:false,combo:0,maxMult:1,
    st:{served:0,byAi:0,byStaff:0,byLocker:0,spoiled:0,angry:0,mistakes:0,broken:0,sentBack:0,revenue:0,refunds:0,penalties:0}};
  if(NETWORK.campaign&&S.locker.some(Boolean))G.legacyLockerDrainOnly=true;
  if(storyLockerAvailable()&&(S.up.locker||0)>0&&!G.legacyLockerDrainOnly){
    if(!S.autoLocker)S.autoLocker=PptCampaignLocker.create();
    G.autoLocker=PptCampaignLocker.runtime();
  }
  if(NETWORK.campaign)G.campaignServed=0;
  if(NETWORK.away)G.awayChecks=0;
  if(townPerk(5,'express')&&G.plan.length)G.townNextCargo=makeTruckCargo();
  const villageHome=perksHome();
  if(villageHome&&PptVillagePerks.begin(villageHome,G,S.day,ev)){
    mkWorker('load',{id:0,n:0,lvl:1,xp:0,spd:3,acc:5,role:'load',trait:'careful',temp:true});
  }
  // Assign home positions; hired cashiers still serve all available windows.
  let wi=nw-1;const lo=lockerOn()?1:0;
  if(lo)G.win[0]={kind:'locker',color:'#c9a25b'};
  if(lv('robot')&&!M.noAuto){const r=mkWorker('robot',null);r.x=ROBOT_HOME.x;r.y=ROBOT_HOME.y;}
  if(lv('ai')&&!M.noAuto){const a=mkWorker('ai',null);a.win=wi;G.win[wi]=a;wi--;}
  if(M.intern){const tmp=Object.assign(genCand(),{trait:'rookie',spd:3,acc:3,role:'sort',temp:true});mkWorker('sort',tmp);}
  // Cashier homes are resting positions, not exclusive service lanes. Reuse
  // homes on overflow without changing hired roles or replacing AI/locker.
  const cashHomes=[];for(let home=wi;home>=lo;home--)cashHomes.push(home);
  let cashierIndex=0;
  for(const s of S.staff){const w=mkWorker(s.role,s);if(s.role==='cash'){
    w.win=cashHomes[cashierIndex++%cashHomes.length];if(!G.win[w.win])G.win[w.win]=w;
  }}
  for(const w of G.workers){if(w.win!=null){w.x=winX(w.win);w.y=SERVE_Y+4;}}
  mode='play';paused=false;hideOv();syncHud();drawHands();if(!deferSave)save();
}
function mkWorker(kind,s){
  const w={kind,s,x:60+G.workers.length*40,y:500,st:'idle',cu:null,cell:null,carry:[],tg:null,dest:null,cool:1,win:null,
    color:kind==='ai'?AIC:kind==='robot'?'#a6b4c2':ROLE_COL[kind],cap:s&&s.trait==='strong'?2:1,
    err:!s||s.trait==='careful'?0:(5-s.acc)*(kind==='cash'?.04:.05)};
  G.workers.push(w);return w;}
const mult=()=>Math.min(2,1+.25*Math.floor(G.combo*G.mod.combo/4));
const key=(c,s)=>c*8+s;
function newParcel(){const c=G.cfg;if(Math.random()<c.big)return{c:rnd(c.colors),s:BIG,f:false,r:false,ready:1e9};
  const b={c:rnd(c.colors),s:rnd(c.shapes),f:Math.random()<c.frag,r:false,ready:1e9};if(Math.random()<c.cold)b.cold=COLD_T;return b;}
const allCust=()=>G.q.flat();
// Extra values are valid colours in the existing saved `shirt` field. The
// seventh village look, a second VIP fallback, and photo outfits need no new
// save fields. Free play retains its original six-colour interpretation.
const VILLAGE_EXTRA_SHIRT='#4d6688',VILLAGE_OTHER_GRANNY_SHIRT='#48604d',STORY_EXTRA_SHIRT_8='#995d4d',STORY_EXTRA_SHIRT_9='#91614d',VILLAGE_COUPLE_SHIRT='#6c6a72';
function customerVisualChapter(network=NETWORK,branchId=branchRuntime?.current()?.id??network?.activeId){
  const chapter=network?.campaign?.chapter;
  return chapter==='capital'?(branchId===2?'capital-center':'capital-outskirts'):
    chapter==='city'&&network?.campaign?.cityProgress?.district==='center'?'city-center':chapter;
}
function customerVariant(shirt,chapter){
  const index=SHIRTS.indexOf(shirt);if(index>=0)return index;
  const storyChapter=['village','town','city','city-center','capital-outskirts','capital-center'].includes(chapter);
  if(storyChapter&&shirt===VILLAGE_EXTRA_SHIRT)return 6;
  if(chapter==='village'&&shirt===VILLAGE_OTHER_GRANNY_SHIRT)return 7;
  if(storyChapter&&shirt===STORY_EXTRA_SHIRT_8)return 8;
  if(storyChapter&&shirt===STORY_EXTRA_SHIRT_9)return 9;
  if(chapter==='village'&&shirt===VILLAGE_COUPLE_SHIRT)return 10;
  return 0;
}
function customerPalette(chapter){
  const palette=[...SHIRTS,VILLAGE_EXTRA_SHIRT,STORY_EXTRA_SHIRT_8,STORY_EXTRA_SHIRT_9];
  if(chapter==='village')palette.push(VILLAGE_COUPLE_SHIRT);
  return palette;
}
// Alex and the arm-in-arm couple move at 60% of normal speed.
// Derive this from their existing appearance identity, so restored visitors
// keep the same behaviour without adding a field to older saves.
const SLOW_VISITOR_IDENTITIES=new Set(['alex','village-photo-elder-couple']);
function customerWalkFactor(person){
  if(!person||typeof PptCharacters.customerVisualKey!=='function'||typeof PptCharacters.customerIdentityKey!=='function')return 1;
  const chapter=customerVisualChapter(),style=PptCharacters.customerVisualKey(customerVariant(person.shirt,chapter),person.vip,chapter);
  return SLOW_VISITOR_IDENTITIES.has(PptCharacters.customerIdentityKey(style))?.6:1;
}
function chooseCustomerShirt(shirt,vip,shirtRoll){
  const chapter=customerVisualChapter();
  if(!['village','town','city','city-center','capital-outskirts','capital-center'].includes(chapter)||typeof PptCharacters.customerVisualKey!=='function'||typeof PptCharacters.customerIdentityKey!=='function')return shirt;
  const key=(colour,kind)=>PptCharacters.customerVisualKey(customerVariant(colour,chapter),kind,chapter);
  const occupied=new Set([...allCust(),...G.lockerQ,...G.leaving,...(G.autoLocker?.customer?[G.autoLocker.customer]:[])].map(person=>key(person.shirt,person.vip)));
  const identities=new Set([...occupied].map(style=>PptCharacters.customerIdentityKey(style)).filter(Boolean));
  // Keep Anna unique even if she has left the queue but is still on screen.
  // The second VIP's colour is durable, so its fallback stays the same after
  // Anna leaves and across save/reload; its VIP rules remain unchanged.
  if(chapter==='village'&&vip==='granny')return identities.has('anna')?VILLAGE_OTHER_GRANNY_SHIRT:shirt;
  if(vip==='granny')return shirt;
  const palette=customerPalette(chapter);
  const start=Number.isFinite(shirtRoll)?Math.min(palette.length-1,Math.floor(shirtRoll*palette.length)):Math.max(0,SHIRTS.indexOf(shirt));
  for(let offset=0;offset<palette.length;offset++){
    const candidate=palette[(start+offset)%palette.length],style=key(candidate,vip),identity=PptCharacters.customerIdentityKey(style);
    if(identity?!identities.has(identity):!occupied.has(style))return candidate;
  }
  // Once all looks are present, only anonymous visitors may be repeated.
  for(let offset=0;offset<palette.length;offset++){
    const candidate=palette[(start+offset)%palette.length];
    if(!PptCharacters.customerIdentityKey(key(candidate,vip)))return candidate;
  }
  return shirt;
}
// Old shifts could save the same named person in several places. Repair only
// those conflicting appearances as the graph is attached; every customer and
// gameplay field stays in place, and the deterministic result is saved by the
// ordinary save flow (or reconstructed identically on another reload).
function repairRestoredVisitorLooks(network){
  if(!['village','town','city','capital'].includes(network?.campaign?.chapter)||typeof PptCharacters.customerVisualKey!=='function'||typeof PptCharacters.customerIdentityKey!=='function')return;
  for(const branch of network.branches){
    const chapter=customerVisualChapter(network,branch.id);
    const palette=customerPalette(chapter);
    const visual=(person,shirt=person.shirt)=>PptCharacters.customerVisualKey(customerVariant(shirt,chapter),person.vip,chapter);
    const runtime=branch.runtime;
    if(!runtime||!Array.isArray(runtime.q)||!Array.isArray(runtime.lockerQ)||!Array.isArray(runtime.leaving))continue;
    const people=[...runtime.q.flat(),...runtime.lockerQ,...runtime.leaving,...(runtime.autoLocker?.customer?[runtime.autoLocker.customer]:[])].filter(person=>person&&typeof person==='object');
    const occupied=new Set(people.map(person=>visual(person))),seenPeople=new Set(),seenIdentities=new Set();
    let repeated=0;
    for(const person of people){
      if(seenPeople.has(person))continue;
      seenPeople.add(person);
      const identity=PptCharacters.customerIdentityKey(visual(person));
      if(!identity)continue;
      if(!seenIdentities.has(identity)){seenIdentities.add(identity);continue;}
      if(identity==='anna')person.shirt=VILLAGE_OTHER_GRANNY_SHIRT;
      else{
        const anonymous=palette.filter(shirt=>!PptCharacters.customerIdentityKey(visual(person,shirt)));
        if(!anonymous.length)continue;
        person.shirt=anonymous.find(shirt=>!occupied.has(visual(person,shirt)))??anonymous[repeated++%anonymous.length];
      }
      occupied.add(visual(person));
    }
  }
}
// City saves from the first prototype did not yet have the technology quest
// or tip schedule. Migrate in memory without charging for an existing AI or
// interrupting a meeting that was already in progress.
function migrateCityProgress(network){
  const campaign=network?.campaign;if(campaign?.chapter!=='city')return;
  const progress=campaign.cityProgress,branch=network.branches.find(item=>item.id===1),
    story=Array.isArray(network.storySeen)?network.storySeen:[],pending=network.storyPresentation?.id;
  const aiOwned=(branch?.state?.up?.ai||0)>0,meetingSeen=story.includes('city_ai_meeting');
  if(!('technologySeen' in progress))progress.technologySeen=aiOwned||meetingSeen||(story.includes('city_technology')&&pending!=='city_technology');
  if(!('aiIntroduced' in progress))progress.aiIntroduced=(aiOwned||meetingSeen)&&pending!=='city_ai_meeting';
  if(!('lastAiTipShift' in progress))progress.lastAiTipShift=progress.aiIntroduced?campaign.shifts:0;
  if(!('nextAiTipIndex' in progress))progress.nextAiTipIndex=0;
}
// The familiar VIP is a story character first introduced in the future city
// chapter. A VIP already present in a restored shift is left untouched.
const campaignBloggerLocked=()=>!!NETWORK?.campaign&&['village','town'].includes(NETWORK.campaign.chapter);

// ---------- containers: shelf cells (s 0–3), big rack (s 4), fridge, locker ----------
function slotArr(c,s){return s===BIG?S.big[c]:S.stock[c][s];}
function slotCap(c,s){return s===BIG?3:capCell();}
function slotStand(c,s){if(s===BIG){const r=bigRect(c);return{x:r.x-10,y:387+c*24};}return cellStand(c,s);}
function fridgeFree(){return fridgeOn()&&S.fridge.some(x=>!x);}
function fridgeFind(n){return fridgeOn()?S.fridge.findIndex(b=>b&&b.c===n.c&&b.s===n.s&&!b.r):-1;}
function homeOf(b){if(b.cold!=null&&fridgeFree())return{fz:true};return{c:b.c,s:b.s};}
function homeFull(b){const h=homeOf(b);return h.fz?false:slotArr(h.c,h.s).length>=slotCap(h.c,h.s);}
function putHome(b,x,y){const h=homeOf(b);if(h.fz){S.fridge[S.fridge.findIndex(v=>!v)]=b;return;}const a=slotArr(h.c,h.s);if(a.length<slotCap(h.c,h.s))a.push(b);else if(!putFloor(b,x,y))S.heap++;}
function canTake(b){const h=G.p.hands;if(h.some(x=>x.s===BIG))return false;if(b&&b.s===BIG)return h.length===0;return h.length<cap();}

function eachParcel(fn){
  for(const col of S.stock)for(const cell of col)for(const p of cell)fn(p,'shelf');
  for(const cell of S.big)for(const p of cell)fn(p,'shelf');
  for(const st of S.floor)for(const p of st)fn(p,'floor');
  for(const p of S.fridge)if(p)fn(p,'fridge');
  for(const p of S.locker)if(p)fn(p,'locker');
  if(perksHome())PptVillagePerks.eachStored(perksHome(),fn);
  if(activeTownHome())PptTownRenovation.eachStored(activeTownHome(),fn);
  for(const p of G.p.hands)fn(p,'hands');
  for(const q of allCust())if(q.housePrepared)fn(q.housePrepared,'counter');
  for(const w of G.workers)for(const p of w.carry)fn(p,'hands');
}
function availMap(){
  const m={};eachParcel(p=>{if(!p.r&&p.ready<=G.clock){const k=key(p.c,p.s);m[k]=(m[k]||0)+1;}});
  for(const q of allCust().concat(G.lockerQ,G.waitingChecks||[]))for(const n of q.need){const k=key(n.c,n.s);m[k]=(m[k]||0)-1;}
  return m;
}
const firstWin=()=>lockerOn()?1:0;
function openServiceWindow(run,first,capacity,personal=false){
  let best=-1,shortest=Infinity;
  for(let i=first;i<run.q.length;i++){
    if(personal&&run.win[i]?.kind==='ai')continue;
    const length=run.q[i].length;
    if(personal&&length>=capacity)continue;
    const score=length+Math.random()*.5;
    if(length<capacity&&score<shortest){shortest=score;best=i;}
  }
  return best;
}
// Keep the actual order and its stock reservation at the entrance until a
// staffed or player-operated window has room. Waiting here costs no patience.
function waitForCheckWindow(run,cu){
  cu.win=null;cu.state='in';cu.claim=null;delete cu.personalUntil;
  (run.waitingChecks||=[]).push(cu);
}
function admitWaitingChecks(run,first,capacity){
  while(run.waitingChecks?.length){
    const win=openServiceWindow(run,first,capacity,true);
    if(win<0)return;
    const cu=run.waitingChecks.shift();
    cu.win=win;cu.x=(win+.5)*W/run.q.length;cu.y=-30;cu.state='in';
    run.q[win].push(cu);
  }
  delete run.waitingChecks;
}
function repairPersonalQueues(branch){
  const run=branch.runtime;
  if(!run?.q||!run.win)return;
  const first=run.win[0]?.kind==='locker'?1:0,capacity=1+(branch.state.up.queue||0);
  for(const [i,line] of run.q.entries()){
    if(run.win[i]?.kind!=='ai')continue;
    for(const cu of line.slice()){
      if(cu.personalCheck!==true)continue;
      line.splice(line.indexOf(cu),1);
      const win=openServiceWindow(run,first,capacity,true);
      // A player already collecting this front order can finish the same
      // route at an empty window. The shelf leg of the route stays intact.
      if(win>=0&&!run.q[win].length&&cu.state==='wait'){
        cu.win=win;cu.x=(win+.5)*W/run.q.length;cu.y=Q_Y[0];run.q[win].push(cu);
        if(run.p.tg?.ref===cu)run.p.tg.x=cu.x;
      }else{
        if(run.p.tg?.ref===cu||run.p.tg?.cu===cu)run.p.tg=null;
        waitForCheckWindow(run,cu);
      }
    }
  }
  if(run.waitingChecks)admitWaitingChecks(run,first,capacity);
}
function spawnCust(){
  if(G.autoLocker&&S.autoLocker&&!G.autoLocker.customer){
    const roll=Math.random(),shirt=chooseCustomerShirt(SHIRTS[Math.floor(roll*SHIRTS.length)],null,roll);
    const customer={shirt,prime:false,cod:false,vip:null,need:[],pt:1,max:1};
    if(PptCampaignLocker.startCustomer(S.autoLocker,G.autoLocker,customer))return true;
  }
  if(G.waitingChecks?.length)admitWaitingChecks(G,firstWin(),depth());
  const c=G.cfg;let best=openServiceWindow(G,firstWin(),depth());
  if(best<0)return false;
  const prime=Math.random()<c.prime,shirtRoll=Math.random();
  const cu={win:best,x:winX(best),y:-30,state:'in',prime,shirt:SHIRTS[Math.floor(shirtRoll*SHIRTS.length)],need:[],ret:null,claim:null,cod:Math.random()<c.cod,vip:null};
  if(activeVillageHome()){cu.x=-18;cu.y=82;cu.houseDoorStep=0;}
  const chapter=NETWORK?.campaign?.chapter,city=chapter==='city',dedupeVip=city||chapter==='capital';
  const vipNow=allCust().some(q=>q.vip)||(dedupeVip&&[...G.lockerQ,...G.leaving].some(q=>q.vip));
  const vipDay=chapter==='capital'?storyDifficultyDay(S.day):S.day;
  const cityEligible=city&&PptCampaign.cityBloggerEligible(NETWORK.campaign,stars());
  if(city){
    if(!vipNow&&cityEligible&&(!NETWORK.campaign.cityProgress.bloggerVisited||Math.random()<.07))cu.vip='blogger';
    else if(!vipNow&&S.day>=12&&Math.random()<.06)cu.vip='granny';
  }else if(!vipNow&&vipDay>=9&&!campaignBloggerLocked()&&Math.random()<.07)cu.vip='blogger';else if(!vipNow&&vipDay>=12&&Math.random()<.06)cu.vip='granny';
  // The customer type is rolled once per arrival. A pickup customer who has
  // to wait for stock keeps waiting; retries must not turn into extra returns.
  const home=perksHome(),cyclist=housePerk(5,'office')&&((home.storage?.visitors||0)+1)%5===0;
  if(G.pendingReturn==null)G.pendingReturn=!cyclist&&Math.random()<c.ret;
  if(cyclist){cu.vip=null;cu.cod=false;cu.houseCyclist=true;}
  if(G.pendingReturn){cu.ret=Object.assign(newParcel(),{r:true,f:false,s:rnd(c.shapes)});delete cu.ret.cold;cu.cod=false;}
  else{
    const m=availMap(),keys=Object.keys(m).filter(k=>m[k]>0).map(Number);
    if(!keys.length)return false;
    // Each unclaimed parcel has an equal chance of being requested. Choosing
    // uniformly among distinct types left common types piling up on shelves.
    const pick=()=>{
      let roll=rnd(keys.reduce((sum,k)=>sum+m[k],0)),k=keys[0];
      for(const candidate of keys){if(roll<m[candidate]){k=candidate;break;}roll-=m[candidate];}
      m[k]--;if(m[k]<=0)keys.splice(keys.indexOf(k),1);return{c:k>>3,s:k&7};
    };
    cu.need.push(pick());
    if(cu.vip==='granny'){if(!keys.length)cu.vip=null;else{cu.need.push(pick());if(keys.length)cu.need.push(pick());}}
    else if(!cyclist&&Math.random()<c.multi&&keys.length)cu.need.push(pick());
  }
  if(cu.ret&&cu.vip==='granny')cu.vip=null;
  if(townPerk(1,'express')||townPerk(1,'logistics')){
    const priority=firstWin(),preferred=townPerk(1,'express')?!cu.ret&&cu.need.length===1:!!cu.ret;
    const available=G.q.map((line,i)=>({i,length:line.length})).filter(l=>l.i>=priority&&l.length<depth()).sort((a,b)=>a.length-b.length);
    const order=preferred?(available.find(l=>l.i===priority)||available[0]):(available.find(l=>l.i!==priority)||(townPerk(1,'express')?null:available[0]));
    if(!order)return false;best=order.i;cu.win=best;cu.x=winX(best);
  }
  cu.shirt=chooseCustomerShirt(cu.shirt,cu.vip,shirtRoll);
  cu.max=c.pat*(prime?G.mod.primePat:1)*(cu.need.length>1?1.3:1)*(cu.vip==='granny'?1.8:cu.vip==='blogger'?.85:1);cu.pt=cu.max;
  if(home){
    const storage=home.storage||(home.storage={});
    if(housePerk(5,'office'))storage.visitors=(storage.visitors||0)+1;
    cu.houseGrace=PptVillagePerks.grace(home,G);
    cu.max=cu.max*PptVillagePerks.radioPatience(home)+PptVillagePerks.familyBonus(home,customerDisplayScale(cu.shirt,cu.vip)===1);
    cu.pt=cu.max;
  }
  G.pendingReturn=null;
  if(city&&cu.vip==='blogger'&&!NETWORK.campaign.cityProgress.bloggerVisited)NETWORK.campaign.cityProgress.bloggerVisited=true;
  if(cu.vip)playerSting(cu.vip);
  if(cu.need.length===1&&toLocker(cu))return true;
  // A small share of later regular orders invites the owner to help. Staff
  // take over after a short wait, so a background branch can never deadlock.
  if(['city','capital'].includes(chapter)&&branchRuntime.current()?.id===NETWORK.activeId&&!cu.vip&&!cu.ret&&!G.waitingChecks?.length){
    G.personalCounter=(Number.isSafeInteger(G.personalCounter)?G.personalCounter:0)+1;
    if(G.personalCounter%3===0)cu.personalCheck=true;
  }
  if(cu.personalCheck&&G.win[best]?.kind==='ai'){
    waitForCheckWindow(G,cu);
    admitWaitingChecks(G,firstWin(),depth());
    return true;
  }
  G.q[best].push(cu);return true;
}
// A customer with one matching parcel can skip the service queue, even when
// already walking toward a window. A claimed parcel cannot be assigned twice.
function toLocker(cu){
  if(!lockerOn()||cu.personalCheck||cu.houseCyclist||cu.need.length!==1||cu.ret)return false;
  const n=cu.need[0],j=S.locker.findIndex(b=>b&&!b.lk&&!b.r&&!b.spoiled&&b.ready<=G.clock&&b.c===n.c&&b.s===n.s);if(j<0)return false;
  S.locker[j].lk=true;cu.lockSlot=j;cu.state='in';cu.lt=1.2;cu.claim=null;G.lockerQ.push(cu);return true;
}
function lockerPull(){for(const q of allCust().slice())if((q.state==='in'||q.state==='wait')&&!q.claim&&q.need.length===1&&!q.ret){const l=G.q[q.win],i=l.indexOf(q);if(i>=0&&toLocker(q))l.splice(i,1);}}
function customerReaction(cu,happy){
  const head=queuePersonY(cu)+9.5-78.5*customerDisplayScale(cu.shirt,cu.vip);
  float(cu.x,Math.max(-WAIT_EXT+10,head-10),happy?'★':'✕',happy?'#ffd166':'#ff5d5d');
}
function leave(cu,happy){const l=G.q[cu.win],i=l.indexOf(cu);if(i>=0){l.splice(i,1);if(happy&&NETWORK.campaign)G.campaignServed=(G.campaignServed||0)+1;}customerReaction(cu,happy);cu.state='leave';cu.happy=happy;cu.claim=null;G.leaving.push(cu);
  if(i===0&&housePerk(4,'office'))PptVillagePerks.callPrime(perksHome(),G,cu.win,firstWin());
}
function angryLeave(q){
  S.cash-=5;G.st.penalties+=5;G.st.angry++;review(1);resetCombo();queueFloat(q,-24,message('fAngry'),'#ff5d5d');
  if(q.vip==='blogger'){for(let k=0;k<3;k++)review(1);S.cash-=20;G.st.penalties+=20;float(W/2,COUNTER_Y-60,message('fBlogBad'),'#ff5d5d');}
  leave(q,false);
}
const isFront=cu=>G.q[cu.win]?.[0]===cu;
function float(x,y,txt,col){if(playerErrorKeys.has(txt?.key)){if(playerActionActive)playerActionError=true;else if(playerInputActive)playerCue('error');}if(G.floats.some(f=>messageText(f.txt)===messageText(txt)&&f.t>.6&&Math.abs(f.x-x)<40&&Math.abs(f.y-y)<20))return;G.floats.push({x,y,txt,col:col||'#eef1ec',t:1.3});}
// Float Y is stored in drawn world space. New customer messages therefore
// survive save/restore beside their projected sprite without changing q.y.
function queueFloat(q,offset,txt,col){float(q.x,queuePersonY(q)+offset,txt,col);}
function dropActive(){const p=G.p;const b=p.hands.splice(p.act,1)[0];p.act=Math.max(0,Math.min(p.act,p.hands.length-1));drawHands();return b;}
function resetCombo(){G.combo=0;}
function breakBox(x,y){
  if(lv('gloves')&&!G.gloves){G.gloves=true;float(x,y-20,message('fGloves'),'#ffd166');return false;}
  S.cash-=15;G.st.penalties+=15;G.st.broken++;G.mess.push({x,y:y+4});float(x,y-20,message('fBroke'),'#ff5d5d');resetCombo();return true;
}
function spotOk(i,b){const st=S.floor[i];if(st.length>=STACK)return false;if(b&&b.s===BIG)return st.length===0;if(st.length&&st[0].s===BIG)return false;return true;}
function floorSpot(px,py,b){
  let best=-1,bd=1e9;
  S.floor.forEach((st,i)=>{if(!spotOk(i,b))return;const d=dist(px,py,FLOOR[i].x,FLOOR[i].y)+st.length*60;if(d<bd){bd=d;best=i;}});
  return best;
}
function putFloor(b,px,py){
  const i=floorSpot(px,py,b);
  if(i<0)return housePerk(1,'diy')&&PptVillagePerks.store(perksHome(),'pallet',b);
  S.floor[i].push(b);return true;
}
function floorTop(i){const n=S.floor[i].length-1;return{x:FLOOR[i].x+n*STACK_DX,y:FLOOR[i].y+n*STACK_DY};}
function payFor(cu,b){const M=G.mod,tip=cu.houseCyclist?0:4*M.tip*Math.max(0,cu.pt)/cu.max;return Math.round((10*(cu.prime?2:1)*G.cfg.pay*(cu.cod?1.6:1)*(1+S.perm.pay+.06*lv('brand'))+(b.f?5+M.fragB:0)+(b.s===BIG?6:0)+(b.cold!=null?4:0)+M.flat+(cu.vip==='granny'&&!cu.need.length?10:0)+tip)*mult());}
// returns true when a cash-on-delivery customer was completed (the server then spends time counting money)
function give(cu,b,by){
  const i=cu.need.findIndex(n=>n.c===b.c&&n.s===b.s);
  if(i>=0&&!b.r){
    if(townPerk(1,'cozy')&&cu.need.length>1&&!cu.townBenchUsed){cu.townBenchUsed=true;cu.pt+=12;cu.max+=12;}
    cu.need.splice(i,1);const pay=payFor(cu,b)+(perksHome()?PptVillagePerks.extraPay(perksHome(),HOLIDAYS.includes(G.ev)):0);S.cash+=pay;G.st.revenue+=pay;G.st.served++;if(b.f)G.st.fragileServed=(G.st.fragileServed||0)+1;if(by){if(by.kind==='ai')G.st.byAi++;else G.st.byStaff++;}
    const before=mult();G.combo++;const m=mult();G.maxMult=Math.max(G.maxMult,m);
    queueFloat(cu,-30,message('earnedCash',pay),by?by.color:'#4cd18a');if(m>before)float(W/2,COUNTER_Y+48,message('fCombo',m),'#ff7a1a');
    if(!cu.need.length){review(cu.pt/cu.max>.5?5:4);if(cu.vip==='blogger'){for(let k=0;k<3;k++)review(5);queueFloat(cu,-46,message('fBlogGood'),'#ffd166');}leave(cu,true);return !!cu.cod;}
  }else{
    if(townPerk(2,'cozy')&&!G.townMistakeSaved){
      G.townMistakeSaved=true;
      if(by&&Array.isArray(by.carry))by.carry.push(b);else if(!by){G.p.hands.push(b);G.p.act=G.p.hands.length-1;drawHands();}else putHome(b,cu.x,SERVE_Y);
      queueFloat(cu,-30,lang==='ru'?'Проверено: без штрафа':'Checked: no penalty','#4cd18a');return false;
    }
    S.cash-=10+G.mod.err;G.st.refunds+=10+G.mod.err;G.st.mistakes++;cu.pt*=.75;resetCombo();queueFloat(cu,-30,message('fRefund'),'#ff5d5d');
    if(b.f){
      if(!breakBox(cu.x,SERVE_Y+8)){
        if(by&&Array.isArray(by.carry))by.carry.push(b);
        else{G.p.hands.push(b);G.p.act=G.p.hands.length-1;drawHands();}
      }
    }else S.heap++;
  }
  return false;
}
const fmtNum=(m,digits)=>Number(m).toLocaleString(lang==='ru'?'ru-RU':'en-US',{minimumFractionDigits:digits||0,maximumFractionDigits:digits??2});
// Never round a below-target rating up to the displayed campaign threshold.
// Round down to hundredths so a rating below a goal never looks like it met it.
// The small allowance keeps exact values such as 4.6 from showing as 4.59.
const displayedRating=value=>NETWORK?.campaign?fmtNum(Math.floor(value*100+1e-9)/100,2):fmtNum(value,1);

// ---------- player actions ----------
function clearPlayerClaims(){for(const q of allCust())if(q.claim==='p')q.claim=null;}
function findSrc(need){const stored=perksHome()&&PptVillagePerks.findStored(perksHome(),need,G.clock,canTake);
  if(stored)return stored;
  const town=activeTownHome();if(town)for(const kind of ['buffer','dock']){const b=town[kind].find(p=>!p.r&&p.ready<=G.clock&&canTake(p)&&need.some(n=>n.c===p.c&&n.s===p.s));if(b)return{townStore:kind,parcel:b};}
  for(const n of need){const fi=fridgeFind(n);if(fi>=0&&canTake(S.fridge[fi]))return{fz:fi};
  const a=slotArr(n.c,n.s),b=a[a.length-1];if(b&&!b.r&&b.c===n.c&&b.s===n.s&&canTake(b))return{c:n.c,s:n.s};}
  if(townPerk(2,'express'))for(const [i,stack] of S.floor.entries()){const b=stack.at(-1);if(b&&!b.r&&b.ready<=G.clock&&canTake(b)&&need.some(n=>n.c===b.c&&n.s===b.s))return{floor:i};}
  return null;}
function srcTop(src){if(src.townStore)return activeTownHome()?.[src.townStore]?.includes(src.parcel)?src.parcel:null;if(src.floor!=null)return S.floor[src.floor].at(-1);if(src.store)return PptVillagePerks.storageTop(perksHome(),src);if(src.fz!=null)return S.fridge[src.fz];const a=slotArr(src.c,src.s);return a[a.length-1];}
function sourceStand(src){if(src.townStore)return src.townStore==='dock'?{x:180,y:480}:src.townStore==='returns'||townPerk(3,'express')?{x:180,y:SERVE_Y}:{x:110,y:435};if(src.floor!=null)return FLOOR[src.floor];if(src.fz!=null)return FRIDGE_STAND;if(src.store)return PptVillagePerks.shelfSource(src);return slotStand(src.c,src.s);}
function sourceTake(src){if(src.townStore)return PptTownRenovation.remove(activeTownHome(),src.townStore,src.parcel);if(src.floor!=null)return S.floor[src.floor].pop();if(src.store)return PptVillagePerks.remove(perksHome(),src);if(src.fz!=null){const b=S.fridge[src.fz];S.fridge[src.fz]=null;return b;}return slotArr(src.c,src.s).pop();}
function customerNeedsAfterHands(q){
  const missing=q.need.slice();
  for(const b of G.p.hands){if(b.r)continue;const i=missing.findIndex(n=>n.c===b.c&&n.s===b.s);if(i>=0)missing.splice(i,1);}
  return missing;
}
// Continue the same customer's route until the cart is full or no more of
// that order can be fetched, then deliver the matching parcels together.
function routeCustomerOrder(q){
  const p=G.p,missing=customerNeedsAfterHands(q),src=findSrc(missing);
  if(src){q.claim='p';const st=sourceStand(src);p.tg={k:'fetch',src,cu:q,x:st.x,y:st.y,batch:true};return true;}
  const hi=p.hands.findIndex(b=>!b.r&&q.need.some(n=>n.c===b.c&&n.s===b.s));
  if(hi>=0){p.act=hi;drawHands();q.claim='p';p.tg={k:'give',ref:q,x:winX(q.win),y:SERVE_Y,batch:true};return true;}
  if(q.claim==='p')q.claim=null;
  if(p.hands.length>=cap()||p.hands.some(b=>b.s===BIG))queueFloat(q,-24,message('fHands'));
  else{queueFloat(q,-24,message('fNotShelf'),'#ffd166');G.hl={need:q.need.slice(),t:2.5};}
  return false;
}
function tapCustomer(q){
  const p=G.p,sx=winX(q.win);
  if(!isFront(q)){queueFloat(q,-24,message('fQueue'));return;}
  if(q.claim&&q.claim!=='p'){queueFloat(q,-24,message('fBusy'),q.claim.color);return;}
  clearPlayerClaims();
  p.tg=null;
  if(q.ret){if(!canTake(q.ret)&&!townReturnDirect(q.ret)){queueFloat(q,-24,message('fHands'));return;}q.claim='p';p.tg={k:'takeRet',ref:q,x:sx,y:SERVE_Y};return;}
  routeCustomerOrder(q);
}
function shareReturn(){
  if(!housePerk(2,'garden')||!PptVillagePerks.neighborReturn(perksHome()))return false;
  S.cash+=2;G.st.revenue+=2;float(W/2,COUNTER_Y-24,lang==='ru'?'Соседям +$2':'Neighbors +$2','#4cd18a');return true;
}
function townReturnDirect(parcel){const home=activeTownHome();return !!(home&&(townPerk(4,'cozy')||townPerk(4,'express'))&&PptTownRenovation.fits(home,'returns',parcel));}
function townToolsAvailable(){const home=activeTownHome();return !!home&&(townPerk(2,'express')||home.choices.length>=3);}
function townToolsMarkup(){
  const home=activeTownHome(),ru=lang==='ru',p=G.p,R=PptTownRenovation,word=(a,b)=>ru?a:b;
  const btn=(value,label,disabled=false)=>'<button class="btn sec" data-a="townTool" data-v="'+value+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
  let h='<section class="townTools"><h2>'+word('Возможности ПВЗ','Pickup point tools')+'</h2>';
  if(townPerk(2,'express'))h+=btn('call',word('Терминал: выбрать ждущего гостя','Call terminal: select waiting guest'));
  for(const kind of ['buffer','returns','dock']){
    const capacity=R.capacity(home,kind);if(!capacity)continue;
    const title=kind==='buffer'?R.text(3,home.choices[2],lang).name:kind==='returns'?R.text(4,home.choices[3],lang).name:word('Буфер разгрузки','Unloading buffer');
    h+='<div class="cat">'+title+' · '+home[kind].length+'/'+capacity+'</div>';
    if(kind!=='dock')h+=btn('put:'+kind,word('Поставить выбранную коробку','Store selected parcel'),!R.fits(home,kind,p.hands[p.act]));
    if(kind==='returns'&&townPerk(4,'express'))h+=btn('bulkReturn',word('Забрать возвраты в тележку','Collect returns into cart'),!home.returns.length||!canTake(home.returns[0]));
    else home[kind].forEach((b,i)=>h+='<div class="townTools__row">'+svgBox(b)+btn('take:'+kind+':'+i,word('Забрать','Take'),!canTake(b))+'</div>');
    if(kind==='returns'&&townPerk(4,'logistics'))h+='<small>'+word('Следующий фургон заберёт размещённые здесь возвраты.','The next arriving van collects staged returns.')+'</small>';
  }
  if(townPerk(5,'express')){const cargo=G.townNextCargo||[];h+='<div class="cat">'+word('Следующий фургон','Next van')+'</div><div class="townTools__dock">'+(cargo.length?cargo.map(b=>'<span>'+svgBox(b)+'</span>').join(''):'<small>'+word('Больше рейсов нет','No more deliveries')+'</small>')+'</div>';}
  if(townPerk(5,'logistics')){const can=G.truck&&!G.truck.townUnloadUsed&&!home.dock.length,available=can?G.truck.cargo.map((b,i)=>({b,i})).filter(v=>R.ordinary(v.b)):[];
    h+='<div class="cat">'+word('Тележка выгрузки','Unloading cart')+'</div><small>'+word('Выбери 2 коробки из фургона. Буфер должен быть свободен.','Select 2 parcels from the van. The buffer must be empty.')+'</small>';
    if(available.length>=2)h+='<div class="townTools__dock">'+available.map(v=>'<label>'+svgBox(v.b)+'<input type="checkbox" data-town-dock="'+v.i+'" aria-label="'+word('Коробка ','Parcel ')+(v.i+1)+'"></label>').join('')+'</div>'+btn('dock',word('Перенести две коробки','Move two parcels'));
    else h+='<small>'+word('Дождись рейса или освободи буфер.','Wait for a van or empty the buffer.')+'</small>';
  }
  return h+'<button class="btn" data-a="townToolsClose">'+word('Вернуться к смене','Return to shift')+'</button></section>';
}
function useTownTool(value){
  const town=activeTownHome(),p=G?.p,R=PptTownRenovation;if(!town||!p||p.busy>0)return false;
  const [method,kind,index]=String(value).split(':');
  if(method==='call'&&townPerk(2,'express')){
    const q=G.q.map(line=>line[0]).find(q=>q?.state==='wait'&&!q.ret&&!q.claim&&(findSrc(customerNeedsAfterHands(q))||p.hands.some(b=>!b.r&&q.need.some(n=>n.c===b.c&&n.s===b.s))));
    if(!q)return false;tapCustomer(q);return !!p.tg;
  }
  if(method==='dock'&&townPerk(5,'logistics')&&G.truck&&!G.truck.townUnloadUsed&&!town.dock.length){
    const values=[...ov.querySelectorAll('input[data-town-dock]:checked')].map(n=>Number(n.dataset.townDock));
    if(values.length!==2||new Set(values).size!==2||values.some(i=>!R.ordinary(G.truck.cargo[i])))return false;
    const parcels=values.map(i=>G.truck.cargo[i]);for(const i of values.slice().sort((a,b)=>b-a))G.truck.cargo.splice(i,1);
    for(const b of parcels){b.ready=G.clock+6+Math.random()*10;R.store(town,'dock',b);}G.truck.townUnloadUsed=true;return true;
  }
  let target;
  if(method==='bulkReturn'&&townPerk(4,'express')&&town.returns.length&&canTake(town.returns[0]))target={k:'townStorage',op:'bulk',store:'returns',x:180,y:SERVE_Y};
  if(['buffer','returns','dock'].includes(kind)&&R.capacity(town,kind)){
    const parcel=method==='put'?p.hands[p.act]:town[kind][Number(index)];
    if(method==='put'&&kind!=='dock'&&R.fits(town,kind,parcel)||method==='take'&&parcel&&canTake(parcel)){
      const stand=sourceStand({townStore:kind});target={k:'townStorage',op:method,store:kind,parcel,x:stand.x,y:stand.y};
    }
  }
  if(!target)return false;clearPlayerClaims();p.tg=target;return true;
}
function showTownTools(){if(!townToolsAvailable()||mode!=='play'||!G||menuOpen||networkPaused||settingsOpen||externallyPaused()||loadFailed)return;paused=true;syncAudio();showOv(townToolsMarkup);}
function houseSortNext(color){
  const p=G.p,b=p.hands.find(v=>!v.r&&v.c===color&&slotArr(v.c,v.s).length<slotCap(v.c,v.s));
  if(!b)return;
  const point=slotStand(b.c,b.s);p.tg={k:'houseSortShelf',b,color,x:point.x,y:point.y};
}
function useHouseTool(value){
  const home=perksHome(),p=G.p;
  if(!home||p.busy>0)return false;
  const [tool,id,index]=String(value).split(':');
  let target;
  if(tool==='switch')return PptVillagePerks.selectTruck(home,G);
  if(tool==='hoist'){
    if(!housePerk(1,'barn')||!G.truck)return false;
    const b=G.truck.cargo[Number(id)];
    if(!PptVillagePerks.hoist(home,G.truck,b,G.clock,slotArr,slotCap)){float(W/2,TRUCK.y-16,message('fFull'));return false;}
    float(W/2,TRUCK.y-16,lang==='ru'?'На полке':'Shelved','#4cd18a');return true;
  }
  if(tool==='stash'&&housePerk(3,'diy')&&!G.houseStash)target={k:'houseStash',x:107,y:399};
  if(tool==='sort'&&housePerk(3,'barn')&&/^[0-3]$/.test(id))target={k:'houseSort',color:+id,x:106+168*(+id%2),y:390+84*Math.floor(+id/2)};
  if((tool==='put'||tool==='take')&&PptVillagePerks.boxes(home,id)){
    const parcel=tool==='put'?p.hands[p.act]:PptVillagePerks.boxes(home,id)[Number(index)];
    if(!parcel)return false;
    const [x,y]=PptVillagePerks.slots[id].xy;target={k:'houseStorage',store:id,op:tool,parcel,x,y};
  }
  if(!target)return false;
  clearPlayerClaims();p.tg=target;return true;
}
function showHouseTools(){
  const home=perksHome();if(!home||mode!=='play'||!G||G.storyLive||menuOpen||networkPaused||settingsOpen||externallyPaused()||loadFailed)return;
  paused=true;syncAudio();showOv(()=>PptVillagePerks.toolsMenu(home,G,lang,svgBox,b=>slotArr(b.c,b.s).length>=slotCap(b.c,b.s)));
}
function closeHouseTools(){
  paused=false;hideOv();syncAudio();drawHands();save();
}
function pairedWindow(q){
  if(!housePerk(4,'barn')||![1,2].includes(q.win)||q.houseCyclist)return null;
  const other=G.q[q.win===1?2:1]?.[0];
  if(other?.state!=='wait'||other.claim||other.ret||other.personalCheck||other.houseCyclist)return null;
  const matches=(b,cu)=>!b.r&&cu.need.some(n=>n.c===b.c&&n.s===b.s);
  for(const first of G.p.hands)if(matches(first,q)){
    const second=G.p.hands.find(b=>b!==first&&matches(b,other));
    if(second)return {first,second,other};
  }
  return null;
}
function interact(tg){
  // A route restored from storage has no session receipt and stays silent.
  const audible=audibleTargets.delete(tg)&&branchRuntime.canPresent();
  const hands=G.p.hands.length,held=G.p.hands[G.p.act],served=G.st.served;
  playerActionActive=audible;playerActionError=false;
  try{interactPlayer(tg);}finally{
    if(audible){
      if(G.p.tg)audibleTargets.add(G.p.tg); // The second leg of this live fetch.
      const misplaced=tg.k==='cell'&&held&&G.p.hands.length<hands&&(held.c!==tg.c||held.s!==tg.s);
      const returned=tg.k==='takeRet'&&G.p.hands.length>hands;
      const completed=tg.k==='give'&&G.st.served>served&&!tg.ref.need.length;
      if(playerActionError||misplaced)playerCue('error');
      else if(returned||completed)playerCue('success');
      else if(G.p.hands.length>hands)playerCue('take');
      else if(G.p.hands.length<hands)playerCue('place');
    }
    playerActionActive=false;playerActionError=false;
  }
}
function interactPlayer(tg){
  const p=G.p,act=p.hands[p.act];
  if(housePowerOff()&&['give','takeRet'].includes(tg.k)){p.tg=tg;return;}
  switch(tg.k){
  case 'townStorage':{
    const town=activeTownHome(),R=PptTownRenovation;if(!town)return;
    if(tg.op==='put'){const i=p.hands.indexOf(tg.parcel);if(i>=0&&R.store(town,tg.store,tg.parcel)){p.act=i;dropActive();}else float(p.x,p.y-20,message('fFull'));}
    else if(tg.op==='bulk'&&townPerk(4,'express')){while(town.returns.length&&canTake(town.returns[0]))p.hands.push(town.returns.shift());p.act=Math.max(0,p.hands.length-1);drawHands();}
    else if(canTake(tg.parcel)){const b=R.remove(town,tg.store,tg.parcel);if(b){p.hands.push(b);p.act=p.hands.length-1;drawHands();}}
    break;}
  case 'houseStorage':{
    const home=perksHome();if(!home)return;
    if(tg.op==='put'){
      const i=p.hands.indexOf(tg.parcel);
      if(i<0||!PptVillagePerks.store(home,tg.store,tg.parcel)){float(p.x,p.y-20,message('fFull'));return;}
      p.act=i;dropActive();
    }else if(canTake(tg.parcel)){
      const b=PptVillagePerks.remove(home,tg);if(b){p.hands.push(b);p.act=p.hands.length-1;drawHands();}
    }else float(p.x,p.y-20,message('fHands'));
    break;}
  case 'houseStash':if(housePerk(3,'diy')&&!G.houseStash){G.houseStash=true;const cash=5+rnd(16);S.cash+=cash;G.st.revenue+=cash;float(p.x,p.y-24,message('earnedCash',cash),'#4cd18a');}break;
  case 'houseSort':if(housePerk(3,'barn'))houseSortNext(tg.color);break;
  case 'houseSortShelf':{if(!housePerk(3,'barn'))return;
    const b=tg.b,i=p.hands.indexOf(b);
    if(i>=0&&!b.r&&slotArr(b.c,b.s).length<slotCap(b.c,b.s)){p.act=i;slotArr(b.c,b.s).push(dropActive());}
    houseSortNext(tg.color);break;}
  case 'truck':{const tr=G.truck;if(!tr||!tr.cargo.length)return;if(!canTake(tr.cargo[0])){float(p.x,p.y-30,message('fHands'));return;}
    const b=tr.cargo.shift();b.ready=G.clock+6+Math.random()*10;p.hands.push(b);p.act=p.hands.length-1;drawHands();break;}
  case 'cell':{const {c,s}=tg,cell=slotArr(c,s);
    if(act){
      if((act.s===BIG)!==(s===BIG)){float(tg.x,tg.y-40,message('fNoFit'),'#ffd166');return;}
      if(cell.length>=slotCap(c,s)){float(tg.x,tg.y-40,message('fFull'));return;}
      const b=dropActive(),wrong=b.c!==c||b.s!==s;
      if(b.f&&wrong){if(!breakBox(tg.x,tg.y)){p.hands.push(b);p.act=p.hands.length-1;drawHands();}return;}
      cell.push(b);if(wrong)G.shake[c+'_'+s]=.4;}
    else if(cell.length&&canTake(cell[cell.length-1])){p.hands.push(cell.pop());p.act=p.hands.length-1;drawHands();}
    break;}
  case 'fridge':{const i=tg.i;if(i<0||i>=S.fridge.length)return;const b=S.fridge[i];
    if(act&&act.s===BIG){float(tg.x,tg.y-30,message('fNoFit'),'#ffd166');return;}
    if(act&&!b){S.fridge[i]=dropActive();}
    else if(b&&canTake(b)){S.fridge[i]=null;p.hands.push(b);p.act=p.hands.length-1;drawHands();}
    else if(act){const j=S.fridge.findIndex(v=>!v);if(j>=0)S.fridge[j]=dropActive();else float(tg.x,tg.y-30,message('fFull'));}
    break;}
  case 'locker':{if(!act){const b=S.locker[tg.i];
      if(b?.lk){float(tg.x,COUNTER_Y,message('fLockerReserved'),'#ffd166');return;}
      if(b&&canTake(b)){S.locker[tg.i]=null;p.hands.push(b);p.act=p.hands.length-1;drawHands();}
      return;}
    if(G.legacyLockerDrainOnly){float(tg.x,COUNTER_Y,lang==='ru'?'Заберите оставшиеся посылки':'Retrieve the remaining parcels','#ffd166');return;}
    if(act.r||act.s===BIG){float(tg.x,COUNTER_Y,message('fNoFit'),'#ffd166');return;}
    const j=S.locker.findIndex(v=>!v);if(j<0){float(tg.x,COUNTER_Y,message('fFull'));return;}
    S.locker[j]=dropActive();lockerPull();break;}
  case 'floor':{const st=S.floor[tg.i];
    if(st.length&&canTake(st[st.length-1])){p.hands.push(st.pop());p.act=p.hands.length-1;drawHands();}
    else if(act){const b=dropActive();
      if(b.f){if(!breakBox(tg.x,tg.y)){p.hands.push(b);p.act=p.hands.length-1;drawHands();}return;}
      const i=spotOk(tg.i,b)?tg.i:floorSpot(tg.x,tg.y,b);if(i<0){p.hands.push(b);drawHands();float(tg.x,tg.y-20,message('fFloorFull'));return;}S.floor[i].push(b);}
    break;}
  case 'fetch':{const q=tg.cu,src=tg.src;if(q.state!=='wait'||!isFront(q)){q.claim=null;return;}
    const b=srcTop(src);
    if(tg.batch&&(!b||b.r||!customerNeedsAfterHands(q).some(n=>n.c===b.c&&n.s===b.s)||!canTake(b))){routeCustomerOrder(q);return;}
    if(!b||!canTake(b)){q.claim=null;return;}
    sourceTake(src);
    p.hands.push(b);
    if(tg.batch&&townPerk(2,'logistics')&&src.c!=null&&src.s!=null){let next;while((next=srcTop(src))&&!next.r&&canTake(next)&&customerNeedsAfterHands(q).some(n=>n.c===next.c&&n.s===next.s)){sourceTake(src);p.hands.push(next);}}
    p.act=p.hands.length-1;drawHands();
    if(tg.batch)routeCustomerOrder(q);else p.tg={k:'give',ref:q,x:winX(q.win),y:SERVE_Y,auto:b};return;}
  case 'give':{const q=tg.ref;if(q.state!=='wait'||!isFront(q)){if(q.claim==='p')q.claim=null;return;}
    if(q.personalCheck===true){
      q.personalCheck=false;delete q.personalUntil;
      if(!lv('scanner')){q.claim='p';p.tg=tg;p.busyLen=p.busy=2;p.busyT='verify';
        float(p.x,p.y-30,lang==='ru'?'Проверка заказа':'Checking order','#5bd6ff');return;}
      if(NETWORK.away)G.awayChecks++;
    }
    q.claim=null;
    if(tg.batch){
      if(q.houseCyclist){
        const i=p.hands.findIndex(b=>!b.r&&q.need.some(n=>n.c===b.c&&n.s===b.s));if(i<0)return;
        p.act=i;q.housePrepared=dropActive();q.housePickupAt=G.clock+.65;q.claim='house-desk';
        queueFloat(q,-28,lang==='ru'?'На стойке':'Ready at counter','#4cd18a');return;
      }
      const pair=pairedWindow(q);
      let cod=false;
      if(pair){
        p.act=p.hands.indexOf(pair.first);cod=give(q,dropActive(),null);
        if(pair.other.state==='wait'&&isFront(pair.other)){
          p.act=p.hands.indexOf(pair.second);cod=give(pair.other,dropActive(),null)||cod;
        }
      }
      while(q.state==='wait'&&isFront(q)){
        const i=p.hands.findIndex(b=>!b.r&&q.need.some(n=>n.c===b.c&&n.s===b.s));if(i<0)break;
        p.act=i;cod=give(q,dropActive(),null)||cod;
      }
      if(cod){p.busyLen=p.busy=1.5;p.busyT='cod';float(p.x,p.y-30,message('fCod'),'#ffd166');}return;
    }
    let i=tg.auto?p.hands.indexOf(tg.auto):p.act;if(i<0)i=p.act;if(!p.hands[i])return;p.act=i;
    if(give(q,dropActive(),null)){p.busyLen=p.busy=1.5;p.busyT='cod';float(p.x,p.y-30,message('fCod'),'#ffd166');}break;}
  case 'takeRet':{const q=tg.ref;q.claim=null;if(q.state!=='wait'||!q.ret)return;const direct=townReturnDirect(q.ret)&&(townPerk(4,'express')||!canTake(q.ret));if(!direct&&!canTake(q.ret))return;
    if(direct)PptTownRenovation.store(activeTownHome(),'returns',q.ret);else if(!shareReturn()){p.hands.push(q.ret);p.act=p.hands.length-1;}q.ret=null;drawHands();S.cash+=3;G.st.revenue+=3;review(5);leave(q,true);queueFloat(q,-30,message('fReturn'),'#4cd18a');break;}
  case 'mess':if(G.mess.includes(tg.ref)){p.busyLen=p.busy=1;p.busyT=tg.ref;}break;
  case 'heap':if(act){dropActive();S.heap++;}else if(S.heap>0){p.busyLen=p.busy=.6;p.busyT='heap';}break;
  }
}
// Orientation is presentation-only and follows actual travel, not UI focus.
const characterFacing=new WeakMap();
function facingOf(o){return characterFacing.get(o)||(o.tg&&o.tg.y<o.y?'rear':'front');}
// The inherited counter has four queues but the building has a single side
// entrance. A short aisle keeps arrivals and departures below the wall.
function followHouseDoor(person,goalX,goalY,speed,dt,leaving=false){
  const stepKey=leaving?'houseExitStep':'houseDoorStep',step=person[stepKey]||0;
  const route=leaving?[[person.x,126],[15,126],[15,82],[-32,82]]:[[15,82],[15,97],[goalX,97]];
  if(step>=route.length)return leaving||moveTo(person,goalX,goalY,speed,dt);
  if(moveTo(person,route[step][0],route[step][1],speed,dt))person[stepKey]=step+1;
  return leaving&&person[stepKey]>=route.length;
}
function moveTo(o,x,y,sp,dt){const d=dist(o.x,o.y,x,y);if(sp*dt>0&&Math.abs(y-o.y)>1e-6)characterFacing.set(o,y<o.y?'rear':'front');if(d<=sp*dt){o.x=x;o.y=y;return true;}o.x+=(x-o.x)/d*sp*dt;o.y+=(y-o.y)/d*sp*dt;return false;}

// Worker dependencies read the active branch each time an action executes.
const {workerCue,workerMotion,topMatch,cashPick,release,dropSpoiledCarry,workerSpeed,wsp,updCash,pickFloor,takeInto,updSort,updLoad,updWorkers}=PptWorkers.create({
  getState:()=>S,getRuntime:()=>G,DAY,BIG,W,SERVE_Y,COUNTER_Y,COUNTER_H,FLOOR,FRIDGE_STAND,HEAP,TRUCK,ROBOT_HOME,slotArr,firstWin,lv,fridgeFind,putFloor,winX,moveTo,rnd,slotStand,srcTop,isFront,give,putHome,review,leave,queueFloat,message,float,breakBox,homeFull,dist,homeOf,slotCap,floorSpot,
  shareReturn,sourceStand,sourceTake,housePowerOff,houseSource:needs=>perksHome()&&PptVillagePerks.findStored(perksHome(),needs,G.clock,()=>true)
});

// Keep the visible truck mixed as parcels are removed from the front.  First
// try rearranging the actual delivery; only change a duplicate if it is
// impossible to keep the visible window and final two mixed by rearrangement.
// Fragile/cold/XL status and all random draws remain unchanged.
function diversifyTruckCargo(cargo,cfg){
  if(cargo.length<2)return cargo;
  const same=(a,b)=>a.c===b.c&&a.s===b.s;
  const swap=(a,b)=>{const value=cargo[a];cargo[a]=cargo[b];cargo[b]=value;};
  const alternate=parcel=>{
    if(cfg.colors>1){parcel.c=(parcel.c+1)%cfg.colors;return true;}
    if(parcel.s!==BIG&&cfg.shapes>1){parcel.s=(parcel.s+1)%cfg.shapes;return true;}
    return false;
  };
  const end=cargo.length-1;
  if(same(cargo[end-1],cargo[end])){
    let different=end-2;while(different>=0&&same(cargo[different],cargo[end]))different--;
    if(different>=0)swap(different,end-1);
    else alternate(cargo[end-1]);
  }
  // The truck artwork displays at most seven parcels. Avoid a visually
  // uniform seven-parcel window as the loader, conveyor or player unloads.
  for(let start=0;start+7<=cargo.length;start++){
    const first=cargo[start];let mixed=false;
    for(let i=start+1;i<start+7;i++)if(!same(first,cargo[i])){mixed=true;break;}
    if(mixed)continue;
    const target=Math.min(start+6,end-2);let other=start+7;
    while(other<end-1&&same(first,cargo[other]))other++;
    if(other<end-1)swap(target,other);else alternate(cargo[target]);
  }
  return cargo;
}
function makeTruckCargo(){const c=G.cfg,cargo=[];for(let i=0;i<c.cargo;i++)cargo.push(newParcel());diversifyTruckCargo(cargo,c);return cargo;}
function truckArrive(park=false){
  const c=G.cfg,cargo=townPerk(5,'express')&&Array.isArray(G.townNextCargo)?G.townNextCargo:makeTruckCargo();
  if(townPerk(5,'express'))G.townNextCargo=G.plan.length?makeTruckCargo():[];
  if(townPerk(4,'logistics')&&activeTownHome().returns.length){const n=activeTownHome().returns.splice(0).length;float(W/2,TRUCK.y-16,(lang==='ru'?'Возвраты забраны: ':'Returns collected: ')+n,'#4cd18a');}
  if(cityFreight()&&cargo.length){
    if(!S.xlDeliverySeen){
      cargo[0]={c:cargo[0].c,s:BIG,f:false,r:false,ready:1e9};
      S.xlDeliverySeen=true;
    }else if(cityColdFreight()&&!S.coldDeliverySeen){
      cargo[0]={c:cargo[0].c,s:0,f:false,r:false,cold:COLD_T,ready:1e9};
      S.coldDeliverySeen=true;
    }
  }
  if(G.autoLocker&&S.autoLocker)PptCampaignLocker.reserve(S.autoLocker,cargo);
  if(G.ev==='chaos'){for(const b of cargo){b.ready=G.clock+6+Math.random()*10;putFloor(b,120+Math.random()*170,390+Math.random()*102);}G.truck={cargo:[],t:2.5,max:2.5,dump:true};return;}
  const wait=c.wait+(housePerk(2,'barn')?30:0);
  const truck={cargo,t:wait,max:wait};
  if(park)G.houseSecondTruck=truck;else G.truck=truck;
}
function returnTruck(tr){
  if(!tr?.cargo.length)return;
  const n=tr.cargo.length,pen=2*n;S.cash-=pen;G.st.penalties+=pen;G.st.sentBack+=n;
  float(W/2,TRUCK.y-12,message('fBack',pen),'#ff5d5d');
}
function spoil(b){b.cold=null;b.r=true;b.f=false;b.spoiled=true;S.cash-=15;G.st.penalties+=15;G.st.spoiled++;resetCombo();float(60,360,message('fSpoiled'),'#ff5d5d');if(G.p.hands.includes(b))drawHands();}
function clearSpoiledLocker(){for(let i=0;i<S.locker.length;i++)if(S.locker[i]?.spoiled){S.locker[i]=null;S.heap++;}}
// The second-day crowd is a presentation-only story beat. Its actors never
// enter the real queues, so they cannot charge penalties or change reviews.
const STORY_CROWD_START=114,STORY_LIVE_LENGTH=5;
function storyLiveEligible(){return !!G&&S.day===2&&S.storyQueueEligible===true&&branchRuntime.current()?.id===1;}
function storyCrowdVisible(){return storyLiveEligible()&&(G.clock>=STORY_CROWD_START||!!G.storyLive);}
function storyReducedMotion(){try{return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}catch{return false;}}
function storyLiveFade(live){return !live?0:storyReducedMotion()?(live.elapsed>=1?1:0):Math.max(0,Math.min(1,(live.elapsed-3)/2));}
function storyTruckPhase(){
  if(!storyCrowdVisible()||(!G.storyLive&&G.clock<117))return null;
  const elapsed=G.storyLive?3:G.clock-117;
  const arrival=storyReducedMotion()?1:Math.max(0,Math.min(1,elapsed));
  const targets=[[122,401],[156,438],[194,394],[226,451],[263,411],[291,462],[177,480]];
  const boxes=targets.map(([x,y],i)=>{
    const progress=storyReducedMotion()?(elapsed>=1?1:0):Math.max(0,Math.min(1,(elapsed-1-i*.17)/.65));
    return {x:TRUCK.x+TRUCK.w/2+(x-(TRUCK.x+TRUCK.w/2))*progress,
      y:TRUCK.y+18+(y-(TRUCK.y+18))*progress-Math.sin(Math.PI*progress)*35,progress,c:i%2,s:i%2};
  });
  return {arrival,boxes};
}
function drawStoryTruck(){
  const scene=storyTruckPhase();if(!scene)return;
  const tr={x:TRUCK.x,y:TRUCK.y+(1-scene.arrival)*84,w:TRUCK.w,h:TRUCK.h};
  if(!globalThis.PptEnvironmentSample?.truck(ctx,tr)){
    ctx.fillStyle='rgba(0,0,0,.35)';rr(tr.x+3,tr.y+4,tr.w,tr.h,6);ctx.fill();
    ctx.fillStyle='#d8dde2';rr(tr.x,tr.y,tr.w,tr.h,6);ctx.fill();ctx.fillStyle='#ff7a1a';ctx.fillRect(tr.x,tr.y+tr.h-8,tr.w,8);
  }
  for(const b of scene.boxes)if(b.progress>0){
    ctx.save();ctx.globalAlpha=.78;
    drawBox(b.x,b.y,{c:b.c,s:b.s,f:false,r:false,ready:1e9},WORLD_BOX_SIZE);
    ctx.setLineDash([3,3]);ctx.strokeStyle='#ffe28a';ctx.lineWidth=1.2;rr(b.x-15,b.y-15,30,30,3);ctx.stroke();ctx.restore();
  }
}
function storyPlayerPose(p,live){
  if(!live||storyReducedMotion())return p;
  const waypoints=[[live.x,live.y],[90,420],[270,365],[115,300],[220,430]],s=Math.min(3.999,live.elapsed*1.2),i=Math.floor(s),t=s-i;
  return {...p,busy:0,x:waypoints[i][0]+(waypoints[i+1][0]-waypoints[i][0])*t,y:waypoints[i][1]+(waypoints[i+1][1]-waypoints[i][1])*t,tg:{k:'story',x:waypoints[i+1][0],y:waypoints[i+1][1]}};
}
function update(dt){
  if(G.storyLive){
    // A background branch waits until the player is actually viewing it.
    if(!branchRuntime.canPresent())return;
    G.storyLive.elapsed+=dt;
    if(G.storyLive.elapsed>=(storyReducedMotion()?1:STORY_LIVE_LENGTH)){delete G.storyLive;endDay();}
    return;
  }
  G.clock+=dt;G.time=DAY-G.clock;if(G.time<=0){
    if(storyLiveEligible()){G.clock=DAY;G.time=0;G.storyLive={elapsed:0,x:G.p.x,y:G.p.y};return;}
    endDay();return;
  }
  if(G.autoLocker&&S.autoLocker){
    const picked=PptCampaignLocker.update(S.autoLocker,G.autoLocker,dt);
    if(picked){
      const pay=Math.round(payFor(picked.customer,picked.parcel)*.8/mult());
      S.cash+=pay;G.st.revenue+=pay;G.st.served++;G.st.byLocker++;review(5);
      float(W+28,130+9.5-78.5*customerDisplayScale(picked.customer.shirt,picked.customer.vip)-10,'★','#ffd166');
      if(NETWORK.campaign){G.campaignServed=(G.campaignServed||0)+1;
        if(NETWORK.campaign.chapter==='city'&&NETWORK.campaign.cityProgress?.district==='center')
          NETWORK.campaign=PptCampaign.recordCityLockerPickup(NETWORK.campaign).campaign;
      }
      lockerSettlementDirty=true;
    }
  }
  const home=perksHome();
  if(home){
    PptVillagePerks.wetCells(home,G,S.stock,dt,spoil);
    if(!home.choices[3]&&!G.houseFaultUntil&&G.clock>=45){
      G.houseFaultUntil=G.clock+5;float(W/2,COUNTER_Y-26,lang==='ru'?'Выбило пробки · 5 с':'Fuse blown · 5 s','#ffd166');
    }
  }
  const parking=housePerk(5,'barn')&&!G.houseSecondTruck&&G.ev!=='chaos';
  if((!G.truck||parking)&&G.plan.length&&G.clock>=G.plan[0]){G.plan.shift();truckArrive(!!G.truck);playerCue('truck');}
  if(G.houseSecondTruck?.houseStarted){
    const other=G.houseSecondTruck;other.t-=dt;
    if(other.t<=0||(!other.cargo.length&&other.t<other.max-1)){returnTruck(other);G.houseSecondTruck=null;}
  }
  if(G.truck){const tr=G.truck;tr.t-=dt;
    if(lv('conveyor')&&tr.cargo.length){G.conv-=dt;if(G.conv<=0){G.conv=2;const b=tr.cargo[0];b.ready=G.clock+6+Math.random()*10;if(putFloor(b,290,492))tr.cargo.shift();}}
    if(tr.t<=0||(!tr.cargo.length&&!tr.dump&&tr.t<tr.max-1)){
      returnTruck(tr);G.truck=G.houseSecondTruck||null;G.houseSecondTruck=null;if(G.truck)G.truck.houseStarted=true;}}
  // cold chain: ticks everywhere except the fridge once the parcel left the truck
  eachParcel((b,where)=>{if(b.cold!=null&&where!=='fridge'&&b.ready<1e8){b.cold-=dt;if(b.cold<=0){spoil(b);playerCue('warn');}}});
  // The locker cannot be opened by the player, so spoiled contents move to
  // the returns heap and release their cell without another cash penalty.
  clearSpoiledLocker();
  // A spoiled locker parcel cannot be sold. The customer falls back to their
  // original service queue, where a replacement may still be found.
  for(const q of G.lockerQ.slice()){
    const b=S.locker[q.lockSlot];if(b&&!b.r&&!b.spoiled)continue;
    G.lockerQ.splice(G.lockerQ.indexOf(q),1);
    q.lockSlot=null;
    if(q.personalCheck){
      waitForCheckWindow(G,q);
      continue;
    }
    let wi=q.win;
    if(G.q[wi].length>=depth()){
      wi=-1;
      for(let i=firstWin();i<G.q.length;i++)if(G.q[i].length<depth()&&(wi<0||G.q[i].length<G.q[wi].length))wi=i;
    }
    if(wi<0){angryLeave(q);playerCue('warn');}
    else{q.win=wi;q.state='in';G.q[wi].push(q);}
  }
  if(G.waitingChecks?.length)admitWaitingChecks(G,firstWin(),depth());
  G.custClock-=dt;
  if(G.custClock<=0){G.custClock=spawnCust()?G.cfg.cust/flow():.5;}
  // A parcel may become ready after it was loaded while its customer is
  // already walking to a window. Check again when its SMS delay expires.
  if(lockerOn())lockerPull();
  const cm=comfort();
  G.q.forEach((line,i)=>{line.slice().forEach((q,k)=>{
    const tx=winX(i),ty=Q_Y[k];
    const walking=customerWalkFactor(q);
    if(q.state==='in'&&Number.isInteger(q.houseDoorStep)){
      if(followHouseDoor(q,tx,ty,110*walking,dt))q.state='wait';
    }else if(q.state==='in'){if(moveTo(q,tx,ty,110*walking,dt))q.state='wait';}
    else{moveTo(q,tx,ty,80*walking,dt);const ow=G.win[i],loss=cm*(ow&&ow.s&&ow.s.trait==='chatty'?.7:1);
      if(q.housePrepared){if(G.clock>=q.housePickupAt&&!housePowerOff()){
        const b=q.housePrepared;delete q.housePrepared;delete q.housePickupAt;q.claim=null;
        if(!b.r)give(q,b,null);else if(!putFloor(b,winX(i),SERVE_Y))S.heap++;
      }return;}
      q.pt-=home?PptVillagePerks.patienceLoss(home,q,dt,loss):dt*loss;
      if(q.pt<=0){if(townPerk(5,'cozy')&&!G.townPorchUsed){G.townPorchUsed=true;q.pt=12;q.max=Math.max(q.max,12);queueFloat(q,-24,lang==='ru'?'Навес: ещё 12 с':'Porch: 12 more s','#4cd18a');}else{angryLeave(q);playerCue('warn');}}}
    // Personal requests belong to the point the player can actually see.
    // On switching branches, release unclaimed requests immediately; a route
    // already accepted by the player remains intact and can finish normally.
    if(q.personalCheck===true&&branchRuntime.current()?.id!==NETWORK.activeId&&q.claim!=='p'){
      q.personalCheck=false;delete q.personalUntil;
    }
    if(q.personalCheck===true&&q.state==='wait'&&k===0&&Math.abs(q.y-ty)<.01){
      if(!Number.isFinite(q.personalUntil))q.personalUntil=G.clock+Math.min(14,Math.max(0,q.pt)*.4);
      else if(G.clock>=q.personalUntil&&q.claim!=='p'){q.personalCheck=false;delete q.personalUntil;}
    }
  });});
  // locker pickups: walk up, open the cell, leave happy
  G.lockerQ.slice().forEach((q,k)=>{const tx=winX(0)+((k%3)-1)*14,ty=Q_Y[Math.min(2,Math.floor(k/3))];
    if(moveTo(q,tx,ty,110*customerWalkFactor(q),dt)){q.lt-=dt;if(q.lt<=0){const j=q.lockSlot,b=S.locker[j];S.locker[j]=null;
      const pay=Math.round(payFor(q,b)*.8/mult());S.cash+=pay;G.st.revenue+=pay;G.st.served++;G.st.byLocker++;review(5);queueFloat(q,-24,message('earnedCash',pay),'#c9a25b');
      G.lockerQ.splice(G.lockerQ.indexOf(q),1);if(NETWORK.campaign)G.campaignServed=(G.campaignServed||0)+1;customerReaction(q,true);q.state='leave';q.happy=true;G.leaving.push(q);}}});
  if(activeVillageHome())G.leaving=G.leaving.filter(q=>!followHouseDoor(q,0,0,120*customerWalkFactor(q),dt,true));
  else{for(const q of G.leaving)q.y-=120*customerWalkFactor(q)*dt;G.leaving=G.leaving.filter(q=>q.y>-40);}
  const p=G.p;
  if(p.busy>0){p.busy-=dt;if(p.busy<=0){
    if(p.busyT==='heap')S.heap=Math.max(0,S.heap-1);
    else if(p.busyT==='verify'){if(NETWORK.away&&p.tg?.ref?.state==='wait'&&p.tg.ref.claim==='p')G.awayChecks++;}
    else G.mess=G.mess.filter(m=>m!==p.busyT);
    p.busyT=null;
  }}
  else if(p.tg){
    let sp=150*(1+.15*lv('shoes'));
    if(p.hands.some(b=>b.s===BIG))sp*=lv('xlcart')?.85:.65;
    if(S.heap>0&&dist(p.x,p.y,HEAP.x,HEAP.y)<HEAP.r)sp*=lv('warehouse')?.8:.6;
    if(G.mess.some(m=>dist(p.x,p.y,m.x,m.y)<20))sp*=.7;
    if(home)sp*=PptVillagePerks.routeSpeed(home,p);
    const detour=home&&PptVillagePerks.floorWaypoint(home,p,p.tg.x,p.tg.y);
    if(detour)moveTo(p,detour.x,detour.y,sp,dt);
    else if(moveTo(p,p.tg.x,p.tg.y,sp,dt)){
      const tg=p.tg;
      if(home&&!tg.shelfHandled&&(tg.k==='fetch'&&!tg.src.store&&tg.src.fz==null||tg.k==='cell'&&!p.hands.length)){
        tg.shelfHandled=true;p.busyLen=p.busy=.55*(housePerk(1,'office')?.85:1);p.busyT='shelf';
      }else{p.tg=null;interact(tg);}
    }
  }
  updWorkers(dt);
  for(const k in G.shake){G.shake[k]-=dt;if(G.shake[k]<=0)delete G.shake[k];}
  if(G.hl){G.hl.t-=dt;if(G.hl.t<=0)G.hl=null;}
  for(const f of G.floats){f.t-=dt;f.y-=22*dt;}G.floats=G.floats.filter(f=>f.t>0);
}

const CARDS=['tips','calm','rush','coffee','trucks','fever','prime','glass','intern','sale','outage','double'];
const CTRS=PptContracts.ids;
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function cardPool(){return CARDS.filter(id=>!(id==='glass'&&S.day<6)&&!(id==='outage'&&!lv('ai')&&!lv('robot')));}
const needCard=()=>S.day>=8,needCtr=()=>S.day>=8&&(S.day-1)%7===0&&!(S.contract&&S.contract.start===S.day);
function ctrSpec(id,d){
  return PptContracts.spec(id,d,start=>PptBalance.volumeContractTarget(start,day=>{const level=storyDifficultyDay(day);return PptBalance.configure(level,cfgFor(level));}));}
function ctrText(id,d,target){const sp=ctrSpec(id,d),tx=STR[lang].ctrs[id];return{name:tx[0],desc:countText('ctr'+id[0].toUpperCase()+id.slice(1),tx[1],[Number.isFinite(target)?target:sp.target]),reward:formatText(tx[2],[undefined,sp.cash||0])};}
function ctrUpdate(st,nStars){const c=S.contract,result=PptContracts.update(c,st,nStars,S.day);if(!result)return null;
  c.prog=result.progress;
  if(result.outcome==='done'){c.state='done';if(result.reward==='gloves')S.up.gloves=1;else if(result.reward==='pay')S.perm.pay+=.05;else if(result.reward==='pat')S.perm.pat+=.05;else S.cash+=ctrSpec(c.id,c.start).cash;}
  if(result.outcome==='fail')c.state='fail';
  return {id:c.id,outcome:result.outcome||'progress',progress:c.prog,target:c.target,cash:ctrSpec(c.id,c.start).cash||0};}
function goalsMet(st){if(NETWORK.away)return PptPostgame.evaluate(NETWORK.away.goals,awayStats(st));const g=G.cfg.goal;const a=st.served>=g,b=st.angry===0,c=G.maxMult>=1.5;return[a,b,c];}
function endDay(){
  if(mode!=='play'||!G)return;
  if(G.autoLocker&&S.autoLocker)PptCampaignLocker.endShift(S.autoLocker,G.autoLocker);
  const st=G.st;
  if(G.houseSecondTruck)returnTruck(G.houseSecondTruck);
  for(const q of allCust())if(q.housePrepared){putHome(q.housePrepared,winX(q.win),SERVE_Y);delete q.housePrepared;}
  if(G.truck&&G.truck.cargo.length){const n=G.truck.cargo.length;S.cash-=2*n;st.penalties+=2*n;st.sentBack+=n;}
  const met=goalsMet(st),nStars=met.filter(Boolean).length,bonus=nStars*15;S.cash+=bonus;
  const home=activeVillageHome(),town=G.legacyTownLease?null:activeTownHome(),baseRent=G.legacyVillageLease?rentFor(storyDifficultyDay(S.day)):shiftBaseRent(S.day);
  const rent=home||town?0:Math.round(baseRent*G.mod.rent);
  const upkeep=home?PptVillagePerks.upkeep(home,S.day,PptVillageHome.upkeep,G.ev):town?PptTownRenovation.upkeep:0;
  const gardenSales=home?PptVillagePerks.gardenSales(home):0;
  const styleSet=home||town?PptVillagePerks.setBonus(home||town):0;
  S.cash+=gardenSales+styleSet-rent-upkeep;
  for(const b of G.p.hands.splice(0)){if(!putFloor(b,250,420,b))S.heap++;}
  if(town){if(!townPerk(3,'cozy'))for(const b of town.buffer.splice(0))putHome(b,250,420);for(const b of town.dock.splice(0))putHome(b,250,420);}
  eachParcel((b,where)=>{if(b.cold!=null&&where!=='fridge')spoil(b);});
  clearSpoiledLocker();
  for(const b of S.locker)if(b)b.lk=false;
  for(const w of G.workers)for(const b of w.carry.splice(0))if(!putFloor(b,250,420))S.heap++;
  const wages=S.staff.reduce((a,x)=>a+wage(x),0);S.cash-=wages;
  const lvUps=[];
  for(const x of S.staff){x.xp+=x.trait==='rookie'?2:1;if(x.lvl<5&&x.xp>=x.lvl*2){x.xp=0;x.lvl++;if(Math.random()<.5&&x.spd<5)x.spd++;else if(x.acc<5)x.acc++;else if(x.spd<5)x.spd++;lvUps.push({n:x.n,lvl:x.lvl});}}
  if(S.day+1>=PptNetwork.HIRING_DAY||S.startStaffSlots>=2)S.cands=[genCand(),genCand(),genCand()];
  drawHands();
  eachParcel(b=>b.ready=-1);
  if(lv('returns'))S.heap=0;
  const beforeContract=S.cash,ctrMsg=ctrUpdate(st,nStars),contractCash=S.cash-beforeContract;
  const cardExpense=S.card==='coffee'?40:0;
  const profit=st.revenue-st.refunds-st.penalties+bonus+gardenSales+styleSet+contractCash-rent-upkeep-wages-cardExpense;
  const deed=!NETWORK.away&&branchRuntime.current().id===1?NETWORK.villageHome:null;
  const instalment=deed?PptVillageHome.paymentDue(deed,profit,S.cash,villageWages()):0;
  if(instalment){deed.debt-=instalment;S.cash-=instalment;}
  if(home)home.shifts++;
  sumData={st,bonus,rent,wages,lvUps,met,nStars,ctrMsg,goal:G.cfg.goal,net:profit-instalment,rating:stars(),
    ...(cardExpense?{cardExpense}:{}),...(contractCash?{contractCash}:{}),
    ...(home?{upkeep,gardenSales,...(styleSet?{styleSet}:{})}:town?{upkeep,...(styleSet?{styleSet}:{})}:{}),...(deed?{instalment,debt:deed.debt}:{})};
  if(NETWORK.postgame)sumData.calendarDay=calendarDay();
  S.lowDays=stars()<2?(S.lowDays||0)+1:0;sumData.lowWarn=S.lowDays===1;
  NETWORK.totals.days++;NETWORK.totals.served+=st.served;NETWORK.totals.revenue+=st.revenue;
  // A trip cannot bankrupt anyone, and after the finale a capital point no
  // longer closes: a chapter restart does not exist once the story is complete.
  if(!NETWORK.away&&!NETWORK.postgame&&(S.cash<-100||S.lowDays>=2)){mode='over';sumData.why=S.cash<-100?'overCash':'overStars';if(!networkBatch)save();showOver();return;}
  if(NETWORK.away)awayFinish(st,met);
  else if(NETWORK.campaign){
    const campaign=NETWORK.campaign,branchId=branchRuntime.current().id;
    // After the finale the capital keeps working. Its story goals are closed,
    // but the outskirts still count shifts: their difficulty follows that number.
    if(campaign.status==='complete'){if(NETWORK.postgame&&campaign.chapter==='capital'&&branchId===1)NETWORK.campaign={...campaign,shifts:campaign.shifts+1};}
    else if(campaign.chapter==='capital'){
      // A branch opened halfway through a solo shift is not yet part of a
      // shared shift. Once both run, the first result may already be on its
      // summary while the other is settling.
      const together=NETWORK.branches.length===2&&NETWORK.branches.every(branch=>branch.id===branchId||['play','summary'].includes(branch.status));
      NETWORK.campaign=PptCampaign.recordCapitalShift(campaign,{branchId,day:S.day,rating:stars(),served:G.campaignServed||0,together}).campaign;
    }else if(branchId===1)NETWORK.campaign=PptCampaign.recordShift(campaign,{chapter:campaign.chapter,shiftId:campaign.shifts+1,rating:stars(),served:G.campaignServed||0,revenue:st.revenue}).campaign;
  }
  // Only new campaigns opt in. Persist the scene marker together with the
  // already-settled results, so returning to a summary never settles twice.
  if(S.day===2&&branchRuntime.current().id===1&&S.storyQueueEligible===true){sumData.storyQueueStep=0;S.storyQueueEligible=false;}
  S.day++;S.ev=null;S.evDay=0;S.card=null;
  mode='summary';if(sumData.ctrMsg?.outcome==='done')contractFxPending.set(branchRuntime.current(),sumData);if(!networkBatch)save();if(loadFailed)return;playerCue('shift');showSummary();
}

// ---------- test mode presets ----------
function preset(n){
  S=fresh();S.day=n;S.cash=n>1?100+40*n:60;
  const up=S.up;
  if(n>=8)Object.assign(up,{shoes:1,cart:1,shelves:1,robot:1,cooler:1,coffee:1,conveyor:1,scanner:1,queue:1});
  if(n>=11)Object.assign(up,{ai:1,tv:1,returns:1});
  if(n>=21)Object.assign(up,{shoes:2,cart:2,shelves:2,tune:1,ai:2,queue:2,warehouse:1,gloves:1});
  if(n>=31)Object.assign(up,{shoes:3});
  if(n>=PptNetwork.HIRING_DAY)S.cands=[genCand(),genCand(),genCand()];
  if(n>=21){up.staffroom=1;S.staff=[Object.assign(genCand(),{trait:'careful',role:'sort',spd:3,acc:4,lvl:3}),Object.assign(genCand(),{trait:'chatty',role:'cash',spd:3,acc:3,lvl:2})];}
  if(n>=31){up.staffroom=2;S.staff.push(Object.assign(genCand(),{trait:'strong',role:'load',spd:4,acc:3,lvl:2}));}
  S.reviews=[5,5,4,5,5];resetNetwork(S);save();hasSave=true;
}

// ---------- input ----------
let cv=document.getElementById('cv'),ctx=cv.getContext('2d'),scale=1;
const AUTO_LOCKER_STRIP=70;
const views=[1,2].map(id=>{const canvas=$(id===1?'cv':'cv2');return{id,canvas,ctx:canvas.getContext('2d'),scene:$('scene'+id),scale:1,worldWidth:W,extension:WAIT_EXT,homeActive:false};});
for(const view of views)view.canvas.addEventListener('pointerdown',pointerDown);
function pointerDown(e){
  const previous=G?.p.tg;playerInputActive=e.isTrusted===true;
  try{handlePlayerPointer(e);}finally{if(playerInputActive&&G?.p.tg&&G.p.tg!==previous)audibleTargets.add(G.p.tg);playerInputActive=false;}
}
function handlePlayerPointer(e){
  if(loadFailed||menuOpen||settingsOpen||networkPaused||externallyPaused())return;
  const view=views.find(item=>item.canvas===e.currentTarget);
  if(view.id!==NETWORK.activeId)selectBranch(view.id);
  if(mode!=='play'||paused||!G||G.storyLive)return;
  const rc=view.canvas.getBoundingClientRect(),x=(e.clientX-rc.left)/rc.width*view.worldWidth,y=(e.clientY-rc.top)/rc.height*(H+view.extension)-view.extension;
  if(x>=W)return;
  const p=G.p;if(p.busy>0)return;
  const hw=W/nWin()/2;
  if(lockerOn()&&x<W/nWin()&&y>=(S.locker.some(Boolean)?COUNTER_Y-16:COUNTER_Y-62)&&y<COUNTER_Y+COUNTER_H){
    const ww=W/nWin(),x0=winX(0)-ww/2+4,cw=(ww-8)/3;
    const col=Math.floor((x-x0)/cw),row=Math.floor((y-COUNTER_Y-5)/13);
    const inside=col>=0&&col<3&&row>=0&&row<2&&x>=x0+col*cw+1&&x<=x0+(col+1)*cw-1&&y>=COUNTER_Y+5+row*13&&y<=COUNTER_Y+17+row*13;
    clearPlayerClaims();p.tg={k:'locker',x:winX(0),y:SERVE_Y};if(inside)p.tg.i=row*3+col;return;}
  // Counter tickets belong to the first customer in each lane.
  for(const l of G.q){const f=l[0];if(!f||f.state!=='wait')continue;const layout=counterOrderLayout(f.win,f.ret?[f.ret]:f.need);if(Math.abs(x-f.x)<hw&&y>=Math.min(COUNTER_Y,layout.y)&&y<Math.max(COUNTER_Y+COUNTER_H,layout.y+layout.height)){clearPlayerClaims();tapCustomer(f);return;}}
  // Patience bars are painted over the row behind; give their visible strip
  // priority over the sprite underneath. A Prime crown extends above the PNG.
  for(const l of G.q)for(const q of l){if(q.state!=='wait')continue;const qy=queuePersonY(q),barY=queueBarY(qy);
    if(x>=queueBarX(q.x)-3&&x<=queueBarX(q.x)+QUEUE_BAR_W+3&&y>=barY-3&&y<=barY+7){tapCustomer(q);return;}
    const size=customerDisplayScale(q.shirt,q.vip),crownY=qy+9.5-78.5*size;
    if(q.prime&&Math.abs(x-(q.x+22))<9&&y>=crownY-11&&y<crownY+3){tapCustomer(q);return;}}
  // Match the visual queue projection; painted front customers take priority
  // if two walking sprites briefly overlap while the line advances.
  for(const l of G.q)for(const q of l){const qy=queuePersonY(q),size=customerDisplayScale(q.shirt,q.vip);
    if(q.state==='wait'&&Math.abs(x-q.x)<Math.min(hw,30*size)&&y>qy+9.5-83.5*size&&y<qy+14){tapCustomer(q);return;}}
  if(view.homeActive&&y< -5)return;
  clearPlayerClaims();
  // A broken parcel can land directly on the hit area of another shelf or
  // appliance. Its visible centre must stay tappable; the smaller priority
  // radius leaves the rest of the underlying control available.
  for(const m of G.mess)if(dist(x,y,m.x,m.y)<14){p.tg={k:'mess',ref:m,x:m.x,y:m.y};return;}
  if(bigOn())for(let c=0;c<G.cfg.colors;c++){const r=bigRect(c);if(x>=r.x-4&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h){const st=slotStand(c,BIG);p.tg={k:'cell',c,s:BIG,x:st.x,y:st.y};return;}}
  if(fridgeOn()&&x>=FRIDGE.x&&x<=FRIDGE.x+FRIDGE.w&&y>=FRIDGE.y&&y<=FRIDGE.y+FRIDGE.h){
    if(S.fridge.length===3&&y>=fzRect(3).y){float(FRIDGE_STAND.x,FRIDGE_STAND.y-25,lang==='ru'?'Расширение в магазине':'Expand in shop');return;}
    let i=0,bd=1e9;for(let k=0;k<S.fridge.length;k++){const r=fzRect(k),d=dist(x,y,r.x+r.w/2,r.y+r.h/2);if(d<bd){bd=d;i=k;}}p.tg={k:'fridge',i,x:FRIDGE_STAND.x,y:FRIDGE_STAND.y};return;}
  for(let c=0;c<G.cfg.colors;c++)for(let s=0;s<G.cfg.shapes;s++){const r=cellRect(c,s);
    if(x>=r.x-2&&x<=r.x+r.w+2&&y>=r.y-18&&y<=r.y+r.h+4){const st=cellStand(c,s);p.tg={k:'cell',c,s,x:st.x,y:st.y};return;}}
  if(G.truck&&!G.truck.dump&&x>=TRUCK.x&&x<=TRUCK.x+TRUCK.w&&y>=TRUCK.y-8&&y<=TRUCK.y+TRUCK.h){p.tg={k:'truck',x:W/2,y:TRUCK.y-14};return;}
  for(const m of G.mess)if(dist(x,y,m.x,m.y)<20){p.tg={k:'mess',ref:m,x:m.x,y:m.y};return;}
  if(dist(x,y,HEAP.x,HEAP.y)<HEAP.r&&(S.heap>0||p.hands.length)){p.tg={k:'heap',x:HEAP.x+26,y:HEAP.y};return;}
  let bi=-1,bd=20;
  S.floor.forEach((st,i)=>{const tp=st.length?floorTop(i):FLOOR[i];const d=dist(x,y,tp.x,tp.y);if(d<bd){bd=d;bi=i;}});
  const tool=perksHome()&&PptVillagePerks.toolAt(perksHome(),x,y);
  if(tool&&!(bi>=0&&S.floor[bi].length)){if(tool==='store:cellar'){showHouseTools();return;}if(useHouseTool(tool))return;}
  if(bi>=0&&(S.floor[bi].length||p.hands.length)){p.tg={k:'floor',i:bi,x:FLOOR[bi].x,y:FLOOR[bi].y+18};return;}
  p.tg={k:'move',x:Math.max(14,Math.min(W-14,x)),y:Math.max(SERVE_Y,Math.min(TRUCK.y-14,y))};
}

// ---------- drawing ----------
function shapePath(s,x,y,r){ctx.beginPath();
  if(s===0)ctx.arc(x,y,r,0,Math.PI*2);
  else if(s===1)ctx.rect(x-r*.85,y-r*.85,r*1.7,r*1.7);
  else if(s===2){ctx.moveTo(x,y-r);ctx.lineTo(x+r*.98,y+r*.75);ctx.lineTo(x-r*.98,y+r*.75);ctx.closePath();}
  else{for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r*1.05;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();}}
function rr(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
// Selected painted-front A. Other placements remain private comparison paths.
const PARCEL_MARK_STYLE='A';
const PARCEL_FRONT_CENTRES=[[20.5,29.5],[20.5,29.5],[21,30],[21,29.5]];
// Visible front-bottom edge endpoints, excluding the soft outer shadow.
const PARCEL_FRONT_BOTTOM=[[4,41,38,43],[5,40,37,42],[6,41,37,43],[5,40,38,42]];
const PARCEL_SHAPE_MID_Y=[0,0,(-1+.75+.04*.98)/2,(()=>{
  const ys=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?.45:1.05;return r*(Math.sin(a)+.04*Math.cos(a));});
  return (Math.min(...ys)+Math.max(...ys))/2;
})()];
function parcelMark(x,y,b,size,style){
  if(style==='A'){
    const centre=PARCEL_FRONT_CENTRES[b.c],extent=size*1.2,radius=size*.24*1.15;
    // Centre each path's geometric bounds, including asymmetric triangle/star.
    const edge=PARCEL_FRONT_BOTTOM[b.c],shear=b.s===1||b.s===2?(edge[3]-edge[1])/(edge[2]-edge[0]):.04;
    const midpoint=b.s===2?(-1+.75+Math.abs(shear)*.98)/2:PARCEL_SHAPE_MID_Y[b.s];
    ctx.save();
    ctx.translate(x+extent*(centre[0]/48-.5),y+extent*(centre[1]/48-.5));
    ctx.transform(1,shear,0,1,0,-midpoint*radius);
    shapePath(b.s,0,0,radius);
    ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle='#17212c';ctx.lineWidth=Math.max(.65,size*.025);ctx.stroke();
    ctx.restore();return;
  }
  if(style==='legacy'){
    ctx.fillStyle=COL[b.c];rr(x-size*.36,y-size*.04,size*.48,size*.44,size*.06);ctx.fill();
    ctx.strokeStyle=COLD[b.c];ctx.lineWidth=.8;ctx.stroke();
    shapePath(b.s,x-size*.12,y+size*.18,size*.17);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=COLD[b.c];ctx.lineWidth=.9;ctx.stroke();return;
  }
  const external=style==='C',cx=x+size*(external?.52:-.048),cy=y+size*(external?0:.156),radius=size*(external?.13:.24);
  if(external){ctx.fillStyle='#1c2025';ctx.beginPath();ctx.arc(cx,cy,size*.16,0,Math.PI*2);ctx.fill();}
  shapePath(b.s,cx,cy,radius);
  if(style==='B'){
    ctx.strokeStyle='#17212c';ctx.lineWidth=Math.max(2,size*.13);ctx.stroke();
    ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(.9,size*.065);ctx.stroke();
  }else{
    ctx.fillStyle='#fff';ctx.fill();
    if(style==='A-before'){ctx.strokeStyle='#17212c';ctx.lineWidth=Math.max(.65,size*.025);ctx.stroke();}
  }
}
function drawBox(x,y,b,sz){
  sz=sz||26;const h=sz/2,c=b.c;
  const wide=b.s===BIG&&!b.r;
  if(wide){const w2=sz*.68,h2=sz*.375;
    const bitmap=globalThis.PptEnvironmentSample?.parcelWide(ctx,x,y,sz,c);
    if(!bitmap){
      ctx.fillStyle='rgba(0,0,0,.3)';rr(x-w2+2,y-h2+3,w2*2,h2*2,4);ctx.fill();
      ctx.fillStyle=COL[c];rr(x-w2,y-h2,w2*2,h2*2,4);ctx.fill();ctx.strokeStyle=COLD[c];ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(x-w2*.45,y-h2,w2*.22,h2*2);ctx.fillRect(x+w2*.25,y-h2,w2*.22,h2*2);
    }
    ctx.save();
    if(bitmap){const centre=PARCEL_FRONT_CENTRES[c],edge=PARCEL_FRONT_BOTTOM[c];
      ctx.translate(x+sz*1.36*(centre[0]/48-.5),y+sz*(centre[1]/48-.5));
      ctx.transform(1,(edge[3]-edge[1])/(edge[2]-edge[0])/1.36,0,1,0,0);
    }else ctx.translate(x,y+1);
    ctx.font='800 '+(bitmap?Math.max(6,Math.round(sz*.32)):Math.round(sz*.32))+'px Nunito, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    if(bitmap){ctx.strokeStyle='#17212c';ctx.lineWidth=Math.max(.8,sz*.055);ctx.strokeText('XL',0,0);}
    ctx.fillStyle='#fff';ctx.fillText('XL',0,0);ctx.restore();
  }else{
    const sample=b.r?globalThis.PptEnvironmentSample?.parcelReturn(ctx,x,y,sz):globalThis.PptEnvironmentSample?.parcel(ctx,x,y,sz,c);
    if(sample){if(!b.r)parcelMark(x,y,b,sz,PARCEL_MARK_STYLE);}
    else{
      ctx.fillStyle='rgba(0,0,0,.3)';rr(x-h+2,y-h+3,sz,sz,4);ctx.fill();
      ctx.fillStyle=b.r?'#b8916a':COL[c];rr(x-h,y-h,sz,sz,4);ctx.fill();
      ctx.strokeStyle=b.r?'#6d5238':COLD[c];ctx.lineWidth=1.5;ctx.stroke();
    }
    if(b.r){
      const rx=sample?x-sz*.1:x,ry=sample?y+sz*.13:y;
      ctx.strokeStyle='#6d5238';ctx.lineWidth=2;ctx.beginPath();ctx.arc(rx,ry,sz*.22,Math.PI*.2,Math.PI*1.6);ctx.stroke();
      const a=Math.PI*1.6,tipX=rx+Math.cos(a)*sz*.22,tipY=ry+Math.sin(a)*sz*.22,tx=-Math.sin(a),ty=Math.cos(a);
      ctx.beginPath();ctx.moveTo(tipX-tx*sz*.12+ty*sz*.08,tipY-ty*sz*.12-tx*sz*.08);ctx.lineTo(tipX,tipY);
      ctx.lineTo(tipX-tx*sz*.12-ty*sz*.08,tipY-ty*sz*.12+tx*sz*.08);ctx.stroke();
    }else if(!sample){
      ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(x-h+2,y-1.5,sz-4,3);
      shapePath(b.s,x,y,sz*.26);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=COLD[c];ctx.lineWidth=1.2;ctx.stroke();
    }
  }
  if(b.spoiled){const sx=x+h-2,sy=y+h-2,r=sz*.18;
    ctx.fillStyle='#9e2734';ctx.beginPath();ctx.arc(sx,sy,r,0,7);ctx.fill();
    ctx.strokeStyle='#fff';ctx.lineWidth=Math.max(1,sz*.07);ctx.beginPath();
    ctx.moveTo(sx-r*.5,sy-r*.5);ctx.lineTo(sx+r*.5,sy+r*.5);ctx.moveTo(sx+r*.5,sy-r*.5);ctx.lineTo(sx-r*.5,sy+r*.5);ctx.stroke();
  }
  if(b.f){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x+h-1,y-h+1,sz*.2,0,7);ctx.fill();
    ctx.fillStyle='#e53935';ctx.font='800 '+Math.round(sz*.3)+'px Nunito, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',x+h-1,y-h+1.5);}
  if(b.cold!=null){const bx=x-h+1,by=y+h-1,r=sz*.21;ctx.fillStyle='#e6f6ff';ctx.beginPath();ctx.arc(bx,by,r,0,7);ctx.fill();
    ctx.strokeStyle='#2b8fd6';ctx.lineWidth=1.2;for(let k=0;k<3;k++){const a=k*Math.PI/3;ctx.beginPath();ctx.moveTo(bx-Math.cos(a)*r*.7,by-Math.sin(a)*r*.7);ctx.lineTo(bx+Math.cos(a)*r*.7,by+Math.sin(a)*r*.7);ctx.stroke();}
    if(b.ready<1e8){const fr=Math.max(0,b.cold/COLD_T);ctx.strokeStyle=fr>.35?'#5bb6e6':'#ff5d5d';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,h+3,-Math.PI/2,-Math.PI/2+Math.PI*2*fr);ctx.stroke();}}
}
function shelfBoxPlacement(cr,b,shake){
  // Reserve y+36 for progress. Include the old fallback shadow, corner badges
  // and full timer stroke; snowflake reaches slightly farther than the ring.
  const size=WORLD_BOX_SIZE;
  const reach=Math.max(size*.6,size*.5+2,b.f?size*.7-1:0,b.cold!=null?Math.max(size*.5+4,size*.71-1):0,b.spoiled?size*.68-2:0);
  // Existing cell/background shake stays unchanged. Bound only enlarged art
  // so two neighbouring parcels shaking towards each other still have a gap.
  const shift=Math.max(0,37/2-.5-reach);
  return {x:cr.x+cr.w/2+Math.max(-shift,Math.min(shift,shake)),y:cr.y+18.5,size};
}
function heldBoxLayout(items,x,y){
  const pitch=36,half=items.length?((items.length-1)*pitch+37)/2:0,centre=Math.max(half,Math.min(W-half,x));
  return items.map((box,index)=>({box,x:centre+(index-(items.length-1)/2)*pitch,y}));
}
function drawReturnHeap(){
  // S.heap remains an aggregate count. These are neutral visual symbols only.
  const symbol={r:true},n=Math.min(S.heap,14);
  for(let i=0;i<n;i++){
    const angle=i*2.4,distance=n===1?0:Math.min(8,2+i*.45);
    ctx.save();ctx.translate(HEAP.x+Math.cos(angle)*distance,HEAP.y+Math.sin(angle)*distance*.7);ctx.rotate(angle);
    drawBox(0,0,symbol,WORLD_BOX_SIZE);ctx.restore();
  }
}
function counterOrderLayout(win,items){
  const columns=Math.min(2,Math.max(1,items.length)),pitch=34,width=columns*pitch,height=Math.ceil(items.length/2)*pitch;
  const x=winX(win),y=items.length>2?COUNTER_Y-18:COUNTER_Y-1;
  const boxes=items.map((box,index)=>{const row=Math.floor(index/2),count=Math.min(2,items.length-row*2);return {box,x:x+(index%2-(count-1)/2)*pitch,y:y+17+row*pitch};});
  return {x:x-width/2,y,width,height,boxes};
}
function drawCounterOrders(){
  if(!G)return;
  const carried=G.p.hands[G.p.act],target=carried&&!carried.r&&lv('scanner')?scannerCustomer(carried):null;
  G.q.forEach((line,win)=>{const customer=line[0];if(!customer||customer.state!=='wait')return;
    const items=customer.ret?[customer.ret]:customer.need,layout=counterOrderLayout(win,items);
    if(customer.claim&&customer.claim!=='p'){ctx.strokeStyle=customer.claim.color;ctx.lineWidth=2.5;rr(layout.x,layout.y,layout.width,layout.height,5);ctx.stroke();}
    else if(customer.prime){ctx.strokeStyle='#ffd166';ctx.lineWidth=2;rr(layout.x,layout.y,layout.width,layout.height,5);ctx.stroke();}
    if(customer===target){ctx.save();ctx.strokeStyle='#66dbff';ctx.lineWidth=3;ctx.globalAlpha=.8+.2*Math.sin(G.clock*6);rr(layout.x-2,layout.y-2,layout.width+4,layout.height+4,6);ctx.stroke();ctx.restore();}
    layout.boxes.forEach(item=>drawBox(item.x,item.y,{...item.box,r:!!customer.ret},WORLD_BOX_SIZE));
    if(customer.cod){const x=Math.min(layout.x+layout.width-2,(win+1)*W/nWin()-7),y=layout.y+1;ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(x,y,6,0,7);ctx.fill();txt('$',x,y+.5,9,'#3a2d05',800);}
  });
}
function drawShelfHeaders(cfg){
  for(let c=0;c<4;c++){
    const r=shelfRect(c),open=c<cfg.colors;
    ctx.fillStyle=open?COL[c]:'#3a3f45';rr(r.x,r.y,r.w,14,[6,6,0,0]);ctx.fill();
    if(!open)continue;
    for(let shape=0;shape<cfg.shapes;shape++){
      const cr=cellRect(c,shape),cell=S.stock[c][shape],s=shape;
      const label='×'+cell.length;ctx.font='800 9px Nunito, sans-serif';const width=ctx.measureText(label).width;
      const left=cr.x+cr.w/2-(8.4+2.5+width)/2,headerY=r.y+7.5;
      shapePath(s,left+4.2,headerY,4);ctx.strokeStyle='rgba(0,0,0,.65)';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#fff';ctx.fill();
      ctx.textAlign='left';ctx.textBaseline='middle';ctx.strokeStyle='rgba(0,0,0,.65)';ctx.lineWidth=2;ctx.strokeText(label,left+10.9,headerY);ctx.fillStyle='#fff';ctx.fillText(label,left+10.9,headerY);
    }
  }
}
function txt(s,x,y,size,col,weight,align){ctx.font=(weight||800)+' '+size+'px Nunito, sans-serif';ctx.fillStyle=col;ctx.textAlign=align||'center';ctx.textBaseline='middle';ctx.fillText(s,x,y);}
function ring(x,y,r,col){ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.stroke();}
function patColor(fr){return fr>.5?'#4cd18a':fr>.25?'#f3c934':'#ff5d5d';}
// The customer this parcel is carried to: the one the player is walking to, or
// the first in a line who waits for exactly this parcel and is not being served
// by somebody else. The scanner then points at the order, not at the shelf.
function scannerCustomer(b){
  const needs=q=>!!q&&q.state==='wait'&&!q.ret&&q.need.some(n=>n.c===b.c&&n.s===b.s);
  const walking=G.p.tg?.k==='give'?G.p.tg.ref:G.p.tg?.k==='fetch'?G.p.tg.cu:null;
  if(needs(walking))return walking;
  return G.q.map(line=>line[0]).find(q=>needs(q)&&isFront(q)&&(!q.claim||q.claim==='p'))||null;
}
function scannerDestination(){
  const b=G?.p.hands[G.p.act];
  if(!b||b.r||!lv('scanner')||scannerCustomer(b))return null;
  if(b.cold!=null&&fridgeOn()){
    const i=S.fridge.indexOf(null);
    return {rect:i<0?FRIDGE:fzRect(i),full:i<0};
  }
  const rect=b.s===BIG?bigRect(b.c):cellRect(b.c,b.s);
  return {rect,full:slotArr(b.c,b.s).length>=slotCap(b.c,b.s)};
}
function wantedKeys(){const s=new Set();if(!G)return s;
  if(G.hl)for(const n of G.hl.need)s.add(key(n.c,n.s));
  if(lv('scanner'))for(const q of allCust())if(q.state==='wait')for(const n of q.need)s.add(key(n.c,n.s));
  return s;}
function customerDisplayScale(shirt,vip,chapter=customerVisualChapter()??null){
  return typeof PptCharacters.customerScale==='function'?PptCharacters.customerScale(customerVariant(shirt,chapter),vip,chapter):1;
}
// Keep children's approved size while showing their faces behind taller adults.
// The offset smoothly disappears as they move into the front service place.
function queuePersonY(person){
  const base=queueDrawY(person.y);
  const projected=typeof PptCharacters.customerScale!=='function'||customerDisplayScale(person.shirt,person.vip)!==1
    ?base:base-16*Math.max(0,Math.min(1,(Q_Y[0]-person.y)/(Q_Y[0]-Q_Y[1])));
  return activeVillageHome()?Math.max(48,projected):projected;
}
// If their shared artwork is still loading, preserve the couple as a couple
// rather than briefly replacing them with a single unrelated person.
function drawFallbackCouple(x,y,size,facing){
  ctx.save();ctx.translate(x,y+9.5);ctx.scale(size,size);
  for(const [cx,shirt,hair] of [[-12,'#b5b4b0','#c1ad91'],[12,'#a39584','#a3a4a4']]){
    ctx.fillStyle='#747a80';rr(cx-8,-27,7,24,2);ctx.fill();rr(cx+1,-27,7,24,2);ctx.fill();
    ctx.fillStyle='#d6d7d6';rr(cx-9,-5,9,5,2);ctx.fill();rr(cx+1,-5,9,5,2);ctx.fill();
    ctx.fillStyle=shirt;rr(cx-10,-48,20,25,5);ctx.fill();
    if(cx<0){ctx.strokeStyle='#e8e8e4';ctx.lineWidth=1;for(let sy=-44;sy<-26;sy+=5){ctx.beginPath();ctx.moveTo(cx-9,sy);ctx.lineTo(cx+9,sy);ctx.stroke();}}
    ctx.fillStyle=hair;ctx.beginPath();ctx.arc(cx,-59,10.5,0,Math.PI*2);ctx.fill();
    if(facing!=='rear'){
      ctx.fillStyle='#efbf9c';ctx.beginPath();ctx.arc(cx,-57,8.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#382e2b';ctx.beginPath();ctx.arc(cx-3,-58,1,0,Math.PI*2);ctx.arc(cx+3,-58,1,0,Math.PI*2);ctx.fill();
    }
  }
  // Their inside arms meet at the centre; the two bodies are one drawable.
  ctx.strokeStyle='#efbf9c';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();
  ctx.moveTo(-6,-40);ctx.lineTo(0,-34);ctx.lineTo(6,-39);ctx.stroke();
  ctx.restore();
}
function drawPerson(x,y,shirt,prime,vip,motion,now,crownShift=0,facing='front'){
  // Compact top-down character: feet, jacket, shoulders and a readable head silhouette.
  ctx.save();
  const chapter=customerVisualChapter()??null;
  const variant=customerVariant(shirt,chapter),size=customerDisplayScale(shirt,vip,chapter);
  ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(x+1,y+6,13*size,8*size,0,0,Math.PI*2);ctx.fill();
  const neutralElder=vip==='granny'&&chapter==='village'&&shirt===VILLAGE_OTHER_GRANNY_SHIRT;
  const animTime=motion==='walk'?now*customerWalkFactor({shirt,vip}):now;
  const sprite=PptCharacters.drawCustomer(ctx,x,y,variant,vip,motion,animTime,facing,chapter);
  const coupleFallback=!sprite&&chapter==='village'&&variant===10&&!vip;
  if(coupleFallback)drawFallbackCouple(x,y,size,facing);
  else if(!sprite){
  ctx.save();ctx.translate(x,y+9.5);ctx.scale(size,size);ctx.translate(-x,-y-9.5);
  // The procedural elder's scaled shoes used to sit below the sprite baseline.
  ctx.save();ctx.translate(x,y-(neutralElder?13:0));ctx.scale(2.25,2.25);ctx.translate(-x,-y);
  ctx.fillStyle='#252a30';rr(x-8,y+3,6,7,2);ctx.fill();rr(x+2,y+3,6,7,2);ctx.fill();
  ctx.fillStyle=shirt;rr(x-11,y-6,22,16,6);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.18)';rr(x-8,y-5,5,11,2);ctx.fill();
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x-1,y-4,2,12);
  ctx.fillStyle='#e9bf98';ctx.beginPath();ctx.arc(x,y-8,7.5,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3b2a20';ctx.beginPath();ctx.arc(x,y-10,7.5,Math.PI,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2b2521';ctx.beginPath();ctx.arc(x-2.5,y-7,1,0,Math.PI*2);ctx.arc(x+2.5,y-7,1,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(70,40,30,.65)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(x,y-4.5,2,.15,Math.PI-.15);ctx.stroke();
  if(vip==='granny'&&(!chapter||(chapter==='village'&&shirt!==VILLAGE_OTHER_GRANNY_SHIRT))){
    ctx.fillStyle='#d9d4cc';ctx.beginPath();ctx.arc(x,y-11,7.5,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f2eee8';ctx.beginPath();ctx.arc(x-5,y-11,2,0,Math.PI*2);ctx.arc(x+5,y-11,2,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#b5568a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y+1,11,.2,Math.PI-.2);ctx.stroke();
  }else if(neutralElder){
    // Neutral grey-haired older visitor, not Anna's portrait or clothing.
    ctx.fillStyle='#c7cecb';ctx.beginPath();ctx.arc(x,y-10,7.5,Math.PI,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  ctx.restore();
  }
  if(vip==='blogger'){
    ctx.fillStyle='#1c2025';rr(x+6,y-15,12,9,2);ctx.fill();
    ctx.fillStyle='#5bd6ff';ctx.beginPath();ctx.arc(x+12,y-10.5,2.6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#ff5d5d';ctx.beginPath();ctx.arc(x+16,y-14,1.5,0,Math.PI*2);ctx.fill();
  }
  if(prime){
    const cy=sprite||coupleFallback?y+9.5-78.5*size:y+9.5-(39.5+(neutralElder?13:0))*size,cx=x+crownShift;
    ctx.fillStyle='#ffd166';ctx.beginPath();ctx.moveTo(cx-6,cy);ctx.lineTo(cx-6,cy-7);ctx.lineTo(cx-3,cy-3);ctx.lineTo(cx,cy-9);ctx.lineTo(cx+3,cy-3);ctx.lineTo(cx+6,cy-7);ctx.lineTo(cx+6,cy);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#9b6b18';ctx.lineWidth=1;ctx.stroke();
  }
  ctx.restore();
}

function drawAutoLocker(now){
  const state=S.autoLocker,run=G?.autoLocker;
  if(!state||S.locker.some(Boolean)||(G&&mode==='play'&&!run))return;
  ctx.save();ctx.beginPath();ctx.rect(W,-WAIT_EXT,AUTO_LOCKER_STRIP,VIEW_H);ctx.clip();
  ctx.fillStyle='#2b3036';ctx.fillRect(W,-WAIT_EXT,AUTO_LOCKER_STRIP,VIEW_H);
  globalThis.PptEnvironmentSample?.floor(ctx,W,-WAIT_EXT,AUTO_LOCKER_STRIP,VIEW_H);
  ctx.fillStyle='rgba(255,197,123,.05)';ctx.fillRect(W,-WAIT_EXT,AUTO_LOCKER_STRIP,VIEW_H);
  globalThis.PptParcelLockerVisual?.draw(ctx,{x:W+14,y:40,w:56,h:90},state.slots);
  txt(lang==='ru'?'ПОСТАМАТ':'LOCKER',W+42,27,8,'#eaf8ff',900);
  const ready=state.slots.filter(order=>order?.status==='ready'||order?.status==='claimed').length;
  txt((lang==='ru'?'Готово ':'Ready ')+ready+'/6',W+42,143,8,'#e6f7ff',800);
  if(state.closing)txt(lang==='ru'?'ПЕРЕЕЗД':'MOVING',W+42,157,8,'#ffc35e',900);
  const c=PptCampaignLocker.scene(state,run).courier;
  if(c){
    const x=W+38,y=c.phase==='arrive'?685-520*c.progress:c.phase==='depart'?165+520*c.progress:165;
    const facing=c.phase==='depart'?'front':'rear',motion=c.phase==='service'?'idle':'walk';
    const drawn=globalThis.PptParcelLockerVisual?.drawCourier(ctx,x,y,motion,now,facing);
    if(!drawn)drawPerson(x,y,'#176768',false,null,motion,now,0,facing);
    if(c.parcel)drawBox(x-15,y+adultSpriteOffset(-12),c.parcel,16);
  }
  ctx.restore();
}
// Keep hand-held parcels the same size, but align them with the hands of the
// proportionally larger human sprites, whose scale is anchored at the feet.
function adultSpriteOffset(offset){const size=typeof PptCharacters.adultScale==='number'?PptCharacters.adultScale:1;return 9.5+(offset-9.5)*size;}
function drawAutoLockerCustomer(now){
  const state=S.autoLocker,run=G?.autoLocker;
  if(!state||S.locker.some(Boolean)||!run)return;
  const c=PptCampaignLocker.scene(state,run).customer;if(!c)return;
  const y=c.phase==='arrive'?-150+170*c.progress:c.phase==='wait'?20:
    c.phase==='approach'?20+110*c.progress:c.phase==='depart'?130-280*c.progress:130;
  const facing=c.phase==='depart'?'rear':'front',motion=c.phase==='wait'||c.phase==='service'?'idle':'walk';
  drawPerson(W+28,y,c.shirt,false,c.vip,motion,now,0,facing);
  if(c.parcel)drawBox(W+41,y+adultSpriteOffset(-12),c.parcel,16);
}
function drawScene(){
  const cfg=G?G.cfg:cfgFor(storyDifficultyDay(S.day)),now=performance.now()/1000,animationTime=(G?.clock??0)+(G?.storyLive?.elapsed??0),pulse=.6+.4*Math.sin(now*8),nw=nWin(),ww=W/nw;
  const home=activeVillageHome(),view=views.find(item=>item.canvas===cv);
  ctx.save();ctx.translate(0,view.extension);
  drawAutoLocker(animationTime);
  ctx.fillStyle='#2b3036';ctx.fillRect(0,-WAIT_EXT,W,VIEW_H);
  if(!globalThis.PptEnvironmentSample?.floor(ctx,0,COUNTER_Y,W,H-COUNTER_Y)){
    ctx.strokeStyle='rgba(255,255,255,.035)';ctx.lineWidth=1;
    for(let x=0;x<=W;x+=40){ctx.beginPath();ctx.moveTo(x,COUNTER_Y);ctx.lineTo(x,H);ctx.stroke();}
    for(let y=COUNTER_Y;y<=H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  }
  // waiting area with queue lanes
  if(!globalThis.PptEnvironmentSample?.floor(ctx,0,-WAIT_EXT,W,COUNTER_Y+WAIT_EXT)){
    ctx.fillStyle='#39424c';ctx.fillRect(0,-WAIT_EXT,W,COUNTER_Y+WAIT_EXT);
    ctx.fillStyle='rgba(255,255,255,.04)';for(let x=0;x<W;x+=24)for(let y=-WAIT_EXT;y<COUNTER_Y;y+=24)if((Math.floor(x/24)+Math.floor(y/24))%2===0)ctx.fillRect(x,y,24,24);
  }
  if(home)globalThis.PptVillageHouseArt?.room(ctx,home,view.extension,G,comfort());
  const d=depth();
  const owner=i=>G?G.win[i]:(i===aiWin()?{color:AIC}:null);
  for(let i=0;i<nw;i++){const x=winX(i),ow=owner(i),back=queueDrawY(Q_Y[d-1]),top=Math.max(-WAIT_EXT+1,queueBarY(back)-4);ctx.globalAlpha=1;ctx.fillStyle=ow?ow.color+'18':'rgba(0,0,0,.08)';rr(x-ww/2+6,top,ww-12,COUNTER_Y-top,8);ctx.fill();
    for(let k=0;k<d;k++){ctx.strokeStyle='rgba(255,255,255,.08)';ctx.setLineDash([3,3]);ctx.beginPath();ctx.ellipse(x,queueDrawY(Q_Y[k])+2,13,9,0,0,7);ctx.stroke();ctx.setLineDash([]);}}
  // Level 2 can help any other customer window, not just the neighbour.
  // During an outage the upgrade is still owned, but its worker is absent.
  const activeAi=mode==='play'?G?.workers?.find(w=>w.kind==='ai'):null;
  const ai=mode==='play'?activeAi?.win:aiWin();
  if(lv('ai')>=2&&Number.isInteger(ai)&&ai>=0&&ai<nw){
    const hy=Math.max(-WAIT_EXT+1,queueBarY(queueDrawY(Q_Y[d-1]))-4);
    ctx.save();ctx.fillStyle='rgba(91,214,255,.06)';ctx.strokeStyle='rgba(91,214,255,.5)';ctx.lineWidth=1;ctx.setLineDash([3,4]);
    for(let i=firstWin();i<nw;i++)if(i!==ai){
      const hx=winX(i);rr(hx-ww/2+5,hy,ww-10,COUNTER_Y-hy-2,8);ctx.fill();ctx.stroke();
    }
    ctx.restore();
  }
  // Every location has its own appliances at the back wall; customers come later and cover them.
  const hallSet=customerVisualChapter()??null,appliance=kind=>globalThis.PptWaitingHall?.draw(ctx,kind,hallSet,nw,W)===true;
  if(lv('cooler')&&!appliance('cooler')&&!globalThis.PptEnvironmentSample?.cooler(ctx,winX(0)-6,-WAIT_EXT)){ctx.fillStyle='#cfe7f5';rr(4,-WAIT_EXT+4,12,20,3);ctx.fill();ctx.fillStyle='#5bb6e6';rr(5,-WAIT_EXT,10,8,3);ctx.fill();}
  if(lv('coffee')&&!appliance('coffee')&&!globalThis.PptEnvironmentSample?.coffee(ctx,winX(0)+18,-WAIT_EXT+6)){ctx.fillStyle='#6b4a36';rr(19,-WAIT_EXT+6,14,16,3);ctx.fill();ctx.fillStyle='#d9c0a0';ctx.fillRect(23,-WAIT_EXT+14,6,5);}
  if(lv('tv')&&!appliance('tv')&&!globalThis.PptEnvironmentSample?.tv(ctx,W-44,-WAIT_EXT+2)){ctx.fillStyle='#111';rr(W-44,-WAIT_EXT+2,40,22,3);ctx.fill();ctx.fillStyle='#3b7de3';ctx.fillRect(W-41,-WAIT_EXT+5,34,16);}
  // counter split into windows
  if(!globalThis.PptEnvironmentSample?.counter(ctx,W,COUNTER_Y,COUNTER_H,nw)){
    ctx.fillStyle='#8a5a3b';ctx.fillRect(0,COUNTER_Y,W,COUNTER_H);ctx.fillStyle='#a8714c';ctx.fillRect(0,COUNTER_Y,W,4);
  }
  for(let i=1;i<nw;i++){ctx.fillStyle='#5e3c27';ctx.fillRect(i*ww-1.5,COUNTER_Y+4,3,COUNTER_H-4);}
  for(let i=0;i<nw;i++){const ow=owner(i);if(ow){const x=winX(i);ctx.fillStyle=ow.color+'44';ctx.fillRect(x-ww/2+1.5,COUNTER_Y+4,ww-3,COUNTER_H-4);}}
  if(lockerOn()){const x0=winX(0)-ww/2+4,cw=(ww-8)/3,used=S.locker.filter(Boolean).length;
    if(!used){const label=t('lockerEmpty').split('→');ctx.fillStyle='rgba(28,32,37,.88)';rr(x0,COUNTER_Y-58,ww-8,43,5);ctx.fill();
      txt((label[0]||'').trim(),winX(0),COUNTER_Y-44,7.5,'#f1d5a3',800);
      txt((label[1]||'').trim(),winX(0),COUNTER_Y-30,7.5,'#f1d5a3',800);}
    const lockerBitmap=globalThis.PptEnvironmentSample?.locker(ctx,x0,COUNTER_Y,ww-8,32);
    txt(t('locker').toUpperCase()+' '+t('lockerCount',used),winX(0),COUNTER_Y-8,8,'#c9a25b',800);
    for(let j=0;j<6;j++){const cx=x0+(j%3)*cw,cy=COUNTER_Y+5+Math.floor(j/3)*13;ctx.fillStyle=lockerBitmap?'rgba(94,74,42,.07)':'#5e4a2a';rr(cx+1,cy,cw-2,12,2);ctx.fill();const b=S.locker[j];if(b)drawBox(cx+cw/2,cy+6,b,10);if(b?.lk){ctx.strokeStyle='#ffc766';ctx.lineWidth=1;rr(cx+1.5,cy+.5,cw-3,11,2);ctx.stroke();ctx.fillStyle='#ffc766';ctx.beginPath();ctx.arc(cx+cw-3,cy+9.5,1.25,0,7);ctx.fill();}}}
  const want=wantedKeys();
  const tutorialActive=!!G&&S.day<=2&&branchRuntime.current()?.id===1&&(!NETWORK?.campaign||NETWORK.campaign.chapter==='village');
  const tutorialItem=tutorialActive&&!lv('scanner')?G.p.hands[G.p.act]:null;
  const tutorialPathsHidden=!!(tutorialItem&&Number.isInteger(tutorialItem.c)&&tutorialItem.c>=0&&tutorialItem.c<cfg.colors&&Number.isInteger(tutorialItem.s)&&tutorialItem.s>=0&&tutorialItem.s<cfg.shapes);
  // Dotted routes are a training aid: after the first two shifts they leave
  // with the shelf-placement highlight. During training they stay hidden
  // while that highlight is visible, avoiding competing guidance.
  const showTutorialPaths=tutorialActive&&!tutorialPathsHidden;
  if(home)globalThis.PptVillageHouseArt?.counter(ctx,home,COUNTER_Y,COUNTER_H,nw);
  // shelves
  for(let c=0;c<4;c++){const r=shelfRect(c),open=c<cfg.colors;
    const sampleShelf=globalThis.PptEnvironmentSample?.shelf(ctx,r);
    if(!sampleShelf){ctx.fillStyle=open?'#1c2025':'#24282d';rr(r.x,r.y,r.w,r.h,6);ctx.fill();}
    if(!open){if(sampleShelf){ctx.fillStyle='rgba(36,40,45,.88)';rr(r.x,r.y,r.w,r.h,6);ctx.fill();}txt(t('locked'),r.x+r.w/2,r.y+40,11,'#6c757e',700);continue;}
    if(sampleShelf)for(let s=1;s<4;s++){ctx.fillStyle='#354252';ctx.fillRect(r.x+5+s*37-4,r.y+19,4,42);}
    for(let s=0;s<4;s++){const cr=cellRect(c,s),sk=G&&G.shake[c+'_'+s],ox=sk?Math.sin(sk*60)*3:0;
      if(s>=cfg.shapes){ctx.fillStyle='#24282d';rr(cr.x,cr.y,cr.w,cr.h,4);ctx.fill();continue;}
      const hl=tutorialPathsHidden&&tutorialItem.c===c&&tutorialItem.s===s;
      ctx.fillStyle=hl?'#3d3326':sampleShelf?'rgba(42,48,56,.10)':'#2a3038';rr(cr.x+ox,cr.y,cr.w,cr.h,4);ctx.fill();
      if(hl){ctx.strokeStyle='#ff7a1a';ctx.lineWidth=2;ctx.stroke();}
      const cell=S.stock[c][s];
      if(cell.length){const top=cell[cell.length-1],placement=shelfBoxPlacement(cr,top,ox);drawBox(placement.x,placement.y,top,placement.size);
        if(top.c!==c||top.s!==s){rr(cr.x+ox+.5,cr.y+.5,cr.w-1,cr.h-1,4);
          if(sampleShelf){ctx.strokeStyle='#1c2025';ctx.lineWidth=3.5;ctx.stroke();}
          ctx.strokeStyle='#ff5d5d';ctx.lineWidth=1.5;ctx.stroke();}}
      const cp=capCell(),bw=(cr.w-6)/cp;
      for(let i=0;i<cp;i++){const b=cell[i];ctx.fillStyle=b?COL[b.c]:'#1c2025';ctx.fillRect(cr.x+3+i*bw+ox,cr.y+cr.h-6,bw-1.5,4);}
    }}
  // returns heap
  ctx.setLineDash([4,4]);ctx.strokeStyle=S.heap>0?'rgba(255,93,93,.4)':'rgba(255,255,255,.12)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(HEAP.x,HEAP.y,HEAP.r,0,7);ctx.stroke();ctx.setLineDash([]);
  {drawReturnHeap();
    txt(t('returns')+(S.heap?' ×'+S.heap:''),HEAP.x,HEAP.y+HEAP.r+8,10,S.heap?'#ff9a9a':'#7b848d',800);}
  // fridge (day 23+) and big-parcel rack (day 21+)
  // Story difficulty follows chapter shifts rather than the global day, so a
  // generic "from day N" placeholder would promise the wrong unlock date.
  const storyNoLateRacks=!!NETWORK?.campaign;
  if(fridgeOn()||!storyNoLateRacks){const F=FRIDGE,on=fridgeOn(),fridgeBitmap=on&&globalThis.PptEnvironmentSample?.fridge(ctx,F);if(!fridgeBitmap){ctx.fillStyle=on?'#cfe3ee':'#24282d';rr(F.x,F.y,F.w,F.h,6);ctx.fill();}
    txt(t('fridge').toUpperCase()+(on?' '+S.fridge.filter(Boolean).length+'/'+S.fridge.length:''),F.x+3,F.y+7,8,on?'#1f4f6a':'#6c757e',800,'left');
    if(on)for(let i=0;i<S.fridge.length;i++){const r=fzRect(i);ctx.fillStyle=fridgeBitmap?'rgba(169,201,220,.12)':'#a9c9dc';rr(r.x+.5,r.y+.5,r.w-1,r.h-1,3);ctx.fill();if(fridgeBitmap){ctx.strokeStyle='rgba(42,92,122,.42)';ctx.lineWidth=.65;ctx.stroke();}const b=S.fridge[i];if(b)drawBox(r.x+r.w/2,r.y+r.h/2,b,WORLD_BOX_SIZE);}
    else txt(t('fromDay',23),F.x+F.w/2,F.y+30,9,'#6c757e',700);}
  const xlBitmap=bigOn()&&globalThis.PptEnvironmentSample?.xlRack(ctx,{x:308,y:375,w:46,h:96});
  if(bigOn()||!storyNoLateRacks)for(let c=0;c<4;c++){const r=bigRect(c),on=bigOn()&&c<cfg.colors;ctx.fillStyle=on?(xlBitmap?'rgba(28,32,37,.08)':'#1c2025'):'#24282d';rr(r.x,r.y,r.w,r.h,4);ctx.fill();
    if(!on)continue;ctx.fillStyle=COL[c];ctx.fillRect(r.x,r.y,4,r.h);const a=S.big[c];
    if(a.length){const tp=a[a.length-1];drawBox(r.x+22,r.y+r.h/2,tp,WORLD_BOX_SIZE);txt('×'+a.length,r.x+r.w-3,r.y+4,8,'#cfd5d0',800,'right');
      if(tp.r){ctx.strokeStyle='#ff5d5d';ctx.lineWidth=1.5;rr(r.x+.5,r.y+.5,r.w-1,r.h-1,4);ctx.stroke();}}
    else txt('XL',r.x+24,r.y+r.h/2+1,9,'#4a525c',800);}
  if(fridgeOn()&&S.fridge.length===3){
    const row=fzRect(3);ctx.fillStyle='rgba(28,32,37,.85)';ctx.fillRect(row.x,row.y,FRIDGE.w,row.h);
    txt(lang==='ru'?'+3 в магазине':'+3 in shop',row.x+FRIDGE.w/2,row.y+row.h/2,9,'#c1d3da',700);
  }
  if(!bigOn()&&!storyNoLateRacks){txt('XL',331,388,9,'#6c757e',800);txt(t('fromDay',21),331,402,8,'#6c757e',700);}
  FLOOR.forEach(f=>{ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1;rr(f.x-14,f.y-14,28,28,4);ctx.stroke();});
  if(G)for(const m of G.mess){ctx.fillStyle='rgba(150,205,235,.55)';ctx.beginPath();ctx.ellipse(m.x,m.y,17,11,.3,0,7);ctx.fill();
    ctx.fillStyle='#e8f6ff';for(let i=0;i<5;i++){ctx.beginPath();const a=i*1.3;ctx.moveTo(m.x+Math.cos(a)*8,m.y+Math.sin(a)*5);ctx.lineTo(m.x+Math.cos(a)*12,m.y+Math.sin(a)*8);ctx.lineTo(m.x+Math.cos(a+.4)*9,m.y+Math.sin(a+.4)*6);ctx.fill();}}
  S.floor.forEach((st,i)=>{st.forEach((b,j)=>{const x=FLOOR[i].x+j*STACK_DX,y=FLOOR[i].y+j*STACK_DY;drawBox(x,y,b,WORLD_BOX_SIZE);
    if(!b.r&&want.has(key(b.c,b.s))){ctx.globalAlpha=pulse;ring(x,y,17,'#ff7a1a');ctx.globalAlpha=1;}});});
  // truck bay
  ctx.fillStyle='#1b1e22';ctx.fillRect(0,H-14,W,14);
  for(let x=-14;x<W;x+=20){ctx.fillStyle='#ff7a1a';ctx.beginPath();ctx.moveTo(x,H);ctx.lineTo(x+10,H);ctx.lineTo(x+20,H-14);ctx.lineTo(x+10,H-14);ctx.closePath();ctx.fill();}
  if(lv('conveyor')){const beltBitmap=globalThis.PptEnvironmentSample?.conveyor(ctx,318,476,26,52);if(!beltBitmap){ctx.fillStyle='#1b1e22';ctx.fillRect(318,476,26,52);}ctx.save();try{if(beltBitmap){ctx.beginPath();ctx.rect(322,482,18,40);ctx.clip();}ctx.strokeStyle='#3a414a';ctx.lineWidth=2;const off=(now*40)%7;for(let y=528-off;y>476;y-=7){ctx.beginPath();ctx.moveTo(320,y);ctx.lineTo(342,y);ctx.stroke();}}finally{ctx.restore();}}
  globalThis.PptEnvironmentSample?.loadingDock(ctx);
  if(G&&G.truck&&!G.truck.dump){const tr=G.truck,T=TRUCK;
    const bitmap=globalThis.PptEnvironmentSample?.truck(ctx,T);
    if(!bitmap){
    ctx.fillStyle='rgba(0,0,0,.35)';rr(T.x+3,T.y+4,T.w,T.h,6);ctx.fill();
    ctx.fillStyle='#d8dde2';rr(T.x,T.y,T.w,T.h,6);ctx.fill();ctx.fillStyle='#ff7a1a';ctx.fillRect(T.x,T.y+T.h-8,T.w,8);
    }
    const show=tr.cargo.slice(0,7);show.forEach((b,i)=>drawBox(T.x+14+i*19,T.y+18,b,17));
    show.forEach((b,i)=>{if(want.has(key(b.c,b.s))){ctx.globalAlpha=pulse;ring(T.x+14+i*19,T.y+18,12,'#ff7a1a');ctx.globalAlpha=1;}});
    if(bitmap){const label=tr.cargo.length?'×'+tr.cargo.length:'';ctx.font='800 11px Nunito, sans-serif';ctx.textAlign='right';ctx.textBaseline='middle';ctx.lineWidth=2;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.strokeText(label,T.x+T.w-8,T.y+34);txt(label,T.x+T.w-8,T.y+34,11,'#fff',800,'right');}
    else txt(tr.cargo.length?'×'+tr.cargo.length:'',T.x+T.w-8,T.y+34,11,'#1c2025',800,'right');
    const fr=Math.max(0,tr.t/tr.max);ctx.fillStyle='#1c2025';rr(T.x,T.y-8,T.w,5,3);ctx.fill();ctx.fillStyle=patColor(fr*1.25-.1);rr(T.x,T.y-8,T.w*fr,5,3);ctx.fill();
  }else{const msg=storyTruckPhase()?(lang==='ru'?'Разгрузка':'Unloading'):G?(G.plan.length?t('nextTruck',Math.max(0,Math.ceil(G.plan[0]-G.clock))):t('noTruck')):t('door');
    ctx.fillStyle='#1b1e22';rr(W/2-72,H-32,144,16,4);ctx.fill();txt(msg,W/2,H-24,9,'#ffb27a',800);}
  drawStoryTruck();
  drawShelfHeaders(cfg);
  const scan=scannerDestination();
  if(scan){
    const r=scan.rect;
    ctx.save();ctx.strokeStyle=scan.full?'#ff6464':'#66dbff';ctx.lineWidth=3;
    ctx.globalAlpha=.8+.2*Math.sin(animationTime*6);
    rr(r.x+2,r.y+2,r.w-4,r.h-4,4);ctx.stroke();ctx.restore();
    if(scan.full)txt('×',r.x+r.w/2,r.y+r.h/2,15,'#fff',900);
  }
  if(home)globalThis.PptVillageHouseArt?.wetCells(ctx,G,cellRect);
  if(!G){ctx.restore();return;}
  if(storyCrowdVisible()){
    // Decorative overflow waits behind the interactive queue; real customers
    // remain independently playable during the last six seconds of the shift.
    const slide=G.storyLive?0:Math.max(0,1-(G.clock-STORY_CROWD_START)/1.5)*40;
    const crowdChapter=NETWORK?.campaign?.chapter??null;
    const crowdShirts=crowdChapter==='village'?[SHIRTS[3],SHIRTS[4],SHIRTS[5],VILLAGE_EXTRA_SHIRT]:
      crowdChapter==='town'?[SHIRTS[0],SHIRTS[1],SHIRTS[2]]:SHIRTS;
    for(let i=0;i<7;i++){
      const x=25+i*51,y=55+(i%2)*31-slide;
      drawPerson(x,y,crowdShirts[i%crowdShirts.length],false,!crowdChapter&&i===3?'granny':null,'idle',animationTime);
      txt('!',x+14,y-60,12,'#ffbc59',900);
    }
  }
  // customers in line + tickets on the counter for the first in each line
  G.q.forEach((line,i)=>{
    for(let k=line.length-1;k>=0;k--){const q=line[k],qy=queuePersonY(q);
      const walking=q.state==='in'||(q.state==='wait'&&(Math.abs(q.x-winX(i))>.01||Math.abs(q.y-Q_Y[k])>.01));
      drawPerson(q.x,qy,q.shirt,q.prime,q.vip,walking?'walk':'idle',animationTime,22,home&&q.state==='wait'?'front':facingOf(q));
      const fr=Math.max(0,q.pt/q.max);
      ctx.fillStyle='#1c2025';rr(queueBarX(q.x),queueBarY(qy),QUEUE_BAR_W,4,2);ctx.fill();ctx.fillStyle=patColor(fr);rr(queueBarX(q.x),queueBarY(qy),QUEUE_BAR_W*fr,4,2);ctx.fill();
      if(k===0&&q.state==='wait'&&q.personalCheck===true){ctx.fillStyle='#7744ae';rr(q.x-6,queueBarY(qy)-2,12,10,3);ctx.fill();txt('!',q.x,queueBarY(qy)+3,9,'#fff',900);}
      if(k>0&&q.state==='wait'){const items=q.ret?[q.ret]:q.need;items.forEach((n,j)=>drawBox(q.x+20,qy-6+j*14,{c:n.c,s:n.s,r:!!q.ret},12));if(q.cod)txt('$',q.x-17,qy-6,10,'#ffd166',800);}
    }
  });
  G.lockerQ.forEach((q,k)=>{const qy=queuePersonY(q),tx=winX(0)+((k%3)-1)*14,ty=Q_Y[Math.min(2,Math.floor(k/3))];drawPerson(q.x,qy,q.shirt,q.prime,q.vip,q.x===tx&&q.y===ty?'idle':'walk',animationTime,0,facingOf(q));ctx.fillStyle='#c9a25b';ctx.beginPath();ctx.arc(q.x+12,qy-10,5,0,7);ctx.fill();});
  for(const q of G.leaving){const qy=queuePersonY(q);drawPerson(q.x,qy,q.shirt,q.prime,q.vip,'walk',animationTime,0,home?facingOf(q):'rear');}
  drawAutoLockerCustomer(animationTime);
  // Orders sit on the counter behind employees and the player, never on top
  // of their bodies. The interactive positions are unchanged.
  drawCounterOrders();
  // Dotted routes for the player and every worker obey the same tutorial rule.
  for(const w of G.workers){
    if(w.cu&&showTutorialPaths){ctx.strokeStyle=w.color+'99';ctx.setLineDash([3,5]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(w.x,w.y);
      if(w.st==='fetch'){const st=w.src.fz!=null?FRIDGE_STAND:slotStand(w.src.c,w.src.s);ctx.lineTo(st.x,st.y);ctx.lineTo(winX(w.cu.win),COUNTER_Y+COUNTER_H);}
      else if(w.st==='dropReturn'){ctx.lineTo(HEAP.x+28,HEAP.y);}
      else ctx.lineTo(winX(w.cu.win),COUNTER_Y+COUNTER_H);
      ctx.stroke();ctx.setLineDash([]);}
    if(w.kind==='robot'){
      // The 28 px body is 1.5 times a standard 24 px floor parcel: 36 px.
      const robotScale=36/28;
      ctx.save();ctx.translate(w.x,w.y);ctx.scale(robotScale,robotScale);ctx.translate(-w.x,-w.y);
      ctx.fillStyle='rgba(0,0,0,.32)';ctx.beginPath();ctx.ellipse(w.x+2,w.y+7,15,8,0,0,7);ctx.fill();
      ctx.fillStyle='#697887';rr(w.x-14,w.y-10,28,22,7);ctx.fill();
      ctx.fillStyle='#c5d0d9';rr(w.x-13,w.y-13,26,22,7);ctx.fill();
      ctx.fillStyle='#8395a4';rr(w.x-9,w.y+5,18,5,2);ctx.fill();
      ctx.fillStyle='#1c2025';rr(w.x-9,w.y-8,18,9,4);ctx.fill();
      ctx.fillStyle='#ffb27a';ctx.beginPath();ctx.arc(w.x-4,w.y-4,2.2,0,7);ctx.arc(w.x+4,w.y-4,2.2,0,7);ctx.fill();
      ctx.fillStyle='#536574';ctx.fillRect(w.x-2,w.y-1,4,2);
      ctx.fillStyle='#ff7a1a';ctx.fillRect(w.x-5,w.y+9,10,2);
      ctx.restore();
      heldBoxLayout(w.carry,w.x,w.y-28).forEach(item=>drawBox(item.x,item.y,item.box,WORLD_BOX_SIZE));continue;}
    ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(w.x+2,w.y+4,14,11,0,0,7);ctx.fill();
    const motion=workerMotion(w);
    // A parcel is held in front of the body: a worker walking away from the
    // camera is painted over it, so the back hides the parcel instead of showing it
    // through. It sits at chest height there, clear of the gap between the legs.
    // Only draw behind once a valid back view is ready; otherwise the parcel
    // is drawn just once over the fallback, without a second ghost behind it.
    const rearCarry=w.kind!=='ai'&&w.carry.length>0&&facingOf(w)==='rear';
    const rearCarryHook=PptCharacters.supportsRearCarryHook===true;
    const drawRearCarry=rearCarry?()=>heldBoxLayout(w.carry,w.x,w.y+adultSpriteOffset(-22)).forEach(item=>drawBox(item.x,item.y,item.box,WORLD_BOX_SIZE)):undefined;
    if(rearCarry&&!rearCarryHook)drawRearCarry();
    const aiBitmap=w.kind==='ai'&&globalThis.PptEnvironmentSample?.ai(ctx,w.x,w.y,motion,G.clock,w.carry.length>0,storyReducedMotion());
    const humanSprite=w.kind!=='ai'&&typeof PptCharacters.drawWorker==='function'&&PptCharacters.drawWorker(ctx,w.x,w.y,w.s,w.kind,motion,G.clock,facingOf(w),rearCarry&&rearCarryHook?drawRearCarry:undefined);
    if(!humanSprite&&!aiBitmap){
    ctx.save();if(w.kind!=='ai'){const size=typeof PptCharacters.adultScale==='number'?PptCharacters.adultScale:1;ctx.translate(w.x,w.y+9.5);ctx.scale(size,size);ctx.translate(-w.x,-w.y-9.5);}ctx.translate(w.x,w.y);ctx.scale(2.25,2.25);ctx.translate(-w.x,-w.y);
    if(w.kind==='ai'){ctx.fillStyle='#2c7da0';ctx.beginPath();ctx.ellipse(w.x,w.y,14,11,0,0,7);ctx.fill();ctx.fillStyle=AIC;ctx.beginPath();ctx.arc(w.x,w.y-2,8,0,7);ctx.fill();txt(t('aiTag'),w.x,w.y-1.5,8,'#0d2a36',800);}
    else{ctx.fillStyle=w.color;ctx.beginPath();ctx.ellipse(w.x,w.y,14,11,0,0,7);ctx.fill();ctx.fillStyle='#e9bf98';ctx.beginPath();ctx.arc(w.x,w.y-2,7.5,0,7);ctx.fill();}
    ctx.restore();
    }
    if(aiBitmap){const tagX=Math.max(12,w.x-38);ctx.fillStyle='rgba(13,42,54,.9)';rr(tagX-11,w.y-28.5,22,9,3);ctx.fill();txt(t('aiTag'),tagX,w.y-24,7.5,'#d9fcff',800);}
    if(w.kind!=='ai'){
      ctx.font='800 8px Nunito, sans-serif';const nm=nameOf(w.s),tw=ctx.measureText(nm).width+6;ctx.fillStyle='rgba(20,23,27,.8)';rr(w.x-tw/2,w.y+12,tw,11,4);ctx.fill();txt(nm,w.x,w.y+17.5,8,w.color,800);}
    if(!(rearCarry&&humanSprite==='rear'))heldBoxLayout(w.carry,w.x,w.y+(aiBitmap?-20:humanSprite?adultSpriteOffset(-12):-42)).forEach(item=>drawBox(item.x,item.y,item.box,WORLD_BOX_SIZE));}
  // Only the focused branch shows the player; staff remain visible everywhere.
  if(branchRuntime.current().id===NETWORK.activeId){
  const p=storyPlayerPose(G.p,G.storyLive);
  if(p.tg&&p.tg.k!=='move'&&p.tg.k!=='story'&&showTutorialPaths){ctx.strokeStyle='rgba(255,122,26,.5)';ctx.setLineDash([3,5]);ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.tg.x,p.tg.y);ctx.stroke();ctx.setLineDash([]);}
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.34)';ctx.beginPath();ctx.ellipse(p.x+2,p.y+7,15,9,0,0,7);ctx.fill();
  // The player holds parcels the same way as hired staff: in front of the body
  // at hand height, and at chest height behind the back when walking away from
  // the camera. The active parcel keeps its white frame in either position.
  const drawHands=y=>heldBoxLayout(p.hands,p.x,y).forEach((item,i)=>{drawBox(item.x,item.y,item.box,WORLD_BOX_SIZE);
    if(i===p.act&&p.hands.length>1){ctx.strokeStyle='#fff';ctx.lineWidth=1.5;rr(item.x-17.5,item.y-17.5,35,35,4);ctx.stroke();}});
  const rearHands=p.hands.length>0&&facingOf(p)==='rear';
  const rearHandsHook=PptCharacters.supportsRearCarryHook===true,drawRearHands=rearHands?()=>drawHands(p.y+adultSpriteOffset(-22)):undefined;
  if(rearHands&&!rearHandsHook)drawRearHands();
  const playerSprite=PptCharacters.drawPlayer(ctx,p.x,p.y,p.busy>0?'service':p.tg?'walk':'idle',animationTime,facingOf(p),rearHands&&rearHandsHook?drawRearHands:undefined);
  if(!playerSprite){
  ctx.save();const size=typeof PptCharacters.adultScale==='number'?PptCharacters.adultScale:1;ctx.translate(p.x,p.y+9.5);ctx.scale(size,size);ctx.translate(-p.x,-p.y-9.5);ctx.translate(p.x,p.y);ctx.scale(2.25,2.25);ctx.translate(-p.x,-p.y);
  ctx.fillStyle='#252a30';rr(p.x-9,p.y+4,7,8,2);ctx.fill();rr(p.x+2,p.y+4,7,8,2);ctx.fill();
  ctx.fillStyle='#ff7a1a';rr(p.x-13,p.y-8,26,19,7);ctx.fill();
  ctx.fillStyle='#ffb27a';rr(p.x-9,p.y-6,5,12,2);ctx.fill();
  ctx.fillStyle='#ffe35c';ctx.fillRect(p.x-12,p.y+1,24,3);
  ctx.fillStyle='#e9bf98';ctx.beginPath();ctx.arc(p.x,p.y-10,8,0,7);ctx.fill();
  ctx.fillStyle='#3b2a20';ctx.beginPath();ctx.arc(p.x,p.y-12,7.5,Math.PI,0);ctx.fill();
  ctx.fillStyle='#2b2521';ctx.beginPath();ctx.arc(p.x-2.5,p.y-9,1,0,7);ctx.arc(p.x+2.5,p.y-9,1,0,7);ctx.fill();
  ctx.fillStyle='#fff0d5';rr(p.x-3,p.y-3,6,3,1);ctx.fill();
  ctx.restore();
  }
  ctx.restore();
  // The simple fallback figure has no hands: parcels stay above its head.
  if(!(rearHands&&playerSprite==='rear'))drawHands(p.y+(playerSprite?adultSpriteOffset(-12):-80));
  if(p.busy>0){ctx.strokeStyle='#4cd18a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,19,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-p.busy/p.busyLen));ctx.stroke();}
  }
  for(const f of G.floats){const text=messageText(f.txt);ctx.globalAlpha=Math.min(1,f.t*1.5);ctx.font='800 13px Nunito, sans-serif';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.6)';ctx.textAlign='center';ctx.strokeText(text,f.x,f.y);txt(text,f.x,f.y,13,f.col,800);ctx.globalAlpha=1;}
  ctx.restore();
}

// ---------- HUD / hint / tray ----------
function displayedDay(state,status,summary){
  // Completed home reports retain their date when the player takes more trips.
  return status==='summary'?(summary?.calendarDay??state.day-1):calendarDay(state);
}
function syncDayHud(){
  let day;
  if(NETWORK?.away)day=NETWORK.away.day;
  else if(ovFn===renderAwayHub)day=calendarDay(outskirtsState(NETWORK));
  else day=displayedDay(S,mode,sumData);
  $('hDay').textContent=t('day',day);
}
function hintText(){
  if(!G||mode!=='play')return '';
  if(storyTruckPhase()?.boxes.some(box=>box.progress>0))return lang==='ru'?'Грузовик разгружает посылки!':'The truck is unloading packages!';
  if(storyCrowdVisible())return lang==='ru'?'Пришло много посетителей!':'A crowd has arrived!';
  if(scannerDestination()?.full)return lang==='ru'?'Сканер: нет места. Освободите отмеченную секцию.':'Scanner: no room. Free up the marked section.';
  if(G.q.some(line=>line[0]?.state==='wait'&&line[0].personalCheck===true))return lang==='ru'?'Клиент с ! ждёт личной проверки: нажмите на него. Сотрудник поможет позже, сканер ускорит проверку.':'A customer marked ! needs your check: tap them. Staff can help later; a scanner makes your check faster.';
  if(G.mess.length)return lang==='ru'?'Пятно замедляет работу. Нажмите на него, чтобы убрать.':'Spills slow work down. Tap a spill to clean it.';
  const p=G.p;
  if(S.day<=2&&branchRuntime.current()?.id===1&&(!NETWORK?.campaign||NETWORK.campaign.chapter==='village')){const waiting=allCust().filter(q=>q.state==='wait'&&!q.ret&&isFront(q));
    const shelfOk=waiting.some(q=>q.need.some(n=>slotArr(n.c,n.s).length));
    const floorOk=waiting.some(q=>q.need.some(n=>S.floor.some(st=>st.some(b=>b.c===n.c&&b.s===n.s))));
    if(p.hands.length)return t('hintShelf');if(shelfOk)return t('hintCust');if(floorOk)return t('hintFloor');
    if(G.truck?.cargo.length&&!G.truck.dump)return t('hintTruck');
    return Number.isFinite(G.plan[0])?t('nextTruck',Math.max(0,Math.ceil(G.plan[0]-G.clock))):t('noTruck');}
  if(G.autoLocker&&G.clock<30)return S.autoLocker?.closing?(lang==='ru'?'Переезд: заказы идут в обычное окно':'Moving: orders go to the counter'):(lang==='ru'?'Постамат: загрузка и выдача без игрока':'Locker: automatic loading and pickup');
  const newsDay=storyDifficultyDay(S.day),nw2=STR[lang].news[newsDay];if(newsDay>=21&&nw2&&G.clock<20&&!(NETWORK?.campaign&&[21,23,26].includes(newsDay)))return nw2;
  if(lockerOn()){
    const used=S.locker.some(Boolean);
    if(G.legacyLockerDrainOnly)return lang==='ru'?'Прежний постамат: заберите оставшиеся посылки':'Previous locker: retrieve the remaining parcels';
    if(G.clock<45&&p.hands.length)return t('hintLockerLoad');
    if(!used&&(G.clock<45||!allCust().length))return t('hintLockerEmpty');
    if(G.clock<45&&used)return t('hintLockerLoaded');
  }
  if(lv('queue')&&G.clock<15)return t('hintQueue');
  return '';
}
function syncHud(){
  const chapter=NETWORK?.campaign?.chapter==='city'&&NETWORK.campaign.cityProgress?.district==='center'?'city-center':NETWORK?.campaign?.chapter;
  globalThis.PptWallpaper?.update(document.body,chapter,S.day,(mode==='play'&&G?G.ev:(S.evDay===S.day?S.ev:null)),NETWORK?.activeId);
  if(document.documentElement && document.documentElement.lang!==lang){
    document.documentElement.lang=lang;
    globalThis.PptDebugSession?.updateLanguage();
  }
  document.title=t('title');
  const icon=document.getElementById('gameIcon');if(icon)icon.href=lang==='ru'?'assets/campaign/icon-photo-ru-chibi-20261111.png':'assets/campaign/icon-photo-en-chibi-20261111.png';
  if(!$('saveNotice').hidden)$('saveNotice').textContent=t(saveNoticeKey);
  if(branchRuntime&&!branchRuntime.canPresent())return;
  syncDayHud();
  const tm=G&&mode==='play'?Math.max(0,Math.ceil(G.time)):DAY;$('hTime').textContent=Math.floor(tm/60)+':'+String(tm%60).padStart(2,'0');
  // On a trip the header keeps showing the player's own funds: the shift's money stays with the visited point.
  const shownCash=NETWORK?.away&&awayHome?awayHome.cash:S.cash;
  $('hCash').textContent=money(shownCash);$('hCash').classList.toggle('neg',shownCash<0);
  $('hStars').textContent='★'+displayedRating(stars());
  const playing=G&&mode==='play';
  $('app').classList.toggle('onShift',!!playing);
  const toolsButton=$('bHouseTools');
  if(toolsButton){
    toolsButton.hidden=!(playing&&(perksHome()||townToolsAvailable())&&!menuOpen&&!paused&&!networkPaused&&!settingsOpen);
    toolsButton.textContent=activeTownHome()?(lang==='ru'?'ПВЗ':'Tools'):(lang==='ru'?'Дом':'House');
  }
  $('bAwayGoals').hidden=!(NETWORK?.away&&playing&&!menuOpen&&!networkPaused&&!paused);
  if(!$('bAwayGoals').hidden)$('bAwayGoals').textContent=PptPostgameUI.words(lang).tracking;
  $('hGoal').hidden=!playing;$('hCombo').hidden=!playing;
  $('hGoal').classList.toggle('goal--reached',!!(playing&&G.st.served>=G.cfg.goal));
  if(playing){$('hGoal').textContent=G.st.served+'/'+G.cfg.goal;const m=mult();$('hCombo').textContent=(lang==='ru'?'Комбо ×':'Combo ×')+fmtNum(m);$('hCombo').classList.toggle('hot',m>1);}
  const ev=playing?G.ev:null;$('evt').hidden=!ev;if(ev)$('evt').textContent=t(ev);
  $('bLang').textContent=lang==='ru'?'EN':'RU';$('tLbl').textContent=t('hands');
  $('bSound').textContent=t('sound');$('bSound').setAttribute('aria-label',t('soundSettings'));
  $('hint').textContent=hintText();
  if(NETWORK)syncNetworkHud();
  if(!menuOpen&&!networkPaused&&!paused&&!NETWORK?.storyPresentation&&(mode==='shop'||mode==='team')&&!ov.hidden&&ovFn&&overlayCash!==NETWORK.cash){
    const scroll=ov.querySelector('.card')?.scrollTop||0;rerenderOv();
    const card=ov.querySelector('.card');if(card)card.scrollTop=scroll;
  }
}
function fallbackSvgBox(b){const c=b.r?'#b8916a':COL[b.c],d=b.r?'#6d5238':COLD[b.c];let sh='';
  const mx=b.s===BIG&&!b.r?28:21;
  const badges=(b.f?'<circle cx="'+mx+'" cy="5" r="4.5" fill="#fff"/><text x="'+mx+'" y="8" font-size="7" text-anchor="middle" fill="#e53935" font-weight="800">!</text>':'')+(b.spoiled?'<circle cx="'+mx+'" cy="21" r="4.5" fill="#9e2734"/><path d="M'+(mx-2)+' 19l4 4m0-4l-4 4" fill="none" stroke="#fff" stroke-width="1.5"/>':'')+(b.cold!=null?'<circle cx="5" cy="21" r="4.5" fill="#e6f6ff"/><path d="M5 17.5v7M2 19.3l6 3.4M2 22.7l6-3.4" stroke="#2b8fd6" stroke-width="1.2"/>':'');
  if(b.s===BIG&&!b.r)return '<svg width="38" height="34" viewBox="0 0 34 26" aria-hidden="true"><rect x="1" y="4" width="32" height="20" rx="4" fill="'+c+'" stroke="'+d+'"/><rect x="8" y="4" width="4" height="20" fill="rgba(255,255,255,.35)"/><rect x="22" y="4" width="4" height="20" fill="rgba(255,255,255,.35)"/><text x="17" y="18" font-size="9" text-anchor="middle" fill="#fff" font-weight="800">XL</text>'+badges+'</svg>';
  if(b.r)sh='<path d="M8 13a5 5 0 1 0 2-4m-3 0h3v3" fill="none" stroke-width="2"/>';
  else if(b.s===0)sh='<circle cx="13" cy="13" r="6"/>';else if(b.s===1)sh='<rect x="8" y="8" width="10" height="10"/>';
  else if(b.s===2)sh='<polygon points="13,6.5 19.5,18 6.5,18"/>';else{const pts=[];for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?3:7;pts.push((13+Math.cos(a)*r).toFixed(1)+','+(13+Math.sin(a)*r).toFixed(1));}sh='<polygon points="'+pts.join(' ')+'"/>';}
  return '<svg width="34" height="34" viewBox="0 0 26 26" aria-hidden="true"><rect x="1" y="1" width="24" height="24" rx="4" fill="'+c+'" stroke="'+d+'"/><g fill="#fff" stroke="'+d+'">'+sh+'</g>'+badges+'</svg>';}
const handIconCache=new Map();let handIconRevision=-1;
function svgBox(b){
  const environment=globalThis.PptEnvironmentSample;
  if(!environment||!document.createElement)return fallbackSvgBox(b);
  if(handIconRevision!==environment.revision){handIconCache.clear();handIconRevision=environment.revision;}
  const key=[b.c,b.s,!!b.f,!!b.r,!!b.spoiled,b.cold!=null].join(':');
  if(handIconCache.has(key))return handIconCache.get(key);
  let html;
  try{
    const width=b.s===BIG&&!b.r?38:34,canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=68;
    const previous=ctx;
    try{
      ctx=canvas.getContext('2d');ctx.scale(2,2);
      // The tray has always shown a static cold badge; countdown stays in-world.
      const descriptor={...b,cold:b.cold!=null?COLD_T:null,ready:1e9};
      drawBox(width/2,17,descriptor,WORLD_BOX_SIZE);
    }finally{ctx=previous;}
    html='<img width="'+width+'" height="34" alt="" aria-hidden="true" src="'+canvas.toDataURL()+'">';
  }catch(error){html=fallbackSvgBox(b);}
  if(handIconCache.size>=64)handIconCache.delete(handIconCache.keys().next().value);
  handIconCache.set(key,html);return html;
}
function drawHands(){if(branchRuntime&&!branchRuntime.canPresent())return;const el=$('slots');if(!G){el.innerHTML='';return;}const p=G.p;let h='';
  for(let i=0;i<cap();i++){const b=p.hands[i];h+='<button type="button" class="slot'+(b?(i===p.act?' on':' full'):'')+'" data-i="'+i+'" aria-label="'+t('handSlot',i+1)+'">'+(b?svgBox(b):'')+'</button>';}
  const home=perksHome();
  if(!p.hands.length&&!home)h+='<span class="emptytxt">'+t('handsEmpty')+'</span>';
  el.innerHTML=h;}
globalThis.PptEnvironmentSample?.setRedraw(drawHands);
$('slots').addEventListener('click',e=>{if(!G||G.storyLive||mode!=='play'||loadFailed||menuOpen||networkPaused||paused||externallyPaused())return;
  const b=e.target.closest('.slot');if(!b)return;const i=+b.dataset.i;if(G.p.hands[i]){G.p.act=i;drawHands();}});
$('bHouseTools')?.addEventListener('click',()=>activeTownHome()?showTownTools():showHouseTools());
$('bLang').addEventListener('click',()=>{lang=lang==='ru'?'en':'ru';langChosen=true;try{localStorage.setItem(LKEY,lang);}catch(e){}syncHud();drawHands();rerenderOv();uiCue('tick');});
function toggleNetworkPause(){if(menuOpen||settingsOpen||loadFailed||externallyPaused())return;networkPaused=!networkPaused;NETWORK.manualPaused=networkPaused;syncAudio();save();if(!loadFailed)presentBranch();uiCue('tick');}
$('bPause').addEventListener('click',toggleNetworkPause);
$('bAwayGoals').addEventListener('click',()=>{if(NETWORK?.away&&mode==='play'&&!networkPaused&&!paused)toggleNetworkPause();});

// ---------- overlays ----------
const ov=$('ov');let ovFn=null,overlayCash=null,pendingReset=null,pendingExpansion=null,expansionConfirmId=0;
let releaseDialogueHouse=null;
let courierFrameCounter=0;
function cityCourierFrame(){const frame=ov.querySelector('#cityCourierFrame');return !ov.hidden&&frame?.contentWindow&&frame.dataset?.token?frame:null;}
function courierPost(frame,type,data={}){frame?.contentWindow?.postMessage({type,token:frame.dataset.token,...data},location.origin==='null'?'*':location.origin);}
function courierSettings(){return {lang,...playerAudio?.snapshot().preferences};}
function syncCourierFrame(){
  const frame=cityCourierFrame();if(frame?.dataset.ready!=='1')return;
  const hold=!!(document.hidden||audioPageGone||networkPaused||externallyPaused()||menuOpen||loadFailed),settings=courierSettings(),key=JSON.stringify(settings);
  if(frame.dataset.settings!==key){frame.dataset.settings=key;courierPost(frame,'ppt-city-courier-settings',settings);}
  if(hold&&frame.dataset.hold!=='1')courierPost(frame,'ppt-city-courier-pause');
  frame.dataset.hold=hold?'1':'0';
}
// The sorting task uses its own trusted frame and protocol, but the same full
// screen presentation as the courier. Holds are sent on both edges so a
// resumed host cannot leave the puzzle permanently paused.
function cityMatchThreeFrame(){const frame=ov.querySelector('#cityMatchThreeFrame');return !ov.hidden&&frame?.contentWindow&&frame.dataset?.token?frame:null;}
function matchThreeHeld(){return !!(document.hidden||audioPageGone||networkPaused||paused||externallyPaused()||menuOpen||settingsOpen||loadFailed);}
// Focusing the embedded puzzle blurs the host window even though the host
// document retains focus. Recheck the actual document on every audio sync so
// losing the app's focus from inside the puzzle still creates a hard hold.
function audioWindowBlurred(){
  const sorting=cityMatchThreeFrame();
  if(sorting?.dataset.ready==='1'&&document.activeElement===sorting&&typeof document.hasFocus==='function')return !document.hasFocus();
  return audioBlurred;
}
function syncMatchThreeFrame(){
  const frame=cityMatchThreeFrame();if(frame?.dataset.ready!=='1')return;
  const settings=courierSettings(),key=JSON.stringify(settings),hold=matchThreeHeld();
  if(frame.dataset.settings!==key){frame.dataset.settings=key;courierPost(frame,'ppt-match-three-settings',settings);}
  if(frame.dataset.hold!==String(hold)){frame.dataset.hold=String(hold);courierPost(frame,'ppt-match-three-pause',{paused:hold});}
}
// Called by the Android wrapper before falling back to the normal Back rules.
globalThis.PptCityCourierBack=()=>{
  const sorting=cityMatchThreeFrame();
  if(sorting){if(sorting.dataset.ready==='1')courierPost(sorting,'ppt-match-three-back');else cityMatchThreeExit();return true;}
  const frame=cityCourierFrame();if(!frame)return false;
  if(frame.dataset.ready==='1')courierPost(frame,'ppt-city-courier-back');else cityCourierExit();
  return true;
};
// One controller for both buses: the SFX synth and the music director share holds, unlock and preferences.
let audioController=null,musicDirector=null;
try{
  let storage;try{storage=globalThis.localStorage;}catch{}
  if(globalThis.PptPlayerSfx){
    audioController=globalThis.PptAudio?.create({enabled:true,storage,softHolds:PptPlayerSfx.softHolds})||null;
    playerAudio=PptPlayerSfx.create(audioController?{controller:audioController}:{storage})||null;
    try{musicDirector=globalThis.PptMusicDirector?.create()||null;if(musicDirector&&!audioController?.setMusicEngine(musicDirector))musicDirector=null;}catch{musicDirector=null;}
  }
}catch{}
// Music scene: menu, shift, rush (Black Friday / chaos), pause (every screen between shifts and manual pause); holiday layer on the shift.
const RUSH_EVENTS=new Set(['bf','chaos']),LAYER_EVENTS=new Set(['ny','sale11','sept']);
function musicScene(holds){
  if(loadFailed||holds.includes('recovery'))return {scene:null,layer:null};
  if(menuOpen)return {scene:'menu',layer:null};
  if(cityMatchThreeFrame())return {scene:'sorting',layer:null};
  // The courier runner and the town basement play their own loops inside their frames.
  if(cityCourierFrame()||!ov.hidden&&ov.querySelector('.townBasementFrame'))return {scene:null,layer:null};
  if(globalThis.VillageHouseUI?.isSearching?.())return {scene:'house',layer:null};
  if(mode==='play'&&G){
    if(holds.includes('manual'))return {scene:'pause',layer:null};
    const ev=S?.ev;
    if(housePerk(4,'cozy'))return {scene:perksHome().radio==='patience'?'shift':'rush',layer:LAYER_EVENTS.has(ev)?ev:null};
    return {scene:RUSH_EVENTS.has(ev)?'rush':'shift',layer:LAYER_EVENTS.has(ev)?ev:null};
  }
  return {scene:'pause',layer:null};
}
function syncAudio(){
  syncCourierFrame();
  syncMatchThreeFrame();
  const townFrame=ov.querySelector('.townBasementFrame');
  if(townFrame){const hold=!!(document.hidden||networkPaused||externallyPaused()||menuOpen||loadFailed);if(townFrame.dataset.hold!==String(hold)){townFrame.dataset.hold=String(hold);townFrame.contentWindow?.postMessage({type:'ppt-town-basement-hold',hold},location.origin);}}
  if(!playerAudio)return;
  const holds=[];
  if(document.hidden)holds.push('hidden');if(audioWindowBlurred())holds.push('blur');if(audioPageGone)holds.push('pagehide');
  if(menuOpen)holds.push('menu');if(settingsOpen||!ov.hidden)holds.push('overlay');
  if(networkPaused||paused||NETWORK?.branches.some(branch=>branch.status==='play'&&branch.paused))holds.push('manual');
  if(loadFailed)holds.push('recovery');holds.push(...externalPause.snapshot().reasons.map(reason=>'external:'+reason));
  const activePlay=mode==='play'&&!!G;
  if(!activePlay||holds.length)audibleTargets=new WeakSet();
  try{musicDirector?.setState(musicScene(holds));}catch{}
  try{playerAudio.sync({activePlay,holds});}catch{}
}
function playerCue(key){if(!branchRuntime?.canPresent())return;syncAudio();try{playerAudio?.cue(key);}catch{}}
// The music director gives the visiting VIP a solo and handles repeat arrivals.
function playerSting(key){if(!branchRuntime?.canPresent()||mode!=='play'||!G)return;syncAudio();try{musicDirector?.sting(key);}catch{}}
// Interface cue for a confirmed DOM action; it is not tied to a branch and stays audible in menus.
function uiCue(key){syncAudio();try{playerAudio?.cue(key);}catch{}}
function unlockAudio(event){
  if(navigator.userActivation?.isActive===false)return;
  syncAudio();try{void playerAudio?.unlock(event);}catch{}
}
// Mouse presses activate immediately. Touch and pen grant audio activation on release.
document.addEventListener('pointerdown',event=>{if(event.pointerType==='mouse')unlockAudio(event);},true);
document.addEventListener('pointerup',event=>{if(event.pointerType!=='mouse')unlockAudio(event);},true);
document.addEventListener('click',unlockAudio,true);
document.addEventListener('keydown',unlockAudio,true);
window.addEventListener('blur',()=>{
  audioBlurred=true;
  // Focus/activeElement may not yet have updated during the parent blur.
  if(cityMatchThreeFrame()?.dataset.ready==='1'&&typeof queueMicrotask==='function')queueMicrotask(syncAudio);else syncAudio();
});
window.addEventListener('focus',()=>{audioBlurred=false;syncAudio();});
window.addEventListener('pagehide',()=>{audioPageGone=true;syncAudio();});
window.addEventListener('pageshow',()=>{audioPageGone=false;syncAudio();});
// Player support channel required by the VK Games catalogue (owner's choice, 20.11.2026).
const SUPPORT_URL='https://vk.com/club243516179';
function showSoundSettings(){
  if(settingsOpen||loadFailed||externallyPaused())return;
  soundReturn={fn:ovFn,summary:contractFxSummary,hidden:ov.hidden,scroll:ov.querySelector('.card')?.scrollTop||0};
  settingsOpen=true;uiCue('tick');
  showOv(()=>{const prefs=playerAudio?.snapshot().preferences||{sfxMuted:false,sfxVolume:.55,musicMuted:false,musicVolume:.3};
    const music=musicDirector?'<button class="btn sec" data-a="musicMute" aria-pressed="'+prefs.musicMuted+'">'+t(prefs.musicMuted?'musicOff':'musicOn')+'</button><label class="soundVolume" for="musicVolume">'+t('musicVolume')+' <output id="musicLevel">'+Math.round(prefs.musicVolume*100)+'%</output></label><input id="musicVolume" type="range" min="0" max="100" step="1" value="'+Math.round(prefs.musicVolume*100)+'">':'';
    return '<h2>'+t('soundSettings')+'</h2><button class="btn sec" data-a="sfxMute" aria-pressed="'+prefs.sfxMuted+'">'+t(prefs.sfxMuted?'soundOff':'soundOn')+'</button><label class="soundVolume" for="sfxVolume">'+t('soundVolume')+' <output id="sfxLevel">'+Math.round(prefs.sfxVolume*100)+'%</output></label><input id="sfxVolume" type="range" min="0" max="100" step="1" value="'+Math.round(prefs.sfxVolume*100)+'">'+music+'<div class="soundActions"><a class="btn sec supportLink" href="'+SUPPORT_URL+'" target="_blank" rel="noopener noreferrer" title="'+t('supportTitle')+'">'+t('support')+'</a><button class="btn" data-a="audioClose">'+t('soundBack')+'</button></div>';});
}
$('bSound').addEventListener('click',showSoundSettings);
const dialoguePrinter=PptCampaignUI.createTypewriter();
let dialogueNode=null,dialogueLastPress=-Infinity;
// Preserve keyboard focus across the DOM replacement used by story screens,
// while leaving pointer/touch scene changes free of forced focus.
let dialogueInput='pointer',dialogueFocusReturn=null;
document.addEventListener('pointerdown',()=>{dialogueInput='pointer';},true);
document.addEventListener('keydown',event=>{
  dialogueInput='keyboard';
  if(event.key!=='Tab'||ov.hidden||globalThis.PptDebugMilestonesUI?.isOpen())return;
  if(globalThis.VillageHouseUI?.isOpen?.())return;
  const dialogue=ov.querySelector('.campaignDialogue, .vInstall');if(!dialogue)return;
  const controls=[...dialogue.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter(element=>element.getClientRects().length&&getComputedStyle(element).visibility!=='hidden');
  if(!controls.length)return;
  const active=document.activeElement,index=controls.indexOf(active);
  if(index<0||(event.shiftKey&&index===0)||(!event.shiftKey&&index===controls.length-1)){
    event.preventDefault();(event.shiftKey?controls[controls.length-1]:controls[0]).focus({preventScroll:true});
  }
},true);
function dialogueTextKey(){
  const p=NETWORK?.storyPresentation;
  if(p?.type==='scene')return 'scene:'+p.id+':'+p.step+':'+lang;
  if(mode==='summary'&&[0,1].includes(sumData?.storyQueueStep))return 'queue:'+sumData.storyQueueStep+':'+lang;
  return null;
}
function prepareDialogueTyping(){
  const node=ov.querySelector('[data-dialogue-text]'),key=dialogueTextKey();
  if(!node||!key||typeof node.getAttribute!=='function'){dialogueNode=null;return;}
  dialogueNode=node;
  const full=node.getAttribute('aria-label')||node.textContent||'';
  const state=dialoguePrinter.begin(key,full,storyReducedMotion());
  node.textContent=state.text;
}
function tickDialogueTyping(dt){
  if(!dialogueNode||ov.hidden||menuOpen||settingsOpen||networkPaused||paused||externallyPaused()||document.hidden)return;
  dialogueNode.textContent=dialoguePrinter.tick(dt).text;
}
function revealDialogue(){if(dialogueNode)dialogueNode.textContent=dialoguePrinter.reveal().text;}
function consumeDialogueClick(action){
  if(!dialogueNode||!['campaignSceneNext','storyQueueNext'].includes(action))return false;
  const now=performance.now();
  if(!dialoguePrinter.snapshot().complete){revealDialogue();dialogueLastPress=now;return true;}
  if(now-dialogueLastPress<250)return true;
  dialogueLastPress=now;return false;
}
function showOv(fn,summary=null){if(branchRuntime&&!branchRuntime.canPresent())return;
  const previousDialogue=ov.querySelector('.campaignDialogue'),active=document.activeElement;
  const previousAction=active&&ov.contains?.(active)?active.dataset?.a:null;
  const keyboard=dialogueInput==='keyboard';
  if(!keyboard)dialogueFocusReturn=null;
  if(keyboard&&previousDialogue&&previousAction)dialogueFocusReturn=previousAction;
  releaseDialogueHouse?.();releaseDialogueHouse=null;
  if(contractFxSummary!==summary)stopContractFx();contractFxSummary=summary;ovFn=fn;ov.innerHTML='<div class="card">'+fn()+'</div>';overlayCash=NETWORK?.cash;ov.hidden=false;syncDayHud();syncAudio();prepareDialogueTyping();bind();queueContractFx();
  const nextDialogue=ov.querySelector('.campaignDialogue');
  const houseCanvas=nextDialogue?.querySelector?.('.campaignDialogue__house');
  if(houseCanvas)releaseDialogueHouse=PptVillageHouseArt.mountDialogue(houseCanvas,NETWORK.villageHome);
  globalThis.PptTownUI?.mount(ov);
  ov.querySelector('.townBasementFrame')?.addEventListener('load',()=>{const frame=ov.querySelector('.townBasementFrame');if(frame){
    if(frame.dataset.restore==='1'&&NETWORK.townHome?.arcade)frame.contentWindow?.postMessage({type:'ppt-town-basement-restore',data:NETWORK.townHome.arcade},location.origin);
    delete frame.dataset.hold;syncAudio();}});
  if(NETWORK?.storyPresentation?.type==='villageInstall')PptVillageInstall.mount(ov,NETWORK.villageHome);
  if(keyboard&&nextDialogue&&(previousDialogue||previousAction==='resume')&&dialogueFocusReturn){
    const controls=nextDialogue.querySelectorAll('[data-a]');
    const target=[...controls].find(button=>button.dataset.a===dialogueFocusReturn)||nextDialogue.querySelector('[data-a="campaignSceneNext"],[data-a="storyQueueNext"]');
    target?.focus?.({preventScroll:true});dialogueFocusReturn=null;
  }else if(keyboard&&previousDialogue&&dialogueFocusReturn){
    const resume=ov.querySelector('[data-a="resume"]');
    if(resume)resume.focus?.({preventScroll:true});else dialogueFocusReturn=null;
  }else if(keyboard&&nextDialogue&&previousAction){
    // A dialogue newly opened from a keyboard-operated menu/summary needs an
    // initial focus target; pointer-driven opening remains untouched.
    nextDialogue.querySelector('[data-a="campaignSceneNext"],[data-a="storyQueueNext"]')?.focus?.({preventScroll:true});
  }else if(!nextDialogue&&previousAction!=='resume')dialogueFocusReturn=null;
}
function rerenderOv(){if(cityCourierFrame()){syncCourierFrame();return;}if(cityMatchThreeFrame()){syncMatchThreeFrame();return;}if(!ov.hidden&&ovFn)showOv(ovFn,contractFxSummary);}
// Repainting an overlay builds a new card, which starts at the top. After a
// purchase or a staff change the player stays on the same screen, so the
// page is put back where it was scrolled.
function keepCardScroll(repaint){const scroll=ov.querySelector('.card')?.scrollTop||0;repaint();const card=ov.querySelector('.card');if(card)card.scrollTop=scroll;}
function hideOv(){if(branchRuntime&&!branchRuntime.canPresent())return;releaseDialogueHouse?.();releaseDialogueHouse=null;stopContractFx();contractFxSummary=null;ov.hidden=true;ovFn=null;syncAudio();}
function bind(){ov.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('click',()=>{if(!consumeDialogueClick(b.dataset.a))act(b.dataset.a,b.dataset.v);}));ov.querySelector('[data-dialogue-text]')?.addEventListener?.('click',revealDialogue);
  const updateVolume=(e,kind)=>{try{
    const value=Number(e.target.value);if(!Number.isFinite(value))return;
    const music=kind==='music',prefs=music
      ?audioController?.setPreferences({musicVolume:value/100,...(value>0?{musicMuted:false}:{})})
      :playerAudio?.setPreferences({sfxVolume:value/100,...(value>0?{sfxMuted:false}:{})});
    $(music?'musicLevel':'sfxLevel').textContent=Math.round(value)+'%';
    const button=ov.querySelector(music?'[data-a="musicMute"]':'[data-a="sfxMute"]');
    if(button&&prefs){const muted=music?prefs.musicMuted:prefs.sfxMuted;button.textContent=t(music?(muted?'musicOff':'musicOn'):(muted?'soundOff':'soundOn'));button.setAttribute('aria-pressed',String(muted));}
  }catch{}};
  for(const [selector,kind] of [['#musicVolume','music'],['#sfxVolume','sfx']]){
    const range=ov.querySelector(selector);for(const event of ['input','change'])range?.addEventListener?.(event,e=>updateVolume(e,kind));
  }}
function confirmReset(kind,value,failed=false){
  pendingReset={kind,value};
  showOv(()=>'<h2>'+(lang==='ru'?'Заменить сохранение сети?':'Replace network save?')+'</h2><p>'+
    (lang==='ru'?'Текущий прогресс всех филиалов будет заменён.':'Current progress in all branches will be replaced.')+
    (failed?'</p><p class="networkHelp">'+(lang==='ru'?'Не удалось сохранить новую игру. Прежнее сохранение осталось доступным; можно попробовать ещё раз.':'Could not save the new game. The previous save is still available; you can try again.'):'')+
    '</p><button class="btn sec" data-a="cancelReset">'+(lang==='ru'?'Отмена':'Cancel')+
    '</button><button class="btn" data-a="confirmReset">'+(lang==='ru'?'Заменить сохранение':'Replace save')+'</button>');
}
// Presentation wrapper: one interface tick only when the action visibly changed the overlay or mode.
function act(a,v){
  const before=[ov.hidden,mode,menuOpen,ov.innerHTML].join('\0');
  try{actCore(a,v);}finally{if(before!==[ov.hidden,mode,menuOpen,ov.innerHTML].join('\0'))uiCue('tick');}
}
function actCore(a,v){
  if(externallyPaused()&&a!=='lang'&&a!=='retry')return;
  if(a==='cityCourierStart'){startCityCourier();return;}
  if(a==='cityCourierExit'&&NETWORK?.storyPresentation?.type==='cityCourier'){cityCourierExit();return;}
  if(a==='cityMatchThreeStart'){startCityMatchThree();return;}
  if(a==='cityMatchThreeExit'&&NETWORK?.storyPresentation?.type==='cityMatchThree'&&cityMatchThreeFrame()?.dataset.ready!=='1'){cityMatchThreeExit();return;}
  if(a==='townRepair'&&NETWORK?.storyPresentation?.type==='townRepair'&&!loadFailed){const level=NETWORK.storyPresentation.level;campaignCommit(candidate=>{PptTownRenovation.repair(candidate.townHome,level,v,candidate.campaign.shifts);candidate.storyPresentation={type:'townInstall',level};});return;}
  if(a==='townInstallNext'&&NETWORK?.storyPresentation?.type==='townInstall'&&!loadFailed){campaignCommit(candidate=>{delete candidate.storyPresentation;});return;}
  if((a==='townTool'||a==='townToolsClose')&&!loadFailed&&mode==='play'&&paused&&!networkPaused&&!menuOpen&&activeTownHome()){
    if(a==='townToolsClose'||useTownTool(v))closeHouseTools();else showTownTools();return;
  }
  if((a==='houseTool'||a==='houseToolsClose')&&!loadFailed&&mode==='play'&&paused&&!networkPaused&&!menuOpen&&perksHome()){
    if(a==='houseToolsClose'||useHouseTool(v))closeHouseTools();else showHouseTools();
    return;
  }
  if(loadFailed){
    if(a==='retry')location.reload();
    // Only an unreadable save may be replaced by a new game, and only after a
    // confirmation. The data is set aside under its own keys, never deleted.
    else if(loadBroken&&!frameFailed){
      if(a==='discardSave')showOv(()=>'<h2>'+(lang==='ru'?'Начать заново?':'Start over?')+'</h2><p>'+(lang==='ru'?'Сохранение, которое не удалось прочитать, будет отложено в сторону и больше не будет загружаться. Игра начнётся с самого начала.':'The save that could not be read will be set aside and will no longer be loaded. The game will start from the beginning.')+'</p><button class="btn sec" data-a="discardSaveCancel">'+(lang==='ru'?'Отмена':'Cancel')+'</button><button class="btn" data-a="discardSaveConfirm">'+(lang==='ru'?'Начать заново':'Start over')+'</button>');
      else if(a==='discardSaveCancel')showLoadFailed();
      else if(a==='discardSaveConfirm'){
        try{PptSave.setAside(campaignStorage());}catch(error){console.error('Could not set the unreadable save aside:',error);showLoadFailed(true);return;}
        location.reload();
      }
    }
    return;
  }
  if(!menuOpen&&!journeyNormalizeEarly())return;
  if(!menuOpen&&NETWORK?.storyPresentation&&!['campaignSceneNext','villageInstallNext','campaignSelect','campaignRescue','campaignContinue','campaignCityChoose','campaignCapitalChoose','postgameStart','dialogueLanguage','dialoguePause','resume','menu','menuSettings','sfxMute','musicMute','audioClose','retry','doTest'].includes(a))return;
  if(!menuOpen&&!settingsOpen&&(ovFn===renderAwayShop||ovFn===renderAwayTeam)){
    if(['buy','hire','fire','role','awayTrain'].includes(a)){applyAwayManagement(a,v);return;}
    if(!['awayShop','awayTeam','awayManageBack','menu','menuSettings','dialogueLanguage','dialoguePause'].includes(a))return;
  }
  if(!menuOpen&&NETWORK?.away&&!['start','resume','menu','menuSettings','sfxMute','musicMute','audioClose','retry','lang','dialogueLanguage','dialoguePause','awayShop','awayTeam','awayManageBack','awayLevel','awayReplan','awayReturn','awayAbort','awayAbortNo','awayAbortYes'].includes(a))return;
  if(!menuOpen&&journeyGuideActive()){
    const stage=NETWORK.journeyGuide,common=['resume','menu','menuSettings','sfxMute','musicMute','audioClose','retry','dialogueLanguage','dialoguePause'];
    const allowed=stage==='map'?['campaignMap']:stage==='map_view'?['campaignContinue']:stage==='shop'?['shop']:stage==='team'?['team','hire','role','guideEarn']:stage==='return_shop'?['shop']:stage==='shop_intro'?['guideShopDone']:[];
    if(!common.includes(a)&&!allowed.includes(a))return;
  }
  if(!menuOpen&&mode==='brief'&&['start','card','ctr'].includes(a)&&guideChoicePending(S))return;
  if(a==='sfxMute'){try{playerAudio?.setPreferences({sfxMuted:!playerAudio.snapshot().preferences.sfxMuted});}catch{}rerenderOv();}
  else if(a==='musicMute'){try{audioController?.setPreferences({musicMuted:!audioController.snapshot().preferences.musicMuted});}catch{}rerenderOv();}
  else if(a==='audioClose'){const previous=soundReturn;soundReturn=null;settingsOpen=false;if(previous?.hidden)hideOv();else if(previous?.fn){showOv(previous.fn,previous.summary);const card=ov.querySelector('.card');if(card)card.scrollTop=previous.scroll;}else hideOv();}
  else if(a==='lang'){if(v!=='ru'&&v!=='en')return;lang=v;langChosen=true;try{localStorage.setItem(LKEY,lang);}catch(e){}syncHud();showMenu();}
  else if(a==='cancelReset'){const previous=pendingReset;pendingReset=null;if(previous?.kind==='restart')showOver();else showMenu();}
  else if(a==='confirmReset'){const previous=pendingReset;pendingReset=null;if(!previous)return;act(previous.kind==='test'?'doTest':previous.kind==='restart'?'doRestart':'doNew',previous.value);}
  else if(a==='new'){if(hasSave)confirmReset('new');else act('doNew');}
  else if(a==='doNew'){
    const initial=Object.assign(fresh(),{storyQueueEligible:true}),candidate=makeNetwork(initial);
    candidate.campaign=PptCampaign.create();candidate.villageRenovation=1;candidate.campaignCheckpoint=campaignClone(candidate.branches[0].state);
    candidate.storyPresentation={type:'scene',id:'prologue',step:0};
    try{PptSave.writeNetwork(campaignStorage(),candidate);}
    catch(error){
      console.error('New game save failed:',error);
      if(error.saveUncertain){loadFailed=true;showStorageError();return;}
      saveNoticeKey='saveFailed';$('saveNotice').textContent=t(saveNoticeKey);$('saveNotice').hidden=false;
      if(hasSave)confirmReset('new',null,true);
      else showOv(()=>'<h2>'+(lang==='ru'?'Не удалось начать игру':'Could not start the game')+'</h2><p>'+(lang==='ru'?'Не удалось сохранить прогресс. Проверьте доступность хранилища и попробуйте ещё раз.':'Progress could not be saved. Check your browser storage and try again.')+'</p><button class="btn" data-a="cancelReset">'+t('menu')+'</button>');
      return;
    }
    hasSave=true;$('saveNotice').hidden=true;dialoguePrinter.reset();dialogueNode=null;dialogueLastPress=-Infinity;networkPaused=false;
    attachNetwork(candidate);menuOpen=false;presentBranch();
  }
  else if(a==='cont'){menuOpen=false;presentBranch();}
  else if(a==='test'){if(hasSave)confirmReset('test',v);else act('doTest',v);}
  else if(a==='doTest'){preset(+v);menuOpen=false;showBrief();}
  else if(a==='start'){startNetworkDay();}
  else if(a==='villageWork'){showVillageWork(true);}
  else if(a==='villageInstallNext'&&NETWORK.storyPresentation?.type==='villageInstall'){
    campaignCommit(candidate=>{delete candidate.storyPresentation;});
  }
  else if(a==='villageRadio'&&mode==='brief'&&activeVillageHome()?.choices[3]==='cozy'){
    globalThis.VillageHouseUI.show({kind:'radio',lang,home:activeVillageHome(),onClose:showBrief,onRadio:choice=>{
      if(!['speed','patience'].includes(choice)||!activeVillageHome()||externallyPaused())return false;
      return campaignCommit(candidate=>{candidate.villageHome.radio=choice;});
    }});
  }
  else if(a==='vkAd'){confirmVkAd();}
  else if(a==='vkAdNo'){if(mode==='summary')showSummary();}
  else if(a==='vkAdGo'){if(mode==='summary'){showSummary();showVkAd();}}
  else if(a==='card'){S.card=v;save();showBrief();}
  else if(a==='ctr'){startCtr(v);showBrief();}
  else if(a==='shop'){if(!firstDayLocked()){
    if(NETWORK?.journeyGuide==='shop'){
      const previousMode=mode;mode='shop';
      if(!journeySet(S.staff.some(person=>person.role==='load')?'shop_intro':'team')){mode=previousMode;branchRuntime.capture();return;}
      showShop();
    }else if(NETWORK?.journeyGuide==='return_shop'){
      const previousMode=mode;mode='shop';
      if(!journeySet('shop_intro')){mode=previousMode;branchRuntime.capture();return;}
      showShop();
    }else{mode='shop';showShop();save();}
  }}
  else if(a==='storyQueueNext'){
    if(mode!=='summary'||branchRuntime.current().id!==1||!sumData||![0,1].includes(sumData.storyQueueStep))return;
    const previous=sumData.storyQueueStep,previousGuide=NETWORK.journeyGuide;sumData.storyQueueStep=previous+1;
    if(previous===1&&NETWORK.campaign?.chapter==='village'&&S.day===3&&previousGuide===undefined)NETWORK.journeyGuide='map';
    if(save()&&!loadFailed)showSummary();else{sumData.storyQueueStep=previous;if(previousGuide===undefined)delete NETWORK.journeyGuide;else NETWORK.journeyGuide=previousGuide;}
  }
  else if(a==='postgameStart'){postgameStart(v==='hub');}
  else if(a==='awayHub'){showAwayHub();}
  else if(a==='awayClose'){if(NETWORK?.postgame)presentBranch();}
  else if(a==='awayPlace'){awayBegin(v);}
  else if(a==='awayShop'||a==='awayTeam'){openAwayManagement(a==='awayShop');}
  else if(a==='awayManageBack'){if(awayManagementAvailable())showAwayBrief();}
  else if(a==='awayLevel'){awaySetLevel(v);}
  else if(a==='awayReplan'){if(NETWORK?.away&&mode==='brief')awayLeave(true);}
  else if(a==='awayReturn'){awayReturn();}
  else if(a==='awayAbort'){if(NETWORK.away)showOv(()=>PptPostgameUI.abort({lang}));}
  else if(a==='awayAbortNo'){if(NETWORK.away)presentBranch();}
  else if(a==='awayAbortYes'){awayLeave();}
  else if(a==='campaignMap'){if(NETWORK.postgame){showAwayHub();return;}if(NETWORK.campaign&&!NETWORK.storyPresentation&&!firstDayLocked()){if(NETWORK.journeyGuide==='map'&&!journeySet('map_view'))return;showCampaignMap();}}
  else if(a==='campaignContinue'){if(NETWORK.storyPresentation?.type==='choose')return;if(NETWORK.journeyGuide==='map_view'){if(journeySet('shop'))showSummary();}else presentBranch();}
  else if(a==='campaignAdvance'){campaignBeginAdvance();}
  else if(a==='lockerResume'){if(NETWORK?.campaign?.chapter==='city'&&S.autoLocker?.closing)campaignCommit(candidate=>{candidate.branches[0].state.autoLocker.closing=false;});}
  else if(a==='campaignCityChoose'){campaignCityChoose();}
  else if(a==='campaignCapitalChoose'){campaignCapitalChoose();}
  else if(a==='campaignOpenCenter'){openSecond();}
  else if(a==='campaignSelect'){campaignSelect(+v);}
  else if(a==='campaignRescue'){campaignRescue();}
  else if(a==='campaignSceneNext'){campaignSceneNext();}
  else if(a==='campaignRetry'){campaignRetry();}
  else if(a==='firstDayNext'){campaignFirstDayNext();}
  else if(a==='dialogueLanguage'){$('bLang').click();}
  else if(a==='dialoguePause'){$('bPause').click();}
  else if(a==='menuSettings'){showSoundSettings();}
  else if(a==='guideUpgrade'){const hint=guideUpgrade();if(mode==='shop'&&hint&&v===hint.key&&guideAck(hint.key)&&!loadFailed)keepCardScroll(showShop);}
  else if(a==='guideShopDone'){if(mode==='shop'&&NETWORK.journeyGuide==='shop_intro')campaignCommit(candidate=>{candidate.journeyGuide='done';if(!Array.isArray(candidate.guideSeen))candidate.guideSeen=[];if(!candidate.guideSeen.includes('intro:shop'))candidate.guideSeen.push('intro:shop');});}
  else if(a==='guideEvent'){if(mode==='brief'&&S.ev===v&&!guideSeen('event:'+v)){const scroll=ov.querySelector('.card')?.scrollTop||0;if(guideAck('event:'+v)&&!loadFailed){showBrief();const card=ov.querySelector('.card');if(card)card.scrollTop=scroll;}}}
  else if(a==='guideChoice'){if(mode==='brief'&&guideChoicePending(S)===v){if(guideAck('intro:'+v)&&!loadFailed)showBrief();}}
  else if(a==='buy'){
    const item=SHOP.find(item=>item.id===v);
    if(!item||firstDayLocked())return;
    const {level,price:cost,canBuy}=shopOffer(item);
    if(!canBuy)return;
    if(v==='ai'&&level===0&&NETWORK?.campaign?.chapter==='city')buyCityAI(cost);
    else if(v==='locker'&&NETWORK?.campaign&&storyLockerAvailable())buyStoryLocker(cost);
    else{
      if(!['shoes','brand'].includes(v))PptNetwork.recordExpansionDebit(NETWORK,NETWORK.activeId,cost);
      S.cash-=cost;S.up[v]=level+1;
      if(v==='coldspace')S.fridge.push(null,null,null);
      if(['shoes','brand'].includes(v)&&NETWORK.branches.length>1){const first=NETWORK.branches.find(branch=>branch.id===1);first.state.up[v]=level+1;}
      if(v==='staffroom')PptCampaign.recordStaffRoomPurchase(S,calendarDay());
      guidePurchased(v);save();syncHud();keepCardScroll(showShop);
    }
  }
  else if(a==='next'){showBrief();}
  else if(a==='team'){showTeam();save();}
  else if(a==='hire'){if(journeyGuideActive()&&NETWORK.journeyGuide==='team'){if(mode!=='team'||S.staff.length)return;campaignCommit(candidate=>{if(!PptNetwork.hire(candidate,candidate.activeId,+v))throw new Error('Cannot hire candidate');if(candidate.branches.find(b=>b.id===candidate.activeId).state.staff.some(person=>person.role==='load'))candidate.journeyGuide='return_shop';});}else{branchRuntime.capture();if(PptNetwork.hire(NETWORK,NETWORK.activeId,+v)){save();syncHud();keepCardScroll(showTeam);}}}
  else if(a==='fire'){S.staff=S.staff.filter(x=>x.id!==+v);save();keepCardScroll(showTeam);}
  else if(a==='role'){const [id,r]=v.split(':');const x=S.staff.find(y=>y.id===+id);if(x){if(journeyGuideActive()){if(mode!=='team'||r!=='load')return;campaignCommit(candidate=>{const worker=candidate.branches.find(b=>b.id===candidate.activeId).state.staff.find(person=>person.id===+id);if(!worker)throw new Error('Worker unavailable');worker.role='load';candidate.journeyGuide='return_shop';});}else{x.role=r;save();keepCardScroll(showTeam);}}}
  else if(a==='guideEarn'){if(mode==='team'&&NETWORK.journeyGuide==='team'&&!S.staff.length&&!S.cands.some(person=>S.cash>=wage(person))){const previousMode=mode;mode='brief';if(journeySet('earn'))showBrief();else{mode=previousMode;branchRuntime.capture();}}}
  else if(a==='resume'){paused=false;branchRuntime.capture();for(const branch of NETWORK.branches)branch.paused=false;networkPaused=false;NETWORK.manualPaused=false;save();if(!loadFailed)presentBranch();}
  else if(a==='menu'){save();showMenu();}
  else if(a==='branch'){selectBranch(+v);}
  else if(a==='prepareBranch'){selectBranch(+v);if(mode!=='play'&&mode!=='over'&&!(mode==='summary'&&[0,1].includes(sumData?.storyQueueStep)))showBrief();}
  else if(a==='cancelExpansion'){confirmExpansion();}
  else if(a==='dismissExpansion'){pendingExpansion=null;presentBranch();}
  else if(a==='confirmExpansion'){commitExpansion(v);}
  else if(a==='restart'){if(hasSave)confirmReset('restart');else act('doRestart');}
  else if(a==='doRestart'){resetNetwork(Object.assign(fresh(),{storyQueueEligible:true}));menuOpen=false;save();drawHands();showBrief();}
}
function startCtr(id){const sp=ctrSpec(id,S.day);S.contract={id,start:S.day,end:S.day+6,prog:0,target:sp.target,state:'active'};save();}
// Story transitions are written as a single candidate save before attaching it.
// Returning from a scene, refreshing the page or retrying cannot settle a day twice.
function campaignClone(value){return JSON.parse(JSON.stringify(value));}
function villageLocation(){
  return NETWORK?.campaign?.chapter==='village' && NETWORK.campaign.status==='active' &&
    !NETWORK.away && branchRuntime?.current()?.id===1;
}
function activeVillageHome(){return villageLocation()&&NETWORK.villageHome?.cleared?NETWORK.villageHome:null;}
function villageWages(){return S.staff.reduce((total,person)=>total+wage(person),0);}
function shiftBaseRent(day){
  if(villageLocation()&&NETWORK.villageRenovation===1){
    // Earlier saves recorded that the player read the notice on day four.
    const starts=NETWORK.villageRentFromDay??(NETWORK.storySeen?.includes('village_rent_notice')?6:Infinity);
    if(day>=starts)return 150;
  }
  return rentFor(storyDifficultyDay(day));
}
function villageScene(candidate,id){
  if(!candidate.storySeen?.includes(id))candidate.storySeen=[...(candidate.storySeen||[]),id];
  candidate.storyPresentation={type:'scene',id,step:0};
}
function showTownWork(){
  const home=activeTownHome(),c=NETWORK?.campaign;
  if(!home||c.status!=='active'||networkBatch||menuOpen||networkPaused||paused||loadFailed||NETWORK.storyPresentation||!['summary','brief','shop','team'].includes(mode)||!branchRuntime.canPresent())return false;
  const work=PptTownRenovation.due(home,c.shifts);if(!work)return false;
  const seen=id=>NETWORK.storySeen?.includes(id);
  let scene=work.kind==='basement'?'town_basement_'+(work.episode+1):'town_repair_'+work.level;
  if(work.level===1&&!seen('town_first_shift'))scene='town_first_shift';
  else if(work.level===3&&!seen('town_village_news'))scene='town_village_news';
  campaignCommit(candidate=>{if(!seen(scene))villageScene(candidate,scene);else candidate.storyPresentation=work.kind==='basement'?{type:'townBasement',episode:work.episode}:{type:'townRepair',level:work.level};});
  return true;
}
window.addEventListener('message',event=>{
  const p=NETWORK?.storyPresentation,frame=ov.querySelector('.townBasementFrame');
  if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin||p?.type!=='townBasement'||event.data?.episode!==p.episode||loadFailed)return;
  if(event.data.type==='ppt-town-basement-checkpoint'){
    const home=NETWORK.townHome,previous=home.arcade;
    try{PptTownRenovation.validateArcade(event.data.data,p.episode);}catch(error){console.error('Invalid basement checkpoint',error);return;}
    home.arcade=event.data.data;if(!save()){if(previous===undefined)delete home.arcade;else home.arcade=previous;}return;
  }
  if(event.data.type==='ppt-town-basement-complete'&&NETWORK.townHome?.arcade?.status==='won'&&!externallyPaused()&&!networkPaused){
    campaignCommit(candidate=>{PptTownRenovation.clear(candidate.townHome,p.episode,candidate.campaign.shifts);delete candidate.storyPresentation;});
  }
});
function cityCourierAvailable(){
  const c=NETWORK?.campaign;
  return c?.chapter==='city'&&c.status==='active'&&c.shifts>=1&&NETWORK.activeId===1&&!NETWORK.away&&!NETWORK.storyPresentation&&
    !NETWORK.cityCourier?.complete&&['summary','brief'].includes(mode);
}
function cityCourierButton(){
  if(!cityCourierAvailable())return '';
  const label=NETWORK.cityCourier?(lang==='ru'?'Продолжить доставку':'Resume delivery'):(lang==='ru'?'Срочная доставка · помочь Нике':'Rush delivery · help Nika');
  return '<button type="button" class="btn sec cityCourierStart" data-a="cityCourierStart">'+label+'</button>';
}
function startCityCourier(){
  if(!cityCourierAvailable()||loadFailed||menuOpen||settingsOpen||networkPaused||paused||!branchRuntime.canPresent())return;
  campaignCommit(candidate=>{
    if(candidate.cityCourier)candidate.storyPresentation={type:'cityCourier'};
    else{candidate.cityCourier={complete:false,checkpoint:null};villageScene(candidate,'city_courier_intro');}
  });
}
function cityCourierExit(state){
  if(NETWORK?.storyPresentation?.type!=='cityCourier'||loadFailed||externallyPaused()||networkPaused)return false;
  return campaignCommit(candidate=>{
    if(state!==undefined)candidate.cityCourier.checkpoint=state;
    delete candidate.storyPresentation;
  });
}
window.addEventListener('message',event=>{
  const frame=cityCourierFrame(),msg=event.data;
  if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin||msg?.token!==frame.dataset.token||
     NETWORK?.storyPresentation?.type!=='cityCourier'||loadFailed)return;
  if(msg.type==='ppt-city-courier-ready'){
    if(frame.dataset.ready==='1')return;
    const settings=courierSettings();frame.dataset.settings=JSON.stringify(settings);
    courierPost(frame,'ppt-city-courier-init',{...settings,state:NETWORK.cityCourier.checkpoint});
    frame.dataset.ready='1';syncCourierFrame();return;
  }
  const request={'ppt-city-courier-checkpoint':'checkpoint','ppt-city-courier-exit':'exit','ppt-city-courier-complete':'complete'}[msg.type];
  if(!['checkpoint','exit','complete'].includes(request)||frame.dataset.ready!=='1')return;
  const reply=ok=>courierPost(frame,'ppt-city-courier-save-result',{request,ok});
  let state;
  try{state=CourierCheckpoint.validate(msg.state);}catch(error){console.error('Invalid city delivery checkpoint',error);reply(false);return;}
  if(request==='checkpoint'){
    const task=NETWORK.cityCourier,previous=task.checkpoint;task.checkpoint=state;
    const ok=save();if(!ok)task.checkpoint=previous;reply(ok);return;
  }
  if(request==='exit'){const ok=cityCourierExit(state);if(!ok)reply(false);return;}
  if(externallyPaused()||networkPaused||msg.delivered!==4||state.runner?.status!=='won'||CourierCheckpoint.delivered(state)!==4){reply(false);return;}
  const ok=campaignCommit(candidate=>{candidate.cityCourier={complete:true};villageScene(candidate,'city_courier_done');});
  if(!ok)reply(false);
});
function cityMatchThreeAvailable(){
  const c=NETWORK?.campaign;
  return c?.chapter==='city'&&c.status==='complete'&&NETWORK.activeId===1&&NETWORK.storyPresentation?.type==='finished'&&
    !NETWORK.away&&!NETWORK.cityMatchThree?.complete&&!NETWORK.branches.some(branch=>branch.status==='play');
}
function startCityMatchThree(){
  if(!cityMatchThreeAvailable()||loadFailed||menuOpen||settingsOpen||networkPaused||paused||!branchRuntime.canPresent())return false;
  return campaignCommit(candidate=>{
    if(candidate.cityMatchThree)candidate.storyPresentation={type:'cityMatchThree'};
    else{candidate.cityMatchThree={complete:false,checkpoint:null};villageScene(candidate,'city_sorting_intro');}
  });
}
function cityMatchThreeExit(state){
  if(NETWORK?.storyPresentation?.type!=='cityMatchThree'||loadFailed||externallyPaused()||networkPaused)return false;
  return campaignCommit(candidate=>{
    if(state!==undefined)candidate.cityMatchThree.checkpoint=state;
    candidate.storyPresentation={type:'finished'};
  });
}
window.addEventListener('message',event=>{
  const frame=cityMatchThreeFrame(),msg=event.data;
  if(!frame||event.source!==frame.contentWindow||event.origin!==location.origin||msg?.token!==frame.dataset.token||
     NETWORK?.storyPresentation?.type!=='cityMatchThree'||loadFailed)return;
  if(msg.type==='ppt-match-three-ready'){
    if(frame.dataset.ready==='1')return;
    const settings=courierSettings(),held=matchThreeHeld();frame.dataset.settings=JSON.stringify(settings);frame.dataset.hold=String(held);
    courierPost(frame,'ppt-match-three-init',{...settings,paused:held,state:NETWORK.cityMatchThree.checkpoint});
    frame.dataset.ready='1';syncMatchThreeFrame();return;
  }
  const request={'ppt-match-three-checkpoint':'checkpoint','ppt-match-three-exit':'exit','ppt-match-three-complete':'complete'}[msg.type];
  if(!['checkpoint','exit','complete'].includes(request)||frame.dataset.ready!=='1')return;
  const reply=ok=>courierPost(frame,'ppt-match-three-save-result',{request,ok});
  let state;
  try{state=PptMatchThreeCheckpoint.transition(NETWORK.cityMatchThree.checkpoint,msg.state);}catch(error){console.error('Invalid sorting checkpoint',error);reply(false);return;}
  if(request==='checkpoint'){
    const task=NETWORK.cityMatchThree,previous=task.checkpoint;task.checkpoint=state;
    const ok=save();if(!ok)task.checkpoint=previous;reply(ok);return;
  }
  if(request==='exit'){const ok=cityMatchThreeExit(state);if(!ok)reply(false);return;}
  if(matchThreeHeld()||!PptMatchThreeCheckpoint.complete(state)){reply(false);return;}
  const ok=campaignCommit(candidate=>{candidate.cityMatchThree={complete:true};villageScene(candidate,'city_sorting_done');});
  if(!ok)reply(false);
});
function showVillageHouseStory(preparing=false){
  if(!villageLocation()||networkBatch||!branchRuntime.canPresent()||menuOpen||networkPaused||paused||loadFailed||
     NETWORK.storyPresentation||NETWORK.villageHome||NETWORK.villageLegacyDeparture||journeyGuideActive()||
     !['brief','summary','shop','team'].includes(mode))return false;
  const shifts=NETWORK.campaign.shifts,seen=NETWORK.storySeen||[];
  let id;
  if(S.day>=4&&shifts>=3&&(preparing||mode!=='summary'||S.day>=5)&&!seen.includes('village_rent_notice'))id='village_rent_notice';
  else if(S.day>=5&&shifts>=4&&seen.includes('village_rent_notice')&&!seen.includes('village_house_listings'))id='village_house_listings';
  if(!id)return false;
  // Preserve the settled fourth shift underneath the conversation and house picker.
  campaignCommit(candidate=>{
    if(preparing&&S.day===4&&id==='village_rent_notice'){
      const branch=candidate.branches[0];branch.status='brief';branch.runtime=null;branch.summary=null;
    }
    if(id==='village_rent_notice'){
      const branch=candidate.branches[0];
      candidate.villageRentFromDay=displayedDay(branch.state,branch.status,branch.summary)+2;
    }
    villageScene(candidate,id);
  });
  return true;
}
// Repairs II-V open with their own conversation. The scene is remembered as
// seen when it starts; after its last line the repair card opens by itself.
const VILLAGE_REPAIR_SCENES=Object.freeze([null,null,'village_repair_walls','village_repair_floor','village_repair_lights','village_repair_yard']);
function villageRepairScene(home){return VILLAGE_REPAIR_SCENES[PptVillageHome.due(home)]||null;}
function villageRepairTalkPending(){
  const home=activeVillageHome(),id=home&&villageRepairScene(home);
  return !!id&&!NETWORK.storySeen?.includes(id);
}
function villageRepairTalkDone(){
  const home=activeVillageHome(),id=home&&villageRepairScene(home);
  return !!id&&!!NETWORK.storySeen?.includes(id);
}
function villageWork(offered=true){
  if(!villageLocation()||!['summary','shop','brief','team'].includes(mode)||NETWORK.storyPresentation||journeyGuideActive())return null;
  const home=NETWORK.villageHome;
  if(!home)return offered&&S.day>=5&&NETWORK.storySeen?.includes('village_house_listings')?'purchase':null;
  if(!home.cleared)return 'clearing';
  return PptVillageHome.due(home)?'repair':null;
}
function showVillageWork(forceOffer=false){
  if(menuOpen||networkPaused||paused||loadFailed||!branchRuntime.canPresent())return false;
  const ui=globalThis.VillageHouseUI,kind=villageWork(forceOffer||NETWORK.villageOfferDay===undefined);
  if(!kind||!ui)return false;
  if(ui.isOpen())return true;
  if(kind==='repair'&&villageRepairTalkPending()){
    const id=villageRepairScene(NETWORK.villageHome),mark=NETWORK.campaign.chapter+':'+NETWORK.campaign.shifts;
    if(ov.querySelector('.campaignDialogue'))hideOv();
    const shown=campaignCommit(candidate=>villageScene(candidate,id));
    // The repair talk is this gap's conversation; other interludes wait a shift.
    if(shown)interludeMark=mark;
    return shown;
  }
  if(kind==='purchase'&&forceOffer&&NETWORK.villageOfferDay!==undefined){
    return campaignCommit(candidate=>{delete candidate.villageOfferDay;});
  }
  const home=NETWORK.villageHome,level=home?PptVillageHome.due(home):0;
  const stillCurrent=()=>!loadFailed&&!externallyPaused()&&kind===villageWork()&&home===NETWORK.villageHome;
  const payment=PptVillageHome.quote(S.cash,villageWages());
  // The scene has ended; its last line and Next button must leave the screen
  // before the native house dialog opens on top of the board.
  if(ov.querySelector('.campaignDialogue'))hideOv();
  ui.show({kind,home,level,payment,lang,baseRent:shiftBaseRent(S.day),
    onPurchase:house=>stillCurrent()&&campaignCommit(candidate=>{
      const price=PptVillageHome.quote(candidate.cash,villageWages());
      candidate.villageHome=PptVillageHome.purchase(house,price);candidate.cash-=price.downPayment;
      delete candidate.villageOfferDay;delete candidate.villageLegacyDeparture;
      villageScene(candidate,'village_house_condition');
    }),
    onClearing:progress=>{
      if(!stillCurrent())return false;
      const old=home.clearing;home.clearing=progress;
      if(save())return true;home.clearing=old;return false;
    },
    onCleared:()=>stillCurrent()&&ui.isClearingComplete(home.clearing)&&campaignCommit(candidate=>{
      candidate.villageHome.cleared=true;
      villageScene(candidate,'village_repair_paths');
    }),
    onRepair:style=>stillCurrent()&&campaignCommit(candidate=>{
      PptVillageHome.repair(candidate.villageHome,level,style);
      candidate.storyPresentation={type:'villageInstall',level};
    }),
    ...(kind==='purchase'?{onClose:()=>stillCurrent()&&campaignCommit(candidate=>{candidate.villageOfferDay=S.day;})}:
      kind==='repair'&&level===1&&!home.shifts&&!home.firstRepairDeferred?
        {deferRoof:true,onClose:()=>stillCurrent()&&campaignCommit(candidate=>{candidate.villageHome.firstRepairDeferred=true;})}:{})
  });
  syncAudio();
  return true;
}
function villageWorkButton(){
  const kind=villageWork();
  if(!kind||(kind==='purchase'&&NETWORK.villageOfferDay===undefined))return '';
  const words={purchase:['Выбрать дом для ПВЗ','Choose a house'],clearing:['Продолжить расчистку','Continue clearing'],repair:['Выбрать улучшение','Choose a renovation']};
  return '<button type="button" class="btn" data-a="villageWork">'+words[kind][lang==='ru'?0:1]+'</button>';
}
function villageBrief(){
  if(!villageLocation())return '';
  const ru=lang==='ru',home=activeVillageHome();
  if(!home)return S.day===4&&NETWORK.storySeen?.includes('village_rent_notice')?'<p class="networkHelp">'+(ru?'Послезавтра аренда вырастет до $150 в день. Анна принесёт объявления после работы.':'Rent goes up to $150 a day the day after tomorrow. Anna will bring the listings after work.')+'</p>':villageWorkButton();
  const weather=PptVillagePerks.weather(S.day,S.ev);
  const sky={sun:['Солнечно','Sunny'],cloud:['Пасмурно','Cloudy'],rain:['Дождь','Rain'],snow:['Снег','Snow']};
  const styleSet=PptVillagePerks.setBonus(home);
  return '<p class="networkHelp">'+sky[weather][ru?0:1]+' · '+(ru?'Ремонт ':'Renovation ')+home.choices.length+'/5 · '+
    (styleSet?(ru?'Набор стиля +':'Style set +')+money(styleSet)+' · ':'')+(ru?'Содержание ':'Upkeep ')+money(PptVillagePerks.upkeep(home,S.day,PptVillageHome.upkeep,S.ev))+'</p>'+
    (home.choices[3]==='cozy'?'<button type="button" class="btn sec" data-a="villageRadio">'+(ru?'Радио':'Radio')+' · '+(home.radio==='patience'?(ru?'спокойная музыка':'calm music'):(ru?'бодрая музыка':'upbeat music'))+'</button>':'');
}
function campaignCommit(change){
  if(loadFailed||!NETWORK?.campaign||NETWORK.away)return false;
  branchRuntime.capture();
  const candidate=PptSave.decodeGraph(PptSave.encodeGraph(NETWORK));
  try{change(candidate);PptSave.writeNetwork(campaignStorage(),candidate);}
  catch(error){console.error('Campaign transition failed:',error);if(error.saveUncertain){loadFailed=true;showStorageError();}saveNoticeKey=error.saveUncertain?'cancelExpansionUncertain':'saveFailed';$('saveNotice').textContent=t(saveNoticeKey);$('saveNotice').hidden=false;return false;}
  hasSave=true;$('saveNotice').hidden=true;attachNetwork(candidate);presentBranch();return true;
}
function buyCityAI(cost){
  // Commit the first purchase and its introduction together, so a failed
  // storage write can neither activate AI nor show an unpaid introduction.
  campaignCommit(candidate=>{
    const branch=candidate.branches.find(item=>item.id===candidate.activeId);
    if(candidate.campaign.chapter!=='city'||candidate.campaign.status!=='active'||candidate.campaign.cityProgress.technologySeen!==true||!branch||branch.status!=='shop'||
       (branch.state.up.ai||0)!==0||!Number.isFinite(cost)||cost<0||candidate.cash<cost)throw new Error('AI purchase unavailable');
    PptNetwork.recordExpansionDebit(candidate,branch.id,cost);
    candidate.cash-=cost;branch.state.up.ai=1;
    if(!Array.isArray(candidate.guideSeen))candidate.guideSeen=[];
    if(!candidate.guideSeen.some(key=>guideItemId(key)==='ai'))candidate.guideSeen.push('upgrade:ai:1');
    if(Array.isArray(candidate.guidePending))candidate.guidePending=candidate.guidePending.filter(key=>guideItemId(key)!=='ai');
    const introduced=candidate.campaign.cityProgress.aiIntroduced===true||(candidate.storySeen||[]).includes('city_ai_meeting');
    if(!introduced){candidate.storySeen=[...(candidate.storySeen||[]),'city_ai_meeting'];candidate.storyPresentation={type:'scene',id:'city_ai_meeting',step:0};}
    else{candidate.campaign.cityProgress.aiIntroduced=true;candidate.campaign.cityProgress.lastAiTipShift=candidate.campaign.shifts;}
  });
}
function buyStoryLocker(cost){
  campaignCommit(candidate=>{
    const branch=candidate.branches.find(item=>item.id===candidate.activeId),c=candidate.campaign;
    const available=c.chapter==='capital'||(c.chapter==='city'&&c.cityProgress?.district==='center'&&c.cityProgress.centerIntroSeen===true);
    if(!available||!(c.status==='active'||candidate.postgame)||!branch||branch.status!=='shop'||(branch.state.up.locker||0)!==0||!Number.isFinite(cost)||cost<0||candidate.cash<cost)throw new Error('Locker purchase unavailable');
    PptNetwork.recordExpansionDebit(candidate,branch.id,cost);candidate.cash-=cost;branch.state.up.locker=1;
    if(!branch.state.autoLocker)branch.state.autoLocker=PptCampaignLocker.create();
    if(!Array.isArray(candidate.guideSeen))candidate.guideSeen=[];
    if(!candidate.guideSeen.some(key=>guideItemId(key)==='locker'))candidate.guideSeen.push('upgrade:locker:1');
    if(Array.isArray(candidate.guidePending))candidate.guidePending=candidate.guidePending.filter(key=>guideItemId(key)!=='locker');
  });
}
function campaignGoals(){
  const result=PptCampaign.goals(NETWORK.campaign,{cash:NETWORK.cash,staff:S.staff,rating:stars(),aiLevel:S.up.ai||0,branchCount:NETWORK.branches.length,
    branches:NETWORK.branches.map(branch=>({id:branch.id,status:branch.id===branchRuntime.current()?.id?mode:branch.status}))});
  if(villageLocation()&&!NETWORK.villageLegacyDeparture){
    const house=NETWORK.villageHome,repairs=house?.choices.length||0,shifts=repairs===5?Math.min(2,Math.max(0,house.shifts-house.finishedAt)):0;
    result.checks.house={current:repairs,target:5,met:repairs===5};
    result.checks.restoredShifts={current:shifts,target:2,met:shifts===2};
    const cash=result.checks.cash;cash.target=Math.max(cash.target,PptVillageHome.townDeposit+100+villageWages());cash.met=cash.current>=cash.target;
    result.ready=result.ready&&cash.met&&result.checks.house.met&&result.checks.restoredShifts.met;
  }
  const town=activeTownHome();
  if(town&&NETWORK.campaign.status==='active'){
    const repairs=town.choices.length,cleared=town.episodes.length,finished=town.finishedAt===null?0:Math.max(0,NETWORK.campaign.shifts-town.finishedAt);
    result.checks.townRepairs={current:repairs,target:5,met:repairs===5};result.checks.townBasement={current:cleared,target:3,met:cleared===3};
    result.checks.townRestoredShifts={current:Math.min(2,finished),target:2,met:finished>=2};
    result.ready=result.ready&&repairs===5&&cleared===3&&finished>=2;
  }
  return result;
}
function firstDayLocked(){return !!NETWORK?.campaign&&NETWORK.campaign.chapter==='village'&&S.day<=2;}
function journeyGuideActive(){return !!NETWORK?.campaign&&NETWORK.campaign.chapter==='village'&&['map','map_view','shop','team','return_shop','shop_intro'].includes(NETWORK.journeyGuide);}
function journeySet(stage){const previous=NETWORK.journeyGuide;NETWORK.journeyGuide=stage;if(save()&&!loadFailed)return true;if(previous===undefined)delete NETWORK.journeyGuide;else NETWORK.journeyGuide=previous;return false;}
// The previous build finished the tutorial while still on the team screen.
// Only migrate that precise, not-yet-visited-shop checkpoint; later saves
// retain their current flow and the new acknowledgement prevents repeats.
function journeyMigrateLegacyShop(){
  if(NETWORK?.campaign?.chapter!=='village'||NETWORK.journeyGuide!=='done'||mode!=='team'||S.day<3||NETWORK.campaign.shifts!==S.day-1||S.staff.length!==1||S.staff[0].role!=='load')return true;
  if(guideSeen('intro:shop')||(NETWORK.guideSeen||[]).some(key=>key.startsWith('upgrade:'))||(NETWORK.guidePending||[]).some(key=>key.startsWith('upgrade:'))||Object.values(S.up||{}).some(level=>level>0))return true;
  return journeySet('return_shop');
}
function journeyNormalizeEarly(){
  if(!firstDayLocked()||NETWORK?.journeyGuide===undefined||NETWORK.journeyGuide==='done')return true;
  const previous=NETWORK.journeyGuide;delete NETWORK.journeyGuide;
  if(save()&&!loadFailed)return true;NETWORK.journeyGuide=previous;return false;
}
function journeyHighlight(html,action){return html.replace('data-a="'+action+'"','data-guide-highlight="true" data-a="'+action+'"');}
function journeyPanel(text){return '<section class="guidePanel" role="region" aria-label="'+t('guideNarrator')+'">'+guideNarratorHeader()+'<p>'+text+'</p></section>';}
function campaignMapButton(){
  if(NETWORK?.away)return '';
  if(NETWORK?.postgame&&!NETWORK.storyPresentation)return '<button type="button" class="btn sec" data-a="awayHub">'+PptPostgameUI.words(lang).journey+'</button>';
  if(!NETWORK?.campaign||NETWORK.storyPresentation||firstDayLocked())return '';
  const {checks,ready}=campaignGoals(),goals=Object.values(checks),done=goals.filter(goal=>goal.met).length,total=goals.length;
  const percent=Math.round(100*done/total),label=lang==='ru'?'Карта и цели':'Map & goals';
  const status=lang==='ru'?label+': выполнено '+done+' из '+total:label+': '+done+' of '+total+' complete';
  return '<button type="button" class="btn sec campaignGoalButton'+(done>0?' campaignGoalButton--progress':'')+(ready?' campaignGoalButton--ready':'')+'" data-a="campaignMap" style="--goal-fill:'+percent+'%" aria-label="'+status+'" title="'+status+'"><span class="campaignGoalButton__fill" aria-hidden="true"></span><span class="campaignGoalButton__label">'+label+'</span></button>';
}
function showCampaignMap(){
  if(!NETWORK?.campaign)return;
  showOv(()=>{const c=NETWORK.campaign,{checks,ready}=campaignGoals(),ru=lang==='ru';
  const center=c.chapter==='city'&&c.cityProgress?.district==='center';
  const objectives=c.chapter==='capital'?[{label:ru?'Открыть второй ПВЗ в центре':'Open a second pickup point downtown',
    progress:checks.network.current+'/'+checks.network.target,done:checks.network.met},
    {label:(ru?'Окраина: рейтинг не ниже ★':'Outskirts: rating at least ★')+fmtNum(checks.outskirts.minimum,1),
      progress:checks.outskirts.current+'/'+checks.outskirts.target+(ru?' смен подряд':' consecutive shifts'),done:checks.outskirts.met},
    {label:(ru?'Центр: рейтинг не ниже ★':'Downtown: rating at least ★')+fmtNum(checks.center.minimum,1),
      progress:checks.center.current+'/'+checks.center.target+(ru?' смен подряд':' consecutive shifts'),done:checks.center.met}]:center?[
    {label:ru?'Провести смены в центре':'Complete downtown shifts',progress:checks.centerShifts.current+'/'+checks.centerShifts.target,done:checks.centerShifts.met},
    {label:ru?'Подготовить сотрудника':'Have an employee ready',progress:checks.staff.current+'/'+checks.staff.target,done:checks.staff.met}]:c.chapter==='city'?[{label:ru?'Пригласить блогера':'Invite the blogger',
    progress:checks.promotion.met?(ru?'Первый визит состоялся':'First visit complete'):
      !checks.promotion.introduced?(ru?'Обсудите продвижение после первой смены':'Discuss promotion after the first shift'):
      '★'+displayedRating(checks.promotion.current)+' / ★'+checks.promotion.minimum,done:checks.promotion.met},
    {label:ru?'Провести смены':'Complete shifts',progress:checks.shifts.current+'/'+checks.shifts.target,done:checks.shifts.met},
    {label:ru?'Подготовить сотрудника':'Have an employee ready',progress:checks.staff.current+'/'+checks.staff.target,done:checks.staff.met}]:[
    {label:ru?'Провести смены':'Complete shifts',progress:checks.shifts.current+'/'+checks.shifts.target,done:checks.shifts.met},
    {label:ru?'Обслужить клиентов':'Serve customers',progress:checks.served.current+'/'+checks.served.target,done:checks.served.met},
    {label:ru?'Удержать рейтинг не ниже ★'+checks.rating.minimum:'Maintain rating at least ★'+checks.rating.minimum,progress:(checks.rating.current===null?'—':'★'+displayedRating(checks.rating.current))+' · '+checks.rating.streak+'/'+checks.rating.target+(ru?' смен подряд':' consecutive shifts'),done:checks.rating.met},
    {label:checks.staff.kind==='new_hire'?(ru?'Нанять нового сотрудника':'Hire a new employee'):(ru?'Подготовить сотрудника':'Have an employee ready'),progress:checks.staff.current+'/'+checks.staff.target,done:checks.staff.met},
    {label:checks.house?(ru?'Взнос за помещение в райцентре $500 и запас на зарплату и работу':'Premises deposit in the district centre ($500) and operating reserve'):checks.cash.kind==='town_revenue'?(ru?'Выручка городка (выдача и возвраты)':'Town revenue (pickups & returns)'):(ru?'Накопить в кассе':'Cash reserve'),progress:money(checks.cash.current)+' / '+money(checks.cash.target),done:checks.cash.met}
  ];
  if(checks.house){
    objectives.push({label:ru?'Купить дом и закончить пять ремонтов':'Buy a house and finish five renovations',progress:checks.house.current+'/5',done:checks.house.met},
      {label:ru?'Провести две смены в готовом доме':'Work two shifts in the restored house',progress:checks.restoredShifts.current+'/2',done:checks.restoredShifts.met});
  }
  if(checks.townRepairs)objectives.push({label:ru?'Расчистить три помещения подвала':'Clear three basement rooms',progress:checks.townBasement.current+'/3',done:checks.townBasement.met},
    {label:ru?'Выполнить пять улучшений ПВЗ':'Complete five premises improvements',progress:checks.townRepairs.current+'/5',done:checks.townRepairs.met},
    {label:ru?'Провести две смены в готовом ПВЗ':'Work two shifts in the renovated pickup point',progress:checks.townRestoredShifts.current+'/2',done:checks.townRestoredShifts.met});
  if(c.chapter==='city'&&checks.ai)objectives.push({label:ru?'Получить ИИ-помощника':'Get an AI assistant',progress:checks.ai.current+'/'+checks.ai.target,done:checks.ai.met});
  if(c.chapter==='capital'&&!checks.network.met){
    const prep=PptNetwork.capitalExpansionQuest(NETWORK)?.checks;
    if(prep)objectives.unshift(
      {label:ru?'Задание на второй ПВЗ: провести смены':'Second-branch quest: complete shifts',progress:Math.min(prep.shifts.current,prep.shifts.target)+'/'+prep.shifts.target,done:prep.shifts.met},
      {label:ru?'Задание: обслужить посетителей в столице':'Quest: serve customers in the capital',progress:Math.min(prep.served.current,prep.served.target)+'/'+prep.served.target,done:prep.served.met},
      {label:ru?'Задание: собрать команду':'Quest: build the team',progress:Math.min(prep.staff.current,prep.staff.target)+'/'+prep.staff.target,done:prep.staff.met});
  }
  let html=PptCampaignUI.map({lang,chapter:c.chapter,district:c.chapter==='city'?(center?'center':'outskirts'):null,objectives,canAdvance:ready&&mode!=='play'&&NETWORK.journeyGuide!=='map_view',finished:c.status==='complete'});
  const courier=cityCourierButton();if(courier)html=html.replace('<div class="campaignActions">','<div class="campaignActions">'+courier);
  if(center&&(S.autoLocker?.closing||S.locker.some(Boolean))){
    const pending=(S.autoLocker?.slots.filter(Boolean).length||0)+S.locker.filter(Boolean).length;
    const note=pending?(ru?'Подготовка к переезду: новых заказов в постамат нет, остальные идут в обычное окно. Дождитесь получения оставшихся заказов: ':'Preparing to move: new orders go to the regular counter. Wait for remaining locker pickups: ')+pending:
      (ru?'Все заказы получены. Можно завершить главу или продолжить приём.':'All orders collected. Complete the chapter or resume locker orders.');
    html=html.replace('<div class="campaignActions">','<p class="networkHelp">'+note+'</p><div class="campaignActions">'+(S.autoLocker?.closing?'<button class="campaignButton campaignButton--secondary" data-a="lockerResume">'+(ru?'Продолжить приём в постамат':'Resume locker orders')+'</button>':''));
  }
  if(c.chapter==='capital'&&!checks.network.met&&PptNetwork.expansionTerms(NETWORK)){
    const terms=PptNetwork.expansionTerms(NETWORK),available=PptNetwork.canOpenSecond(NETWORK);
    const details=ru?'Выполните задание на второй ПВЗ и накопите '+money(terms.requiredBalance)+'. Стоимость — '+money(terms.cost)+', остальное останется на команду и покупки.':
      'Complete the second-branch quest and have '+money(terms.requiredBalance)+'. It costs '+money(terms.cost)+'; the rest stays for staff and purchases.';
    html=html.replace('<div class="campaignActions">','<p class="networkHelp">'+details+'</p><div class="campaignActions"><button class="campaignButton" data-a="campaignOpenCenter"'+(available?'':' disabled')+'>'+(ru?'Открыть ПВЗ в центре':'Open downtown pickup point')+'</button>');
  }
  if(NETWORK.journeyGuide==='map_view'){
    const message=ru?'Здесь виден путь и цели главы: смены, клиенты, рейтинг, сотрудник и запас денег. Выполняй их параллельно — когда всё готово, откроется переезд.':'This map tracks shifts, customers, rating, staff and cash. Work on the goals together; once they are all met, you can move on.';
    html=html.replace('<div class="campaignActions">','<div class="campaignActions journeyGuideSticky">'+journeyPanel(message));html=journeyHighlight(html,'campaignContinue').replace('<ul class="campaignGoals">','<ul class="campaignGoals" data-guide-highlight="true">');
  }
  return html;});
}
function campaignPortrait(path){
  if(!path)return '';
  if(path.includes('narrator-portrait'))return 'narrator';
  if(path.includes('leo-portrait'))return 'leo';
  if(path.includes('hero-casual'))return 'playerCasual';
  if(path.includes('hero-uniform'))return 'playerUniform';
  if(path.includes('uniform-female-a'))return 'player';
  if(path.includes('anna-portrait')||path.includes('grandma-idle'))return 'anna';
  if(path.includes('worker-hi-vis'))return 'leo';
  if(path.includes('eli-portrait')||path.includes('bearded-idle'))return 'eli';
  if(path.includes('maya-portrait')||path.includes('girl-hoodie'))return 'maya';
  if(path.includes('nika-portrait'))return 'nika';
  if(path.includes('city-blogger-portrait'))return 'cityBlogger';
  return '';
}
function showCampaignPresentation(){
  const presentation=NETWORK.storyPresentation;if(!presentation)return false;
  if(presentation.type==='cityMatchThree'){
    if(cityMatchThreeFrame())return true;
    const token=globalThis.crypto?.randomUUID?.()||('sorting-'+Date.now()+'-'+(++courierFrameCounter));
    showOv(()=>{
      const ru=lang==='ru',title=ru?'Сортировочный центр':'Sorting centre',sortingUrl='prototypes/match-three/index.html?campaign=1&token='+encodeURIComponent(token)+'&lang='+lang;
      return '<section class="cityCourierShell cityMatchThreeShell" aria-label="'+title+'"><iframe id="cityMatchThreeFrame" class="cityCourierFrame" title="'+title+'" data-token="'+token+'" src="'+esc(sortingUrl)+'"></iframe>'+
        '<div class="cityCourierLoading"><p role="status">'+(ru?'Загружаем сортировочный центр…':'Loading the sorting centre…')+'</p><button type="button" class="btn sec" data-a="cityMatchThreeExit">'+(ru?'Вернуться к переезду':'Return to the departure screen')+'</button></div></section>';
    });return true;
  }
  if(presentation.type==='cityCourier'){
    if(cityCourierFrame())return true;
    const token=globalThis.crypto?.randomUUID?.()||('delivery-'+Date.now()+'-'+(++courierFrameCounter));
    showOv(()=>{
      const ru=lang==='ru',title=ru?'Срочная доставка':'Rush delivery',courierUrl='prototypes/city-courier/index.html?campaign=1&token='+encodeURIComponent(token)+'&lang='+lang;
      return '<section class="cityCourierShell" aria-label="'+title+'"><iframe id="cityCourierFrame" class="cityCourierFrame" title="'+title+'" data-token="'+token+'" src="'+esc(courierUrl)+'"></iframe>'+
        '<div class="cityCourierLoading"><p role="status">'+(ru?'Загружаем карту мегаполиса…':'Loading the city map…')+'</p><button type="button" class="btn sec" data-a="cityCourierExit">'+(ru?'Вернуться в ПВЗ':'Back to the pickup point')+'</button></div></section>';
    });return true;
  }
  if(presentation.type==='townBasement'){
    if(!ov.hidden&&ov.querySelector('.townBasementFrame'))return true;
    showOv(()=>PptTownUI.basementMarkup(presentation.episode,lang,playerAudio?.snapshot().preferences,!!NETWORK.townHome.arcade));return true;
  }
  if(presentation.type==='townRepair'){showOv(()=>PptTownUI.choicesMarkup(NETWORK.townHome,presentation.level,lang));return true;}
  if(presentation.type==='townInstall'){showOv(()=>PptTownUI.installMarkup(NETWORK.townHome,lang));return true;}
  if(presentation.type==='villageInstall'){
    showOv(()=>PptVillageInstall.markup(NETWORK.villageHome,lang));
    return true;
  }
  if(presentation.type==='scene'){
    if(!PptStoryContent.scene(presentation.id,lang)[presentation.step])return false;
    showOv(()=>{const line=PptStoryContent.scene(presentation.id,lang)[presentation.step];
      const chapter=NETWORK.campaign.chapter,location=chapter==='city'&&NETWORK.campaign.cityProgress?.district==='center'?'city-center':chapter;
      return PptCampaignUI.dialogue({lang,speaker:line.speaker,text:line.text,portrait:campaignPortrait(line.portrait),location,
        ownedHouse:!!NETWORK.villageHome&&!NETWORK.away,townChoices:activeTownHome()?.choices});});return true;
  }
  if(presentation.type==='choose'){
    showOv(()=>{const staff=S.staff.map(person=>({id:person.id,label:nameOf(person)+' · '+STR[lang].roles[person.role][0]+' · '+t('lvlShort',person.lvl)}));return PptCampaignUI.choose({lang,staff});});return true;
  }
  if(presentation.type==='retryNotice'){
    showOv(()=>{const ru=lang==='ru',loss=money(presentation.penalty),support=money(presentation.support),debt=money(presentation.clearedDebt);return '<h2>'+(ru?'Новая попытка':'Try again')+'</h2><p>'+(ru?'Начинаем последнюю достигнутую главу заново.':'Restart the last reached chapter.')+'</p><p>'+(ru?'Потеря: ':'Penalty: ')+loss+(presentation.clearedDebt?(ru?' · долг списан: ':' · debt cleared: ')+debt:'')+(presentation.support?(ru?' · помощь на новый старт: ':' · restart support: ')+support:'')+'</p><button class="btn" data-a="campaignSceneNext">'+(ru?'Продолжить':'Continue')+'</button>';});return true;
  }
  if(presentation.type==='finished'){
    if(NETWORK.campaign.chapter==='capital'){
      showOv(()=>'<h2>'+(lang==='ru'?'История пройдена!':'Story complete!')+'</h2><p>'+(lang==='ru'?'От деревни до столицы — теперь у вас работает целая сеть пунктов выдачи.':'From the village to the capital, you have built a pickup point network.')+'</p><p>'+(lang==='ru'?'Сеть продолжает работать. Можно вернуться в знакомые места на одну смену или остаться в столице.':'Your network keeps working. Visit familiar places for one shift or stay in the capital.')+'</p><button class="btn" data-a="postgameStart" data-v="hub">'+(lang==='ru'?'Отправиться в путешествие':'Go on a journey')+'</button><button class="btn sec" data-a="postgameStart">'+(lang==='ru'?'Работать в столице':'Work in the capital')+'</button><button class="btn sec" data-a="menu">'+t('menu')+'</button>');return true;
    }
    if(NETWORK.campaign.chapter==='city'){
      showOv(()=>{const ru=lang==='ru',cleared=!!NETWORK.cityMatchThree?.complete;
        return '<h2>'+(ru?'Мегаполис освоен!':'City chapter complete!')+'</h2><p>'+(cleared?(ru?'Сортировочный центр готов. Пора открыть пункт на окраине столицы.':'The sorting centre is ready. It is time to open a pickup point on the capital outskirts.'):
          (ru?'Перед отъездом помоги Нике закончить три партии в сортировочном центре.':'Before leaving, help Nika finish three sorting rounds.'))+'</p><button class="btn" data-a="'+(cleared?'campaignCapitalChoose':'cityMatchThreeStart')+'">'+(cleared?(ru?'Отправиться в столицу':'Go to the capital'):
          NETWORK.cityMatchThree?(ru?'Продолжить сортировку':'Resume sorting'):(ru?'Сортировочный центр':'Sorting centre'))+'</button><button class="btn sec" data-a="menu">'+t('menu')+'</button>';
      });return true;
    }
    showOv(()=>'<h2>'+(lang==='ru'?'Первая часть пройдена!':'First part complete!')+'</h2><p>'+(lang==='ru'?'Деревня и городок готовы. Впереди — мегаполис!':'The village and town chapters are complete. The city is next!')+'</p><button class="btn" data-a="campaignCityChoose">'+(lang==='ru'?'Отправиться в мегаполис':'Go to the city')+'</button><button class="btn sec" data-a="menu">'+t('menu')+'</button>');return true;
  }
  return false;
}
function campaignSceneNext(){
  const p=NETWORK.storyPresentation;if(!p||!['scene','retryNotice'].includes(p.type))return;
  campaignCommit(candidate=>{
    const current=candidate.storyPresentation;
    if(current.type==='retryNotice'){delete candidate.storyPresentation;return;}
    const length=PptStoryContent.scene(current.id,'ru').length;
    if(current.step+1<length){current.step++;return;}
    if(current.id==='village_departure')candidate.storyPresentation={type:'choose'};
    else if(current.id==='city_courier_intro')candidate.storyPresentation={type:'cityCourier'};
    else if(current.id==='city_sorting_intro')candidate.storyPresentation={type:'cityMatchThree'};
    else if(current.id==='town_final'||current.id==='city_departure'||current.id==='city_sorting_done'||current.id==='capital_final')candidate.storyPresentation={type:'finished'};
    else {
      if(candidate.campaign.chapter==='city'){
        if(current.id==='city_center_arrival')candidate.campaign=PptCampaign.markCityCenterIntroduction(candidate.campaign).campaign;
        if(current.id==='city_promotion')candidate.campaign.cityProgress.promotionSeen=true;
        if(current.id==='city_technology')candidate.campaign.cityProgress.technologySeen=true;
        if(current.id==='city_ai_meeting'){candidate.campaign.cityProgress.aiIntroduced=true;candidate.campaign.cityProgress.lastAiTipShift=candidate.campaign.shifts;}
      }
      delete candidate.storyPresentation;
    }
  });
}
// Short scenes between shifts. The first one that is due is stored as seen
// together with its presentation, so a reload or a chapter retry never repeats it.
// At most one interlude is shown in the same gap between two shifts.
let interludeMark=null;
const CITY_AI_TIPS=['city_ai_tip_team','city_ai_tip_queue','city_ai_tip_cash','city_ai_tip_orders'],CITY_AI_TIP_INTERVAL=3;
function campaignInterludeId(){
  const c=NETWORK?.campaign;
  if(!c||NETWORK.away||c.status!=='active'||interludeMark===c.chapter+':'+c.shifts||NETWORK.storyPresentation||loadFailed||menuOpen||branchRuntime.current()?.id!==1||journeyGuideActive()||firstDayLocked())return null;
  const seen=id=>Array.isArray(NETWORK.storySeen)&&NETWORK.storySeen.includes(id),ready=campaignGoals().ready;
  if(c.chapter==='village'){
    const home=activeVillageHome();
    if(villageRepairTalkPending())return null;
    if(home?.shifts>=1&&!seen('village_town_offer'))return 'village_town_offer';
    if((c.shifts===2||seen('village_town_offer'))&&S.staff.length>0&&!seen('village_team'))return 'village_team';
  }else if(c.chapter==='town'){
    if(c.shifts>=1&&c.shifts<=2&&!seen('town_first_shift'))return 'town_first_shift';
    if(c.shifts>=3&&!ready&&!seen('town_village_news'))return 'town_village_news';
  }else if(c.chapter==='city'){
    if(c.shifts>=1&&!seen('city_promotion'))return 'city_promotion';
    if(c.shifts>=3&&c.cityProgress.promotionSeen&&!c.cityProgress.technologySeen&&!seen('city_technology'))return 'city_technology';
    if(c.cityProgress.aiIntroduced&&(S.up.ai||0)>0&&c.shifts-c.cityProgress.lastAiTipShift>=CITY_AI_TIP_INTERVAL)
      return CITY_AI_TIPS[c.cityProgress.nextAiTipIndex];
  }else if(c.chapter==='capital'){
    const progress=c.capitalProgress;
    if(progress.aiIntroduced&&c.shifts-progress.lastAiTipShift>=CITY_AI_TIP_INTERVAL)
      return CITY_AI_TIPS[progress.nextAiTipIndex];
  }
  return null;
}
function campaignInterlude(){
  const id=campaignInterludeId();if(!id)return false;
  const mark=NETWORK.campaign.chapter+':'+NETWORK.campaign.shifts;
  const shown=campaignCommit(candidate=>{
    const branch=candidate.branches[0];branch.status='brief';branch.runtime=null;branch.summary=null;branch.paused=false;
    const tip=CITY_AI_TIPS.indexOf(id);
    if(tip>=0&&['city','capital'].includes(candidate.campaign.chapter)){
      const progress=candidate.campaign.chapter==='city'?candidate.campaign.cityProgress:candidate.campaign.capitalProgress;
      progress.lastAiTipShift=candidate.campaign.shifts;
      progress.nextAiTipIndex=(tip+1)%CITY_AI_TIPS.length;
    }else candidate.storySeen=[...(Array.isArray(candidate.storySeen)?candidate.storySeen:[]),id];
    candidate.storyPresentation={type:'scene',id,step:0};
  });
  if(shown)interludeMark=mark;
  return shown;
}
function campaignDismissChoice(){campaignCommit(candidate=>{if(['town','city'].includes(candidate.campaign.chapter)&&candidate.campaign.status==='complete')candidate.storyPresentation={type:'finished'};else delete candidate.storyPresentation;});}
function campaignCityChoose(){
  if(NETWORK?.campaign?.chapter!=='town'||NETWORK.campaign.status!=='complete'||NETWORK.storyPresentation?.type!=='finished')return;
  campaignCommit(candidate=>{candidate.storyPresentation={type:'choose'};});
}
function campaignCapitalChoose(){
  if(NETWORK?.campaign?.chapter!=='city'||NETWORK.campaign.status!=='complete'||NETWORK.storyPresentation?.type!=='finished')return;
  if(!NETWORK.cityMatchThree?.complete){startCityMatchThree();return;}
  campaignCommit(candidate=>{candidate.storyPresentation={type:'choose'};});
}
function campaignFirstDayNext(){
  if(mode!=='summary'||!NETWORK.campaign||NETWORK.campaign.chapter!=='village'||S.day!==2||NETWORK.storyPresentation)return;
  campaignCommit(candidate=>{
    const branch=candidate.branches[0];branch.status='brief';branch.runtime=null;branch.summary=null;branch.paused=false;
    candidate.storyPresentation={type:'scene',id:'first_day_complete',step:0};
  });
}
function campaignBeginAdvance(){
  if(!NETWORK?.campaign||NETWORK.storyPresentation||mode==='play'||!campaignGoals().ready)return;
  const center=NETWORK.campaign.chapter==='city'&&NETWORK.campaign.cityProgress?.district==='center';
  if(center&&(S.autoLocker?.slots.some(Boolean)||S.locker.some(Boolean))){
    if(S.autoLocker&&!S.autoLocker.closing)campaignCommit(candidate=>{candidate.branches[0].state.autoLocker.closing=true;});
    showCampaignMap();return;
  }
  campaignCommit(candidate=>{
    if(candidate.campaign.chapter==='village')candidate.storyPresentation={type:'scene',id:'village_departure',step:0};
    else if(candidate.campaign.chapter==='city'&&candidate.campaign.cityProgress?.district!=='center'){
      const branch=candidate.branches[0],state=branch.state;
      const result=PptCampaign.beginCityCenter(candidate.campaign,{cash:candidate.cash,staff:state.staff,
        rating:state.reviews.reduce((a,b)=>a+b,0)/state.reviews.length,aiLevel:state.up.ai||0});
      candidate.campaign=result.campaign;candidate.cash=result.cash;candidate.campaignCheckpoint=campaignClone(state);
      candidate.storyPresentation={type:'scene',id:'city_center_arrival',step:0};
    }
    else{
      const branch=candidate.branches[0],city=candidate.campaign.chapter==='city',capital=candidate.campaign.chapter==='capital';
      candidate.campaign=PptCampaign.advance(candidate.campaign,{cash:candidate.cash,staff:branch.state.staff,
        aiLevel:branch.state.up.ai||0,branchCount:candidate.branches.length,
        branches:candidate.branches.map(item=>({id:item.id,status:item.status}))}).campaign;
      candidate.storyPresentation={type:'scene',id:capital?'capital_final':city?'city_departure':'town_final',step:0};
    }
  });
}
// A legacy save may reach the compulsory choice with no employees. Offer one
// free helper in that exceptional state, then still require an explicit choice.
// The hire and candidate removal are persisted together before the UI changes.
function campaignRescue(){
  if(NETWORK?.storyPresentation?.type!=='choose'||S.staff.length)return;
  campaignCommit(candidate=>{
    const state=candidate.branches.find(branch=>branch.id===1)?.state;
    if(!state||state.staff.length||candidate.storyPresentation?.type!=='choose')throw new Error('Helper is not needed');
    let helper=state.cands.shift();
    if(!helper){
      const used=new Set(state.cands.map(person=>person.id));let id=Number.isSafeInteger(state.nid)&&state.nid>0?state.nid:1;
      while(used.has(id)&&id<Number.MAX_SAFE_INTEGER)id++;
      if(used.has(id))throw new Error('No employee ID available');
      helper={id,n:0,trait:'careful',spd:2,acc:2,lvl:1,xp:0,role:'load'};
      state.nid=id<Number.MAX_SAFE_INTEGER?id+1:id;
    }
    state.staff.push(helper);
  });
}
function campaignSelect(id){
  if(NETWORK.storyPresentation?.type!=='choose'||!Number.isSafeInteger(id))return;
  if(NETWORK.campaign.chapter==='city'&&NETWORK.campaign.status==='complete'&&!NETWORK.cityMatchThree?.complete)return;
  const moved=campaignCommit(candidate=>{
    const branch=candidate.branches[0],toCity=candidate.campaign.chapter==='town'&&candidate.campaign.status==='complete',
      toCapital=candidate.campaign.chapter==='city'&&candidate.campaign.status==='complete';
    if(toCapital&&!candidate.cityMatchThree?.complete)throw new Error('Sorting centre is not complete');
    const result=(toCapital?PptCampaign.beginCapital:toCity?PptCampaign.beginCity:PptCampaign.advance)(candidate.campaign,
      {cash:candidate.cash,staff:branch.state.staff,selectedId:id,aiLevel:branch.state.up.ai||0});
    // Preserve the once-per-upgrade tutorial history even for older saves
    // which bought an upgrade before the updated shop guide was introduced.
    const oldUpgrades=branch.state.up||{};
    const purchased=SHOP.filter(item=>{
      const level=oldUpgrades[item.id];
      return Number.isInteger(level)&&level>0&&level<=item.p.length;
    }).map(item=>item.id);
    if(purchased.length){
      if(!Array.isArray(candidate.guideSeen))candidate.guideSeen=[];
      for(const itemId of purchased)if(!candidate.guideSeen.some(key=>guideItemId(key)===itemId))candidate.guideSeen.push('upgrade:'+itemId+':1');
      if(Array.isArray(candidate.guidePending))candidate.guidePending=candidate.guidePending.filter(key=>!purchased.includes(guideItemId(key)));
    }
    const next=fresh();delete next.cash;next.day=branch.state.day;next.storyQueueEligible=false;next.storyTownExtraStaffSlot=true;
    if(toCapital)next.startStaffSlots=1;
    for(const itemId of ['shoes','cart','xlcart','scanner','gloves','brand']){
      if(purchased.includes(itemId)||(itemId==='gloves'&&oldUpgrades.gloves===1))next.up[itemId]=oldUpgrades[itemId];
    }
    // Orders from an older window locker must not disappear on a chapter move.
    // An interrupted automatic order is likewise carried as the same parcel,
    // never recreated or paid here. Normal completed moves have no such orders.
    if(branch.state.locker?.some(Boolean)){
      next.locker=branch.state.locker;next.up.locker=1;
      for(const parcel of next.locker)if(parcel)parcel.lk=false;
    }
    if(branch.state.autoLocker?.slots.some(Boolean)){
      next.autoLocker=branch.state.autoLocker;next.autoLocker.closing=false;next.up.locker=1;
      PptCampaignLocker.endShift(next.autoLocker,branch.runtime?.autoLocker);
    }
    next.staff=[result.person];next.nid=Math.max(next.nid,result.person.id+1);
    branch.state=next;branch.runtime=null;branch.summary=null;branch.status='brief';branch.paused=false;
    if(candidate.campaign.chapter==='village'&&candidate.villageHome){
      if(!campaignGoals().ready)throw new Error('Village move is not ready');
      PptVillagePerks.moveStorage(candidate.villageHome,next);
      result.cash-=PptVillageHome.townDeposit;
    }
    if(toCity&&candidate.townHome)PptTownRenovation.moveStorage(candidate.townHome,next);
    candidate.campaign=result.campaign;candidate.cash=result.cash;candidate.activeId=1;candidate.campaignCheckpoint=campaignClone(next);
    if(result.campaign.chapter==='town')candidate.townHome=PptTownRenovation.create();else if(candidate.townHome)delete candidate.townHome;
    if(toCapital){delete candidate.cityCourier;delete candidate.cityMatchThree;}
    candidate.storyPresentation={type:'scene',id:toCapital?'capital_arrival':toCity?'city_arrival':'town_arrival',step:0};
  });
  if(moved)interludeMark=null;
}
function campaignRetry(){
  if(mode!=='over'||!NETWORK?.campaign||!NETWORK.campaignCheckpoint)return;
  const retried=campaignCommit(candidate=>{
    const result=PptCampaign.restart(candidate.campaign,{cash:candidate.cash}),branch=candidate.branches[0];
    const next=campaignClone(candidate.campaignCheckpoint);
    // Old locker parcels can be carried into any chapter. Replaying the
    // checkpoint would resurrect parcels already collected in that chapter.
    next.locker=branch.state.locker;
    if(branch.state.autoLocker?.slots.some(Boolean)){
      next.autoLocker=branch.state.autoLocker;next.autoLocker.closing=false;next.up.locker=1;
      PptCampaignLocker.endShift(next.autoLocker,branch.runtime?.autoLocker);
    }else delete next.autoLocker;
    if(next.locker.some(Boolean))next.up.locker=1;
    // A retry must cover one empty shift and leave a modest working reserve.
    const restartDay=result.campaign.chapter==='capital'?STORY_CAPITAL_BASE_DAY:result.campaign.chapter==='city'?STORY_CITY_BASE_DAY:result.campaign.chapter==='town'?STORY_TOWN_BASE_DAY:Math.min(next.day,STORY_VILLAGE_DAY_CAP);
    const required=rentFor(restartDay)+next.staff.reduce((sum,person)=>sum+wage(person),0)+60;
    const extra=Math.max(0,required-result.cash);
    branch.state=next;branch.runtime=null;branch.summary=null;branch.status='brief';branch.paused=false;
    candidate.campaign=result.campaign;candidate.cash=result.cash+extra;candidate.manualPaused=false;
    if(result.campaign.chapter==='village'){
      delete candidate.villageHome;delete candidate.villageOfferDay;delete candidate.villageLegacyDeparture;delete candidate.villageRentFromDay;
      if(candidate.storySeen)candidate.storySeen=candidate.storySeen.filter(id=>!['village_rent_notice','village_house_listings','village_house_condition','village_repair_paths','village_town_offer'].includes(id));
    }
    if(result.campaign.chapter==='town'){
      candidate.townHome=PptTownRenovation.create();
      if(candidate.storySeen)candidate.storySeen=candidate.storySeen.filter(id=>!/^town_(?:basement|repair)_/.test(id));
    }
    if(result.campaign.chapter==='capital'){
      const second=candidate.branches.find(item=>item.id===2);
      const hasOrders=second&&(second.state.locker?.some(Boolean)||second.state.autoLocker?.slots.some(Boolean));
      // Keep the second branch only when it holds orders; otherwise preserve
      // the original single-branch restart behaviour.
      if(hasOrders){
        if(second.status==='over'){second.status='brief';second.runtime=null;second.summary=null;second.paused=false;}
        candidate.branches=[branch,second];
      }else candidate.branches=[branch];
      candidate.activeId=1;
    }
    if(result.campaign.chapter==='village'&&candidate.journeyGuide!=='done')delete candidate.journeyGuide;
    candidate.storyPresentation={type:'retryNotice',penalty:result.penalty,support:result.support+extra,clearedDebt:result.clearedDebt};
  });
  if(retried)interludeMark=null;
}
// ---------- after the story: away shifts ----------
// The player visits an earlier place for one shift. The capital network is
// set aside in memory. Preparation is paid from the real capital before play.
// Shift revenue and local inventory belong to the visited point.
function awayStats(st){return {served:st.served,angry:st.angry,mistakes:st.mistakes,broken:st.broken,sentBack:st.sentBack,
  personal:Math.max(0,st.served-st.byAi-st.byStaff-st.byLocker),checks:G?.awayChecks||0};}
function awayGoals(){
  // Set the venue's target before taking the player's crew or purchases into account.
  const away=NETWORK.away,base=fresh();base.day=AWAY_DAY;
  const config=PptPostgame.tune(storyDayConfig(AWAY_DAY,null,null,base).c,away.level);
  return PptPostgame.goalsFor({location:away.location,level:away.level,trips:away.trips,config});
}
function postgameStart(openHub){
  const c=NETWORK?.campaign;
  if(!c||c.chapter!=='capital'||c.status!=='complete'||NETWORK.away||(NETWORK.storyPresentation&&NETWORK.storyPresentation.type!=='finished'))return;
  if(!campaignCommit(candidate=>{if(!candidate.postgame)candidate.postgame=PptPostgame.create();delete candidate.storyPresentation;}))return;
  if(openHub)showAwayHub();
}
function showAwayHub(){
  if(loadFailed||!NETWORK?.postgame||NETWORK.away||NETWORK.storyPresentation)return;
  branchRuntime.capture();
  showOv(renderAwayHub);
}
function renderAwayHub(){
  const postgame=NETWORK.postgame,rank=PptPostgame.rank(postgame.points);
  return PptPostgameUI.hub({lang,points:postgame.points,trips:postgame.trips,rankIndex:rank.index,nextRank:rank.next,locations:PptPostgame.LOCATIONS,
    busy:NETWORK.branches.some(branch=>branch.status==='play')});
}
function outskirtsState(home){return home.branches.find(branch=>branch.id===1).state;}
function travelUpgradeLevel(home,id){
  if(id==='shoes'||id==='brand')return Math.max(...home.branches.map(branch=>branch.state.up[id]||0));
  return outskirtsState(home).up[id]||0;
}
function packAwayTeam(state,home){
  const source=outskirtsState(home);
  state.up=campaignClone(source.up);
  if(source.fridge.length===6&&state.fridge.length===3)state.fridge.push(null,null,null);
  for(const id of ['shoes','brand']){const level=travelUpgradeLevel(home,id);if(level)state.up[id]=level;}
  state.staff=campaignClone(source.staff);state.perm=campaignClone(source.perm);state.nid=source.nid;
}
function awayManagementAvailable(){
  return !!NETWORK?.away&&!!awayHome&&mode==='brief'&&!loadFailed&&!menuOpen&&!settingsOpen&&!networkPaused&&!externallyPaused()&&!NETWORK.storyPresentation;
}
function renderAwayShop(){
  const content=shopHiringButton(outskirtsState(awayHome),awayHome,'awayTeam')+shopItems(awayHome);
  return PptPostgameUI.management({lang,shop:true,balance:money(awayHome.cash),content});
}
function renderAwayTeam(){
  const home=awayHome,state=outskirtsState(home);
  const content='<p>'+t('slotsTxt',state.staff.length,PptNetwork.staffSlots(state,home))+'</p>'+
    (state.staff.length?state.staff.map(x=>staffCard(x,true,home)).join(''):'<p>'+t('teamEmpty')+'</p>')+
    '<div class="cat">'+t('cands')+'</div>'+state.cands.map(x=>staffCard(x,false,home)).join('');
  return PptPostgameUI.management({lang,shop:false,balance:money(home.cash),content});
}
function openAwayManagement(shop){
  if(!awayManagementAvailable())return;
  const state=outskirtsState(awayHome);
  if(!state.cands.length&&state.staff.length<PptNetwork.staffSlots(state,awayHome)){
    commitAwayPreparation((_home,point)=>{for(let i=0;i<3;i++)point.cands.push(genCand(point));return true;});
    if(loadFailed)return;
  }
  showOv(shop?renderAwayShop:renderAwayTeam);
}
// Stage each purchase against the durable capital. Only publish the new cash,
// staff and equipment after storage confirms the write. The active branch and
// its original summary stay exactly where the player left them.
function commitAwayPreparation(change){
  if(!awayManagementAvailable())return false;
  const candidate=PptSave.decodeGraph(PptSave.encodeGraph(awayHome));
  if(!change(candidate,outskirtsState(candidate)))return false;
  try{PptSave.writeNetwork(campaignStorage(),candidate);}
  catch(error){
    console.error('Travel preparation save failed:',error);
    if(error.saveUncertain){loadFailed=true;showStorageError();}
    saveNoticeKey=error.saveUncertain?'cancelExpansionUncertain':'saveFailed';$('saveNotice').textContent=t(saveNoticeKey);$('saveNotice').hidden=false;return false;
  }
  awayHome=candidate;packAwayTeam(S,candidate);
  hasSave=true;$('saveNotice').hidden=true;syncHud();return true;
}
function applyAwayManagement(action,value){
  if(!awayManagementAvailable()||typeof value!=='string'||(action==='buy')!==(ovFn===renderAwayShop))return;
  const [id,choice]=value.split(':');
  const changed=commitAwayPreparation((home,state)=>{
    if(action==='buy'){
      const item=SHOP.find(it=>it.id===id);if(!item)return false;
      const offer=shopOffer(item,home);
      if(!offer.canBuy||String(offer.level)!==choice)return false;
      PptNetwork.setCash(home,home.cash-offer.price);state.up[id]=offer.level+1;
      if(id==='coldspace')state.fridge.push(null,null,null);
      if(id==='staffroom')PptCampaign.recordStaffRoomPurchase(state,calendarDay(state,home));
      if(id==='locker'&&!state.autoLocker)state.autoLocker=PptCampaignLocker.create();
      guidePurchased(id,home);return true;
    }
    if(action==='hire')return PptNetwork.hire(home,1,Number(id));
    const person=state.staff.find(x=>x.id===Number(id));if(!person)return false;
    if(action==='fire'){state.staff=state.staff.filter(x=>x!==person);return true;}
    if(action==='role'&&['cash','sort','load'].includes(choice)&&person.role!==choice){person.role=choice;return true;}
    if(action==='awayTrain'&&person.spd<5&&String(person.spd)===choice&&home.cash>=wage(person)){
      PptNetwork.setCash(home,home.cash-wage(person));person.spd++;return true;
    }
    return false;
  });
  if(changed)keepCardScroll(()=>openAwayManagement(action==='buy'));
}
function awayBegin(location){
  if(loadFailed||menuOpen||settingsOpen||networkPaused||externallyPaused()||!NETWORK?.postgame||NETWORK.away||NETWORK.storyPresentation||!PptPostgame.LOCATIONS.includes(location))return;
  branchRuntime.capture();
  if(NETWORK.branches.some(branch=>branch.status==='play'))return;
  // The stored capital must equal the one kept in memory before leaving.
  if(!save()||loadFailed)return;
  const home=NETWORK,state=fresh();
  Object.assign(state,{day:AWAY_DAY,evDay:AWAY_DAY,ev:null,cash:0,storyQueueEligible:false});
  packAwayTeam(state,home);
  const network=makeNetwork(state);
  network.campaign=PptPostgame.campaignFor(location);network.journeyGuide='done';
  network.guideSeen=Array.isArray(home.guideSeen)?home.guideSeen.slice():[];
  network.away={location,level:awayLevel,day:calendarDay(outskirtsState(home),home),trips:home.postgame.trips,goals:null,result:null,settled:false};
  awayHome=home;attachNetwork(network);
  NETWORK.away.goals=awayGoals();
  presentBranch();
}
function awaySetLevel(level){
  if(!NETWORK?.away||mode!=='brief'||!PptPostgame.LEVEL_IDS.includes(level))return;
  awayLevel=NETWORK.away.level=level;NETWORK.away.goals=awayGoals();showAwayBrief();
}
function showAwayBrief(){mode='brief';syncHud();
  showOv(()=>{const away=NETWORK.away,rule=PptPostgame.LEVELS[away.level];
    const locked=['robot','ai','locker'].filter(id=>(S.up[id]||0)>0&&campaignTechLocked(id)).map(id=>STR[lang].items[id][0]);
    return PptPostgameUI.brief({lang,location:away.location,level:away.level,levels:PptPostgame.LEVEL_IDS,goals:away.goals,
      team:S.staff.map(person=>nameOf(person)+' ('+STR[lang].roles[person.role][0]+')'),hireLabel:hiringLabel(outskirtsState(awayHome),awayHome),locked,rule,bonusCap:money(rule.cap)});});}
function awayFinish(st,met){
  const away=NETWORK.away,stats=awayStats(st),reward=PptPostgame.reward(away.level,met,Math.max(0,st.revenue));
  away.result={met,progress:PptPostgame.progress(away.goals,stats),points:reward.points,bonus:reward.bonus,served:stats.served,personal:stats.personal,revenue:st.revenue};
  awaySettle();
}
// Idempotent: the reward is written to a copy of the capital network, and
// that copy replaces the kept one only after the storage confirmed it.
function awaySettle(){
  const away=NETWORK?.away;if(!away?.result||!awayHome)return false;
  if(away.settled)return true;
  try{
    const candidate=PptSave.decodeGraph(PptSave.encodeGraph(awayHome));
    candidate.postgame=PptPostgame.settle(candidate.postgame,away.result);
    PptNetwork.setCash(candidate,candidate.cash+away.result.bonus);
    for(const person of outskirtsState(candidate).staff){
      const trained=S.staff.find(worker=>worker.id===person.id);
      if(trained)Object.assign(person,{xp:trained.xp,lvl:trained.lvl,spd:trained.spd,acc:trained.acc});
    }
    PptSave.writeNetwork(campaignStorage(),candidate);
    awayHome=candidate;away.settled=true;hasSave=true;$('saveNotice').hidden=true;return true;
  }catch(error){
    console.error('Away reward save failed:',error);
    if(error.saveUncertain){loadFailed=true;showStorageError();}
    saveNoticeKey=error.saveUncertain?'cancelExpansionUncertain':'saveFailed';$('saveNotice').textContent=t(saveNoticeKey);$('saveNotice').hidden=false;return false;
  }
}
function showAwaySummary(){syncHud();
  showOv(()=>{const away=NETWORK.away,result=away.result,total=awayHome.postgame.points+(away.settled?0:result.points),rank=PptPostgame.rank(total);
    return PptPostgameUI.summary({lang,location:away.location,level:away.level,goals:away.goals,met:result.met,progress:result.progress,served:result.served,personal:result.personal,
      revenue:money(result.revenue),points:result.points,bonus:money(result.bonus),total,rankIndex:rank.index,
      rankUp:rank.index>PptPostgame.rank(total-result.points).index,saved:away.settled,nextDay:calendarDay(outskirtsState(awayHome),awayHome)});});}
function awayReturn(){
  if(loadFailed||!NETWORK?.away?.result)return;
  if(!awaySettle()){if(!loadFailed)showAwaySummary();return;}
  awayLeave(true);
}
// An unfinished shift discards its local play state. Confirmed preparation is already saved.
function awayLeave(toJourney=false){
  const home=awayHome;if(loadFailed||!NETWORK?.away||!home)return false;
  awayHome=null;attachNetwork(home);
  if(toJourney){syncHud();drawHands();showAwayHub();}else presentBranch();
  // The two capital canvases were resized: repaint them now, not a frame later.
  renderBranches();return true;
}
function goalList(goal,met){const g=[t('g1',goal),t('g2'),t('g3')];
  return '<div class="goals">'+g.map((x,i)=>'<div class="goal'+(met&&met[i]?' ok':'')+'"><span class="st">★</span>'+x+'</div>').join('')+'</div>';}
function showLang(){showOv(()=>'<div class="stripe"></div><h1>'+t('title')+'</h1><p class="tag">'+STR.ru.pick+'</p><div class="row"><button class="btn" data-a="lang" data-v="ru">Русский</button><button class="btn" data-a="lang" data-v="en">English</button></div>');}
function showMenu(){menuOpen=true;syncHud();showOv(()=>PptStartMenu.render({lang,hasSave}));}
function branchPreparation(branch){
  if(NETWORK.away)return null;
  const state=branch.state,day=state.day;
  if(guideChoicePending(state))return 'guide';
  if(day>=8&&(state.cardDay!==day||!state.card))return 'card';
  if(day>=8&&(day-1)%7===0&&!(state.contract&&state.contract.start===day))return 'contract';
  return null;
}
function networkReadiness(){branchRuntime.capture();return PptNetwork.shiftReadiness(NETWORK,branchPreparation);}
function startNetworkDay(){
  if(loadFailed||externallyPaused()||NETWORK.storyPresentation)return false;
  if(showTownWork())return false;
  if(showVillageHouseStory(true))return false;
  if(showVillageWork())return false;
  branchRuntime.capture();
  const c=NETWORK.campaign,capitalTip=c?.chapter==='capital'&&c.status==='active'&&c.capitalProgress.aiIntroduced&&
    c.shifts-c.capitalProgress.lastAiTipShift>=CITY_AI_TIP_INTERVAL;
  // Advice is a network-wide event. If the player stays at the centre,
  // return to the first branch before starting another synchronized shift.
  if(capitalTip&&NETWORK.activeId!==1){selectBranch(1);return false;}
  if(capitalTip&&campaignInterlude())return false;
  const pendingStory=NETWORK.branches.find(branch=>branch.id===1&&branch.status==='summary'&&[0,1].includes(branch.summary?.storyQueueStep));
  if(pendingStory){selectBranch(1);return false;}
  const readiness=networkReadiness();
  if(!readiness.ready){
    if(mode==='play'||mode==='over'||readiness.reason==='closed')return false;
    if(readiness.reason==='staff'&&readiness.branch?.id===NETWORK.activeId)showTeam();else showBrief();return false;
  }
  for(const branch of readiness.branches)branchRuntime.run(branch,()=>newDay(true),{ui:false});
  save();fit();presentBranch();return true;
}
function tickNetwork(dt){
  if(!Number.isFinite(dt)||dt<0)throw new TypeError('Invalid frame delta');
  if(externallyPaused())return 0;
  branchRuntime.capture();
  if(menuOpen||settingsOpen||networkPaused||NETWORK.storyPresentation||NETWORK.branches.some(branch=>branch.status==='play'&&branch.paused))return 0;
  // A visible story scene pauses the entire live network without changing the
  // player's manual pause; switching away or finishing it resumes normally.
  if(mode==='summary'&&[0,1].includes(sumData?.storyQueueStep))return 0;
  const pendingLive=NETWORK.branches.find(branch=>branch.id===1&&branch.status==='play'&&branch.runtime?.storyLive);
  if(pendingLive&&NETWORK.activeId!==1){selectBranch(1);return 0;}
  // Once the cinematic takes control, suspend all real gameplay while it runs.
  // Its timer uses the normal pause/visibility gate and survives saved runtime.
  if(mode==='play'&&G?.storyLive&&branchRuntime.current()?.id===1){update(dt);branchRuntime.capture();return 1;}
  const live=NETWORK.branches.filter(branch=>branch.status==='play');
  if(!live.length)return 0;
  for(const branch of live)branch.runtime.time=DAY-branch.runtime.clock;
  // Legacy saves may have two live shifts at different clocks. Let the slower
  // simulation catch up while the faster one waits; never skip its events.
  const maxClock=Math.max(...live.map(branch=>branch.runtime.clock));
  const lagging=live.filter(branch=>maxClock-branch.runtime.clock>1e-8);
  const targets=lagging.length?lagging:live;
  const before=live.map(branch=>branch.status),storyBefore=!!NETWORK.branches.find(branch=>branch.id===1)?.runtime?.storyLive;
  networkBatch=true;
  try{for(const branch of targets){
    const delta=lagging.length?Math.min(dt,maxClock-branch.runtime.clock):dt;
    branchRuntime.run(branch,()=>update(delta),{ui:branch.id===NETWORK.activeId});
  }}finally{networkBatch=false;}
  if(lagging.length)for(const branch of lagging)if(branch.status==='play'&&maxClock-branch.runtime.clock>0&&maxClock-branch.runtime.clock<=1e-8){
    branch.runtime.clock=maxClock;branch.runtime.time=DAY-maxClock;
  }
  const changed=live.some((branch,i)=>branch.status!==before[i]);
  const storyStarted=!storyBefore&&!!NETWORK.branches.find(branch=>branch.id===1)?.runtime?.storyLive;
  if(changed||storyStarted||lockerSettlementDirty){
    const saved=save();if(saved)lockerSettlementDirty=false;
    if(!loadFailed){if(storyStarted&&NETWORK.activeId!==1)selectBranch(1);else if(changed)presentBranch();}
  }
  return targets.length;
}
function showBrief(){if(NETWORK.away){showAwayBrief();return;}if(showTownWork()||showVillageHouseStory(true)||campaignInterlude())return;mode='brief';if(showVillageWork())return;if(S.evDay!==S.day){S.ev=pickEvent(S.day);S.evDay=S.day;save();}
  PptNetwork.ensureSetupCandidates(S);
  if(needCard()&&S.cardDay!==S.day){S.cardOpts=shuffle(cardPool()).slice(0,3);S.cardDay=S.day;S.card=null;save();}
  if(needCtr()&&S.ctrDay!==S.day){S.ctrOpts=shuffle(CTRS.filter(id=>id!=='fragile')).slice(0,lv('gloves')?3:2);if(!lv('gloves'))S.ctrOpts.push('fragile');S.ctrDay=S.day;save();}
  syncHud();
  showOv(()=>{const ev=S.ev,chapter=NETWORK?.campaign?.chapter,city=chapter==='city',later=city||chapter==='capital',newsDay=later?storyDifficultyDay(S.day):S.day,rawNews=STR[lang].news[newsDay]||'',n=firstDayLocked()&&S.day===2?(lang==='ru'?'Новая форма: треугольник.':'New shape: triangle.'):NETWORK.campaign&&!later&&S.day===6?(lang==='ru'?'Новая форма: звезда. Хрупкие посылки разбиваются на полу и в неправильной ячейке.':'New shape: star. Fragile parcels break on the floor and in the wrong slot.'):(NETWORK.campaign&&!later&&S.day===10)||(campaignBloggerLocked()&&S.day===9)||(city&&newsDay===9&&!NETWORK.campaign.cityProgress.bloggerVisited)||(later&&[6,10].includes(newsDay)&&!(S.up.ai>0))||(NETWORK.campaign&&[21,23,26].includes(newsDay))||(campaignTechLocked('robot')&&[21,23,25].includes(S.day))?'':rawNews;const goal=dayConfig(S.day,ev,S.card,S).c.goal;
    const eventGuide=guideEventPanel(ev);
    const choiceIntro=guideChoicePending(S),disabled=choiceIntro?' disabled':'';
    const aiQuest=NETWORK?.campaign?.chapter==='city'&&NETWORK.campaign.cityProgress.technologySeen&&!(S.up.ai>0);
    let h='<p class="tag">'+t('day',calendarDay())+'</p><h2>'+(ev?t(ev):t('normal'))+'</h2>'+villageBrief();
    h+=cityCourierButton();
    if(cityFreight()&&!S.xlDeliverySeen)h+='<p class="lvup">'+(lang==='ru'?'Первая XL-поставка. Освободите руки и отнесите большую коробку в секцию её цвета справа.':'First XL delivery. Empty your hands and carry the large parcel to its colour on the right.')+'</p>';
    else if(cityColdFreight()&&!S.coldDeliverySeen)h+='<p class="lvup">'+(lang==='ru'?'Первая холодная поставка. После выгрузки у коробки со снежинкой 30 секунд до порчи. Холодильник слева, мест: ':'First cold delivery. A snowflake parcel has 30 seconds outside the fridge after unloading. Fridge slots on the left: ')+S.fridge.length+'</p>';
    if(activeTownHome())h+=PptTownUI.canvas(activeTownHome().choices,'townBriefArt')+'<p class="networkHelp">'+(lang==='ru'?'Собственное помещение · аренда $0 · содержание $':'Owned premises · rent $0 · upkeep $')+PptTownRenovation.upkeep+'</p>';
    if(aiQuest)h+='<div class="lvup cityAiQuest">'+(lang==='ru'?'Задание: получить ИИ-помощника. Его можно купить в магазине.':'Quest: get an AI assistant. You can buy it in the shop.')+'<button class="btn sec" data-a="shop">'+(lang==='ru'?'Открыть магазин':'Open shop')+'</button></div>';
    h+=(choiceIntro?guideChoicePanel(choiceIntro):'')+(eventGuide||'<p>'+(ev?eventDescription(ev):t('normalD'))+'</p>')+(n?'<p><b>'+n+'</b></p>':'');
    if(needCtr()){h+='<div class="cat">'+t('ctrT')+'</div><small style="color:var(--muted)">'+t('ctrHint')+'</small>'+S.ctrOpts.map(id=>{const x=ctrText(id,S.day);return '<button type="button" class="pick" data-a="ctr" data-v="'+id+'"'+disabled+'><b>'+x.name+'</b>'+x.desc+'<small>'+x.reward+'</small></button>';}).join('');}
    else if(S.contract&&S.contract.state==='active'){const x=ctrText(S.contract.id,S.contract.start,S.contract.target);h+='<div class="lvup" style="color:var(--accent)">'+t('ctrProg',x.name,fmtNum(S.contract.prog)+'/'+fmtNum(S.contract.target))+' · '+x.desc+'</div>';}
    if(needCard()){h+='<div class="cat">'+t('cardT')+'</div><small style="color:var(--muted)">'+t('cardHint')+'</small>'+S.cardOpts.map(id=>{const x=STR[lang].cards[id];return '<button type="button" class="pick'+(S.card===id?' on':'')+'" data-a="card" data-v="'+id+'"'+disabled+'><b>'+x[0]+'</b><small>'+x[1]+'</small></button>';}).join('');}
    const staffReady=PptNetwork.readyForFirstShift(branchRuntime.current()),readiness=networkReadiness(),ready=readiness.ready;
    let wait='';
    if(choiceIntro)wait='<small style="color:var(--muted)">'+(lang==='ru'?'Сначала прочитай подсказку рассказчика.':'Read the narrator’s tip first.')+'</small>';
    else if(!staffReady)wait=setupHelp();
    else if((needCard()&&!S.card)||needCtr())wait='<small style="color:var(--muted)">'+t('pickFirst')+'</small>';
    else if(!ready&&readiness.branch){
      wait='<p class="networkHelp">'+t(readiness.reason==='running'?'networkWaitRunning':'networkWaitPrepare',readiness.branch.id)+'</p>';
      if(readiness.branch.id!==NETWORK.activeId)wait+='<button class="btn sec" data-a="prepareBranch" data-v="'+readiness.branch.id+'">'+t('networkGoBranch',readiness.branch.id)+'</button>';
    }
    return h+(firstDayLocked()?'':'<div class="cat">'+t('goals')+'</div>'+goalList(goal,null))+wait+campaignMapButton()+'<button class="btn" data-a="start"'+(ready?'':' disabled')+'>'+t('start')+'</button>';});}
function showPause(){
  if(NETWORK.away&&mode==='play'&&G){
    showOv(()=>PptPostgameUI.progressScreen({lang,...NETWORK.away,progress:PptPostgame.progress(NETWORK.away.goals,awayStats(G.st))}));
    return;
  }
  showOv(()=>'<h2>'+(networkPaused?(lang==='ru'?'Пауза сети':'Network paused'):t('paused'))+'</h2><button class="btn" data-a="resume">'+t('resume')+'</button>'+(NETWORK.away?'<button class="btn sec" data-a="awayAbort">'+PptPostgameUI.words(lang).abortYes+'</button>':'')+'<button class="btn sec" data-a="menu">'+t('menu')+'</button>');
}
function money(v){return (v<0?'−$':'$')+fmtNum(Math.abs(v));}
function line2(label,val,cls){return '<span>'+label+'</span><span class="v'+(cls?' '+cls:'')+'">'+val+'</span>';}
function contractResultText(result){
  if(!result)return '';
  if(typeof result==='string')return esc(result);
  const tx=STR[lang].ctrs[result.id],name=tx[0];
  return result.outcome==='done'?t('ctrDone',name,formatText(tx[2],[undefined,result.cash]))
    :result.outcome==='fail'?t('ctrFail',name):t('ctrProg',name,fmtNum(result.progress)+'/'+fmtNum(result.target));
}
// Older saves stored translated messages. Recover their parameters once on load;
// this migration only changes presentation and never calls settlement rules.
function normalizeSummary(d){
  if(!d)return;
  // A stored summary is shown on screen. The game writes numbers there; a
  // save edited or damaged outside the game must not put anything else on
  // the page. A valid summary passes through unchanged.
  const number=value=>typeof value==='number'&&Number.isFinite(value);
  if(!number(d.rating)||d.rating<1||d.rating>5)delete d.rating;
  if(d.st&&typeof d.st==='object')for(const key of Object.keys(d.st))if(!number(d.st[key]))d.st[key]=0;
  for(const key of ['bonus','rent','wages','net','goal','nStars','upkeep','gardenSales','styleSet','instalment','debt','contractCash','cardExpense'])if(key in d&&!number(d[key]))d[key]=0;
  d.lvUps=(d.lvUps||[]).map(value=>{
    if(typeof value!=='string')return value;
    for(const source of ['ru','en'])for(let n=0;n<NAMES[source].length;n++)for(let lvl=1;lvl<=5;lvl++)
      if(value===STR[source].lvUp.replace('{0}',NAMES[source][n]).replace('{1}',lvl))return {n,lvl};
    return value;
  }).filter(value=>typeof value==='string'||(value&&Number.isInteger(value.n)&&value.n>=0&&value.n<NAMES.ru.length&&Number.isInteger(value.lvl)&&value.lvl>=1&&value.lvl<=5));
  if(d.ctrMsg&&typeof d.ctrMsg==='object'){
    if(!CTRS.includes(d.ctrMsg.id))d.ctrMsg=null;
    else for(const key of ['progress','target','cash'])if(key in d.ctrMsg&&!number(d.ctrMsg[key]))d.ctrMsg[key]=0;
  }
  if(typeof d.ctrMsg!=='string')return;
  for(const source of ['ru','en'])for(const id of CTRS){
    const dict=STR[source],name=dict.ctrs[id][0];
    for(const [key,outcome] of [['ctrDone','done'],['ctrFail','fail'],['ctrProg','progress']]){
      const [before,after='']=dict[key].replace('{0}',name).split('{1}');
      if(!d.ctrMsg.startsWith(before)||!d.ctrMsg.endsWith(after))continue;
      const value=d.ctrMsg.slice(before.length,after?-after.length:undefined);
      if(key==='ctrFail'&&value)continue;
      const result={id,outcome,cash:Number(value.replace(/[^0-9]/g,''))||0};
      if(outcome==='progress'){
        const [progress,target]=value.split('/').map(Number);
        if(!Number.isFinite(progress)||!Number.isFinite(target))continue;
        Object.assign(result,{progress,target});
      }
      d.ctrMsg=result;return;
    }
  }
}
function normalizeFloat(value){
  if(typeof value!=='string')return value;
  if(/^\+\$\d+$/.test(value))return message('earnedCash',Number(value.slice(2)));
  for(const source of ['ru','en'])for(const [key,template] of Object.entries(STR[source])){
    if(!/^f[A-Z]/.test(key)||typeof template!=='string')continue;
    if(value===template)return message(key);
    if(!template.includes('{0}'))continue;
    const [before,after]=template.split('{0}');
    if(!value.startsWith(before)||!value.endsWith(after))continue;
    const param=value.slice(before.length,after?-after.length:undefined);
    if(key==='fMisplace'){
      const n=NAMES[source].indexOf(param);if(n>=0)return message(key,{staffName:n});
    }else if(key==='fCombo'||key==='fBack'){
      const number=Number(param.replace(',','.'));if(Number.isFinite(number))return message(key,number);
    }
  }
  return value;
}
function showStoryQueue(){showOv(()=>{
  const first=sumData.storyQueueStep===0;
  const safe=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const speaker=t(first?'guideNarrator':'storyHelperName'),text=t(first?'storyRushText':'storyHelpText');
  const picture=first?'<div class="storyQueuePeople"><img class="storyQueueCrowd" src="assets/campaign/sad-crowd-village-20261111.webp" alt=""></div><img class="storyNarrator" src="assets/campaign/narrator-portrait.webp" alt="">':'<div class="storyHelperPortrait"><picture><img src="assets/campaign/maya-portrait.webp" alt=""></picture></div>';
  return '<section class="campaignScreen campaignDialogue" role="dialog" aria-modal="true" aria-label="'+safe(speaker)+'"><div class="campaignDialogue__scene campaignDialogue__scene--village '+(first?'storyQueue':'storyHelper')+'"><div class="campaignDialogue__tools"><button type="button" data-a="dialogueLanguage" class="campaignDialogue__tool" aria-label="'+(lang==='ru'?'Сменить язык':'Change language')+'">'+(lang==='ru'?'EN':'RU')+'</button><button type="button" data-a="dialoguePause" class="campaignDialogue__tool" aria-label="'+(lang==='ru'?'Пауза':'Pause')+'">Ⅱ</button></div>'+picture+'</div><div class="campaignDialogue__box"><strong class="campaignDialogue__speaker">'+safe(speaker)+'</strong><p class="campaignDialogue__text" data-dialogue-text="true" aria-label="'+safe(text)+'">'+safe(text)+'</p><div class="campaignDialogue__actions"><button type="button" class="campaignButton campaignButton--next" data-a="storyQueueNext">'+safe(t(first?'storyNext':'storyResults'))+'</button></div></div></section>';
});}
function showSummary(){if(NETWORK.away){showAwaySummary();return;}if(!journeyNormalizeEarly())return;if(sumData&&[0,1].includes(sumData.storyQueueStep)){showStoryQueue();return;}
  if(NETWORK?.campaign?.chapter==='village'&&sumData?.storyQueueStep===2&&S.day===3&&NETWORK.journeyGuide===undefined){if(!journeySet('map'))return;}
  if(NETWORK?.journeyGuide==='earn'&&NETWORK.campaign?.chapter==='village'){if(!journeySet('shop'))return;}
  if(NETWORK?.journeyGuide==='map_view'){showCampaignMap();return;}
  if(!networkBatch&&showTownWork())return;
  if(!networkBatch&&(showVillageHouseStory()||(!NETWORK.villageHome&&showVillageWork())))return;
  syncHud();showOv(()=>{const d=sumData,s=d.st;
  return '<div class="summaryBody"><p class="tag">'+t('day',displayedDay(S,mode,d))+'</p><h2>'+t('sum')+'</h2>'+(firstDayLocked()?'':'<div class="bigstars">'+[0,1,2].map(i=>i<d.nStars?'<b>★</b>':'★').join('')+'</div>'+goalList(d.goal,d.met))+'<div class="rows">'+
  line2(t('served'),s.served)+(s.byAi?line2(t('byAi'),s.byAi):'')+(s.byStaff?line2(t('byStaff'),s.byStaff):'')+(s.byLocker?line2(t('byLocker'),s.byLocker):'')+line2(t('angry'),s.angry)+line2(t('mistakes'),s.mistakes)+(s.broken?line2(t('broken'),s.broken):'')+(s.spoiled?line2(t('spoiled'),s.spoiled):'')+(s.sentBack?line2(t('sentBack'),s.sentBack):'')+
  line2(t('revenue'),'+'+money(s.revenue),'pos')+(s.refunds?line2(t('refunds'),'−'+money(s.refunds),'neg'):'')+(s.penalties?line2(t('penalties'),'−'+money(s.penalties),'neg'):'')+
  (d.bonus?line2(t('starBonus'),'+'+money(d.bonus),'pos'):'')+line2(t('rent'),d.rent?'−'+money(d.rent):money(0),d.rent?'neg':'')+
  (d.upkeep?line2(lang==='ru'?'Содержание дома':'House upkeep','−'+money(d.upkeep),'neg'):'')+
  (d.gardenSales?line2(lang==='ru'?'Лавка варенья':'Jam stall','+'+money(d.gardenSales),'pos'):'')+
  (d.styleSet?line2(lang==='ru'?'Дом в одном стиле':'Matching style','+'+money(d.styleSet),'pos'):'')+
  (d.contractCash?line2(lang==='ru'?'Награда за контракт':'Contract reward','+'+money(d.contractCash),'pos'):'')+
  (d.cardExpense?line2(lang==='ru'?'Кофе по карте дня':'Day card coffee','−'+money(d.cardExpense),'neg'):'')+
  (d.wages?line2(t('wages'),'−'+money(d.wages),'neg'):'')+
  (d.instalment?line2(lang==='ru'?'Взнос за дом':'House instalment','−'+money(d.instalment),'neg'):'')+
  (d.debt?line2(lang==='ru'?'Остаток рассрочки':'Remaining house debt',money(d.debt)):'')+
  '<span class="tot">'+t('net')+'</span><span class="v tot '+(d.net<0?'neg':'pos')+'">'+money(d.net)+'</span>'+(d.adReward?line2(lang==='ru'?'Бонус за рекламу':'Ad bonus','+'+money(d.adReward),'pos'):'')+line2(t('cash'),money(S.cash))+'<span>'+t('rating')+'</span><span class="v" style="color:var(--gold)">★'+displayedRating(d.rating??stars())+'</span></div>'+(d.lowWarn?'<div class="lvup" style="color:var(--bad)">'+t('lowWarn')+'</div>':'')+(d.ctrMsg?'<div class="lvup" style="color:var(--accent)">'+contractResultText(d.ctrMsg)+'</div>':'')+(d.lvUps.length?'<div class="lvup">'+d.lvUps.map(x=>typeof x==='string'?esc(x):t('lvUp',NAMES[lang][x.n],x.lvl)).join('<br>')+'</div>':'')+'</div>'+(firstDayLocked()?'<button class="btn" data-a="firstDayNext">'+(lang==='ru'?'Далее':'Next')+'</button>':journeySummaryActions());},sumData);}
function journeySummaryActions(){
  const stage=NETWORK?.journeyGuide,ru=lang==='ru',map=campaignMapButton(),shop='<button class="btn" data-a="shop">'+t('toShop')+'</button>';
  if(stage==='map')return '<div class="journeyGuideSticky">'+journeyPanel(ru?'Посмотрим, что нужно сделать для переезда. Открой карту и цели.':'Let’s see what it takes to move on. Open the map and goals.')+journeyHighlight(map,'campaignMap')+'</div>';
  if(stage==='shop')return '<div class="journeyGuideSticky">'+journeyPanel(ru?'Теперь найдём помощника для разгрузки. Открой магазин.':'Now let’s find someone to unload deliveries. Open the shop.')+journeyHighlight(shop,'shop')+'</div>';
  return vkAdButton()+'<div class="summaryActions">'+villageWorkButton()+cityCourierButton()+map+shop+'</div>';
}
// VK rewarded advert: one per shift summary, only on the player's press. The
// bonus is a share of the shift's revenue and is written into the summary,
// so a reload or a second press can never pay it twice.
const AD_REWARD_SHARE=.2,AD_REWARD_MIN=20;
const adRewardAmount=summary=>Math.max(AD_REWARD_MIN,Math.round((summary?.st?.revenue||0)*AD_REWARD_SHARE/5)*5);
function vkAdButton(){
  if(!vkRuntime||NETWORK?.away||NETWORK?.storyPresentation||journeyGuideActive()||!sumData||sumData.adReward!==undefined||firstDayLocked())return '';
  const state=vkRuntime.adState(),ru=lang==='ru';
  if(state==='showing')return '<button class="btn sec vkAd" disabled>'+(ru?'Реклама загружается…':'Loading the ad…')+'</button>';
  if(state!=='ready')return '';
  return '<button class="btn sec vkAd" data-a="vkAd">'+(ru?'▶ Смотреть рекламу: +':'▶ Watch an ad: +')+money(adRewardAmount(sumData))+'</button>';
}
// VK: the player presses the button and then agrees, seeing the bonus by name.
function confirmVkAd(){
  if(!vkRuntime||mode!=='summary'||!sumData||sumData.adReward!==undefined||vkRuntime.adState()!=='ready')return;
  const amount=money(adRewardAmount(sumData));
  showOv(()=>'<h2>'+(lang==='ru'?'Посмотреть рекламу?':'Watch an ad?')+'</h2><p>'+(lang==='ru'?'За просмотр рекламы вы получите '+amount+' в кассу.':'You get '+amount+' for watching an ad.')+'</p><button class="btn" data-a="vkAdGo">'+(lang==='ru'?'Смотреть':'Watch')+'</button><button class="btn sec" data-a="vkAdNo">'+(lang==='ru'?'Не сейчас':'Not now')+'</button>');
}
function showVkAd(){
  const summary=sumData,state=S;
  if(!vkRuntime||mode!=='summary'||!summary||summary.adReward!==undefined||vkRuntime.adState()!=='ready')return;
  const amount=adRewardAmount(summary);
  vkRuntime.showRewardAd().then(shown=>{
    if(!shown||loadFailed||summary.adReward!==undefined)return;
    summary.adReward=amount;state.cash+=amount;
    save();uiCue('shift');
  }).finally(()=>{if(mode==='summary'&&!menuOpen&&!ov.hidden)rerenderOv();else syncHud();});
  rerenderOv();
}
const saleOn=(state=S,network=NETWORK)=>state.saleDay&&state.saleDay===calendarDay(state,network)-1;
const priceOf=(it,l,state=S,network=NETWORK)=>Math.round(it.p[l]*(saleOn(state,network)?.75:1));
// Narrator hints are acknowledged explicitly, once per network rather than per
// branch. Old saves without this optional field begin with an empty set.
function guideSeen(key){return Array.isArray(NETWORK?.guideSeen)&&NETWORK.guideSeen.includes(key);}
function guideItemId(key){return /^upgrade:([a-z0-9]+):[1-5]$/.exec(key)?.[1]||null;}
function guideItemSeen(id){return Array.isArray(NETWORK?.guideSeen)&&NETWORK.guideSeen.some(key=>guideItemId(key)===id);}
function guidePurchased(id,network=NETWORK){
  // Buying an item means the player no longer needs its first-time lesson.
  // Keep the existing on-disk key format for old saves and other branches.
  if(!Array.isArray(network.guideSeen))network.guideSeen=[];
  if(!network.guideSeen.some(key=>guideItemId(key)===id))network.guideSeen.push('upgrade:'+id+':1');
  if(Array.isArray(network.guidePending))network.guidePending=network.guidePending.filter(key=>guideItemId(key)!==id);
}
function guideAck(key){
  if(!NETWORK||guideSeen(key))return false;
  const previousSeen=NETWORK.guideSeen,previousPending=NETWORK.guidePending;
  if(!Array.isArray(NETWORK.guideSeen))NETWORK.guideSeen=[];
  else NETWORK.guideSeen=NETWORK.guideSeen.slice();
  NETWORK.guideSeen.push(key);
  if(Array.isArray(NETWORK.guidePending))NETWORK.guidePending=NETWORK.guidePending.filter(item=>guideItemId(key)?guideItemId(item)!==guideItemId(key):item!==key);
  if(save())return true;
  if(previousSeen===undefined)delete NETWORK.guideSeen;else NETWORK.guideSeen=previousSeen;
  if(previousPending===undefined)delete NETWORK.guidePending;else NETWORK.guidePending=previousPending;
  return false;
}
function guideDiscover(){
  if(!NETWORK||!branchRuntime?.canPresent())return;
  const previous=NETWORK.guidePending,original=Array.isArray(previous)?previous:[],previousSeen=NETWORK.guideSeen,seen=Array.isArray(previousSeen)?previousSeen.slice():[],ids=new Set();
  // Migrate purchases in older saves to the once-per-type acknowledgement.
  const seenItem=id=>seen.some(key=>guideItemId(key)===id);
  for(const it of SHOP)if((S.up[it.id]||0)>0&&!seenItem(it.id))seen.push('upgrade:'+it.id+':1');
  // The waiting area has one lesson, under its first step; any step known from
  // an older save counts as the lesson read.
  if(WAITING.some(it=>seenItem(it.id))&&!seenItem(WAITING[0].id))seen.push('upgrade:'+WAITING[0].id+':1');
  // Older versions queued additional levels. Discard those and already-bought
  // types without changing the saved acknowledgement format.
  const pending=original.filter(key=>{const id=guideItemId(key),it=SHOP.find(item=>item.id===id);
    if(!it||it.part&&it!==WAITING[0]||campaignTechLocked(id)||key!=='upgrade:'+id+':1'||lv(id)>0||seenItem(id)||ids.has(id))return false;ids.add(id);return true;});
  for(const it of SHOP){if(it.part&&it!==WAITING[0]||shopOffer(it).lock)continue;const key='upgrade:'+it.id+':1';
    if(lv(it.id)===0&&(calendarDay()>=it.d||(it.id==='locker'&&storyLockerAvailable()))&&(!it.req||lv(it.req))&&!seenItem(it.id)&&!ids.has(it.id)){pending.push(key);ids.add(it.id);}}
  if(JSON.stringify(pending)!==JSON.stringify(original)||JSON.stringify(seen)!==JSON.stringify(Array.isArray(previousSeen)?previousSeen:[])){
    NETWORK.guidePending=pending;NETWORK.guideSeen=seen;
    if(!save()){if(previous===undefined)delete NETWORK.guidePending;else NETWORK.guidePending=previous;if(previousSeen===undefined)delete NETWORK.guideSeen;else NETWORK.guideSeen=previousSeen;}
  }
}
function guideUpgrade(){
  for(const key of NETWORK?.guidePending||[]){
    const id=guideItemId(key),it=SHOP.find(item=>item.id===id);
    if(it&&!shopOffer(it).lock&&key==='upgrade:'+id+':1'&&lv(id)===0&&(calendarDay()>=it.d||(id==='locker'&&storyLockerAvailable()))&&(!it.req||lv(it.req))&&!guideItemSeen(id))return {it,key};
  }
  return null;
}
const GUIDE_EXPLANATIONS={
  ru:{
    scanner:'Возьми коробку: голубая рамка покажет, куда её отнести. Красная рамка означает, что место заполнено.',
    xlcart:'Если носишь много больших коробок, с этой тележкой дорога от грузовика до стеллажа займёт меньше времени.',
    coldspace:'Когда верхний ряд заполнен, второй ряд даст место ещё трём заказам со снежинкой.',
    shoes:'В них будет легче успевать между грузовиком, полками и клиентами.',
    cart:'С тележкой за один поход можно перенести больше посылок.',
    staffroom:'Появится место ещё для одного сотрудника; нанять его нужно отдельно.',
    queue:'У окна смогут ждать больше людей, но их терпение всё равно тратится.',
    shelves:'В каждой ячейке поместится больше посылок, и склад не заполнится так быстро.',
    conveyor:'Грузовик начнёт сам выгружать посылки на пол, пока там есть место.',
    returns:'Возвраты больше не придётся убирать вручную: за ночь стойка очистится.',
    warehouse:'Появится дополнительное окно, а куча возвратов будет меньше мешать ходить.',
    locker:'Можно заранее загрузить посылку: клиент с одним заказом заберёт её сам.',
    robot:'Он поможет разложить посылки с пола и грузовика по полкам.',
    tune:'С этим улучшением робот будет быстрее разбирать посылки.',
    ai:'Помощник возьмёт на себя выдачу в отдельном окне и разгрузит очередь.',
    brand:'Пункт станет узнаваемее и будет получать больше за каждую выданную посылку.',
    cooler:'Здесь появятся кулер, потом кофемашина и телевизор: с каждым шагом посетители спокойнее ждут своей очереди.'
  },
  en:{
    scanner:'Pick up a parcel and follow the blue outline. A red outline means its destination is full.',
    xlcart:'This trolley saves time on the walk from the truck to the XL rack when carrying a heavy parcel.',
    coldspace:'When the top row fills up, a second row keeps three more snowflake orders cold.',
    shoes:'These help you get between the truck, shelves and customers faster.',
    cart:'A trolley lets you carry more packages on each trip.',
    staffroom:'This opens another team slot; you still need to hire someone for it.',
    queue:'More people can wait at each window, though everyone still loses patience.',
    shelves:'Each slot holds more packages, so the shelves fill up less quickly.',
    conveyor:'The truck will unload packages onto the floor while there is room.',
    returns:'The returns pile will clear overnight, saving you a cleanup job.',
    warehouse:'You get another service window, and the returns pile slows you down less.',
    locker:'Load a package in advance and a customer with one order can collect it.',
    robot:'It helps put away packages from the floor and truck.',
    tune:'This helps your robot put packages away faster.',
    ai:'The assistant handles a service window and helps take pressure off the queue.',
    brand:'A better-known pickup point earns more for every package handed out.',
    cooler:'A water cooler comes first, then a coffee machine and a TV: each step helps visitors wait more calmly.'
  }
};
function guideNarratorHeader(){
  return '<div class="guideNarratorHeader"><img class="guideNarratorPortrait" src="assets/campaign/narrator-portrait.webp" alt="" decoding="async"><b>'+t('guideNarrator')+'</b></div>';
}
function guideItemPanel(hint){
  if(!hint)return '';
  const name=STR[lang].items[hint.it.part||hint.it.id][0],explanation=hint.it.id==='locker'&&storyLockerAvailable()?storyLockerExplanation():GUIDE_EXPLANATIONS[lang]?.[hint.it.id]||STR[lang].items[hint.it.id][1];
  // The first lesson introduces the narrator's role; after an upgrade has
  // been acknowledged (or already purchased in an older save), get straight
  // to the item's name and its useful explanation.
  const introduced=Array.isArray(NETWORK?.guideSeen)&&NETWORK.guideSeen.some(key=>guideItemId(key));
  const lead=introduced?'<b>'+name+':</b> ':t('guideUpgrade',name)+' ';
  return '<section class="guidePanel guidePulse" role="region" aria-label="'+t('guideNarrator')+'">'+guideNarratorHeader()+'<p>'+lead+explanation+'</p><button type="button" class="guideAck" data-a="guideUpgrade" data-v="'+hint.key+'">'+t('guideUnderstood')+'</button></section>';
}
// Story chapters without automation use the softened rush; describe what the player will actually meet.
function eventDescription(ev){return ev==='bf'&&campaignTechLocked('robot')?t('bfDStory'):t(ev+'D');}
function guideEventPanel(ev){
  if(!ev||guideSeen('event:'+ev))return '';
  return '<section class="guidePanel guidePulse" role="region" aria-label="'+t('guideNarrator')+'">'+guideNarratorHeader()+'<p>'+t('guideEvent',t(ev))+' '+eventDescription(ev)+'</p><button type="button" class="guideAck" data-a="guideEvent" data-v="'+ev+'">'+t('guideUnderstood')+'</button></section>';
}
function guideChoicePending(state){
  if(NETWORK?.away)return null;
  const day=state?.day||0,contractAvailable=day>=8&&((day-1)%7===0&&!(state.contract&&state.contract.start===day)||state.contract?.state==='active');
  if(contractAvailable&&!guideSeen('intro:contract'))return 'contract';
  if(day>=8&&!guideSeen('intro:card'))return 'card';
  return null;
}
function guideChoicePanel(kind){
  if(guideSeen('intro:'+kind))return '';
  const text=kind==='contract'
    ?(lang==='ru'?'Контракт — задача на семь дней. Если получишь несколько предложений, выбери одно: у каждого свои условия и награда. Выполни условия в срок, чтобы получить награду; при провале её не будет.':'A contract is a seven-day challenge. When offered a choice, pick one and check its conditions and reward. Meet the conditions in time to earn the reward; a failed contract pays nothing.')
    :(lang==='ru'?'Перед сменой выбери одну карту дня из трёх. Она меняет условия только на эту смену. У бонусов бывают и минусы, поэтому прочитай описание перед выбором.':'Before each shift, pick one of three day cards. It changes the rules for this shift only. Bonuses can have drawbacks, so read the description before choosing.');
  return '<section class="guidePanel guidePulse" role="region" aria-label="'+t('guideNarrator')+'">'+guideNarratorHeader()+'<p>'+text+'</p><button type="button" class="guideAck" data-a="guideChoice" data-v="'+kind+'">'+t('guideUnderstood')+'</button></section>';
}
function shopOffer(it,home){
  const state=home?outskirtsState(home):S,level=it.id==='coldspace'&&state.fridge.length===6?1:home?travelUpgradeLevel(home,it.id):lv(it.id);
  let day=level>=1&&it.d2?it.d2:it.d,lock=null;
  if(it.id==='staffroom')day=PptCampaign.staffRoomUnlockDay(state,it.d);
  if(it.id==='locker'&&storyLockerAvailable())day=1;
  if(it.id==='coldspace'&&!(home?home.campaign?.chapter==='capital':fridgeOn()))lock='freight';
  else if(it.id==='xlcart'&&!(home?home.campaign?.chapter==='capital':bigOn()))lock='freight';
  else if(campaignTechLocked(it.id))lock='place';
  else if(level>=it.p.length)lock='owned';
  else if(calendarDay(state,home||NETWORK)<day)lock='day';
  else if(it.req&&!(home?travelUpgradeLevel(home,it.req):lv(it.req)))lock='robot';
  const price=level<it.p.length?priceOf(it,level,state,home||NETWORK):0,cash=home?home.cash:state.cash;
  return {level,day,lock,price,canBuy:!lock&&cash>=price};
}
function shopBtn(it,offer,travel){const {level,day,price,lock,canBuy}=offer;
  if(journeyGuideActive()&&NETWORK.journeyGuide==='team')return '<button type="button" disabled>'+(lang==='ru'?'Сначала найм':'Hire first')+'</button>';
  if(journeyGuideActive()&&NETWORK.journeyGuide==='shop_intro')return '<button type="button" disabled>'+(lang==='ru'?'Сначала осмотримся':'Look around first')+'</button>';
  if(lock==='freight')return '<button type="button" disabled>'+(it.id==='xlcart'?'XL':(lang==='ru'?'Холодная поставка':'Cold delivery'))+'</button>';
  if(lock==='place')return '<button type="button" disabled>'+(NETWORK?.campaign?.chapter==='city'&&it.id==='locker'?(lang==='ru'?'Центр мегаполиса':'City downtown'):NETWORK?.campaign?.chapter==='city'&&['robot','tune','ai'].includes(it.id)?(lang==='ru'?'Сначала разговор о технологиях':'Discuss technology first'):(lang==='ru'?'Мегаполис':'City'))+'</button>';
  if(lock==='owned')return '<button type="button" disabled>'+t('owned')+'</button>';
  if(lock==='day')return '<button type="button" disabled>'+t('lockDay',day)+'</button>';
  if(lock==='robot')return '<button type="button" disabled>'+t('needRobot')+'</button>';
  return '<button type="button" data-a="buy" data-v="'+it.id+(travel?':'+level:'')+'"'+(canBuy?'':' disabled')+'>'+money(price)+'</button>';}
// The cooler, the coffee machine and the TV are steps of one offer. Every step
// keeps its own saved id, so older saves with any of them need no migration.
const WAITING=SHOP.filter(it=>it.part==='waiting');
function waitingArea(home=null){
  const level=it=>home?travelUpgradeLevel(home,it.id):lv(it.id);
  return {owned:WAITING.filter(it=>level(it)>0),next:WAITING.find(it=>level(it)<1)||null};
}
function waitingItem(home,featured){
  const {owned,next}=waitingArea(home),[name,about]=STR[lang].items.waiting,item=id=>STR[lang].items[id];
  const offer=next?shopOffer(next,home):{level:1,day:1,price:0,lock:'owned',canBuy:false};
  const have=owned.length?'<br>'+t('waitingHave',owned.map(it=>item(it.id)[0].toLocaleLowerCase(lang)).join(', ')):'';
  const then=next?'<br>'+t('waitingNext',item(next.id)[0].toLocaleLowerCase(lang),item(next.id)[1]):'';
  return '<div class="item'+(featured?.it.part||next&&shopNew(offer,home)?' itemNew':'')+'" data-item="waiting"><b>'+name+' <small style="font-weight:700">'+t('lvl',owned.length,WAITING.length)+'</small></b>'+
    shopBtn(next||WAITING.at(-1),offer,!!home)+'<small>'+about+have+then+'</small></div>';
}
// New in the shop: this upgrade or its next level has opened today.
const shopNew=(offer,home)=>!home&&!offer.lock&&offer.day>1&&offer.day===calendarDay();
function shopItems(home=null,featured=null){
  let h='';
  for(const cat of ['staff','storage','auto','comfort','growth']){h+='<div class="cat">'+STR[lang].cats[cat]+'</div>';
    for(const it of SHOP.filter(x=>x.cat===cat)){
      if(it.part){if(it===WAITING[0])h+=waitingItem(home,featured);continue;}
      const offer=shopOffer(it,home),max=it.p.length,nm=it.id==='locker'&&storyLockerAvailable()?[STR[lang].items.locker[0],storyLockerExplanation()]:STR[lang].items[it.id];
      h+='<div class="item'+(featured?.it.id===it.id||shopNew(offer,home)?' itemNew':'')+'"><b>'+nm[0]+(max>1?' <small style="font-weight:700">'+t('lvl',offer.level,max)+'</small>':'')+'</b>'+shopBtn(it,offer,!!home)+'<small>'+nm[1]+'</small></div>';}}
  return h;
}
function hiringLabel(state,network){
  return '👥 '+t('teamBtn',state.staff.length,PptNetwork.staffSlots(state,network));
}
function shopHiringButton(state,network,action,guided=false){
  const canHire=state.staff.length<PptNetwork.staffSlots(state,network)&&state.cands.some(person=>network.cash>=wage(person));
  return '<button type="button" class="btn'+(canHire?' hireAvailable':'')+'" style="background:#24566a;border:1px solid #5bd6ff;color:#e2faff;margin:10px 0 3px" '+
    (guided?'data-guide-highlight="true" ':'')+'data-a="'+action+'">'+hiringLabel(state,network)+'</button>'+
    '<small style="display:block;color:var(--muted);margin:0 0 10px">'+t('teamShopHint')+'</small>';
}
function showShop(){if(!journeyGuideActive())guideDiscover();if(loadFailed)return;
  // The team screen creates candidates when none remain. Prepare that same
  // list before showing the shop so the hire indicator reflects real people.
  if(slots()>0&&S.staff.length<slots()&&!S.cands.length){S.cands=[genCand(),genCand(),genCand()];save();if(loadFailed)return;}
  showOv(()=>{const training=journeyGuideActive()&&NETWORK.journeyGuide==='team',intro=journeyGuideActive()&&NETWORK.journeyGuide==='shop_intro',featured=training||intro?null:guideUpgrade();let h='<div class="row" style="justify-content:space-between;align-items:baseline"><h2>'+t('shop')+'</h2>'+(saleOn()?'<span class="chip" style="background:var(--accent);color:#1a0f05">'+t('saleTag')+'</span>':'')+'<b style="color:var(--good)">'+money(S.cash)+'</b></div>'+(training?journeyPanel(lang==='ru'?'Открой команду: грузчик поможет разгружать поставки. После найма вернёмся к улучшениям.':'Open the team: a loader helps unload deliveries. We’ll return to upgrades after hiring.'):intro?journeyPanel(lang==='ru'?'Здесь можно покупать улучшения для пункта и сотрудников. Заглядывай в магазин каждый день: новые улучшения открываются постепенно, а иногда появляются скидки.':'Here you can buy upgrades for your pickup point and staff. Check the shop every day: new upgrades unlock over time, and there are occasional sales.')+'<button class="btn" data-guide-highlight="true" data-a="guideShopDone">'+(lang==='ru'?'Понятно':'Got it')+'</button>':guideItemPanel(featured))+(slots()&&!intro?shopHiringButton(S,NETWORK,'team',training):'');
  return h+shopItems(null,featured)+(training||intro?'':'<button class="btn" data-a="next">'+t('next',calendarDay())+'</button>');});}
const dots=n=>'<i>'+'●'.repeat(n)+'</i>'+'○'.repeat(5-n);
const setupMissingRoles=()=>['cash','load'].filter(role=>!S.staff.some(person=>person.role===role));
function staffCard(x,hired,home=null){const tr=STR[lang].traits[x.trait],careful=x.trait==='careful';
  const state=home?outskirtsState(home):S,room=PptNetwork.staffSlots(state,home||NETWORK),cash=home?home.cash:state.cash;
  let h='<div class="scard"><div class="row" style="justify-content:space-between;align-items:baseline"><b>'+nameOf(x)+' · '+t('lvlShort',x.lvl)+'</b><span class="pos" style="font-weight:800">'+money(wage(x))+t('perDay')+'</span></div>'+
  '<small><b style="color:var(--ink)">'+tr[0]+'</b> — '+tr[1]+'</small><div class="stats"><span>'+t('spd')+' '+dots(x.spd)+'</span><span>'+t('acc')+' '+(careful?'<i>'+t('accPerfect')+'</i>':dots(x.acc))+'</span></div>'+(careful?'<small style="font-size:11px">'+t('accBaseWage',x.acc)+'</small>':'');
  if(hired){
    h+='<div class="roles">'+['load','sort','cash'].map(r=>'<button type="button" class="rbtn'+(x.role===r?' on':'')+'" '+(journeyGuideActive()&&r==='load'?'data-guide-highlight="true" ':'')+'data-a="role" data-v="'+x.id+':'+r+'"'+(journeyGuideActive()&&r!=='load'?' disabled':'')+'>'+STR[lang].roles[r][0]+'</button>').join('')+'</div><small>'+STR[lang].roles[x.role][1]+'</small>';
    const missing=setupMissingRoles();
    if(!home&&x.role==='sort'&&branchRuntime.current().id===2&&S.day===1&&S.staff.length>=slots()&&missing.length)
      h+='<small class="networkHelp">'+t('setupSwitch',STR[lang].roles[missing[0]][0])+'</small>';
    if(home){const w=PptPostgameUI.words(lang);
      h+='<button type="button" class="hire" data-a="awayTrain" data-v="'+x.id+':'+x.spd+'"'+(x.spd>=5||cash<wage(x)?' disabled':'')+'>'+
        (x.spd>=5?w.maxSpeed:w.training+' '+x.spd+' → '+(x.spd+1)+' · '+money(wage(x)))+'</button>';}
    if(!journeyGuideActive())h+='<button type="button" class="fire" data-a="fire" data-v="'+x.id+'">'+t('fire')+'</button>';}
  else{const full=state.staff.length>=room||(journeyGuideActive()&&state.staff.length>0),poor=cash<wage(x);
    h+='<small>'+(journeyGuideActive()?(lang==='ru'?'Роль назначим после найма':'Assign a role after hiring'):(lang==='ru'?'Роль: ':'Role: ')+STR[lang].roles[x.role][0])+'</small><button type="button" class="hire" '+(journeyGuideActive()&&!full&&!poor?'data-guide-highlight="true" ':'')+'data-a="hire" data-v="'+x.id+'"'+(full||poor?' disabled':'')+'>'+t('hire')+' · '+money(wage(x))+'</button>';
    if(full||poor)h+='<small class="networkHelp">'+(full?t('hireFull',state.staff.length,room):t('hireFunds'))+'</small>';}
  return h+'</div>';}
function showTeam(){mode='team';PptNetwork.ensureSetupCandidates(S);if(slots()>0&&S.staff.length<slots()&&!S.cands.length){S.cands=[genCand(),genCand(),genCand()];save();}
  if(NETWORK?.journeyGuide==='team'&&journeyGuideActive()&&S.staff.some(person=>person.role==='load')){if(!journeySet('return_shop'))return;}
  showOv(()=>{const training=journeyGuideActive()&&NETWORK.journeyGuide==='team',poor=training&&!S.staff.length&&!S.cands.some(person=>S.cash>=wage(person));
    if(NETWORK?.journeyGuide==='return_shop'&&journeyGuideActive())return '<div class="journeyGuideTeam"><h2>'+(lang==='ru'?'Команда':'Team')+'</h2>'+journeyPanel(lang==='ru'?'Отлично, грузчик готов помочь! Теперь вернёмся в магазин и посмотрим, как развивать пункт.':'Great, your loader is ready to help! Now let’s return to the shop and see how to improve your pickup point.')+'<button class="btn" data-guide-highlight="true" data-a="shop">'+t('backShop')+'</button></div>';
    if(training){
      const help=journeyPanel(S.staff.length?(lang==='ru'?'Назначь сотруднику роль грузчика: он поможет разгружать машину.':'Assign the loader role: this worker will help unload trucks.'):(poor?(lang==='ru'?'Пока не хватает денег на найм. Проведи ещё смену и вернись сюда.':'You need more cash to hire. Work another shift, then come back.'):(lang==='ru'?'Найми сотрудника и назначь грузчиком. Зарплата платится при найме и после каждой смены.':'Hire an employee and assign them as loader. Wages are paid at hiring and after each shift.')));
      return '<div class="journeyGuideTeam"><div class="row" style="justify-content:space-between;align-items:baseline"><h2>'+(lang==='ru'?'Команда':'Team')+'</h2><b style="color:var(--good)">'+money(S.cash)+'</b></div>'+help+
        (poor?'<button class="btn" data-guide-highlight="true" data-a="guideEarn">'+(lang==='ru'?'Провести смену':'Work a shift')+'</button>':'')+
        (S.staff.length?S.staff.map(x=>staffCard(x,true)).join(''):S.cands.map((person,index)=>({person,index})).sort((a,b)=>Number(S.cash>=wage(b.person))-Number(S.cash>=wage(a.person))||a.index-b.index).map(({person})=>staffCard(person,false)).join(''))+'</div>';
    }
    return '<div class="row" style="justify-content:space-between;align-items:baseline"><h2>'+t('team')+'</h2><b style="color:var(--good)">'+money(S.cash)+'</b></div><small style="color:var(--muted)">'+t('slotsTxt',S.staff.length,slots())+'</small><p style="margin:5px 0 10px;color:var(--muted);font-size:12px;line-height:1.4">'+t('teamHelp')+'</p>'+(!PptNetwork.readyForFirstShift(branchRuntime.current())?setupHelp(false):branchRuntime.current().id===2&&S.day===1?'<p class="networkHelp">'+t('setupReady')+'</p>':'')+
    (S.staff.length?S.staff.map(x=>staffCard(x,true)).join(''):'<p>'+t('teamEmpty')+'</p>')+'<div class="cat">'+t('cands')+'</div>'+S.cands.map(x=>staffCard(x,false)).join('')+
    '<button class="btn sec" data-a="shop">'+t('backShop')+'</button><button class="btn" data-a="next">'+t('next',calendarDay())+'</button>';});}
function showOver(){syncHud();showOv(()=>'<div class="stripe"></div><h2>'+t('over')+'</h2><p>'+t(sumData.why)+' '+t('reached',S.day)+'</p>'+NETWORK.branches.filter(b=>b.id!==NETWORK.activeId&&b.status!=='over').map(b=>'<button class="btn" data-a="branch" data-v="'+b.id+'">'+(lang==='ru'?'Перейти в ПВЗ ':'Go to branch ')+b.id+'</button>').join('')+(NETWORK.campaign?'<p>'+(lang==='ru'?'Часть денег потеряна. Можно начать последнюю главу заново.':'You lost some money. You can restart the current chapter.')+'</p><button class="btn" data-a="campaignRetry">'+(lang==='ru'?'Начать главу заново':'Restart chapter')+'</button>':'<button class="btn sec" data-a="restart">'+(lang==='ru'?'Начать новую сеть':'Start a new network')+'</button>'));}

// ---------- network adapter (the simulation above remains branch-local) ----------
function makeNetwork(state){
  const network=PptNetwork.create(state);
  network.manualPaused=false;
  network.totals={days:0,served:0,revenue:0};
  Object.assign(network.branches[0],{runtime:null,status:'brief',summary:null,paused:false});
  return network;
}
function prepareBranch(branch){
  // Add missing legacy defaults in place: replacing nested staff or runtime
  // objects here would break worker.s / customer.claim reference identity.
  const defaults=fresh();
  for(const key of Object.keys(defaults))if(key!=='cash'&&!(key in branch.state))branch.state[key]=defaults[key];
  if(branch.status==null||branch.status==='menu')branch.status='brief';
  if(!['brief','play','summary','shop','team','over'].includes(branch.status))throw new Error('Unknown saved branch status');
  if(branch.runtime==null)branch.runtime=null;
  if(branch.status==='play')repairPersonalQueues(branch);
  if(branch.runtime)for(const f of branch.runtime.floats||[])f.txt=normalizeFloat(f.txt);
  if(branch.summary==null)branch.summary=null;
  normalizeSummary(branch.summary);
  if(branch.paused==null)branch.paused=false;
  if(branch.id===2)PptNetwork.expansionLedger(branch);
  if(branch.status==='play'&&!branch.runtime)throw new Error('Saved shift has no runtime');
  if((branch.status==='summary'||branch.status==='over')&&!branch.summary)throw new Error('Saved shift has no result');
  Object.defineProperty(branch.state,'cash',{configurable:true,enumerable:false,
    get:()=>NETWORK.cash,set:value=>PptNetwork.setCash(NETWORK,value)});
}
function attachNetwork(network){
  stopContractFx();contractFxSummary=null;contractFxPending=new Map();contractFxCommitted=new WeakSet();contractFxConsumed=new WeakSet();
  if(!network.away)awayHome=null;
  NETWORK=network;
  // Previous saves with two operating branches remain a legacy network even
  // when their first branch still has the old one-shot story marker.
  if(!NETWORK.campaign&&NETWORK.branches.length===2)NETWORK.storyCampaign=false;
  else if(typeof NETWORK.storyCampaign!=='boolean')NETWORK.storyCampaign=PptNetwork.isStoryCampaign(NETWORK);
  if(NETWORK.manualPaused===undefined)NETWORK.manualPaused=false;
  if(!NETWORK.totals)NETWORK.totals={days:0,served:0,revenue:0};
  for(const branch of NETWORK.branches)prepareBranch(branch);
  // Preserve earlier single-point story saves when the chapter system is
  // introduced. Previous shift counts are known, but completed customers and
  // the historic rating streak cannot be reconstructed, so those start at zero
  // without replaying the prologue or altering the current game state.
  if(NETWORK.storyCampaign&&!NETWORK.campaign&&NETWORK.branches.length===1){
    const state=NETWORK.branches[0].state,campaign=PptCampaign.create();
    campaign.shifts=Math.max(0,state.day-1);
    // The old total counted parcels, not people. Prior customer counts cannot
    // be reconstructed accurately and therefore start at zero.
    campaign.served=0;
    campaign.lastRating=campaign.shifts&&state.reviews.length?state.reviews.reduce((a,b)=>a+b,0)/state.reviews.length:null;
    const checkpoint=fresh();delete checkpoint.cash;checkpoint.storyQueueEligible=false;
    NETWORK.campaign=campaign;NETWORK.campaignCheckpoint=checkpoint;
  }
  migrateCityProgress(NETWORK);
  if(NETWORK.campaign?.chapter==='town'&&NETWORK.campaign.status==='active'&&!NETWORK.townHome){
    NETWORK.townHome=PptTownRenovation.create(Math.max(0,NETWORK.campaign.shifts-1));
    const branch=NETWORK.branches[0];if(branch.status==='play'&&branch.runtime)branch.runtime.legacyTownLease=true;
  }
  if(NETWORK.campaign?.chapter==='village'&&!NETWORK.villageHome){
    if(NETWORK.storyPresentation?.id==='village_rent_notice'&&NETWORK.villageRentFromDay===undefined){
      const branch=NETWORK.branches[0];NETWORK.villageRentFromDay=displayedDay(branch.state,branch.status,branch.summary)+2;
    }
    // Old editions could play the town conversation while still renting.
    if(NETWORK.storyPresentation?.id==='village_town_offer')delete NETWORK.storyPresentation;
    if(NETWORK.storySeen?.includes('village_town_offer'))NETWORK.storySeen=NETWORK.storySeen.filter(id=>id!=='village_town_offer');
    if(NETWORK.villageOfferDay!==undefined){
      // This player already chose to keep renting. Retain the available listings.
      for(const id of ['village_rent_notice','village_house_listings']){
        if(!NETWORK.storySeen?.includes(id))NETWORK.storySeen=[...(NETWORK.storySeen||[]),id];
      }
    }
  }
  if(NETWORK.campaign?.chapter==='village'&&NETWORK.villageRenovation!==1){
    const branch=NETWORK.branches[0];
    if(branch.status==='play'&&branch.runtime&&!NETWORK.villageHome)branch.runtime.legacyVillageLease=true;
    // Honour a departure already earned or in progress when loading an older village.
    if(NETWORK.storyPresentation?.id==='village_departure'||NETWORK.storyPresentation?.type==='choose'||
       PptCampaign.goals(NETWORK.campaign,{cash:NETWORK.cash,staff:branch.state.staff}).ready)NETWORK.villageLegacyDeparture=true;
    NETWORK.villageRenovation=1;
  }
  // A finished chapter always waits on its closing screen. A save that lost
  // the screen gets it back: from the briefing a shift could be started, and
  // the chapter rules refuse to record a shift of a finished chapter.
  if(NETWORK.campaign?.status==='complete'&&!NETWORK.storyPresentation&&!NETWORK.postgame)NETWORK.storyPresentation={type:'finished'};
  // A legacy city save could already be at the staff-choice screen. The task
  // is now a mandatory city finale; bring that save back to the departure
  // screen without touching staff, cash or the completed city progress.
  if(NETWORK.campaign?.chapter==='city'&&NETWORK.campaign.status==='complete'&&NETWORK.storyPresentation?.type==='choose'&&!NETWORK.cityMatchThree?.complete)NETWORK.storyPresentation={type:'finished'};
  repairRestoredVisitorLooks(NETWORK);
  branchRuntime=PptBranchRuntime.create({
    read:()=>({S,G,mode,sumData,paused}),
    write:value=>{S=value.S;G=value.G;mode=value.mode;sumData=value.sumData;paused=value.paused;},
    activeId:()=>NETWORK.activeId
  });
  branchRuntime.bind(NETWORK.branches.find(branch=>branch.id===NETWORK.activeId));
  // Explicit user pause is durable; legacy branch-local pauses also stop the
  // network. Browser hidden/menu holds never contribute to this saved flag.
  networkPaused=NETWORK.manualPaused||NETWORK.branches.some(branch=>branch.status==='play'&&branch.paused);
  updateLayout();
}
function resetNetwork(state){
  if(loadFailed)return;
  dialoguePrinter.reset();dialogueNode=null;dialogueLastPress=-Infinity;interludeMark=null;
  networkPaused=false;
  attachNetwork(makeNetwork(state));
}
function initNetwork(){
  try{
    const network=PptSave.loadNetwork(campaignStorage(),state=>makeNetwork(Object.assign(fresh(),state)));
    hasSave=!!network;
    attachNetwork(network||makeNetwork(fresh()));
  }catch(e){
    console.error('Network load failed:',e);loadFailed=true;loadBroken=true;
    // This temporary scene is never saved. Keep every original storage key.
    attachNetwork(makeNetwork(fresh()));
  }
}
function setupHelp(withButton=true){
  const missing=setupMissingRoles(),full=S.staff.length>=slots();
  const status=t('setupStatus',missing.includes('cash')?t('setupNeeded'):t('setupAssigned'),missing.includes('load')?t('setupNeeded'):t('setupAssigned'));
  const roles=missing.map(role=>STR[lang].roles[role][0]).join(lang==='ru'?' и ':' and ');
  let note=full?t('setupFull',roles):t('setupHire');
  if(!full&&!S.cands.some(person=>missing.includes(person.role)&&S.cash>=wage(person)))note+=' '+t('setupNoFunds');
  const back=NETWORK?.campaign?.chapter==='capital'?(lang==='ru'?'Вернуться на окраину':'Return to the outskirts'):(lang==='ru'?'Вернуться в ПВЗ 1':'Return to branch 1');
  return '<p class="networkHelp">'+status+'</p><p class="networkHelp">'+note+'</p>'+(withButton?'<button class="btn" data-a="team">'+t('team')+'</button>':'')+'<button class="btn sec" data-a="branch" data-v="1">'+back+'</button>';
}
function setView(id){const view=views.find(item=>item.id===id);cv=view.canvas;ctx=view.ctx;scale=view.scale;}
function updateLayout(){
  $('app').classList.toggle('dual',NETWORK.branches.length===2);
  for(const view of views){
    const exists=NETWORK.branches.some(branch=>branch.id===view.id);
    $('branch'+view.id).hidden=!exists;
    $('branch'+view.id).classList.toggle('selected',view.id===NETWORK.activeId);
  }
  // Re-appending the overlay to the same scene detaches and blurs its active
  // button in browsers, including on every committed dialogue line.
  const scene=$('scene'+NETWORK.activeId);if(ov.parentElement!==scene)scene.appendChild(ov);
  setView(NETWORK.activeId);fit();
}
function selectBranch(id){
  if(loadFailed||menuOpen||settingsOpen||externallyPaused()||NETWORK.storyPresentation||G?.storyLive||!NETWORK.branches.some(branch=>branch.id===id))return;
  audibleTargets=new WeakSet();
  stopContractFx();contractFxSummary=null;
  branchRuntime.capture();NETWORK.activeId=id;
  branchRuntime.bind(NETWORK.branches.find(branch=>branch.id===id));
  updateLayout();presentBranch();save();uiCue('tick');
}
function presentBranch(){
  if(!menuOpen&&!journeyNormalizeEarly())return;
  if(!menuOpen&&!journeyMigrateLegacyShop())return;
  syncHud();drawHands();
  if(menuOpen){showMenu();return;}
  if(networkPaused||paused){showPause();return;}
  if(NETWORK.campaign&&showCampaignPresentation())return;
  if(showTownWork())return;
  if(showVillageHouseStory()||(!NETWORK.villageHome&&showVillageWork()))return;
  if(NETWORK.villageHome&&!NETWORK.villageHome.cleared&&showVillageWork())return;
  if(NETWORK.villageHome?.cleared&&!NETWORK.villageHome.choices.length&&showVillageWork())return;
  if(villageRepairTalkDone()&&showVillageWork())return;
  if(mode==='play')hideOv();
  else if(mode==='summary')showSummary();
  else if(mode==='over')showOver();
  else if(mode==='shop')showShop();
  else if(mode==='team')showTeam();
  else showBrief();
}
function openSecond(){
  if(loadFailed||menuOpen||settingsOpen||networkPaused||externallyPaused()||NETWORK.storyPresentation||G?.storyLive||
     (PptNetwork.isStoryCampaign(NETWORK)&&!PptNetwork.isCapitalCampaign(NETWORK)))return;
  branchRuntime.capture();
  if(PptNetwork.isCapitalCampaign(NETWORK)){
    const candidate=PptSave.decodeGraph(PptSave.encodeGraph(NETWORK));
    if(!PptNetwork.openSecond(candidate,fresh()))return;
    const branch=candidate.branches.find(item=>item.id===2);
    Object.assign(branch,{runtime:null,status:'brief',summary:null,paused:false});candidate.activeId=2;
    try{PptSave.writeNetwork(campaignStorage(),candidate);}
    catch(error){
      console.error('Capital expansion save failed:',error);
      if(error.saveUncertain){loadFailed=true;showStorageError();}
      saveNoticeKey=error.saveUncertain?'cancelExpansionUncertain':'saveFailed';$('saveNotice').textContent=t(saveNoticeKey);$('saveNotice').hidden=false;return;
    }
    hasSave=true;$('saveNotice').hidden=true;attachNetwork(candidate);presentBranch();uiCue('tick');return;
  }
  if(!PptNetwork.openSecond(NETWORK,fresh()))return;
  const branch=NETWORK.branches[1];
  Object.assign(branch,{runtime:null,status:'brief',summary:null,paused:false});
  prepareBranch(branch);selectBranch(branch.id);
}
function confirmExpansion(){
  if(loadFailed||menuOpen||settingsOpen||externallyPaused()||NETWORK.storyPresentation)return;
  branchRuntime.capture();
  const quote=PptNetwork.cancellationQuote(NETWORK);
  if(!quote)return;
  pendingExpansion={branch:NETWORK.branches.find(branch=>branch.id===2),quote,token:String(++expansionConfirmId)};
  const pending=pendingExpansion;
  showOv(()=>'<h2>'+t('cancelExpansionTitle')+'</h2><p>'+t('cancelExpansionRefund',money(pending.quote.refund),money(pending.quote.openingCost??PptNetwork.OPEN_COST),money(pending.quote.spent))+'</p><p>'+t('cancelExpansionEffects')+'</p>'+(pending.quote.legacy?'<p class="networkHelp">'+t('cancelExpansionLegacy')+'</p>':'')+'<button class="btn sec" data-a="dismissExpansion">'+t('cancelExpansionKeep')+'</button><button class="btn" data-a="confirmExpansion" data-v="'+pending.token+'">'+t('cancelExpansionConfirm',money(pending.quote.refund))+'</button>');
}
function commitExpansion(token){
  const pending=pendingExpansion;
  if(!pending||pending.token!==token||loadFailed||menuOpen||externallyPaused()||NETWORK.storyPresentation)return false;
  pendingExpansion=null;
  branchRuntime.capture();
  const quote=PptNetwork.cancellationQuote(NETWORK);
  if(!quote||NETWORK.branches.find(branch=>branch.id===2)!==pending.branch||quote.refund!==pending.quote.refund){presentBranch();return false;}
  const candidate=PptSave.decodeGraph(PptSave.encodeGraph(NETWORK));
  if(!PptNetwork.cancelSecond(candidate))return false;
  try { PptSave.writeNetwork(campaignStorage(),candidate); }
  catch(error){
    console.error('Expansion cancellation save failed:',error);
    if(error.saveUncertain){loadFailed=true;showStorageError();}
    else presentBranch();
    saveNoticeKey=error.saveUncertain?'cancelExpansionUncertain':'cancelExpansionSaveFailed';$('saveNotice').textContent=t(saveNoticeKey);$('saveNotice').hidden=false;
    return false;
  }
  hasSave=true;$('saveNotice').hidden=true;
  attachNetwork(candidate);presentBranch();return true;
}
function showStorageError(){showOv(()=>'<h2>'+t('cancelExpansionStorageTitle')+'</h2><p>'+t('cancelExpansionUncertain')+'</p><button class="btn" data-a="retry">'+t('cancelExpansionReload')+'</button>');}
function branchStatus(branch){
  if((networkPaused||menuOpen||branch.paused||externallyPaused())&&branch.status==='play')return lang==='ru'?'Пауза':'Paused';
  if(branch.status==='play'&&NETWORK.branches.some(other=>other.status==='play'&&branch.runtime.clock-other.runtime.clock>1e-8))return t('networkSyncing');
  if(branch.status==='play'&&branch.id!==NETWORK.activeId)return lang==='ru'?'Автономно':'Autonomous';
  const labels=lang==='ru'?{brief:'Перед сменой',play:'Смена идёт',summary:'Смена закрыта',shop:'Магазин',team:'Найм',over:'Закрыт'}:{brief:'Before shift',play:'Shift running',summary:'Shift ended',shop:'Shop',team:'Hiring',over:'Closed'};
  return labels[branch.status]||'';
}
function syncNetworkHud(){
  branchRuntime.capture();
  const ru=lang==='ru',opened=NETWORK.branches.length===2,capital=NETWORK.campaign?.chapter==='capital';
  let served=NETWORK.totals.served,revenue=NETWORK.totals.revenue;
  for(const branch of NETWORK.branches){
    if(branch.status==='play'){served+=branch.runtime.st.served;revenue+=branch.runtime.st.revenue;}
    const pane=$('branch'+branch.id),event=branch.status==='play'&&branch.runtime?branch.runtime.ev:
      branch.state.evDay===branch.state.day?branch.state.ev:null;
    if(pane.dataset)pane.dataset.wallpaperSeason=event==='ny'?'winter':'normal';
    const label=NETWORK.away?PptPostgameUI.placeName(lang,NETWORK.away.location):capital?(branch.id===1?(ru?'Окраина':'Outskirts'):(ru?'Центр':'Downtown')):(ru?'ПВЗ ':'Branch ')+branch.id;
    $('bBranch'+branch.id).textContent=label+(NETWORK.away?'':' · '+t('day',displayedDay(branch.state,branch.status,branch.summary)))+' · '+branchStatus(branch);
    $('bBranch'+branch.id).setAttribute('aria-pressed',String(branch.id===NETWORK.activeId));
    $('bBranch'+branch.id).title=branch.id===NETWORK.activeId
      ?(ru?'Вы управляете этим ПВЗ. Кассиры обслуживают все его окна.':'You manage this branch. Cashiers serve all its windows.')
      :(ru?'Выберите ПВЗ для управления. Кассиры обслуживают все его окна независимо от выбора.':'Select this branch to manage it. Cashiers serve all its windows regardless of selection.');
    const state=branch.state;
    const inventory=state.stock.flat().reduce((n,cell)=>n+cell.length,0)+state.floor.reduce((n,cell)=>n+cell.length,0)+state.big.reduce((n,cell)=>n+cell.length,0)+state.fridge.filter(Boolean).length+state.locker.filter(Boolean).length;
    const time=branch.status==='play'?' · '+t('seconds',Math.max(0,Math.ceil(branch.runtime.time))):'';
    $('stats'+branch.id).textContent=(ru?'Склад: ':'Stored: ')+inventory+' · '+(ru?'Сотрудники: ':'Staff: ')+state.staff.length+time;
  }
  $('branchLabel').textContent=NETWORK.away?PptPostgameUI.words(lang).away+' · '+PptPostgameUI.placeName(lang,NETWORK.away.location):NETWORK.campaign?(capital?(ru?'Столица · ':'Capital · ')+(NETWORK.activeId===1?(ru?'Окраина':'Outskirts'):(ru?'Центр':'Downtown')):NETWORK.campaign.chapter==='village'?(ru?'Деревня':'Village'):NETWORK.campaign.chapter==='town'?(ru?'Городок':'Town'):
    (ru?'Мегаполис · ':'City · ')+(NETWORK.campaign.cityProgress?.district==='center'?(ru?'Центр':'Downtown'):(ru?'Окраина':'Outskirts'))):(ru?'ПВЗ ':'Branch ')+NETWORK.activeId+'/'+NETWORK.branches.length;
  $('networkTotals').hidden=!opened;
  const live=NETWORK.branches.filter(branch=>branch.status==='play');
  const catchingUp=live.length>1&&Math.max(...live.map(branch=>branch.runtime.clock))-Math.min(...live.map(branch=>branch.runtime.clock))>1e-8;
  $('networkTotals').textContent=(ru?'Сеть · смен: ':'Network · shifts: ')+(NETWORK.totals.days+(NETWORK.postgame?.trips??0))+' · '+(ru?'выдано: ':'served: ')+served+' · '+(ru?'выручка: ':'revenue: ')+money(revenue)+(catchingUp?' · '+t('networkCatchup'):'');
  const storyCampaign=PptNetwork.isStoryCampaign(NETWORK);
  const expand=$('bExpand'),capitalExpansion=PptNetwork.isCapitalCampaign(NETWORK),terms=PptNetwork.expansionTerms(NETWORK);
  expand.hidden=opened||(storyCampaign&&!capitalExpansion);
  expand.disabled=menuOpen||loadFailed||networkPaused||externallyPaused()||!!NETWORK.storyPresentation||!PptNetwork.canOpenSecond(NETWORK);
  if(capitalExpansion){
    expand.textContent=!terms.unlocked?(ru?'Задание на второй ПВЗ':'Second-branch quest'):NETWORK.cash<terms.requiredBalance?(ru?'Для центра нужно ':'Downtown requires ')+money(terms.requiredBalance)
      :(ru?'Открыть центр · ':'Open downtown · ')+money(terms.cost);
    expand.title=ru?'Сначала выполните задание на второй ПВЗ: 3 смены, 50 посетителей, 2 сотрудника. Для открытия нужно '+money(terms.requiredBalance)+'. Стоимость '+money(terms.cost)+'; остальное останется на команду и покупки.':
      'First complete the second-branch quest: 3 shifts, 50 customers and 2 employees. Have '+money(terms.requiredBalance)+' to open. It costs '+money(terms.cost)+'; the rest stays for staff and purchases.';
  }else{
    expand.textContent=storyCampaign?'':!NETWORK.expansionUnlocked?(ru?'Сеть: накопите $15 000':'Network: reach $15,000')
      :NETWORK.cash<PptNetwork.OPEN_REQUIRED_BALANCE?(ru?'Для открытия нужно $15 000':'Opening requires $15,000')
      :(ru?'Открыть ПВЗ 2 · $10 000':'Open branch 2 · $10,000');
    expand.title=storyCampaign?'':ru?'Для открытия нужно иметь $15 000. Спишется $10 000, минимум $5 000 останется на найм и покупки. Разблокировка расширения сохраняется навсегда.':'Have $15,000 to open. Opening costs $10,000, leaving at least $5,000 for hiring and purchases. Expansion stays permanently unlocked.';
  }
  const cancel=$('bCancelExpansion');cancel.hidden=!PptNetwork.cancellationQuote(NETWORK);
  cancel.disabled=menuOpen||loadFailed||externallyPaused();cancel.textContent=t('cancelExpansion');
  $('bPause').title=ru?'Пауза всех филиалов':'Pause all branches';
  $('bPause').setAttribute('aria-label',$('bPause').title);
  $('bLang').setAttribute('aria-label',t('changeLanguage'));
  $('bPrevBranch').setAttribute('aria-label',t('previousBranch'));
  $('bNextBranch').setAttribute('aria-label',t('nextBranch'));
}
for(const id of [1,2])$('bBranch'+id).addEventListener('click',()=>selectBranch(id));
for(const id of ['bPrevBranch','bNextBranch'])$(id).addEventListener('click',()=>selectBranch(NETWORK.activeId===1?2:1));
$('bExpand').addEventListener('click',openSecond);
$('bCancelExpansion').addEventListener('click',confirmExpansion);

// ---------- loop ----------
function fit(){const dpr=window.devicePixelRatio||1;
  $('app').classList.toggle('hasAutoLocker',!!NETWORK?.branches?.some(branch=>branch.state?.autoLocker&&!branch.state.locker.some(Boolean)&&(branch.status!=='play'||!!branch.runtime?.autoLocker)));
  for(const view of views){
  const sw=view.scene.clientWidth,sh=view.scene.clientHeight;if(!sw||!sh)continue;
  const branch=NETWORK?.branches?.find(item=>item.id===view.id),state=branch?.state;
  const show=!!state?.autoLocker&&!state.locker.some(Boolean)&&(branch.status!=='play'||!!branch.runtime?.autoLocker);
  view.worldWidth=W+(show?AUTO_LOCKER_STRIP:0);
  view.homeActive=!!(view.id===1&&activeVillageHome()&&globalThis.PptVillageHouseArt);
  view.extension=WAIT_EXT;
  const height=H+view.extension;
  view.scale=Math.max(.1,Math.min(sw/view.worldWidth,sh/height));
  view.canvas.style.width=view.worldWidth*view.scale+'px';view.canvas.style.height=height*view.scale+'px';
  view.canvas.width=Math.round(view.worldWidth*view.scale*dpr);view.canvas.height=Math.round(height*view.scale*dpr);
  view.ctx.setTransform(view.scale*dpr,0,0,view.scale*dpr,0,0);
}if(NETWORK)setView(NETWORK.activeId);}
function renderBranches(){
  if(views[0].homeActive!==!!(activeVillageHome()&&globalThis.PptVillageHouseArt))fit();
  for(const branch of NETWORK.branches){const view=views.find(item=>item.id===branch.id);
    if(!view.scene.clientWidth)continue;
    try{setView(branch.id);branchRuntime.run(branch,drawScene,{ui:false});}
    finally{setView(NETWORK.activeId);}
  }
}
new ResizeObserver(fit).observe($('stage'));
for(const view of views)new ResizeObserver(fit).observe(view.scene);
let last=performance.now(),hudT=0,saveT=5;
function syncVisibilityPause(){
  const hidden=!!document.hidden;
  if(hidden===!!releaseHiddenPause)return;
  resetFrameClock=true;
  if(hidden){
    stopContractFx();
    releaseHiddenPause=externalPause.acquire('hidden');
    if(hasSave&&!loadFailed)save();
  }else{
    releaseHiddenPause();releaseHiddenPause=null;
  }
  // UI refresh alone must not route summary/brief back through their setup.
  syncHud();
  if(!hidden)queueContractFx();
}
// An error the rules did not foresee must not end the loop silently: the
// next frame is always requested, the game stops on a recovery screen and
// saving is switched off, so a half-finished state never replaces the last
// good save. Reloading continues from that save.
let frameFailed=false;
function showFrameError(){showOv(()=>'<h2>'+(lang==='ru'?'Игра остановлена':'The game has stopped')+'</h2><p>'+(lang==='ru'?'Произошла непредвиденная ошибка. Чтобы не испортить сохранение, запись отключена. Перезагрузите игру — она продолжится с последнего сохранения.':'An unexpected error occurred. Saving is off so that your progress is not damaged. Reload the game to continue from the last save.')+'</p><button class="btn" data-a="retry">'+(lang==='ru'?'Перезагрузить игру':'Reload the game')+'</button>');}
function frame(now){
  try{if(!frameFailed)runFrame(now);}
  catch(error){
    frameFailed=true;loadFailed=true;
    try{console.error('Frame failed:',error);}catch{}
    try{settingsOpen=false;showFrameError();}catch{}
    try{syncAudio();}catch{}
  }
  finally{requestAnimationFrame(frame);}
}
function runFrame(now){
  // A first RAF timestamp can precede performance.now() captured at startup.
  // Never feed a negative or non-finite delta to the simulation.
  if(!Number.isFinite(now))now=performance.now();
  if(globalThis.PptDebugSession?.covered){last=now;return;}
  syncAudio();
  const dt=externallyPaused()||resetFrameClock?0:Math.max(0,Math.min(.05,(now-last)/1000));
  last=Math.max(last,now);resetFrameClock=false;
  if(!loadFailed)tickNetwork(dt);
  tickDialogueTyping(dt);
  renderBranches();
  // Fade the entire viewport, not just the canvas. Menus, pause and storage
  // recovery remain readable and the overlay never intercepts input.
  $('storyFade').style.opacity=(!loadFailed&&!menuOpen&&!settingsOpen&&!networkPaused&&!paused&&!externallyPaused()&&mode==='play'&&G?.storyLive)?String(storyLiveFade(G.storyLive)):'0';
  hudT-=dt;if(hudT<=0){syncHud();hudT=.2;}
  if(!menuOpen&&!loadFailed){saveT-=dt;if(saveT<=0){save();saveT=5;}}
}
initNetwork();
syncHud();
function showLoadFailed(setAsideFailed=false){showOv(()=>'<h2>'+(lang==='ru'?'Сохранение не загружено':'Save could not be loaded')+'</h2><p>'+(lang==='ru'?'Исходные данные сохранены. Запись отключена, чтобы не заменить их новой игрой.':'The original data is intact. Saving is disabled to avoid replacing it with a new game.')+'</p>'+(setAsideFailed?'<p class="networkHelp">'+(lang==='ru'?'Не удалось отложить сохранение. Данные не изменены.':'The save could not be set aside. Nothing was changed.')+'</p>':'')+'<button class="btn" data-a="retry">'+(lang==='ru'?'Повторить загрузку':'Retry loading')+'</button><button class="btn sec" data-a="discardSave">'+(lang==='ru'?'Начать новую игру':'Start a new game')+'</button>');}
if(loadFailed)showLoadFailed();
else showMenu();
globalThis.PptDebugSession?.connect({
  lang:()=>lang, hold:reason=>externalPause.acquire(reason), freshNetwork:()=>makeNetwork(fresh()),
  isPlaying:()=>!menuOpen, canResume:()=>hasSave&&!loadFailed,
  checkpoint:()=>menuOpen||mode!=='play'||save(),
  resume(entry,resuming){
    menuOpen=false;
    if(entry==='houseShift' && !resuming)startNetworkDay();
    else if(entry==='travel' && NETWORK.postgame && mode==='brief')showAwayHub();
    else presentBranch();
  }
});
window.addEventListener('pagehide',()=>{if(hasSave&&!loadFailed)save();});
document.addEventListener('visibilitychange',syncVisibilityPause);
syncVisibilityPause();
// VK package only (connect returns null elsewhere). The VK mobile client can
// hide the game without a browser visibility change; its hold, like the one of
// a rewarded advert, goes through the same external pause gate. The VK copy of
// the save replaces this device's save only after the player chooses it.
vkRuntime=globalThis.PptVkRuntime?.connect({
  hold(reason){resetFrameClock=true;const release=externalPause.acquire(reason);syncHud();return()=>{resetFrameClock=true;const removed=release();syncHud();return removed;};},
  save(){if(hasSave&&!loadFailed)save();},
  isMenuOpen:()=>menuOpen,
  lang:()=>lang,
  readSave(){try{return campaignStorage().getItem(PptSave.networkKey);}catch{return null;}},
  writeSave(raw){
    let storage=null,previous=null;
    try{storage=campaignStorage();previous=storage.getItem(PptSave.networkKey);storage.setItem(PptSave.networkKey,raw);if(storage.getItem(PptSave.networkKey)===raw)return true;}catch{}
    try{if(storage){if(previous===null)storage.removeItem(PptSave.networkKey);else storage.setItem(PptSave.networkKey,previous);}}catch{}
    return false;
  },
  lockSaves(){savesLocked=true;},
  unlockSaves(){savesLocked=false;},
  reload(){location.reload();},
  changed(){if(mode==='summary'&&!menuOpen&&!ov.hidden&&ovFn)rerenderOv();}
})||null;
// Start immediately when the host permits autoplay; otherwise the existing
// trusted pointer/keyboard unlock starts it on the first interaction.
syncAudio();
try{audioController?.tryAutoplay();}catch{}
globalThis.PptLoadingScreen?.ready();
requestAnimationFrame(frame);
})();
