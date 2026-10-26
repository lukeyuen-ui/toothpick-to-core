import {createRenderer3D} from '/renderer3d.js';
import {createScenePreview} from '/scene-preview.js';
try{const preview=createScenePreview(document.getElementById('cover'),createRenderer3D,'cover');function draw(now){preview.draw(now);document.documentElement.dataset.cover='ready';requestAnimationFrame(draw);}requestAnimationFrame(draw);}catch(error){const p=document.getElementById('error');p.hidden=false;p.textContent='WebGL is required to capture this actual 3D scene. Screenshot this fixed 1200 by 630 frame and save as public/cover.png.';console.warn(error);}
