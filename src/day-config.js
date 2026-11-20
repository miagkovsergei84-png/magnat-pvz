// Pure branch-local day and shift configuration. PptBalance is the only runtime dependency.
globalThis.PptDayConfig = (() => {
  const DAY=120,BIG=4;
function cfgFor(d){
  const ci=[7,6,5.5,5,4.6,4.3,4.0],pa=[32,30,28,27,26,25,24];
  return{colors:d<3?2:d<5?3:4,shapes:d<2?2:d<6?3:4,
    cust:d<=7?ci[d-1]:Math.max(2.6,4.3-.1*(d-6)),pat:d<=7?pa[d-1]:Math.max(16,25-.5*(d-6)),
    prime:d<3?0:d<8?.15:Math.min(.3,.15+.02*(d-7)),frag:d<6?0:d<8?.1:Math.min(.2,.1+.015*(d-7)),
    multi:d<4?0:.2,ret:d<5?0:.12,pay:1,big:d<21?0:.12,cold:d<23?0:.14,cod:d<25?0:.18,
    trucks:d<4?[0,40,80]:[0,28,56,84],wait:Math.max(22,40-2*d),goal:6+2*d};
}
// `tuning.softRush` is used by story chapters without automation: the
// Black Friday rush stays busier than a normal day but remains manageable
// for one person with a small team.
function dayConfig(day,ev,card,state,tuning){
  const level=id=>state.up[id]||0;
  const c=PptBalance.configure(day,cfgFor(day));
  if(ev==='bf'){c.cust/=tuning?.softRush?1.5:2;c.pat*=tuning?.softRush?.9:.75;c.pay=1.5;c.goal=Math.round(c.goal*1.5);}
  if(ev==='chaos'){c.trucks=c.trucks.concat([105]).sort((a,b)=>a-b);}
  if(ev==='sale11'){c.prime=.5;c.multi=Math.max(c.multi,.4);c.pay=1.3;c.goal=Math.round(c.goal*1.3);}
  if(ev==='ny'){c.cust/=1.6;c.pat*=1.2;c.pay=1.4;c.goal=Math.round(c.goal*1.4);}
  if(ev==='sept'){c.multi=.6;c.cust/=1.3;c.pat*=.9;c.goal=Math.round(c.goal*1.3);}
  // card of the day
  const M={tip:1,rent:1,err:0,combo:1,flat:0,fragB:0,primePat:.6,noAuto:false,intern:false};
  switch(card){
    case 'tips':M.tip=3;c.pat*=.85;break;
    case 'calm':c.cust/=.7;M.rent=.5;break;
    case 'rush':c.cust*=.77;c.pay*=1.2;break;
    case 'coffee':c.pat*=1.3;break;
    case 'trucks':c.wait*=.5;M.flat=3;break;
    case 'fever':M.combo=2;M.err=15;break;
    case 'prime':c.prime=Math.min(.6,c.prime*2+.1);M.primePat=.8;break;
    case 'glass':c.frag=Math.min(.5,c.frag*3+.1);M.fragB=10;break;
    case 'intern':M.intern=true;break;
    case 'sale':break;
    case 'outage':c.pay*=1.4;M.noAuto=true;break;
    case 'double':c.pay*=1.5;M.rent=3;break;
  }
  c.pat*=1+state.perm.pat;
  c.cust/=1+.2*level('queue');                   // longer queue = more customers walk in
  c.pay*=PptBalance.priceFactor(day);
  const custs=DAY/c.cust*(1+c.multi);
  const unload=10+3*(1+level('cart'))+(level('conveyor')?6:0)+(level('robot')?4:0)+6*state.staff.filter(x=>x.role==='load').length;
  c.cargo=Math.max(5,Math.min(unload,Math.round(custs*1.05/c.trucks.length)));
  const usable=b=>b&&!b.r&&!b.spoiled&&(b.cold==null||b.cold>0)&&
    b.c>=0&&b.c<c.colors&&(b.s===BIG?day>=21:b.s>=0&&b.s<c.shapes);
  const existing=state.stock.flat(2).filter(usable).length+
    state.floor.flat().filter(usable).length+state.big.flat().filter(usable).length+
    state.fridge.filter(usable).length+state.locker.filter(usable).length;
  c.goal=PptBalance.supplyGoal(day,PptBalance.dailyGoal(day,c),c.cargo*c.trucks.length+existing);
  return {c,M};
}
  return { cfgFor, dayConfig };
})();
