'use strict';
(function(root){
  const size=5, count=size*size, neighbors=Array.from({length:count},(_,i)=>[i-1,i+1,i-size,i+size].filter(j=>j>=0&&j<count&&Math.abs(j%size-i%size)+Math.abs(Math.floor(j/size)-Math.floor(i/size))===1));
  const key=(a,b)=>Math.min(a,b)+'-'+Math.max(a,b);
  function shuffled(a,rng){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
  function shortest(map){
    const max=1<<map.stops.length,finish=max-1,total=count*max,dist=Array(total).fill(Infinity),last=Array(total).fill(-1),done=new Set();
    const bit=i=>{const n=map.stops.indexOf(i);return n<0?0:1<<n;};
    const start=map.depot*max;dist[start]=0;
    while(done.size<total){let u=-1,best=Infinity;for(let i=0;i<total;i++)if(!done.has(i)&&dist[i]<best){u=i;best=dist[i];}if(u<0)break;
      done.add(u);const at=Math.floor(u/max),mask=u%max;
      if(mask===finish){let route=[];for(let i=u;i>=0;i=last[i])route.push(Math.floor(i/max));return {cost:best,route:route.reverse()};}
      for(const v of neighbors[at]){const w=map.roads[key(at,v)];if(!w)continue;const next=v*max+(mask|bit(v));if(best+w<dist[next]){dist[next]=best+w;last[next]=u;}}
    }
    return null;
  }
  function generate(rng=Math.random){
    const edges=[];for(let i=0;i<count;i++)for(const j of neighbors[i])if(i<j)edges.push(key(i,j));
    for(let tries=0;tries<100;tries++){
      const roads=Object.fromEntries(edges.map(e=>[e,1])),order=shuffled(edges,rng);
      order.slice(0,5).forEach(e=>roads[e]=0);order.slice(5,12).forEach(e=>roads[e]=3);
      const places=shuffled(Array.from({length:count},(_,i)=>i),rng),depot=places[0],stops=places.slice(1,5);
      const map={size,depot,stops,roads},answer=shortest(map);if(answer&&answer.cost>=8){map.target=answer.cost+4;map.optimal=answer.cost;return map;}
    }
    throw Error('Could not prepare a connected district');
  }
  function routeInfo(map,route){
    if(!route.length||route[0]!==map.depot)throw Error('Route must start at depot');let cost=0;
    for(let i=1;i<route.length;i++){const w=map.roads[key(route[i-1],route[i])];if(!w||!neighbors[route[i-1]].includes(route[i]))throw Error('Blocked or non-adjacent street');cost+=w;}
    const delivered=map.stops.filter(i=>route.includes(i));return {cost,delivered,complete:delivered.length===map.stops.length};
  }
  const api=Object.freeze({size,count,neighbors,key,shortest,generate,routeInfo});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CourierMap=api;
})(globalThis);
