import test from 'node:test';
import assert from 'node:assert/strict';
import {C} from '../config.js';
import {createRoom,join,step} from '../rules.js';
import {normalizeMove,validPosition} from '../movement-rules.js';
import {home} from '../hauling-rules.js';
const setup=()=>{const r=createRoom('TEST',42,false,0),p=join(r,'token','Mover',0);p.publicId='mover';p.x=p.y=4.5;return {r,p};};
const cmd=(p,dx,dy)=>({player:p,message:{type:'move',dx,dy}});
const tick=(r,actions=[],now=r.now+C.tickMs)=>step(r,actions,now);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('move accepts any finite vector of length at most one, preserving analog magnitude',()=>{assert.deepEqual(normalizeMove(0.6,0.8),{dx:0.6,dy:0.8});assert.deepEqual(normalizeMove(0.2,-0.1),{dx:0.2,dy:-0.1});assert.deepEqual(normalizeMove(0,0),{dx:0,dy:0});for(const [x,y]of [[NaN,0],[Infinity,0],['1',0],[2,0],[1,0.4],[1,1],[null,1]])assert.equal(normalizeMove(x,y),null);});
test('all mobility speeds are authoritative, diagonal distance does not increase',()=>{for(let tier=0;tier<C.mobility.length;tier++){const {r,p}=setup();p.mobility=tier;tick(r,[cmd(p,1,0)]);near(p.x,4.5+C.mobility[tier].speed*C.tickSeconds);near(p.y,4.5);const second=setup();second.p.mobility=tier;tick(second.r,[cmd(second.p,Math.SQRT1_2,Math.SQRT1_2)]);near(Math.hypot(second.p.x-4.5,second.p.y-4.5),C.mobility[tier].speed*C.tickSeconds);}});
test('timeout stops motion, bad input does not refresh it, keepalives sustain a held move',()=>{const {r,p}=setup();tick(r,[cmd(p,1,0)],100);tick(r,[cmd(p,'bad',0)],800);const before=p.x;tick(r,[],901);near(p.x,before);assert.equal(p.move.dx,0);for(let i=0;i<10;i++)tick(r,i%5===0?[cmd(p,1,0)]:[],1000+i*100);near(p.x-before,2);tick(r,[cmd(p,0,0)],2000);const stop=p.x;tick(r);assert.equal(p.x,stop);});
test('movement slides at depot and edges, including fast movement',()=>{const {r,p}=setup();p.x=6.7;p.y=7.5;p.mobility=3;for(let i=0;i<10;i++){tick(r,[cmd(p,Math.SQRT1_2,Math.SQRT1_2)]);assert.ok(validPosition(p.x,p.y));}assert.ok(p.y>9);p.x=C.movement.collisionRadius;p.y=4.5;tick(r,[cmd(p,-Math.SQRT1_2,Math.SQRT1_2)]);near(p.x,C.movement.collisionRadius);assert.ok(p.y>4.5);p.x=C.mapSize-0.21;p.y=4.5;tick(r,[cmd(p,1,0)]);near(p.x,C.mapSize-C.movement.collisionRadius);});
test('move clears drive, return, targeting and boarding; taps while held cannot dig',()=>{const {r,p}=setup();p.drive={x:8.5,y:8.5};p.target={x:4,y:4};p.returning=p.boarded=p.boarding=true;tick(r,[cmd(p,1,0),{player:p,message:{type:'tap',x:4,y:4}}]);assert.equal(p.drive,null);assert.equal(p.target,null);assert.equal(p.returning,false);assert.equal(p.boarded,false);assert.equal(p.boarding,false);assert.deepEqual(r.cells[4*C.mapSize+4].damage,{});});
test('click autopilot routes around a depot aligned with its destination',()=>{const {r,p}=setup();p.x=7.5;p.y=4.5;tick(r,[{player:p,message:{type:'tap',x:7,y:12}}]);for(let i=0;i<130&&p.drive;i++){tick(r);assert.ok(validPosition(p.x,p.y));}assert.equal(p.drive,null);near(p.x,7.5);near(p.y,12.5);});

test('depot tap driving and Return to base stop outside all depot cells from every side',()=>{for(const [x,y]of [[7.5,3.5],[7.5,12.5],[3.5,7.5],[12.5,7.5]])for(const returning of [false,true]){const {r,p}=setup();p.x=x;p.y=y;if(returning){p.hold={value:100,units:1,lots:[{value:100,order:1}]};tick(r,[{player:p,message:{type:'returnHome'}}]);}else tick(r,[{player:p,message:{type:'tap',x:7,y:7}}]);for(let i=0;i<100&&p.drive;i++){assert.ok(validPosition(p.x,p.y));assert.ok(!C.hauling.depotCells.some(([cx,cy])=>cx===Math.floor(p.x)&&cy===Math.floor(p.y)));tick(r);}assert.equal(p.drive,null);assert.ok(validPosition(p.x,p.y));assert.ok(!C.hauling.depotCells.some(([cx,cy])=>cx===Math.floor(p.x)&&cy===Math.floor(p.y)));if(returning){assert.equal(p.wallet,100);assert.equal(p.hold.units,0);}}});

// Holes are walls: the opening (the cell less its lip) stops the explorer's disc, so nobody walks over a hole, along the seam between two holes or
// through the corner where two meet. A hole broken beside you leaves you on its lip; one broken under you still drops you in.
import {overPit} from '../movement-rules.js';
import {hp,hit} from '../rules.js';
import {fillBots,botCommands,crewBots} from '../bot-rules.js';
const dig=(r,x,y,row)=>r.cells[y*C.mapSize+x]={row,hp:hp(row),damage:{}};
const lip=C.movement.collisionRadius-C.pits.inset;// the explorer's centre stays collisionRadius short of the opening, which starts inset past the cell's edge
test('holes are walls to the lip: no walking over a hole, along a seam between two holes or through their corner',()=>{
 {const {r,p}=setup();dig(r,5,4,8);for(let i=0;i<40;i++)tick(r,[cmd(p,1,0)]);assert.equal(p.shaft,null);assert.ok(p.x<=5-lip+1e-9,'stops short of the opening: '+p.x);assert.ok(p.x>5-lip-0.05,'but reaches the lip: '+p.x);assert.ok(!overPit(r,p.x,p.y));}
 {const {r,p}=setup();dig(r,5,4,8);dig(r,5,5,8);p.x=4.5;p.y=5;for(let i=0;i<40;i++)tick(r,[cmd(p,1,0)]);assert.ok(p.x<=5-lip+1e-9,'the seam between two holes is too narrow: '+p.x);}
 {const {r,p}=setup();dig(r,5,4,8);dig(r,4,5,8);for(let i=0;i<60;i++)tick(r,[cmd(p,Math.SQRT1_2,Math.SQRT1_2)]);assert.ok(Math.floor(p.x)<5||Math.floor(p.y)<5,'the corner between two holes does not let you through: '+p.x+','+p.y);assert.ok(!overPit(r,p.x,p.y));}
 {const {r,p}=setup();dig(r,5,4,8);p.x=4.5;tick(r,[{player:p,message:{type:'tap',x:7,y:4}}]);for(let i=0;i<60&&p.drive;i++)tick(r);near(p.x,7.5);near(p.y,4.5);assert.equal(p.shaft,null,'the click autopilot walks round a shaft');}
 {const {r,p}=setup();dig(r,7,4,8);p.x=4.5;tick(r,[{player:p,message:{type:'tap',x:7,y:4}}]);for(let i=0;i<60&&p.drive;i++)tick(r);assert.ok(p.x<=7-lip+1e-9,'aimed into a shaft, it stops at the rim: '+p.x);assert.equal(p.shaft,null);}
});
test('a hole broken beside you nudges you onto its lip; one broken under you still drops you in',()=>{
 {const {r,p}=setup();p.x=4.95;p.y=4.5;p.tool=8;dig(r,5,4,C.shafts.surfaceReachRows);r.cells[4*C.mapSize+5].hp=1;hit(r,p,5,4,5,true);tick(r,[cmd(p,0,0)]);assert.equal(p.shaft,null);assert.ok(p.x<=5-lip+1e-9,'nudged clear: '+p.x);assert.ok(!overPit(r,p.x,p.y));}
 {const {r,p}=setup();p.x=4.95;p.y=4.5;dig(r,5,4,C.shafts.surfaceReachRows);for(let i=0;i<10;i++)tick(r,[cmd(p,1,0)]);assert.ok(p.x>5.5,'a scrape of three rows is a dent you walk through: '+p.x);}
 {const {r,p}=setup();p.x=4.5;p.y=4.5;p.tool=8;r.cells[4*C.mapSize+4].hp=1;tick(r,[{player:p,message:{type:'tap',x:4,y:4}}]);assert.equal(p.shaft,4*C.mapSize+4,'the cell under you breaking drops you into it');}
});
test('bots route around holes and belay down from a neighbouring cell',()=>{
 const r=createRoom('BOTS',5,false,0);r.botLevel='normal';const h=join(r,'human','Ana',0);h.publicId='a';h.x=h.y=3.5;fillBots(r,0);
 for(const [x,y] of [[5,3],[5,4],[5,5],[6,3],[6,5],[7,3],[7,4],[7,5]])dig(r,x,y,6);dig(r,6,4,12);// a ring of holes round a deep one
 let aboveHole=0,belayed=0;for(let now=0;now<120*C.tapWindowMs;now+=C.tickMs){step(r,botCommands(r,now),now);for(const b of crewBots(r)){if(b.shaft!=null){belayed++;continue;}if(overPit(r,b.x,b.y))aboveHole++;}}
 assert.equal(aboveHole,0,'no bot ever stands over a hole');assert.ok(belayed>0,'bots still belay into holes from the rim');
});
test('Return to base hops across shafts that cut the hub off: down into the hole towards home, up on its far side, and on',()=>{const {r,p}=setup();for(let y=0;y<C.mapSize;y++){dig(r,10,y,12);dig(r,11,y,12);}p.x=12.5;p.y=7.5;p.hold={value:100,units:1,lots:[{value:100,order:1}]};
 tick(r,[{player:p,message:{type:'returnHome'}}]);let hops=0,t=0;while(t++<800&&(p.returning||p.belay||p.shaft!=null)){if(p.shaft!=null&&!p.hopSeen){p.hopSeen=true;hops++;}if(p.shaft==null)p.hopSeen=false;tick(r);}
 assert.ok(hops>=1,'crossed by belaying through a shaft');assert.ok(home(p.x,p.y),'ends at home: '+p.x.toFixed(2)+','+p.y.toFixed(2));assert.equal(p.hold.units,0,'and sells the hold');
 // No shaft towards home means no hop: the drive just stops at the rim.
 const again=setup();again.p.x=12.5;again.p.y=7.5;for(let y=0;y<C.mapSize;y++){again.r.cells[y*C.mapSize+10].row=1;}tick(again.r,[{player:again.p,message:{type:'returnHome'}}]);for(let i=0;i<80;i++)tick(again.r);assert.ok(home(again.p.x,again.p.y),'a one-row scrape is no wall: '+again.p.x.toFixed(2));});
