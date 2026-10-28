import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {C,CONSOLE_STYLE} from '../config.js';
import {createRoom,join,step,snapshot,hp} from '../rules.js';
import {runConsole,tuneConsole,consoleZone,consoleRedDepth} from '../team-rules.js';
import {validMessage,decodeMessage} from '../resilience.js';
import {fillBots,botCommands,crewBots,workSeat} from '../bot-rules.js';
import {setupShowcase,equipShowcase} from '../showcase-rules.js';
import {operate} from './console-play.js';
import {playShowcase} from './showcase-play.js';
// A drill-ready room (the old showcase's starting point): the rig over a 3 by 3 bore at row 156, coolant, and two oil pumps.
function lateGame(r){const N=C.mapSize,x=4,y=8;r.site=y*N+x;r.drill={index:r.site};r.coolant=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)Object.assign(r.cells[(y+dy)*N+x+dx],{row:156,hp:hp(156),damage:{}});
 for(const i of [4*N+11,4*N+12])Object.assign(r.cells[i],{row:30,hp:hp(30),damage:{},oilSite:true,oilRow:30,pumpBuilt:true});return r;}

// One seat on its own: four players sit down together so each kind exists, then only the seat under test keeps running.
function seat(kind,seed=7){const room={seed,console:{}},crew=[0,1,2,3].map(i=>({publicId:'p'+i,boarded:true}));runConsole(room,crew,0,C.tickSeconds);const p=crew.find(q=>room.console[q.publicId].kind===kind);let now=0;
 return {room,p,g:()=>room.console[p.publicId],run(ticks,surge=1){for(let i=0;i<ticks;i++){now+=C.tickMs;runConsole(room,[p],now,C.tickSeconds,surge);}}};}
const gap=g=>Math.abs(g.a-g.b);
function drillRoom(crew){const r=createRoom('SEAT',42,false,0);r.finds=[];for(let i=0;i<4;i++){const p=join(r,'s'+i,'P'+i,0);p.publicId='p'+i;p.x=p.y=6.5;p.lastActive=0;}r.site=200;r.drill={index:200};r.coolant=true;r.cells[200]={row:150,hp:hp(150),damage:{}};for(let i=0;i<4;i++){r.cells[i].pumpBuilt=true;r.players[i].boarded=i<crew;}return r;}
const tick=(r,commands=[])=>step(r,commands,r.now+C.tickMs),tune=(p,extra={})=>({player:p,message:{type:'tune',...extra}});

test('four crew get the four different seats, each starting green',()=>{const r=drillRoom(4);tick(r);assert.deepEqual(r.players.map(p=>r.console[p.publicId].kind),C.console.kinds);assert.equal(r.oil.console,1);for(const g of Object.values(r.console))assert.equal(consoleZone(g.v),'green');});

test('HEAT climbs on its own, a vent tap knocks it back, and venting too often overcools',()=>{const s=seat('HEAT');s.run(30);assert.ok(s.g().v>0.55,'heat climbs untouched: '+s.g().v);
 const before=s.g().v;tuneConsole(s.room,s.p);assert.ok(Math.abs(s.g().v-(before-C.console.tuneStep))<1e-9,'one tap vents one burst');
 s.g().v=0.5;tuneConsole(s.room,s.p);assert.equal(consoleZone(s.g().v),'green');tuneConsole(s.room,s.p);assert.equal(consoleZone(s.g().v),'yellow','a second quick vent overcools');tuneConsole(s.room,s.p);tuneConsole(s.room,s.p);assert.equal(consoleZone(s.g().v),'red');
 const v=s.g().v;tuneConsole(s.room,s.p,{hold:true});tuneConsole(s.room,s.p,{level:0.9});assert.equal(s.g().v,v,'valve and throttle input do nothing on HEAT');});

test('PRESSURE builds while the valve is shut, bleeds while it is held, and a bare tap does nothing',()=>{const s=seat('PRESSURE');assert.equal(s.g().hold,false);s.run(20);const high=s.g().v;assert.ok(high>0.55,'pressure builds while shut: '+high);
 tuneConsole(s.room,s.p);assert.equal(s.g().v,high,'a tap is not a valve');tuneConsole(s.room,s.p,{hold:true});assert.equal(s.g().hold,true);s.run(10);const low=s.g().v;assert.ok(low<high-0.08,'holding bleeds it off: '+high+' to '+low);
 tuneConsole(s.room,s.p,{hold:false});s.run(10);assert.ok(s.g().v>low,'letting go builds it again');
 s.g().v=0.5;for(let i=0;i<80;i++){tuneConsole(s.room,s.p,{hold:s.g().v>0.5});s.run(1);assert.equal(consoleZone(s.g().v),'green','feathering the valve holds the green');}});

test('ALIGN axes wander apart until both pads are held, then pull together; the needle reads the gap',()=>{const s=seat('ALIGN');assert.equal(s.g().hold,false);s.run(100);assert.ok(gap(s.g())>0.24,'released axes drift out of the green: '+gap(s.g()));
 const g=s.g();assert.ok(Math.abs(g.v-(0.5+(g.a-g.b)/2))<1e-9);tuneConsole(s.room,s.p);tuneConsole(s.room,s.p,{level:0.2});assert.equal(s.g().v,g.v,'taps and throttle do nothing on ALIGN');
 tuneConsole(s.room,s.p,{hold:true});s.run(15);assert.ok(gap(s.g())<0.12,'holding both pads pulls the axes together: '+gap(s.g()));assert.equal(consoleZone(s.g().v),'green');
 for(let i=0;i<100;i++){s.run(1);assert.equal(consoleZone(s.g().v),'green','held axes stay locked');}
 const lo=0.1,hi=0.9;assert.ok(s.g().a>=lo&&s.g().a<=hi&&s.g().b>=lo&&s.g().b<=hi,'the axes stay on the graph');
 tuneConsole(s.room,s.p,{hold:false});s.run(100);assert.ok(gap(s.g())>0.24,'let go and they wander apart again');});

test('POWER: the target band wanders, the throttle sets the level, and riding the band keeps the needle green',()=>{const s=seat('POWER'),P=C.console.power,targets=[];for(let i=0;i<300;i++){s.run(1);targets.push(s.g().target);}
 assert.ok(targets.every(t=>t>=P.low&&t<=P.high),'the band stays on the graph');assert.ok(Math.max(...targets)-Math.min(...targets)>0.15,'the band wanders');
 tuneConsole(s.room,s.p,{level:0.9});const g=s.g();assert.equal(g.level,0.9);assert.ok(Math.abs(g.v-Math.min(1,Math.max(0,0.5+0.9-g.target)))<1e-9,'v = 0.5 + (level - target)');
 tuneConsole(s.room,s.p);tuneConsole(s.room,s.p,{hold:true});assert.equal(s.g().level,0.9,'taps and holds do nothing on POWER');
 for(let i=0;i<200;i++){tuneConsole(s.room,s.p,{level:s.g().target});s.run(1);assert.equal(consoleZone(s.g().v),'green','following the band holds the green');}});

test('the overdrive surge speeds every seat up',()=>{for(const kind of C.console.kinds){const calm=seat(kind,11),hard=seat(kind,11);calm.run(20,1);hard.run(20,C.console.overdriveDrift);
 const moved=g=>kind==='ALIGN'?Math.abs(g.a-0.5)+Math.abs(g.b-0.5):kind==='POWER'?Math.abs(g.target-0.5):Math.abs(g.v-0.5);assert.ok(moved(hard.g())>moved(calm.g()),kind+' moves further in overdrive');}});

test('seat input works only from the seat: nobody off the drill, nobody without a gauge',()=>{const s=seat('PRESSURE');s.p.boarded=false;tuneConsole(s.room,s.p,{hold:true});assert.equal(s.g().hold,false);s.p.boarded=true;tuneConsole(s.room,{publicId:'ghost',boarded:true},{hold:true});assert.equal(s.g().hold,false);});

test('a vent tap is rate limited like a dig tap, but valve and throttle messages always land',()=>{const r=drillRoom(2);tick(r);const [pressure,heat]=r.players;assert.equal(r.console[pressure.publicId].kind,'PRESSURE');assert.equal(r.console[heat.publicId].kind,'HEAT');
 r.console[heat.publicId].v=1;tick(r,Array.from({length:12},()=>tune(heat)));assert.ok(r.console[heat.publicId].v>0.2,'only eight vents a second count');
 tick(r,[...Array.from({length:9},()=>tune(pressure)),tune(pressure,{hold:true})]);assert.equal(r.console[pressure.publicId].hold,true,'a hold lands after the tap budget is spent');
 tick(r,[...Array.from({length:9},()=>tune(pressure)),tune(pressure,{hold:false})]);assert.equal(r.console[pressure.publicId].hold,false,'and so does the release');
 const q=drillRoom(4);tick(q);const power=q.players[3];tick(q,Array.from({length:20},(_,i)=>tune(power,{level:i/19})));assert.equal(q.console[power.publicId].level,1,'the last throttle position wins');});

test('a perfect crew holds all four seats green through the overdrive',()=>{const r=drillRoom(4);r.worldBreaker={startedAt:0,startRow:150,endsAt:1e9};for(let i=0;i<300;i++){tick(r,operate(r));if(i>0)assert.equal(r.oil.console,1,'tick '+i+' '+JSON.stringify(r.console));}});

test('the wire carries each seat\'s needle and control, rounded, and nothing server-only',()=>{const r=drillRoom(4);for(let i=0;i<5;i++)tick(r);const wire=snapshot(r,true).team.console,fields={HEAT:['kind','v'],PRESSURE:['hold','kind','v'],ALIGN:['a','b','hold','kind','v'],POWER:['kind','level','target','v']};
 for(const [id,g] of Object.entries(wire)){assert.deepEqual(Object.keys(g).sort(),fields[g.kind],g.kind);for(const [key,value] of Object.entries(g))if(typeof value==='number')assert.equal(Math.round(value*1000)/1000,value,key+' is rounded');assert.ok(JSON.stringify(g).length<80,JSON.stringify(g));assert.equal(g.v,Math.round(r.console[id].v*1000)/1000);}});

test('the tune validator accepts a tap, a valve hold and a throttle level, and nothing else',()=>{
 for(const m of [{type:'tune'},{type:'tune',hold:true},{type:'tune',hold:false},{type:'tune',level:0},{type:'tune',level:1},{type:'tune',level:0.437}]){assert.equal(validMessage(m),true,JSON.stringify(m));assert.deepEqual(decodeMessage(Buffer.from(JSON.stringify(m))),m);}
 for(const m of [{type:'tune',hold:'yes'},{type:'tune',hold:1},{type:'tune',level:-0.01},{type:'tune',level:1.01},{type:'tune',level:'0.5'},{type:'tune',level:NaN},{type:'tune',level:Infinity},{type:'tune',level:{}},{type:'tune',hold:true,level:0.5}])assert.equal(validMessage(m),false,JSON.stringify(m));
 assert.equal(decodeMessage(Buffer.from('{"type":"tune","level":2}')),null);});

// Bot habits, one seat at a time. Math.random is pinned so each habit is checked exactly: 0.99 never slips or fumbles, 0 always does.
function habit(random,fn){const saved=Math.random;Math.random=()=>random;try{return fn();}finally{Math.random=saved;}}
test('HEAT bots vent late, after a reaction delay, and sometimes twice',()=>{const L=C.bots.levels.normal,b={nextTune:0},out=[],add=(type,extra={})=>out.push({type,...extra});const g={kind:'HEAT',v:0.5+L.tuneAt-0.01};
 habit(0.99,()=>workSeat(g,b,L,0,add));assert.equal(out.length,0,'still waiting while only a little hot');g.v=0.5+L.tuneAt+0.01;habit(0.99,()=>workSeat(g,b,L,0,add));assert.deepEqual(out,[{type:'tune'}]);
 habit(0.99,()=>workSeat(g,b,L,50,add));assert.equal(out.length,1,'no second vent before the reaction time');habit(0,()=>workSeat(g,b,L,b.nextTune,add));assert.equal(out.length,3,'a fumble vents twice');});

test('PRESSURE bots open the valve when high and let go late',()=>{const L=C.bots.levels.normal,b={nextTune:0},out=[],add=(type,extra={})=>out.push({type,...extra});const g={kind:'PRESSURE',v:0.5+L.tuneAt+0.01,hold:false};
 habit(0.5,()=>workSeat(g,b,L,0,add));assert.deepEqual(out,[{type:'tune',hold:true}]);g.hold=true;g.v=0.5-L.letGo+0.01;habit(0.5,()=>workSeat(g,b,L,5000,add));assert.equal(out.length,1,'still bleeding below the centre line');
 g.v=0.5-L.letGo-0.01;habit(0.5,()=>workSeat(g,b,L,5000,add));assert.deepEqual(out[1],{type:'tune',hold:false});});

test('ALIGN bots grip both pads most of the time and slip off now and then',()=>{const L=C.bots.levels.normal,b={nextTune:0},out=[],add=(type,extra={})=>out.push({type,...extra});const g={kind:'ALIGN',v:0.5,a:0.5,b:0.5,hold:false};
 habit(0.99,()=>workSeat(g,b,L,0,add));assert.deepEqual(out,[{type:'tune',hold:true}]);g.hold=true;habit(0.99,()=>workSeat(g,b,L,100,add));assert.equal(out.length,1,'keeps holding');
 habit(0,()=>workSeat(g,b,L,200,add));assert.deepEqual(out[1],{type:'tune',hold:false});g.hold=false;assert.ok(b.gripAt>200);habit(0.99,()=>workSeat(g,b,L,201,add));assert.equal(out.length,2,'no regrip until the slip is over');habit(0.99,()=>workSeat(g,b,L,b.gripAt,add));assert.deepEqual(out[2],{type:'tune',hold:true});});

test('POWER bots chase the target with lag; easy bots lag more than hard ones',()=>{const chase=level=>{const L=C.bots.levels[level],b={nextTune:0},out=[],g={kind:'POWER',v:0.2,level:0.5,target:0.8};habit(0.5,()=>{for(let i=0;i<4;i++)workSeat(g,b,L,i*100,(type,extra)=>out.push(extra.level));});return out;};
 const easy=chase('easy'),hard=chase('hard');for(const run of [easy,hard]){assert.ok(run.every((x,i)=>x>(run[i-1]??0.5)&&x<0.8),'closes in without arriving: '+run);}assert.ok(easy.at(-1)<hard.at(-1),'easy '+easy.at(-1)+' hard '+hard.at(-1));
 const L=C.bots.levels;for(const key of ['tuneAt','tuneEveryMs','letGo','fumble','slip','slipMs','shake'])assert.ok(L.easy[key]>=L.normal[key]&&L.normal[key]>=L.hard[key],key+' gets sloppier as bots get easier');assert.ok(L.easy.follow<L.normal.follow&&L.normal.follow<L.hard.follow);});

// Through a whole overdrive: a person plays one seat perfectly and normal bots work the other three, in each arrangement.
test('normal bots keep every seat working through the overdrive, but never perfectly',()=>{const tally={};for(let k=0;k<4;k++){const r=lateGame(createRoom('BOTS',30+k,false,0,true));r.botLevel='normal';const p=join(r,'h','Ana',0);p.publicId='a';fillBots(r,0);
  r.players.splice(r.players.indexOf(p),1);r.players.splice(k,0,p);for(const q of r.players){q.boarded=true;q.boarding=false;q.drive=null;}r.worldBreaker={startedAt:0,startRow:r.cells[r.site].row,endsAt:1e9};
  for(let now=0;now<40000;now+=C.tickMs){const cmds=[...botCommands(r,now).filter(c=>c.message.type!=='propose'),...operate(r).filter(c=>c.player===p)];step(r,cmds,now);if(now>=2000)for(const b of crewBots(r)){const g=r.console[b.publicId],t=tally[g.kind]??={n:0,green:0,yellow:0,red:0};t.n++;t[consoleZone(g.v)]++;}}}
 assert.deepEqual(Object.keys(tally).sort(),[...C.console.kinds].sort());for(const [kind,t] of Object.entries(tally)){const green=t.green/t.n,red=t.red/t.n;assert.ok(green>0.1&&green<0.97,kind+' green '+green);assert.ok(red<0.4,kind+' red '+red);}});

test('in a showcase, a person who works their own seat rides the console for about 45 seconds and the overdrive cracks the core in under a minute',()=>{const {r,t}=playShowcase({seed:9,policy:'follow'});
 assert.ok(r.won);assert.ok(t.breaker-t.boarded>=35&&t.breaker-t.boarded<=70,'console '+(t.breaker-t.boarded)+' s');assert.ok(t.won-t.breaker>=30&&t.won-t.breaker<=C.team.worldBreakerMs/C.tapWindowMs,'overdrive '+(t.won-t.breaker)+' s');});

// The readout tells seated crew to propose the World Breaker in Command, so the confirm step has to work from the seat.
test('a seated crew member far from the hub can confirm the World Breaker proposal; someone walking there cannot',async()=>{const {createConfirmation}=await import('../public/confirmation.js');
 const r=createRoom('SHOW',4,false,0,true);setupShowcase(r);const p=join(r,'a','Ana',0);p.publicId='a';equipShowcase(r,p);[p.x,p.y]=[C.mapSize-1.5,C.mapSize-1.5];r.site=8*C.mapSize+4;r.drill={index:r.site};
 const nodes=Object.fromEntries(['confirm-panel','confirm-name','confirm-detail','confirm-price','confirm-wallet','confirm-status','confirm-yes','confirm-cancel','confirm-footprint'].map(id=>[id,{hidden:true,disabled:false,textContent:'',focus(){}}])),sent=[];
 const ui=createConfirmation({getContext:()=>{const state=snapshot(r,true);return {state,me:state.players.find(q=>q.id==='a'),connected:true};},send:m=>sent.push(m),money:n=>'$'+n,document:{getElementById:id=>nodes[id],activeElement:null}}),message={type:'propose',item:'worldBreaker'};
 ui.open(message);assert.equal(nodes['confirm-panel'].hidden,true,'walking far from the hub');p.boarded=true;ui.open(message);assert.equal(nodes['confirm-panel'].hidden,false,'aboard the drill');assert.equal(nodes['confirm-yes'].disabled,false);nodes['confirm-yes'].onclick();assert.deepEqual(sent,[message]);
 ui.open({type:'buy',kind:'tool'});assert.equal(nodes['confirm-panel'].hidden,true,'personal purchases still need the hub');});

test('the console UI ships: tall pads that never scroll or zoom, the graph, the road line, and no long dashes in the copy',async()=>{const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8'),server=await readFile(new URL('../server.js',import.meta.url),'utf8'),view=await readFile(new URL('../public/console-view.js',import.meta.url),'utf8'),goals=await readFile(new URL('../public/goals.js',import.meta.url),'utf8');
 for(const id of ['console-graph','console-pads','console-pad-left','console-tune','drill-road'])assert.match(html,new RegExp('id="'+id+'"'));assert.match(server,/CONSOLE_STYLE\);return;/);assert.match(server,/'console-view\.js'/);
 assert.match(CONSOLE_STYLE,/\.console-pad\{[^}]*min-height:54px/);assert.match(CONSOLE_STYLE,/\.console-pad\{[^}]*touch-action:none/);assert.match(CONSOLE_STYLE,/#console-graph\{[^}]*touch-action:none/);assert.match(view,/setPointerCapture/);assert.match(goals,/road to the World Breaker/);
 for(const text of [view,CONSOLE_STYLE,goals])assert.doesNotMatch(text,/[\u2013\u2014]/);});

test('a red needle says how deep it sits, from the red line to the end stop, by the zones the drill itself uses',()=>{const K=C.console;
 for(let i=0;i<=200;i++){const v=i/200,d=consoleRedDepth(v);assert.equal(d>0,consoleZone(v)==='red',String(v));assert.ok(d>=0&&d<=1);}
 assert.equal(consoleRedDepth(0),1);assert.equal(consoleRedDepth(1),1);assert.equal(consoleRedDepth(0.5+K.yellow),0);assert.ok(Math.abs(consoleRedDepth(0.5-(K.yellow+0.5)/2)-0.5)<1e-9,'halfway to the end stop');});

test('the red zone ships: your own red gauge pulses the view edges and rumbles the seat, a crewmate\'s flashes their row, reduced motion keeps them still',async()=>{const view=await readFile(new URL('../public/console-view.js',import.meta.url),'utf8'),client=await readFile(new URL('../public/client.js',import.meta.url),'utf8'),renderer=await readFile(new URL('../public/renderer3d.js',import.meta.url),'utf8');
 assert.match(CONSOLE_STYLE,/#map-wrap::before\{[^}]*pointer-events:none[^}]*var\(--red/);assert.match(CONSOLE_STYLE,/#map-wrap\.red-zone::before\{[^}]*animation:red-zone/);assert.match(CONSOLE_STYLE,/#console-crew \.red\{[^}]*animation:crew-red/);
 assert.match(CONSOLE_STYLE,/prefers-reduced-motion:reduce\)\{#map-wrap\.red-zone::before,#console-crew \.red\{animation:none\}/);
 assert.match(view,/import \{consoleZone,consoleRedDepth\} from '\/team-rules\.js'/);assert.doesNotMatch(view,/K\.yellow\?'yellow'/,'the view takes the zones from the rules, it does not redefine them');assert.match(view,/alarm\(consoleRedDepth\(g\.v\)\)/);assert.match(view,/flashUntil\.set\(id,now\+C\.three\.cockpit\.redFlashMs\)/);
 assert.match(client,/red:depth=>renderer\?\.redZone\?\.\(depth\)/);assert.match(renderer,/cabShake\(!!state\.team\.worldBreaker,redLevel,reduced/);});
