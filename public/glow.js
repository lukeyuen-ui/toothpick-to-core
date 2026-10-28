import * as T from './vendor/three.module.js';
// Post-processing for the 3D view, built from core three.js classes only.
// The scene renders into a multisampled HDR target. A half resolution bright pass with a soft knee keeps only light above the
// threshold, separable Gaussian blurs spread it at quarter and eighth resolution, and one full-screen composite adds the glow,
// a white flash, chromatic aberration and a vignette before ACES tone mapping and sRGB output (render targets skip both, so the
// composite applies them and the image keeps the renderer's look). After tone mapping the composite grades the image: saturation,
// a split tone (blacks lifted toward navy, shade cooled, highlights kept neutral-warm) and contrast, then a faint film grain where
// the preset asks for it. Without WebGL2 render targets it falls back to a plain render.
const VERT='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}';
// Gaussian weights folded into bilinear pairs, so a 17-tap kernel costs 9 texture reads.
export function gaussianTaps(radius,sigma){const w=[];let sum=0;for(let i=0;i<=radius;i++){const v=Math.exp(-i*i/(2*sigma*sigma));w.push(v);sum+=i?2*v:v;}const taps=[[0,w[0]/sum]];for(let i=1;i<=radius;i+=2){const a=w[i]/sum,b=i+1<=radius?w[i+1]/sum:0;taps.push([(i*a+(i+1)*b)/(a+b),a+b]);}return taps;}
function blurShader(taps){let s='uniform sampler2D tInput;uniform vec2 dir;varying vec2 vUv;void main(){vec3 c=texture2D(tInput,vUv).rgb*'+taps[0][1].toFixed(6)+';';for(const [o,w] of taps.slice(1))s+='c+=(texture2D(tInput,vUv+dir*'+o.toFixed(5)+').rgb+texture2D(tInput,vUv-dir*'+o.toFixed(5)+').rgb)*'+w.toFixed(6)+';';return s+'gl_FragColor=vec4(c,1.0);}';}
const BRIGHT='uniform sampler2D tInput;uniform vec2 texel;uniform float threshold;uniform float knee;varying vec2 vUv;'+
 'vec3 tap(vec2 o){vec3 c=texture2D(tInput,vUv+o*texel).rgb;return any(isnan(c))||any(isinf(c))?vec3(0.0):min(c,vec3(24.0));}'+
 'void main(){vec3 c=(tap(vec2(-1.0,-1.0))+tap(vec2(1.0,-1.0))+tap(vec2(-1.0,1.0))+tap(vec2(1.0,1.0)))*0.25;float br=max(c.r,max(c.g,c.b));'+
 'float soft=clamp(br-threshold+knee,0.0,2.0*knee);soft=soft*soft/(4.0*knee+0.0001);gl_FragColor=vec4(c*max(soft,br-threshold)/max(br,0.0001),1.0);}';
// A few scene shaders leave NaN pixels along discard edges (an 8-bit canvas showed them as faint black dots). In a float target they
// would flood the glow, so the bright pass zeroes them and the composite patches each one from its neighbours.
const COMPOSITE='uniform sampler2D tScene;uniform sampler2D tBloomA;uniform sampler2D tBloomB;uniform float strength;uniform float flash;uniform float aberration;uniform float vignette;uniform float saturation;uniform float contrast;uniform float grain;uniform vec2 grainSeed;uniform vec3 lift;uniform vec3 shadowTint;uniform vec3 highlightTint;uniform float aspect;uniform vec2 texel;varying vec2 vUv;'+
 'float noise(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}bool bad(vec3 c){return any(isnan(c))||any(isinf(c));}'+
 'vec3 safeAt(vec2 uv){vec3 c=texture2D(tScene,uv).rgb;return bad(c)?vec3(0.0):c;}'+
 'vec3 sceneAt(vec2 uv){vec3 c=texture2D(tScene,uv).rgb;if(!bad(c))return c;return (safeAt(uv+vec2(texel.x,0.0))+safeAt(uv-vec2(texel.x,0.0))+safeAt(uv+vec2(0.0,texel.y))+safeAt(uv-vec2(0.0,texel.y)))*0.25;}'+
 'void main(){vec2 d=vUv-0.5;vec3 c;if(aberration>0.0){vec2 o=d*aberration;c=vec3(sceneAt(vUv+o).r,sceneAt(vUv).g,sceneAt(vUv-o).b);}else c=sceneAt(vUv);'+
 'if(strength>0.0)c+=(texture2D(tBloomA,vUv).rgb*0.55+texture2D(tBloomB,vUv).rgb*0.45)*strength;c+=vec3(flash);'+
 'c*=1.0-vignette*smoothstep(0.55,1.45,length(d*vec2(aspect,1.0))/max(aspect,1.0)*2.0);gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n'+
 'vec3 g=gl_FragColor.rgb;float luma=dot(g,vec3(0.2126,0.7152,0.0722));g=mix(vec3(luma),g,saturation);g=g*mix(shadowTint,highlightTint,smoothstep(0.1,0.75,luma))+lift*(1.0-luma);g=(g-0.5)*contrast+0.5;'+
 'if(grain>0.0)g+=(noise(gl_FragCoord.xy+grainSeed)-0.5)*grain;gl_FragColor.rgb=g+(noise(gl_FragCoord.xy)-0.5)/255.0;}';
export function createGlow(gl,{strength=0.5,threshold=0.85,knee=0.45,vignette=0.22,saturation=1.05,contrast=1.03,lift=[0,0,0],shadowTint=[1,1,1],highlightTint=[1,1,1],samples=4}={}){
 const uniforms={strength:{value:strength},threshold:{value:threshold},knee:{value:knee},flash:{value:0},aberration:{value:0},vignette:{value:vignette},saturation:{value:saturation},contrast:{value:contrast},grain:{value:0},grainSeed:{value:new T.Vector2()},lift:{value:new T.Vector3(...lift)},shadowTint:{value:new T.Vector3(...shadowTint)},highlightTint:{value:new T.Vector3(...highlightTint)}};
 // compile() warms shader programs ahead of time (asynchronously where the browser can), bound to the same target the scene renders
 // into, so the warmed variants are exactly the ones the next frames use.
 const warm=(object,camera,target)=>{try{return Promise.resolve(typeof gl.compileAsync==='function'?gl.compileAsync(object,camera,target):gl.compile?.(object,camera,target)).catch(()=>{});}catch{return Promise.resolve();}};
 const plain={active:false,bloom:false,uniforms,render(scene,camera){gl.render(scene,camera);return gl.info?.render?.calls||0;},compile:warm,setSize(){},setBloom(){},dispose(){}};
 if(!gl?.capabilities?.isWebGL2||typeof gl.getContext!=='function'||typeof gl.setRenderTarget!=='function'||typeof gl.getDrawingBufferSize!=='function')return plain;
 const raw=gl.getContext(),size=new T.Vector2(),msaa=Math.min(samples,gl.capabilities.maxSamples||0);
 const make=(type,w,h,depth,count)=>{const rt=new T.WebGLRenderTarget(w,h,{type,format:T.RGBAFormat,depthBuffer:depth,stencilBuffer:false,samples:count,minFilter:T.LinearFilter,magFilter:T.LinearFilter,generateMipmaps:false});if(type===T.UnsignedByteType)rt.texture.colorSpace=T.SRGBColorSpace;return rt;};
 const complete=rt=>{gl.setRenderTarget(rt);const ok=raw.checkFramebufferStatus(raw.FRAMEBUFFER)===raw.FRAMEBUFFER_COMPLETE;gl.setRenderTarget(null);return ok;};
 // Half float keeps light above 1.0 for the threshold; 8-bit sRGB targets are the fallback when float color buffers are not renderable.
 let type=null,scene=null;for(const candidate of [T.HalfFloatType,T.UnsignedByteType]){const test=make(candidate,4,4,true,msaa),pass=make(candidate,4,4,false,0);let ok=false;try{ok=complete(test)&&complete(pass);}catch{ok=false;}pass.dispose();if(ok){type=candidate;scene=test;break;}test.dispose();}
 if(!scene){console.warn('Toothpick 3D: post-processing unavailable; plain rendering.');return plain;}
 const bright=make(type,4,4,false,0),levels=[[make(type,4,4,false,0),make(type,4,4,false,0)],[make(type,4,4,false,0),make(type,4,4,false,0)]];
 const triangle=new T.BufferGeometry();triangle.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));triangle.setAttribute('uv',new T.Float32BufferAttribute([0,0,2,0,0,2],2));
 const quad=new T.Mesh(triangle);quad.frustumCulled=false;const quadScene=new T.Scene();quadScene.add(quad);const quadCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
 const pass=(fragmentShader,extra)=>new T.ShaderMaterial({vertexShader:VERT,fragmentShader,uniforms:extra,depthTest:false,depthWrite:false,blending:T.NoBlending,toneMapped:false});
 const brightMat=pass(BRIGHT,{tInput:{value:null},texel:{value:new T.Vector2()},threshold:uniforms.threshold,knee:uniforms.knee});
 const blur=blurShader(gaussianTaps(8,3.6)),blurMat=pass(blur,{tInput:{value:null},dir:{value:new T.Vector2()}});
 const compositeMat=new T.ShaderMaterial({vertexShader:VERT,fragmentShader:COMPOSITE,depthTest:false,depthWrite:false,blending:T.NoBlending,uniforms:{tScene:{value:scene.texture},tBloomA:{value:levels[0][1].texture},tBloomB:{value:levels[1][1].texture},aspect:{value:1},texel:{value:new T.Vector2(1,1)},...uniforms}});
 let bloom=true;const draw=(material,target)=>{quad.material=material;gl.setRenderTarget(target);gl.render(quadScene,quadCamera);};
 function setSize(){gl.getDrawingBufferSize(size);const w=Math.max(1,size.x),h=Math.max(1,size.y);scene.setSize(w,h);bright.setSize(Math.ceil(w/2),Math.ceil(h/2));levels.forEach(([a,b],i)=>{const d=4<<i;a.setSize(Math.max(1,Math.ceil(w/d)),Math.max(1,Math.ceil(h/d)));b.setSize(Math.max(1,Math.ceil(w/d)),Math.max(1,Math.ceil(h/d)));});brightMat.uniforms.texel.value.set(1/w,1/h);compositeMat.uniforms.texel.value.set(1/w,1/h);compositeMat.uniforms.aspect.value=w/h;}
 function render(sceneToDraw,camera){
  gl.setRenderTarget(scene);gl.render(sceneToDraw,camera);const calls=gl.info?.render?.calls||0;
  if(bloom&&uniforms.strength.value>0){brightMat.uniforms.tInput.value=scene.texture;draw(brightMat,bright);let source=bright;
   for(const [a,b] of levels){blurMat.uniforms.tInput.value=source.texture;blurMat.uniforms.dir.value.set(1/a.width,0);draw(blurMat,a);blurMat.uniforms.tInput.value=a.texture;blurMat.uniforms.dir.value.set(0,1/a.height);draw(blurMat,b);source=b;}}
  const keep=uniforms.strength.value;if(!bloom)uniforms.strength.value=0;draw(compositeMat,null);uniforms.strength.value=keep;return calls;}
 setSize();
 return {active:true,get bloom(){return bloom;},uniforms,render,compile(object,camera,target){gl.setRenderTarget(scene);const done=warm(object,camera,target);gl.setRenderTarget(null);return done;},setSize,setBloom(on){bloom=!!on;},dispose(){for(const rt of [scene,bright,...levels.flat()])rt.dispose();triangle.dispose();brightMat.dispose();blurMat.dispose();compositeMat.dispose();}};
}
