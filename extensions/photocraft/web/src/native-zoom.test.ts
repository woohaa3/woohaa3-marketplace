// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { installNativeZoom } from "./native-zoom.js";
it("turns Safari cumulative scale into increments and suppresses duplicate ctrl wheels",()=>{
 const target=document.createElement("div"), emit=vi.fn();
 const dispose=installNativeZoom(target,emit,()=>true);
 const gesture=(type:string,scale:number)=>{const e=new Event(type,{bubbles:true,cancelable:true});Object.assign(e,{scale,clientX:20,clientY:30});target.dispatchEvent(e);expect(e.defaultPrevented).toBe(true);};
 gesture("gesturestart",1);gesture("gesturechange",1.2);gesture("gesturechange",1.5);
 target.dispatchEvent(new WheelEvent("wheel",{ctrlKey:true,deltaY:-20,cancelable:true}));
 gesture("gestureend",1.5);
 expect(emit.mock.calls.map(([e])=>e.factor)).toEqual([1.2,1.25]);
 dispose();expect(target.hasAttribute("data-canvas-input-owner")).toBe(false);
});
it("normalizes ctrl wheel pinch without sending a second scroll and ignores invalid gesture scales",()=>{
 const target=document.createElement("div"),emit=vi.fn();const dispose=installNativeZoom(target,emit,()=>true);
 target.dispatchEvent(new WheelEvent("wheel",{ctrlKey:true,deltaY:-10,cancelable:true}));
 expect(emit.mock.calls[0][0].factor).toBeCloseTo(Math.exp(.1));
 const bad=new Event("gesturechange");Object.assign(bad,{scale:NaN});target.dispatchEvent(bad);
 expect(emit).toHaveBeenCalledTimes(1);dispose();
});
it("leaves ordinary scroll alone, gates hidden input and restores the prior owner",()=>{
 const target=document.createElement("div"),emit=vi.fn();let active=false;
 target.setAttribute("data-canvas-input-owner","previous");
 const dispose=installNativeZoom(target,emit,()=>active);
 const hidden=new WheelEvent("wheel",{ctrlKey:true,deltaY:-10,cancelable:true});target.dispatchEvent(hidden);
 expect(hidden.defaultPrevented).toBe(false);expect(emit).not.toHaveBeenCalled();
 active=true;const scroll=new WheelEvent("wheel",{deltaY:10,cancelable:true});target.dispatchEvent(scroll);
 expect(scroll.defaultPrevented).toBe(false);expect(emit).not.toHaveBeenCalled();
 target.dispatchEvent(new WheelEvent("wheel",{ctrlKey:true,deltaY:-1,deltaMode:1,cancelable:true}));
 expect(emit.mock.calls[0][0].factor).toBeCloseTo(Math.exp(.16));
 dispose();expect(target.getAttribute("data-canvas-input-owner")).toBe("previous");
 target.dispatchEvent(new WheelEvent("wheel",{ctrlKey:true,deltaY:-10,cancelable:true}));expect(emit).toHaveBeenCalledTimes(1);
});
it("cancels an interrupted Safari gesture on blur so later ctrl-wheel works",()=>{
 const target=document.createElement("div"),emit=vi.fn();const dispose=installNativeZoom(target,emit,()=>true);
 const start=new Event("gesturestart",{cancelable:true});Object.assign(start,{scale:1});target.dispatchEvent(start);
 target.dispatchEvent(new FocusEvent("blur"));
 target.dispatchEvent(new WheelEvent("wheel",{ctrlKey:true,deltaY:-10,cancelable:true}));
 expect(emit).toHaveBeenCalledTimes(1);dispose();
});
it("records bounded numeric strings only in explicit performance capture",()=>{
 const target=document.createElement("div"),emit=vi.fn();let now=0;
 const warn=vi.spyOn(console,"warn").mockImplementation(()=>{}),debug=vi.spyOn(console,"debug").mockImplementation(()=>{});
 const clock=vi.spyOn(performance,"now").mockImplementation(()=>now);
 vi.stubGlobal("__WOOHAA_NATIVE__",{performanceCapture:true});
 const dispose=installNativeZoom(target,emit,()=>true);
 try {
  const pinch=()=>target.dispatchEvent(new WheelEvent("wheel",{ctrlKey:true,deltaY:-10,cancelable:true}));
  pinch();pinch();expect(warn).toHaveBeenCalledTimes(1);
  expect(warn.mock.calls[0]).toEqual([expect.stringMatching(/^\[photocraft-native\] zoom received source=2 count=1 factor=1\.105/)]);
  now=1000;pinch();expect(warn).toHaveBeenCalledTimes(2);
  expect(warn.mock.calls[1][0]).toContain("count=3");expect(debug).not.toHaveBeenCalled();
  vi.stubGlobal("__WOOHAA_NATIVE__",{performanceCapture:false});now=2000;pinch();
  expect(warn).toHaveBeenCalledTimes(2);expect(debug).toHaveBeenCalledTimes(1);
 } finally {dispose();warn.mockRestore();debug.mockRestore();clock.mockRestore();vi.unstubAllGlobals();}
});
