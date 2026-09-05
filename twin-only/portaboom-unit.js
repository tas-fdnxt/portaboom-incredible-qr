// portaboom-unit.js — the PB4000 as a STANDALONE, reusable 3D unit.
// Decoupled from any world. Drop into any three.js scene:
//   import {PortaboomUnit} from './portaboom-unit.js';
//   const pb = new PortaboomUnit({src:'pb4000_master.glb'});
//   await pb.load(); scene.add(pb.object); pb.setPosition(x,y,z); pb.openBoom();
// The unit owns its own model, boom hinge, lights, and animation tick.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from 'three/addons/loaders/DRACOLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

export class PortaboomUnit {
  constructor(opts={}){
    this.src = opts.src || 'pb4000_master.glb';
    this.targetSize = opts.size || 2.6;     // metres, longest dim
    this.object = new THREE.Group();        // <- the only thing a host adds to its scene
    this.object.name = 'PORTABOOM_UNIT';
    this.boomPivot = null; this.boomTarget = 0; this.boomCur = 0;
    this.lampMeshes = []; this.lightsOn = true;
    this.loaded = false;
  }
  load(){
    return new Promise((res,rej)=>{
      const loader=new GLTFLoader();
      try{ if(MeshoptDecoder && MeshoptDecoder.ready){ /* plain GLB: decoder harmless */ } loader.setMeshoptDecoder(MeshoptDecoder);}catch(e){console.warn('meshopt',e);}
      try{ const draco=new DRACOLoader(); draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/'); loader.setDRACOLoader(draco);}catch(e){console.warn('draco',e);}
      console.log('[PortaboomUnit] loading', this.src);
      loader.load(this.src,(g)=>{
        console.log('[PortaboomUnit] loaded OK', this.src);
        const m=g.scene;
        // normalise: centre on origin, scale to targetSize, sit on y=0
        const box=new THREE.Box3().setFromObject(m); const sz=box.getSize(new THREE.Vector3()); const ctr=box.getCenter(new THREE.Vector3());
        m.position.sub(ctr); const k=this.targetSize/Math.max(sz.x,sz.y,sz.z); m.scale.setScalar(k);
        const box2=new THREE.Box3().setFromObject(m); m.position.y -= box2.min.y;
        m.traverse(o=>{ if(o.isMesh){ o.castShadow=true; o.receiveShadow=true; } });
        this.model=m; this.object.add(m);
        this._detectBoom(); this._detectLamps();
        this.loaded=true; res(this);
      }, undefined, (e)=>{console.error('[PortaboomUnit] LOAD FAILED', this.src, e); rej(e);});
    });
  }
  // find the model's OWN boom (long, thin, low part) and wrap it in a hinge pivot
  _detectBoom(){
    let best=null, bestLen=0;
    this.model.traverse(o=>{ if(!o.isMesh) return;
      const bb=new THREE.Box3().setFromObject(o); const s=bb.getSize(new THREE.Vector3());
      const longD=Math.max(s.x,s.z), thin=Math.min(s.x,s.y,s.z);
      if(longD>1.0 && thin<0.45 && s.y<0.7 && longD>bestLen){ best=o; bestLen=longD; }
    });
    if(!best) return;                          // no separable boom in this GLB
    const bb=new THREE.Box3().setFromObject(best);
    const axisX = (bb.max.x-bb.min.x) >= (bb.max.z-bb.min.z);
    // inboard end = the end nearer the cabinet (assume min along the long axis)
    const wp=new THREE.Vector3(axisX?bb.min.x:(bb.min.x+bb.max.x)/2,(bb.min.y+bb.max.y)/2,axisX?(bb.min.z+bb.max.z)/2:bb.min.z);
    const pivot=new THREE.Group(); best.parent.add(pivot);
    pivot.position.copy(best.parent.worldToLocal(wp.clone()));
    pivot.attach(best);
    this.boomPivot=pivot; this.boomAxis=axisX?'z':'x';
  }
  _detectLamps(){
    // small bright/emissive lenses = the signal lamps (best-effort on a baked model)
    this.model.traverse(o=>{ if(o.isMesh && o.material){
      const bb=new THREE.Box3().setFromObject(o); const s=bb.getSize(new THREE.Vector3());
      if(Math.max(s.x,s.y,s.z)<0.3 && o.material.emissive){ this.lampMeshes.push(o); }
    }});
  }
  setPosition(x,y,z){ this.object.position.set(x,y,z); return this; }
  setRotationY(rad){ this.object.rotation.y=rad; return this; }
  openBoom(){ this.boomTarget=1; }
  closeBoom(){ this.boomTarget=0; }
  toggleBoom(){ this.boomTarget = this.boomTarget>0.5?0:1; return this.boomTarget>0.5; }
  setLights(on){ this.lightsOn=on; this.lampMeshes.forEach(l=>{ if(l.material) l.material.emissiveIntensity = on?1.2:0; }); }
  // call every frame from the host's render loop
  update(){
    if(!this.boomPivot) return;
    this.boomCur += (this.boomTarget-this.boomCur)*0.06;
    const ang = this.boomCur*(Math.PI/2*0.9);
    if(this.boomAxis==='z') this.boomPivot.rotation.z = ang; else this.boomPivot.rotation.x = -ang;
  }
  get boomOpen(){ return this.boomCur>0.5; }
}
