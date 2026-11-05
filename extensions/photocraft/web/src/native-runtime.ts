/** Optional native backend chosen once, before any document is opened. */
import { nativeDocumentEditorClient } from "@woohaa3/frontend/extension-api";
import type { NativeEditorInput, NativeEditorInputEvent, NativeEditorOperation, NativeEditorResult } from "@woohaa3/contracts";
import type { DirectRuntime, EngineState, RuntimeFactory } from "./direct-runtime.js";
import { installNativeIme, type NativeImeSnapshot } from "./native-input.js";
import { installNativeZoom } from "./native-zoom.js";
const REQUIRED = ["native-ui", "shared-texture", "export"];
function sourceFormat(name: string, bytes: Uint8Array): string {
  const extension=name.toLowerCase().split(".").at(-1);
  if(extension==="pcraft")return "application/x-photocraft";
  if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return "image/png";
  if(bytes[0]===0xff&&bytes[1]===0xd8)return "image/jpeg";
  if(bytes.length>=12&&bytes[0]===0x52&&bytes[1]===0x49&&bytes[2]===0x46&&bytes[3]===0x46&&bytes[8]===0x57&&bytes[9]===0x45&&bytes[10]===0x42&&bytes[11]===0x50)return "image/webp";
  return extension==="jpg"||extension==="jpeg"?"image/jpeg":extension==="webp"?"image/webp":"image/png";
}
export async function tryCreateNativeRuntime(options: Parameters<RuntimeFactory>[0]): Promise<DirectRuntime | null> {
  const candidate = nativeDocumentEditorClient();
  if (!candidate) return null;
  const client = candidate;
  let capabilities = await client.capabilities();
  if (capabilities.providers.some(p => p.provider_id === "photocraft-native") && !capabilities.gpu_ready) {
    for (let attempt=0; attempt<30 && !capabilities.gpu_ready; ++attempt) {
      await new Promise(resolve=>setTimeout(resolve,100)); capabilities=await client.capabilities();
    }
  }
  const provider = capabilities.providers.find(p => p.provider_id === "photocraft-native" && p.api_major === 1
    && p.project_protocol === 1 && p.browser_protocol === 1 && REQUIRED.every(c => p.capabilities.includes(c)));
  if (!provider || !capabilities.gpu_ready) {
    const required=capabilities.providers.find(p=>p.provider_id==="photocraft-native" && p.capabilities.includes("required-native"));
    if(required) throw new Error(`原生 PhotoCraft 试验包初始化失败：${!capabilities.gpu_ready ? "GPU 未就绪" : "协议或能力不匹配"}，已阻止静默回退 WASM。`);
    return null;
  }
  if (capabilities.workspace_open) throw new Error("原生 PhotoCraft 工作区仍在使用中，请关闭旧工作区后重试");
  const { onEvent } = options;
  const canvas = options.target ?? options.canvas;
  const session = crypto.randomUUID(), generation = 1;
  let lastRenderError = "";
  let requestId = 0, sequence = 0, layoutGeneration = 0, disposed = false, enabled = true, shown = false, activation = 0;
  let inputReady = false;
  let inputInFlight = false, framePending = false, pollTimer: ReturnType<typeof setTimeout> | undefined;
  let state: EngineState = { documentId:null,documentName:null,docWidth:null,docHeight:null,revision:null,dirty:false,rect:null,modal:false,escOwned:false,operation:false,documents:[] };
  let inputs: NativeEditorInput[] = [];
  let pendingActivation: string | null = null;
  const names = new Map<string,string>();
  const seenDocumentRequests = new Set<string>();
  const acknowledgedDocumentRequests = new Set<string>(), acknowledgingDocumentRequests = new Set<string>();
  const exportPayloads = new WeakMap<object, Uint8Array>();
  const waiters = new Map<number,{resolve(result:NativeEditorResult):void;reject(error:Error):void}>();
  let sendTail = Promise.resolve();
  const fail = (error: unknown) => {
    const message=String(error instanceof Error ? error.message : error);
    console.error("[photocraft-native]",message);
    onEvent({type:"photocraft:error",message});
  };
  const rect = () => canvas.getBoundingClientRect();
  const dimensions = () => { const r=rect(),dpr=devicePixelRatio || 1;return {physical_size:[Math.max(1,Math.round(r.width*dpr)),Math.max(1,Math.round(r.height*dpr))] as [number,number],scale_factor:dpr}; };
  await client.create({provider_id:provider.provider_id,session_id:session,generation,project_protocol:1,browser_protocol:1,capabilities:REQUIRED,...dimensions()});
  const updateLayout = () => {
    const r=rect(),dpr=devicePixelRatio || 1;
    const layout={physical_size:[Math.max(1,Math.round(r.width*dpr)),Math.max(1,Math.round(r.height*dpr))] as [number,number],scale_factor:dpr,layout_generation:++layoutGeneration,viewport_origin_css:[r.x,r.y] as [number,number]};
    sendTail=sendTail.then(() => client.layout(layout)).catch(fail);
  };
  updateLayout();
  function operation(operation:NativeEditorOperation):Promise<NativeEditorResult> {
    if(disposed) return Promise.reject(new Error("原生编辑器已释放"));
    const id=++requestId;
    const result=new Promise<NativeEditorResult>((resolve,reject)=>waiters.set(id,{resolve,reject}));
    sendTail=sendTail.then(()=>client.enqueue({session_id:session,request_id:id,generation,operation})).catch(error=>{waiters.get(id)?.reject(error);waiters.delete(id);});
    return result;
  }
  const revision=(id:string)=>{const d=state.documents?.find(d=>d.id===id);if(!d)throw new Error("文档已关闭或尚未就绪");return d.revision;};
  async function poll() {
    if(disposed)return;
    try {
      const snapshot=await client.poll();
      if(disposed)return;
      const frame=snapshot.frame as Partial<EngineState> | undefined;
      const documents=Object.values(snapshot.documents).map(d=>({id:d.document_id,name:names.get(d.document_id) ?? d.source_id,revision:d.revision,dirty:d.revision!==d.saved_revision}));
      const projected:EngineState={...state,...frame,documents};
      if(projected.documentId&&!documents.some(doc=>doc.id===projected.documentId)) Object.assign(projected,{documentId:null,documentName:null,docWidth:null,docHeight:null,revision:null,dirty:false,viewReady:false,rect:null,documentView:null});
      if(pendingActivation && projected.documentId!==pendingActivation) state={...projected,documentId:pendingActivation,viewReady:false,rect:null,documentView:null};
      else { state=projected;if(pendingActivation===state.documentId&&state.viewReady)pendingActivation=null; }
      ime.update(frame as NativeImeSnapshot ?? {});
      onEvent({type:"photocraft:state",state});
      const requests=(frame as {documentRequests?:Array<{kind:"activate"|"close";id:string;nativeRequestId:string|number}>}|undefined)?.documentRequests ?? [];
      const liveRequests=new Set<string>();
      for(const request of requests.slice(0,128)){
        if((request.kind!=="activate"&&request.kind!=="close")||typeof request.id!=="string"||!["string","number"].includes(typeof request.nativeRequestId))continue;
        const key=String(request.nativeRequestId);liveRequests.add(key);
        if(!seenDocumentRequests.has(key)){seenDocumentRequests.add(key);onEvent({type:"photocraft:document-request",kind:request.kind,id:request.id});}
        const document=documents.find(doc=>doc.id===request.id);
        if(document&&!acknowledgedDocumentRequests.has(key)&&!acknowledgingDocumentRequests.has(key)){
          acknowledgingDocumentRequests.add(key);
          void operation({kind:"command",document_id:request.id,expected_revision:document.revision,command:"native.ack-document-request",parameters:Array.from(new TextEncoder().encode(JSON.stringify({nativeRequestId:request.nativeRequestId})))})
            .then(()=>{acknowledgedDocumentRequests.add(key);}).catch(()=>{}).finally(()=>acknowledgingDocumentRequests.delete(key));
        }
      }
      for(const key of seenDocumentRequests)if(!liveRequests.has(key)){seenDocumentRequests.delete(key);acknowledgedDocumentRequests.delete(key);}
      for(const receipt of snapshot.receipts){
        if(disposed)return;
        if(receipt.generation!==generation)continue;
        const waiter=waiters.get(receipt.request_id);
        if(waiter){
          if("Ok" in receipt.result && receipt.result.Ok.kind === "exported") exportPayloads.set(receipt.result.Ok, await client.exportBytes(receipt.result.Ok));
          if(disposed)return;
          waiters.delete(receipt.request_id);if("Err" in receipt.result)waiter.reject(new Error(receipt.result.Err.message));else waiter.resolve(receipt.result.Ok);
        }
        if(disposed)return;
        await client.acknowledge(receipt.request_id);
      }
    } catch(error) { if(!disposed)fail(error); }
    finally { if(!disposed)pollTimer=setTimeout(poll,shown?32:100); }
  }
  const position=(event:MouseEvent):[number,number]=>{const r=rect();return[event.clientX-r.x,event.clientY-r.y];};
  const modifiers=(event:MouseEvent|KeyboardEvent)=>({alt:event.altKey,control:event.ctrlKey,shift:event.shiftKey,meta:event.metaKey});
  function input(event:NativeEditorInputEvent,force=false){
    if(disposed||!shown||!inputReady||(!enabled&&!force))return;
    const value={sequence:++sequence,layout_generation:layoutGeneration,time_seconds:performance.now()/1000,event};
    // Coalesce only moves. Never discard button-up/cancel or composition commits.
    const previous=inputs.at(-1);
    if(event.kind==="pointer"&&event.phase==="move"&&previous?.event.kind==="pointer"&&previous.event.phase==="move"&&previous.event.pointer_id===event.pointer_id&&previous.event.pointer_type===event.pointer_type){
      const samples=[...(previous.event.samples.length?previous.event.samples:[{position_css:previous.event.position_css,pressure:previous.event.pressure,time_seconds:previous.time_seconds}]),...(event.samples.length?event.samples:[{position_css:event.position_css,pressure:event.pressure,time_seconds:value.time_seconds}])];
      value.event={...event,samples:samples.length<=64?samples:Array.from({length:64},(_,i)=>samples[Math.floor(i*(samples.length-1)/63)]!)};
      inputs[inputs.length-1]=value;
    } else {
      if(inputs.length>=256){
        const move=inputs.findIndex(item=>item.event.kind==="pointer"&&item.event.phase==="move");
        if(move>=0)inputs.splice(move,1);
        else { inputs=[]; inputs.push({...value,event:{kind:"blur"}}); fail(new Error("输入队列已取消，请重新开始当前操作")); return; }
      }
      inputs.push(value);
    }
    if(!framePending){framePending=true;requestAnimationFrame(flushInput);}
  }
  function flushInput(){
    framePending=false;if(disposed||inputInFlight||!inputs.length)return;
    inputInFlight=true;
    const batch=inputs.splice(0,256);
    sendTail=sendTail.then(()=>client.input(batch)).catch(fail).finally(()=>{inputInFlight=false;if(inputs.length&&!disposed&&!framePending){framePending=true;requestAnimationFrame(flushInput);}});
  }
  const removers:Array<()=>void>=[];
  function listen<K extends keyof HTMLElementEventMap>(target:HTMLElement,type:K,listener:(event:HTMLElementEventMap[K])=>void,config?:AddEventListenerOptions){target.addEventListener(type,listener as EventListener,config);removers.push(()=>target.removeEventListener(type,listener as EventListener,config));}
  for(const type of ["pointerdown","pointermove","pointerup","pointercancel"] as const)listen(canvas,type,event=>{
    if(!enabled||!shown)return;event.preventDefault();event.stopPropagation();
    if(type==="pointerdown"){canvas.setPointerCapture(event.pointerId);canvas.focus();}
    const phase={pointerdown:"down",pointermove:"move",pointerup:"up",pointercancel:"cancel"}[type] as "down"|"move"|"up"|"cancel";
    input({kind:"pointer",phase,pointer_id:event.pointerId,position_css:position(event),pressure:event.pressure,pointer_type:event.pointerType as "mouse"|"pen"|"touch",button:Math.max(0,event.button),buttons:event.buttons,modifiers:modifiers(event),samples:(event.getCoalescedEvents?.()??[]).slice(-64).map(e=>({position_css:position(e),pressure:e.pressure,time_seconds:e.timeStamp/1000}))});
  });
  const disposeZoom=installNativeZoom(canvas,input,()=>enabled&&shown&&inputReady&&!disposed);
  listen(canvas,"wheel",event=>{if(!enabled||!shown)return;event.preventDefault();event.stopPropagation();const multiplier=event.deltaMode===1?16:event.deltaMode===2?rect().height:1;input({kind:"wheel",position_css:position(event),delta_css:[event.deltaX*multiplier,event.deltaY*multiplier],modifiers:modifiers(event)});},{passive:false});
  listen(canvas,"contextmenu",event=>{if(enabled&&shown){event.preventDefault();event.stopPropagation();}});
  const ime=installNativeIme({canvas,emit:input,enabled:()=>enabled&&shown&&!disposed});
  // Platform focus moves between this input surface and its real IME client;
  // do not synthesize a blur in the middle of composition.
  listen(canvas,"blur",event=>{if(!(event.relatedTarget instanceof HTMLElement && event.relatedTarget.dataset.photocraftNativeIme))input({kind:"blur"},true);});
  void poll();
  const observer=new ResizeObserver(updateLayout);observer.observe(canvas);
  const moved=()=>updateLayout();window.addEventListener("resize",moved);
  return {
    backend:"native",state:()=>state,
    show:()=>{shown=true;inputReady=false;const token=++activation;updateLayout();void operation({kind:"show"}).then(()=>{if(shown&&activation===token)inputReady=true;}).catch(fail);return token;},
    hide:()=>{shown=false;inputReady=false;++activation;inputs=[];void operation({kind:"hide"}).catch(fail);},
    input:active=>{if(enabled&&!active){input({kind:"blur"},true);flushInput();}enabled=active;},focus:()=>{canvas.focus();ime.focus();},
    open:async(operationId,name,bytes,nodeBinding)=>{const ticket=await client.upload(bytes);try{const result=await operation({kind:"open",source_id:operationId,node_binding:nodeBinding ?? null,format:sourceFormat(name,bytes),bytes_blob_id:ticket});if(result.kind!=="opened")throw new Error("原生文档未打开");names.set(result.document_id,name);return result.document_id;}catch(error){try{await client.discardUpload(ticket);}catch{}throw error;}},
    activate:async id=>{pendingActivation=id;try{await operation({kind:"activate",document_id:id});return ++activation;}catch(error){if(pendingActivation===id)pendingActivation=null;throw error;}},
    close:async id=>{const result=await operation({kind:"close",document_id:id,expected_revision:revision(id),discard:true});if(result.kind==="needs-settlement")throw new Error("请先结束当前操作");names.delete(id);},
    export:async(id,project,expectedRevision)=>{
      // Put every pending mouse-up/IME commit ahead of the export. The owner
      // consumes input before checking the frozen revision, so a race fails
      // stale rather than silently exporting pre-stroke pixels.
      do { flushInput(); await sendTail; } while(inputs.length || inputInFlight);
      const result=await operation({kind:"export",document_id:id,expected_revision:expectedRevision ?? revision(id),format:project?"pcraft":"png"});if(result.kind!=="exported")throw new Error("原生导出未完成");const bytes=exportPayloads.get(result);if(!bytes)throw new Error("原生导出字节尚未下载");exportPayloads.delete(result);return bytes;},
    markSaved:async(id,revision)=>{await operation({kind:"mark-saved",document_id:id,expected_revision:revision});},
    ack:()=>{},settle:()=>{if(state.operation||state.modal)throw new Error("请先结束当前操作或关闭编辑器弹窗");return state;},
    dispose:()=>{if(disposed)return;disposed=true;clearTimeout(pollTimer);observer.disconnect();ime.dispose();disposeZoom();window.removeEventListener("resize",moved);for(const remove of removers)remove();for(const waiter of waiters.values())waiter.reject(new Error("工作区已释放"));waiters.clear();
      void (async()=>{
        await sendTail;
        for(let attempt=0;attempt<20;attempt++){
          const snapshot=await client.poll();
          for(const receipt of snapshot.receipts)if(receipt.generation===generation)await client.acknowledge(receipt.request_id);
          if(Object.keys(snapshot.documents).length)throw new Error("原生工作区仍有驻留文档，请先结算并关闭");
          try{await client.shutdown();return;}catch(error){if(attempt===19)throw error;}
          await new Promise(resolve=>setTimeout(resolve,25));
        }
      })().catch(fail);},
  };
}
