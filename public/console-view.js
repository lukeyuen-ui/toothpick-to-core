import {C} from '/config.js';
// Drill console seats. The server owns every needle; this view only sends the seat's own control (a HEAT vent tap, a held
// PRESSURE valve or pair of ALIGN pads, a POWER throttle level) and smooths what it draws between the 10 Hz updates.
const K=C.console;
const SEATS={
 HEAT:{words:['OVERCOOLED','COOLING','STEADY','RUNNING HOT','OVERHEATING'],pad:['VENT','tap when it runs hot','Space or click'],help:['Heat climbs on its own. Tap VENT to cool it, but every vent bites, so too many overcool.','Heat climbs on its own. Space, a click or VENT cools it, but every vent bites, so too many overcool.']},
 PRESSURE:{words:['BLED DRY','LOW','STEADY','BUILDING','OVERPRESSURE'],pad:['HOLD TO BLEED','let go to build','hold Space'],help:['Pressure builds while the valve is shut. Hold the pad to bleed it off and let go before it drops too far.','Pressure builds while the valve is shut. Hold Space or the pad to bleed it off and let go before it drops too far.']},
 ALIGN:{words:['OFF AXIS','SLIPPING','LOCKED','SLIPPING','OFF AXIS'],pad:['HOLD','drill axis','hold A'],right:['HOLD','bore axis','hold D'],help:['Hold both pads, one thumb each, to pull the drill axis onto the bore axis. Let go and they wander apart.','Hold A and D together to pull the drill axis onto the bore axis. Let go and they wander apart.']},
 POWER:{words:['STARVED','LOW','ON TARGET','HIGH','SURGING'],help:['The target band wanders. Drag up and down on the graph to keep the throttle inside the green.','The target band wanders. Hold W or S, or drag the graph, to keep the throttle inside the green.']}};
const zoneOf=v=>{const d=Math.abs(v-0.5);return d<=K.green?'green':d<=K.yellow?'yellow':'red';},COLORS={green:'#4fd17f',yellow:'#e6b84a',red:'#ff6b62'};
// Five words per seat: red low, yellow low, green, yellow high, red high.
const word=(seat,v)=>{const z=zoneOf(v),i=z==='green'?2:z==='yellow'?(v<0.5?1:3):(v<0.5?0:4);return SEATS[seat].words[i];};
const round=x=>Math.round(x*1000)/1000,clamp=x=>Math.min(1,Math.max(0,x));
export function createConsoleView({send,pulse=()=>{},touch=()=>false,doc=globalThis.document}){
 const $=id=>doc.getElementById(id),panel=$('drill-console'),graph=$('console-graph'),left=$('console-pad-left'),right=$('console-tune'),ctx=graph.getContext('2d');
 let seat=null,cur=null,prev=null,curAt=0,hold=false,sentHoldAt=-1e9,level=0.5,sentLevel=null,sentLevelAt=-1e9,drag=null,lastFrame=null,history=[],sampledAt=0,touched=false;
 const pressed={left:new Set(),right:new Set()},keys={space:false,a:false,d:false,w:false,s:false};
 const label=(el,[text,touchHint,keyHint])=>{const b=doc.createElement('b'),s=doc.createElement('small');b.textContent=text;s.textContent=touch()?touchHint:keyHint;el.replaceChildren(b,s);};
 function vent(){if(seat!=='HEAT')return;send({type:'tune'});pulse();right.classList.add('held');setTimeout(()=>right.classList.remove('held'),140);}
 // A hold counts while any finger or key on that side is down; ALIGN needs both sides at once.
 function update(){const l=pressed.left.size>0||keys.a,r=pressed.right.size>0||(seat==='PRESSURE'?keys.space:keys.d),want=seat==='PRESSURE'?r:seat==='ALIGN'?l&&r:false;
  left.classList.toggle('held',seat==='ALIGN'&&l);if(seat!=='HEAT')right.classList.toggle('held',r);if(want!==hold){hold=want;sendHold();}}
 function sendHold(){send({type:'tune',hold});sentHoldAt=performance.now();if(hold)pulse();}
 function sendLevel(now){sentLevel=round(level);sentLevelAt=now;send({type:'tune',level:sentLevel});}
 function releaseAll(){for(const s of Object.values(pressed))s.clear();for(const k of Object.keys(keys))keys[k]=false;drag=null;update();}
 function setup(kind,g){seat=kind;panel.dataset.kind=kind||'';releaseAll();hold=!!g?.hold;level=g?.level??0.5;sentLevel=null;history=[];prev=cur=null;touched=false;if(!kind)return;
  const S=SEATS[kind];left.hidden=kind!=='ALIGN';right.hidden=kind==='POWER';graph.hidden=kind!=='ALIGN'&&kind!=='POWER';if(S.pad)label(right,S.right||S.pad);if(kind==='ALIGN')label(left,S.pad);right.setAttribute('aria-label',kind==='HEAT'?'Vent heat':kind==='PRESSURE'?'Hold to bleed pressure':'Hold the bore axis');left.setAttribute('aria-label','Hold the drill axis');}
 // Pads take pointer events so two thumbs can hold two pads at once; capture keeps a hold alive while a thumb slides off.
 for(const [el,side] of [[left,'left'],[right,'right']]){
  el.addEventListener('pointerdown',e=>{if(!seat||(e.button!==undefined&&e.button!==0))return;e.preventDefault();try{el.setPointerCapture(e.pointerId);}catch{}if(seat==='HEAT'){vent();return;}pressed[side].add(e.pointerId);update();});
  const up=e=>{if(pressed[side].delete(e.pointerId))update();};for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,up);
  // Keyboard or assistive activation arrives as a click with no pointer; it vents HEAT, the only seat a single press can play.
  el.addEventListener('click',e=>{if(e.detail===0&&side==='right')vent();});el.addEventListener('contextmenu',e=>e.preventDefault());}
 // POWER: press anywhere on the graph to put the throttle there, then drag; the level goes out at most every sendMs and once more on release.
 const aim=e=>{const r=graph.getBoundingClientRect(),pad=r.height*0.08;level=clamp(1-(e.clientY-r.top-pad)/Math.max(1,r.height-2*pad));touched=true;};
 graph.addEventListener('pointerdown',e=>{if(seat!=='POWER')return;e.preventDefault();try{graph.setPointerCapture(e.pointerId);}catch{}drag=e.pointerId;aim(e);});
 graph.addEventListener('pointermove',e=>{if(e.pointerId===drag)aim(e);});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])graph.addEventListener(type,e=>{if(e.pointerId!==drag)return;drag=null;sendLevel(performance.now());});
 globalThis.addEventListener?.('blur',releaseAll);doc.addEventListener?.('visibilitychange',()=>{if(doc.hidden)releaseAll();});
 // Keys while seated: Space vents HEAT or holds the PRESSURE valve, A and D are the two ALIGN pads, W and S push the POWER throttle.
 function key(e,k,down){const name=e.code==='Space'?'space':['a','d','w','s'].includes(k)?k:null;if(!name)return false;
  if(!seat){if(!down&&keys[name]){keys[name]=false;return true;}return false;}
  const mine=name==='space'?seat==='HEAT'||seat==='PRESSURE':name==='a'||name==='d'?seat==='ALIGN':seat==='POWER';if(!mine)return false;e.preventDefault?.();
  if(seat==='HEAT'){if(down&&!e.repeat)vent();return true;}if(e.repeat)return true;keys[name]=down;if(seat==='POWER'){touched=true;if(!down)sendLevel(performance.now());}else update();return true;}
 function render(state,me){const g=state.team?.console?.[me.id],on=!!me.boarded&&!!g&&!state.team?.won;panel.hidden=!on;if(!on){if(seat)setup(null);return;}if(g.kind!==seat)setup(g.kind,g);
  const z=zoneOf(g.v),wb=state.team.worldBreaker,now=performance.now();if(g!==cur){prev=cur||g;cur=g;curAt=now;}
  $('console-title').textContent=(wb?'OVERDRIVE '+Math.round((wb.charge||0)*100)+'% · ':'')+g.kind+' · '+word(g.kind,g.v)+(wb?'':' · drill x'+(+(state.team.oil?.console??1)).toFixed(2));$('console-title').style.color=COLORS[z];$('console-needle').style.left=(g.v*100).toFixed(1)+'%';
  const crew=$('console-crew'),gauges=state.team.console,others=state.players.filter(p=>p.id!==me.id&&gauges[p.id]),keyList=others.map(p=>p.id+':'+gauges[p.id].kind).join(',');
  if(crew.dataset.key!==keyList){crew.dataset.key=keyList;crew.replaceChildren();for(const p of others){const name=doc.createElement('span');name.textContent=p.nickname+' · '+gauges[p.id].kind;const bar=doc.createElement('div');bar.className='console-bar';const n=doc.createElement('i');n.className='needle';n.dataset.id=p.id;bar.append(n);crew.append(name,bar);}}
  for(const n of crew.querySelectorAll('.needle'))n.style.left=((gauges[n.dataset.id]?.v??0.5)*100).toFixed(1)+'%';
  const help=SEATS[g.kind].help[touch()?0:1];$('console-help').textContent=(wb?'Overdrive! Every seat moves faster now, and each green gauge cracks the core sooner. '+help:help+' Green gauges are the road to the World Breaker.')+(touch()?'':' R to leave.');
  // The server echoes the valve and throttle; if a message was lost, or the seat was rebuilt on reboarding, say it again.
  if(seat==='PRESSURE'||seat==='ALIGN'){if(g.hold!==hold&&now-sentHoldAt>400)sendHold();}
  else if(seat==='POWER'&&touched&&Math.abs((g.level??0.5)-level)>0.02&&now-sentLevelAt>400&&drag==null)sendLevel(now);}
 function frame(now){if(!seat||panel.hidden){lastFrame=null;return;}const dt=lastFrame==null?0:Math.min(0.1,(now-lastFrame)/1000);lastFrame=now;
  if(seat==='POWER'){const push=(keys.w?1:0)-(keys.s?1:0);if(push)level=clamp(level+push*K.power.keys*dt);if((push||drag!=null)&&round(level)!==sentLevel&&now-sentLevelAt>=K.sendMs)sendLevel(now);}
  if(graph.hidden||!cur)return;
  // Ease between the last two server samples (about one tick behind) so the axes and the band glide instead of stepping at 10 Hz.
  const t=Math.min(1,(now-curAt)/C.tickMs),mix=key=>(prev[key]??cur[key])+((cur[key]??0)-(prev[key]??cur[key]))*t;
  if(now-sampledAt>=33){sampledAt=now;history.push(seat==='ALIGN'?{at:now,a:mix('a'),b:mix('b')}:{at:now,target:mix('target'),level:mix('level')});while(history.length&&now-history[0].at>4000)history.shift();}
  draw(now);}
 function draw(now){const dpr=Math.min(2,globalThis.devicePixelRatio||1),w=Math.max(1,graph.clientWidth),h=Math.max(1,graph.clientHeight);if(graph.width!==Math.round(w*dpr)||graph.height!==Math.round(h*dpr)){graph.width=Math.round(w*dpr);graph.height=Math.round(h*dpr);}
  const c=ctx,pad=h*0.08,y=v=>pad+(1-v)*(h-2*pad),x=at=>w-(now-at)/4000*w;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);c.fillStyle='#08161b';c.fillRect(0,0,w,h);c.strokeStyle='#17323a';c.lineWidth=1;for(const v of [0.25,0.5,0.75]){c.beginPath();c.moveTo(0,y(v));c.lineTo(w,y(v));c.stroke();}
  if(!history.length)return;const last=history[history.length-1];c.font='bold 10px system-ui';c.textBaseline='top';
  const line=(key,color)=>{c.strokeStyle=color;c.lineWidth=2.5;c.beginPath();history.forEach((s,i)=>i?c.lineTo(x(s.at),y(s[key])):c.moveTo(x(s.at),y(s[key])));c.stroke();};
  if(seat==='ALIGN'){
   // Shade the gap between the axes in its zone colour: a slim green ribbon is a locked bore.
   for(let i=1;i<history.length;i++){const s=history[i],p=history[i-1];c.fillStyle=COLORS[zoneOf(0.5+(s.a-s.b)/2)]+'55';c.beginPath();c.moveTo(x(p.at),y(p.a));c.lineTo(x(s.at),y(s.a));c.lineTo(x(s.at),y(s.b));c.lineTo(x(p.at),y(p.b));c.closePath();c.fill();}
   line('a','#80d8ff');line('b','#ffb85c');const z=COLORS[zoneOf(0.5+(last.a-last.b)/2)];c.fillStyle=z;c.fillRect(w-5,Math.min(y(last.a),y(last.b)),4,Math.max(2,Math.abs(y(last.a)-y(last.b))));
   c.fillStyle='#80d8ff';c.fillText('DRILL AXIS',6,4);c.fillStyle='#ffb85c';c.textAlign='right';c.fillText('BORE AXIS',w-10,4);c.textAlign='left';return;}
  // POWER: the wandering target as a yellow band with a green core, the throttle trail in white, and the live throttle as a handle.
  const band=(span,color)=>{c.fillStyle=color;c.beginPath();history.forEach((s,i)=>i?c.lineTo(x(s.at),y(clamp(s.target+span))):c.moveTo(x(s.at),y(clamp(s.target+span))));for(let i=history.length-1;i>=0;i--)c.lineTo(x(history[i].at),y(clamp(history[i].target-span)));c.closePath();c.fill();};
  band(K.yellow,'#e6b84a33');band(K.green,'#4fd17f77');line('level','#ffffffcc');
  const live=touched?level:last.level,z=COLORS[zoneOf(0.5+live-last.target)],hy=y(live);c.fillStyle=z;c.fillRect(w-26,hy-4,24,8);c.strokeStyle='#ffffff';c.lineWidth=1.5;c.strokeRect(w-26,hy-4,24,8);
  c.fillStyle='#bfe8f2';c.fillText('TARGET',6,4);if(!touched){c.textAlign='right';c.fillStyle='#bfe8f2aa';c.fillText(touch()?'drag to steer':'W / S or drag',w-32,h-16);c.textAlign='left';}}
 return {render,frame,key,tap:vent,get seat(){return seat;}};
}
