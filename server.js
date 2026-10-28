import {setupShowcase,equipShowcase} from './showcase-rules.js';
import {BOT_LEVELS,fillBots,makeRoomForPerson,botCommands} from './bot-rules.js';
import {detectorMask} from './lighting-rules.js';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {randomBytes,randomInt,randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {C,STYLE,M2_STYLE,M3_STYLE,HAUL_STYLE,THREE_STYLE,CAB_STYLE,SHIP_STYLE,POLISH_STYLE,FIELD_STYLE,EXPLORER_STYLE,BUILD2_STYLE,GUIDE_ANIMATION,BUILD4_STYLE,CORE_HUB_STYLE,SHORT_STYLE,GFX_STYLE,DRILL_STYLE} from './config.js';
import {createRoom,join,step,snapshot,snapshotForPlayer,depthAt} from './rules.js';
import {disconnect} from './presence-rules.js';
import {decodeMessage,escapeHtml,allowAction} from './resilience.js';
// Each deploy gets a build id; clients that reconnect to a newer server reload to pick up the new code.
const BUILD=process.env.RENDER_GIT_COMMIT||String(Date.now());
const rooms=new Map(),sockets=new Map(),queues=new Map();
const ended='That expedition has ended. Start a new one.';
const routes=new Map([['/',['public/index.html','text/html']],['/favicon.svg',['public/favicon.svg','image/svg+xml']],['/cover.png',['public/cover.png','image/png']],['/cover.html',['public/cover.html','text/html']],['/config.js',['config.js','text/javascript']],['/manifest.webmanifest',['public/manifest.webmanifest','application/manifest+json']],['/icon-192.png',['public/icon-192.png','image/png']],['/icon-512.png',['public/icon-512.png','image/png']]]);
for(const file of ['core-scene.js','client.js','protocol.js','team-view.js','renderer.js','audio.js','renderer3d.js','input.js','feedback.js','scene-assets.js','cab-scene.js','control-math.js','cover.js','scene-preview.js','confirmation.js','pit-geometry.js','explorer-models.js','supply-view.js','goals.js','logistics-view.js','wording.js','glow.js','quality.js','flora.js','dawn.js'])routes.set('/'+file,['public/'+file,'text/javascript']);
for(const file of ['rules.js','team-rules.js','hauling-rules.js','formatters.js','shaft-rules.js','movement-rules.js','presence-rules.js','resilience.js','economy-rules.js','excavator-rules.js','obstacles.js','personal-conveyors.js','lighting-rules.js'])routes.set('/'+file,[file,'text/javascript']);
const server=http.createServer(async(req,res)=>{
 let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400);res.end();return;}
 const json=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 if(url.pathname==='/style.css'){res.writeHead(200,{'Content-Type':'text/css','Cache-Control':'no-store'});res.end(STYLE+M2_STYLE+M3_STYLE+HAUL_STYLE+THREE_STYLE+CAB_STYLE+SHIP_STYLE+POLISH_STYLE+FIELD_STYLE+EXPLORER_STYLE+BUILD2_STYLE+GUIDE_ANIMATION+BUILD4_STYLE+CORE_HUB_STYLE+SHORT_STYLE+GFX_STYLE+DRILL_STYLE);return;}
 if(url.pathname==='/health'){json(200,{ok:true,rooms:rooms.size,players:[...rooms.values()].reduce((n,r)=>n+r.players.filter(p=>p.connected).length,0)});return;}
 const roomMatch=/^\/room\/([A-Za-z]{4})$/.exec(url.pathname);if(roomMatch){const r=rooms.get(roomMatch[1].toUpperCase());if(!r||Date.now()-r.lastActivity>=C.idleMs)json(404,{error:'That room has ended'});else json(200,{code:r.code,crew:r.players.filter(p=>p.connected&&!p.bot).length,bots:r.players.filter(p=>p.bot&&!p.departed).length,depth:depthAt(r.deepest)});return;}
 let route=routes.get(url.pathname);if(/^\/vendor\/[a-zA-Z0-9._-]+$/.test(url.pathname))route=['public'+url.pathname,url.pathname.endsWith('.js')?'text/javascript':'text/plain'];if(!route){res.writeHead(404);res.end('Not found');return;}
 try{let body=await readFile(new URL(route[0],import.meta.url));if(url.pathname==='/'){const host=String(req.headers.host||'localhost').replace(/[^a-zA-Z0-9.:[\]-]/g,''),proto=req.headers['x-forwarded-proto']==='https'||req.socket.encrypted?'https':'http',origin=proto+'://'+host,r=rooms.get((url.searchParams.get('room')||'').toUpperCase());body=body.toString().replaceAll('__ORIGIN__',escapeHtml(origin)).replace('__HOST__',escapeHtml(r?.players[0]?.nickname||''));}res.writeHead(200,{'Content-Type':route[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; frame-ancestors 'none'"});res.end(body);}catch{res.writeHead(404);res.end('Not found');}
});
const wss=new WebSocketServer({server,maxPayload:C.resilience.wireLimit});
function send(ws,data){if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));}
function makeCode(){let code;do{code=Array.from({length:C.codeLength},()=>C.codeAlphabet[randomInt(C.codeAlphabet.length)]).join('');}while(rooms.has(code));return code;}
function drop(ws){const b=sockets.get(ws);if(b){disconnect(b.room,b.player,Date.now());sockets.delete(ws);}}
wss.on('connection',ws=>{
 ws.alive=true;ws.messageTimes=[];ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});
 ws.on('message',(data,binary)=>{
  const now=Date.now();ws.messageTimes=ws.messageTimes.filter(t=>now-t<C.resilience.actionWindowMs);if(ws.messageTimes.length>=C.resilience.messageLimit)return;ws.messageTimes.push(now);
  const msg=decodeMessage(data,binary);if(!msg)return;
  if(msg.type==='ping'){if(Number.isFinite(msg.at))send(ws,{type:'pong',at:msg.at});return;}
  if(msg.type==='create'||msg.type==='join'){
   if(sockets.has(ws))return;
   let room;if(msg.type==='create'){const code=makeCode();room=createRoom(code,randomBytes(4).readUInt32LE(),msg.fast===true,now,msg.quick===true);room.botLevel=BOT_LEVELS.includes(msg.bots)?msg.bots:'off';if(msg.showcase===true)setupShowcase(room);rooms.set(code,room);queues.set(code,[]);}else{room=rooms.get(String(msg.code||'').toUpperCase());if(!room||now-room.lastActivity>=C.idleMs){send(ws,{type:'error',code:'ended',text:ended});return;}}
   const token=typeof msg.token==='string'&&room.players.some(p=>p.token===msg.token)?msg.token:randomBytes(24).toString('hex');let p;
   if(!room.players.some(q=>q.token===token&&!q.departed))makeRoomForPerson(room,now);
   try{p=join(room,token,msg.nickname,now);}catch(error){send(ws,{type:'error',text:error.message});return;}p.publicId??=randomUUID();equipShowcase(room,p);fillBots(room,now);
   for(const [other,b]of sockets)if(b.player===p){sockets.delete(other);other.close();}
   sockets.set(ws,{room,player:p,detectors:detectorMask(p)});send(ws,{type:'welcome',token,id:p.publicId,build:BUILD});send(ws,snapshotForPlayer(room,snapshot(room,true),p));return;
  }
  const b=sockets.get(ws);if(!b||!allowAction(b.player,msg.type,now))return;const queue=queues.get(b.room.code);if(!queue||queue.length>=C.resilience.queueLimit)return;
  if(['tune','aim','belayDown','layConveyor','buyExcavator','placeExcavator','toggleExcavator','takeExcavator','belay','move','tap','buy','chip','propose','proposeSite','proposeConveyor','returnHome','vote','cancelVote','board','reset'].includes(msg.type))queue.push({player:b.player,message:msg,respond:r=>send(ws,r)});
 });ws.on('close',()=>drop(ws));
});
setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){drop(ws);ws.terminate();continue;}ws.alive=false;ws.ping();}},C.heartbeatMs);
setInterval(()=>{
 const now=Date.now();for(const [code,room]of rooms){if(now-room.lastActivity>=C.idleMs){for(const [ws,b]of sockets)if(b.room===room){send(ws,{type:'expired',code:'ended',text:ended});sockets.delete(ws);ws.close();}rooms.delete(code);queues.delete(code);continue;}
  const queue=queues.get(code);queues.set(code,[]);if(room.botLevel&&room.botLevel!=='off'){if(now-(room.botsCheckedAt||0)>=C.bots.fillEveryMs){room.botsCheckedAt=now;fillBots(room,now);}queue.push(...botCommands(room,now));}step(room,queue,now);const diff=snapshot(room);for(const [ws,b]of sockets)if(b.room===room){send(ws,snapshotForPlayer(room,diff,b.player,b.detectors));b.detectors=detectorMask(b.player);for(const toast of room.privateToasts[b.player.publicId]||[])send(ws,toast);}
 }
},C.tickMs);
const portFlag=process.argv.indexOf('--port');server.listen(Number(process.env.PORT)||Number(portFlag>=0?process.argv[portFlag+1]:null)||C.defaultPort,'0.0.0.0',()=>console.log('Toothpick authority listening on',server.address().port));
