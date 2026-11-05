import type { NativeEditorInputEvent } from "@woohaa3/contracts";
/** One DOM owner for Safari GestureEvent and Chromium/Windows ctrl-wheel pinch. */
export function installNativeZoom(target: HTMLElement, emit: (event: NativeEditorInputEvent) => void, enabled: () => boolean): () => void {
  const previousOwner = target.getAttribute("data-canvas-input-owner");
  target.setAttribute("data-canvas-input-owner", "local");
  let scale: number | null = null, safariUntil = 0, count = 0, lastLog = -Infinity;
  const send = (factor: number, event: {clientX?:number;clientY?:number}, source:number) => {
    if (!Number.isFinite(factor) || factor < .01 || factor > 100 || factor === 1) return;
    const r=target.getBoundingClientRect();
    emit({kind:"zoom",factor,position_css:[(event.clientX ?? r.x+r.width/2)-r.x,(event.clientY ?? r.y+r.height/2)-r.y]});
    ++count;const now=performance.now();
    if(now-lastLog>=1000){
      const message=`[photocraft-native] zoom received source=${source} count=${count} factor=${factor}`;
      const capture=(globalThis as typeof globalThis & {__WOOHAA_NATIVE__?:{performanceCapture?:boolean}}).__WOOHAA_NATIVE__?.performanceCapture===true;
      if(capture)console.warn(message);else console.debug(message);
      lastLog=now;
    }
  };
  const reset = () => { scale=null; safariUntil=0; };
  const gesture = (event: Event) => {
    if(!enabled()){scale=null;return;}
    event.preventDefault();event.stopPropagation();safariUntil=performance.now()+250;
    const e=event as Event & {scale:number;clientX?:number;clientY?:number};
    if(event.type==="gesturestart"){scale=Number.isFinite(e.scale)&&e.scale>0?e.scale:1;return;}
    if(Number.isFinite(e.scale)&&e.scale>0&&scale!==null){send(e.scale/scale,e,1);scale=e.scale;}
    if(event.type==="gestureend")scale=null;
  };
  const wheel = (event: WheelEvent) => {
    if(!event.ctrlKey||!enabled())return;
    event.preventDefault();event.stopImmediatePropagation();
    if(scale!==null||performance.now()<safariUntil)return;
    const multiplier=event.deltaMode===1?16:event.deltaMode===2?target.getBoundingClientRect().height:1;
    send(Math.exp(Math.max(-4,Math.min(4,-event.deltaY*multiplier*.01))),event,2);
  };
  for(const type of ["gesturestart","gesturechange","gestureend"])target.addEventListener(type,gesture,{passive:false});
  target.addEventListener("wheel",wheel,{passive:false});
  target.addEventListener("blur",reset);window.addEventListener("blur",reset);
  return ()=>{
    for(const type of ["gesturestart","gesturechange","gestureend"])target.removeEventListener(type,gesture);
    target.removeEventListener("wheel",wheel);
    target.removeEventListener("blur",reset);window.removeEventListener("blur",reset);
    if(previousOwner===null)target.removeAttribute("data-canvas-input-owner");else target.setAttribute("data-canvas-input-owner",previousOwner);
  };
}
