// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { tryCreateNativeRuntime } from "./native-runtime.js";
const { client } = vi.hoisted(()=>({client:{capabilities:vi.fn(),create:vi.fn(),upload:vi.fn(),discardUpload:vi.fn(),download:vi.fn(),exportBytes:vi.fn(),layout:vi.fn(),input:vi.fn(),enqueue:vi.fn(),poll:vi.fn(),acknowledge:vi.fn(),shutdown:vi.fn()}}));
vi.mock("@woohaa3/frontend/extension-api",()=>({nativeDocumentEditorClient:()=>client}));
afterEach(()=>{vi.clearAllMocks();vi.useRealTimers();document.body.innerHTML="";});
const descriptor={provider_id:"photocraft-native",api_major:1,project_protocol:1,browser_protocol:1,capabilities:["native-ui","shared-texture","export"]};
it("keeps WASM fallback when a complete native capability is absent without touching the lazy canvas",async()=>{
  client.capabilities.mockResolvedValue({providers:[{...descriptor,capabilities:["cpu-session"]}],gpu_ready:true});
  const canvas=vi.fn(()=>document.createElement("canvas"));
  expect(await tryCreateNativeRuntime({target:document.createElement("div"),get canvas(){return canvas();},assetBaseUrl:"/",onEvent:vi.fn()})).toBeNull();
  expect(canvas).not.toHaveBeenCalled();expect(client.create).not.toHaveBeenCalled();
});
it("chooses one native owner before opening, resolves retained receipts and never creates a rendering canvas",async()=>{
  vi.useFakeTimers();
  let resize=()=>{};
  vi.stubGlobal("ResizeObserver",class {constructor(callback:()=>void){resize=callback;}observe(){}disconnect(){}});
  const target=document.createElement("div");target.tabIndex=0;document.body.append(target);
  let offset=0;vi.spyOn(target,"getBoundingClientRect").mockImplementation(()=>({x:offset,y:0,left:offset,top:0,width:200,height:100,right:offset+200,bottom:100,toJSON(){}}));
  client.capabilities.mockResolvedValue({providers:[descriptor],gpu_ready:true,workspace_open:false});
  client.upload.mockResolvedValue("test-input-ticket");client.create.mockResolvedValue(undefined);client.layout.mockResolvedValue(undefined);client.acknowledge.mockResolvedValue(true);client.shutdown.mockResolvedValue(undefined);
  client.poll.mockResolvedValue({documents:{},receipts:[],state:[],visible:false});
  const renderingCanvas=vi.fn(()=>document.createElement("canvas"));
  const onEvent=vi.fn();
  const runtime=await tryCreateNativeRuntime({target,get canvas(){return renderingCanvas();},assetBaseUrl:"/",onEvent});
  offset=20;resize();offset=40;resize();await vi.advanceTimersByTimeAsync(1);
  expect(client.layout.mock.calls.slice(0,3).map(([layout])=>[layout.layout_generation,layout.viewport_origin_css[0]])).toEqual([[1,0],[2,20],[3,40]]);
  const opening=runtime!.open("origin","image.png",Uint8Array.of(137,80,78,71),"node-12");
  await vi.advanceTimersByTimeAsync(1);
  const request=client.enqueue.mock.calls[0][0]; expect(request.operation.node_binding).toBe("node-12");
  client.poll.mockResolvedValue({documents:{"12":{document_id:"12",source_id:"origin",revision:1,saved_revision:1}},receipts:[{request_id:request.request_id,generation:1,result:{Ok:{kind:"opened",document_id:"12",revision:1,source_size:[1,1]}}}],state:[],visible:false});
  await vi.advanceTimersByTimeAsync(100);
  expect(await opening).toBe("12");expect(runtime!.backend).toBe("native");expect(renderingCanvas).not.toHaveBeenCalled();
  expect(document.querySelector("canvas")).toBeNull();expect(client.create).toHaveBeenCalledTimes(1);expect(client.acknowledge).toHaveBeenCalledWith(request.request_id);
  const exporting=runtime!.export("12",false);await vi.advanceTimersByTimeAsync(1);
  const exportRequest=client.enqueue.mock.calls.at(-1)![0];
  let finishDownload!:(bytes:Uint8Array)=>void;
  client.exportBytes.mockReturnValueOnce(new Promise<Uint8Array>(resolve=>{finishDownload=resolve;}));
  client.poll.mockResolvedValue({documents:{"12":{document_id:"12",source_id:"origin",revision:1,saved_revision:1}},receipts:[{request_id:exportRequest.request_id,generation:1,result:{Ok:{kind:"exported",bytes_blob_id:"output-ticket",revision:1}}}],frame:{documentRequests:[{kind:"close",id:"12",nativeRequestId:99}]},state:[],visible:false});
  await vi.advanceTimersByTimeAsync(100);
  expect(client.acknowledge).not.toHaveBeenCalledWith(exportRequest.request_id);
  finishDownload(Uint8Array.of(1,2,3));expect(await exporting).toEqual(Uint8Array.of(1,2,3));
  expect(client.acknowledge).toHaveBeenCalledWith(exportRequest.request_id);
  await vi.advanceTimersByTimeAsync(100);
  expect(onEvent.mock.calls.filter(([event])=>event.type==="photocraft:document-request")).toEqual([[{type:"photocraft:document-request",kind:"close",id:"12"}]]);
  client.enqueue.mockRejectedValueOnce(new Error("queue busy"));
  await expect(runtime!.open("rejected","other.png",Uint8Array.of(1))).rejects.toThrow("queue busy");
  expect(client.discardUpload).toHaveBeenCalledWith("test-input-ticket");
  for(const [name,bytes,format] of [
    ["named.jpg",Uint8Array.of(0x89,0x50,0x4e,0x47),"image/png"],
    ["named.png",Uint8Array.of(0xff,0xd8,0xff),"image/jpeg"],
    ["named.png",Uint8Array.of(0x52,0x49,0x46,0x46,0,0,0,0,0x57,0x45,0x42,0x50),"image/webp"],
    ["saved.pcraft",Uint8Array.of(0x50,0x4b,3,4),"application/x-photocraft"],
    ["unknown.JPEG",Uint8Array.of(0),"image/jpeg"],
    ["unknown.webp",Uint8Array.of(0),"image/webp"],
  ] as const){
    client.enqueue.mockRejectedValueOnce(new Error("format probe"));
    await expect(runtime!.open("probe",name,bytes)).rejects.toThrow("format probe");
    expect(client.enqueue.mock.calls.at(-1)![0].operation.format).toBe(format);
  }
  runtime!.dispose();expect(document.querySelector("textarea")).toBeNull();vi.unstubAllGlobals();
});

it("fails visibly when a required native provider never becomes GPU-ready",async()=>{
  vi.useFakeTimers();
  client.capabilities.mockResolvedValue({providers:[{...descriptor,capabilities:[...descriptor.capabilities,"required-native"]}],gpu_ready:false});
  const lazyCanvas=vi.fn(()=>document.createElement("canvas"));
  const result=tryCreateNativeRuntime({target:document.createElement("div"),get canvas(){return lazyCanvas();},assetBaseUrl:"/",onEvent:vi.fn()});
  const assertion=expect(result).rejects.toThrow(/GPU/);
  await vi.advanceTimersByTimeAsync(3100); await assertion;
  expect(lazyCanvas).not.toHaveBeenCalled();expect(client.create).not.toHaveBeenCalled();
});

it("does not send input while hidden or before Show is acknowledged",async()=>{
  vi.useFakeTimers();
  vi.stubGlobal("ResizeObserver",class {observe(){}disconnect(){}});
  client.capabilities.mockResolvedValue({providers:[descriptor],gpu_ready:true,workspace_open:false});
  client.poll.mockResolvedValue({documents:{},receipts:[],state:[],visible:false});
  client.layout.mockResolvedValue(undefined);client.enqueue.mockResolvedValue(undefined);
  const target=document.createElement("div");target.tabIndex=0;document.body.append(target);
  const runtime=(await tryCreateNativeRuntime({target,get canvas(): HTMLCanvasElement {throw new Error("native runtime must not create a canvas");},assetBaseUrl:"/",onEvent:vi.fn()}))!;
  runtime.hide();target.dispatchEvent(new FocusEvent("blur"));
  await vi.advanceTimersByTimeAsync(20);
  expect(client.input).not.toHaveBeenCalled();
  runtime.show();target.dispatchEvent(new FocusEvent("blur"));
  await vi.advanceTimersByTimeAsync(20);
  expect(client.input).not.toHaveBeenCalled();
  const show=client.enqueue.mock.calls.at(-1)![0];
  client.poll.mockResolvedValue({documents:{},receipts:[{request_id:show.request_id,generation:1,result:{Ok:{kind:"done"}}}],state:[],visible:true});
  await vi.advanceTimersByTimeAsync(100);
  target.dispatchEvent(new FocusEvent("blur"));await vi.advanceTimersByTimeAsync(20);
  expect(client.input).toHaveBeenCalledTimes(1);
  runtime.hide();target.dispatchEvent(new FocusEvent("blur"));await vi.advanceTimersByTimeAsync(20);
  expect(client.input).toHaveBeenCalledTimes(1);
  runtime.dispose();vi.unstubAllGlobals();
});
