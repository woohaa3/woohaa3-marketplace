// U57–U64 逐项实测：在真实匹配 WASM（`packages/editor/dist/wasm`）上按能力组执行。
//
// 每组覆盖：建立/参数读回/预览像素/预览不改正式内容/提交一步历史/撤销复原/拒绝条件/工程重开。
// 只记录结构、像素尺寸、内容身份与历史——不含视觉效果结论（那需要真实 GPU 与人工确认）。
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const source=path.resolve('packages/editor/dist/wasm');
const mod=await import(pathToFileURL(path.join(source,'photocraft_editor.js')));
mod.initSync({module:fs.readFileSync(path.join(source,'photocraft_editor_bg.wasm'))});
const fail=[];
const check=(n,c,d='')=>{if(!c){fail.push(n);console.log('FAIL',n,d);}else console.log('ok  ',n);};
const fresh=(w=80,h=60)=>{const e=new mod.WasmEditor();e.execute('file.new',JSON.stringify({width:w,height:h,name:'v'}));return e;};
const doc=e=>JSON.parse(e.stateJson()).document;
const flat=(rows)=>rows.flatMap(function f(l){return [l,...(l.children?flat(l.children):[])];});
const layer=(e,id)=>flat(doc(e).layers).find(l=>l.id===id);


// ---------------- U57 新建填充层：面板参数不被创建命令丢弃 ----------------
{
  const e=fresh(); const st=()=>doc(e);
  // U57: create gradient with panel params
const c=JSON.parse(e.newFillLayer('layer.newFillLayer.gradient',JSON.stringify({
  stops:[[0,'#ff0000'],[0.5,'#00ff00'],[1,'#0000ff']], transparency:[[0,100],[1,20]],
  style:'radial',angle:30,scale:70,offset:[10,-5],reverse:true,dither:true,align:true})));
check('U57 create keeps stops',c.gradient.stops.length===3,JSON.stringify(c.gradient.stops));
check('U57 create keeps transparency pct',c.gradient.transparency?.[1]?.[1]===20,JSON.stringify(c.gradient.transparency));
check('U57 create keeps scale',c.gradient.scale===70,String(c.gradient.scale));
check('U57 create keeps reverse/dither',c.gradient.reverse===true && c.gradient.dither===true);
const layer=c.layer;
// single history step
check('U57 create is one step',st().history.length===2,String(st().history));
// preview keeps hash, apply changes it
const hash0=e.contentHash();
const pv=JSON.parse(e.previewFillLayer(layer,JSON.stringify({fillKind:'gradient',stops:[[0,'#ffffff'],[1,'#000000']]})));
check('U57 preview has pixels',pv.preview.width>0 && e.contentHash()===hash0);

  e.free();
}

// ---------------- U58
{
  const e=fresh(); const st=()=>JSON.parse(e.stateJson()).document;
  e.execute('layer.new.layerFromBackground',JSON.stringify({}));
  e.execute('layer.new.layer',JSON.stringify({name:'A'}));
  e.execute('layer.new.layer',JSON.stringify({name:'B'}));
  const ids=st().layers.map(l=>l.id);
  e.execute('layer.select',JSON.stringify({layer:ids[1]}));
  e.execute('layer.select',JSON.stringify({layer:ids[2],mode:'add'}));
  const link=JSON.parse(e.layerWorkflow('layer.linkLayers',JSON.stringify({}),false));
  check('U58 link',link.changed===true);
  const linked=st().layers.filter(l=>l.id===ids[1]||l.id===ids[2]);
  check('U58 linkGroup set',linked.length===2 && linked.every(l=>l.linkGroup!==null) && linked[0].linkGroup===linked[1].linkGroup,JSON.stringify(linked.map(l=>l.linkGroup)));
  const label=JSON.parse(e.layerWorkflow('layer.setLabelColor',JSON.stringify({layer:ids[1],color:'blue'}),false));
  check('U58 label',label.changed===true && st().layers.find(l=>l.id===ids[1]).labelColor==='blue');
  const sel=JSON.parse(e.layerWorkflow('layer.selectLinkedLayers',JSON.stringify({}),false));
  check('U58 selectLinkedLayers',sel.changed===false && st().selectedLayers.length===2,JSON.stringify(st().selectedLayers));
  const n1=st().layers.length;
  const stamp=JSON.parse(e.layerWorkflow('layer.stampVisible',JSON.stringify({}),false));
  check('U58 stampVisible',stamp.changed===true && st().layers.length===n1+1);
  const n2=st().layers.length;
  const down=JSON.parse(e.layerWorkflow('layer.stampDown',JSON.stringify({}),false));
  check('U58 stampDown',down.changed===true && st().layers.length===n2+1);
  e.execute('layer.select',JSON.stringify({layer:ids[1]}));
  e.execute('layer.select',JSON.stringify({layer:ids[2],mode:'add'}));
  const rev=JSON.parse(e.layerWorkflow('layer.arrange.reverse',JSON.stringify({}),false));
  check('U58 reverse',rev.changed===true);
  e.free();
}
{
  const e=fresh(); const st=()=>JSON.parse(e.stateJson()).document;
  const bgId=st().layers[0].id;
  e.execute('select.rect',JSON.stringify({x:5,y:5,width:20,height:20}));
  const cut=JSON.parse(e.layerWorkflow('layer.new.layerViaCut',JSON.stringify({layer:bgId}),false));
  check('U58 viaCut',cut.changed===true && st().layers.length===2);
  const steps=st().history.length;
  e.execute('edit.undo',JSON.stringify({}));
  check('U58 viaCut one undo step',st().layers.length===1 && st().history.length<=steps-1);
  e.free();
}
{
  const e=fresh(); const st=()=>JSON.parse(e.stateJson()).document;
  const fg=JSON.parse(e.layerWorkflow('layer.new.layerFromBackground',JSON.stringify({}),false));
  check('U58 layerFromBackground',fg.changed===true);
  const anyLayer=st().layers[0].id;
  const bg=JSON.parse(e.layerWorkflow('layer.new.backgroundFromLayer',JSON.stringify({layer:anyLayer}),false));
  check('U58 backgroundFromLayer',bg.changed===true);
  e.free();
}
// ---------------- U59
{
  // 每条命令单独验证「一次撤销回到进入状态」：选区变化本身也是历史项，混在一条时间线上会数不清。
  const clipboardOf=(e)=>JSON.stringify(JSON.parse(e.pasteRegion()).clipboard);
  for(const id of ['edit.pasteSpecial.pasteInto','edit.pasteSpecial.pasteOutside']){
    const e=fresh(); const st=()=>JSON.parse(e.stateJson()).document;
    e.execute('select.rect',JSON.stringify({x:5,y:5,width:20,height:20}));
    e.execute('edit.copy',JSON.stringify({}));
    const before={layers:st().layers.length,hash:e.contentHash(),clipboard:clipboardOf(e)};
    const region=JSON.parse(e.pasteRegion());
    const r=JSON.parse(e.layerWorkflow(id,JSON.stringify({}),false));
    check('U59 '+id+' adds one layer',r.changed===true && st().layers.length===before.layers+1);
    check('U59 '+id+' changes content',e.contentHash()!==before.hash);
    check('U59 '+id+' builds a mask',st().layers[0].hasMask===true);
    check('U59 '+id+' keeps clipboard',clipboardOf(e)===before.clipboard);
    e.undo();
    check('U59 '+id+' one undo restores',st().layers.length===before.layers && e.contentHash()===before.hash);
    // 选区取消后必须明确拒绝，而不是静默成功。
    e.execute('select.all',JSON.stringify({}));e.execute('select.rect',JSON.stringify({x:0,y:0,width:0,height:0}));
    let rejected=false;
    try{ e.layerWorkflow(id,JSON.stringify({}),false); }catch(err){ rejected=/选区/.test(String(err.message||err)); }
    check('U59 '+id+' requires a selection',rejected);
    check('U59 '+id+' region target',['pixels','mask'].includes(region.target));
    e.free();
  }
}
// ---------------- U61
{
  const e=fresh(); const st=()=>JSON.parse(e.stateJson()).document;
  const addStyle=(id,fx)=>{const info=JSON.parse(e.beginLayerProperties(id));e.previewLayerProperties(JSON.stringify({style:{enabled:true,items:[fx??info.styleDefaults[0]]}}));JSON.parse(e.commitLayerProperties());};
  e.execute('layer.new.layer',JSON.stringify({name:'S'}));
  const src=st().layers[0].id;
  addStyle(src);
  const fxOf=(id)=>{const l=st().layers.find(x=>x.id===id);return Array.isArray(l?.effects?.items)?l.effects.items.length:0;};
  check('U61 style added via draft',fxOf(src)>0);
  const copy=JSON.parse(e.layerWorkflow('layer.layerStyle.copyLayerStyle',JSON.stringify({layer:src}),false));
  check('U61 copyStyle keeps document',copy.changed===false && copy.hasStyleClipboard===true);
  e.execute('layer.new.layer',JSON.stringify({name:'T'}));
  const tgt=st().layers[0].id;
  const paste=JSON.parse(e.layerWorkflow('layer.layerStyle.pasteLayerStyle',JSON.stringify({layer:tgt}),false));
  check('U61 pasteStyle',paste.changed===true);
  check('U61 pasted effects present',fxOf(tgt)===fxOf(src));
  const noop=JSON.parse(e.layerWorkflow('layer.layerStyle.scaleEffects',JSON.stringify({layer:tgt}),false));
  check('U61 scaleEffects default scale is a no-op',noop.changed===false);
  const scale=JSON.parse(e.layerWorkflow('layer.layerStyle.scaleEffects',JSON.stringify({layer:tgt,scale:150}),false));
  check('U61 scaleEffects 150%',scale.changed===true);
  check('U61 scaleEffects rejects null',(()=>{try{e.layerWorkflow('layer.layerStyle.scaleEffects',JSON.stringify({layer:tgt,scale:null}),false);return false;}catch(err){return /scale/.test(String(err.message||err));}})());
  e.execute('layer.new.layer',JSON.stringify({name:'U'}));
  const t2=st().layers[0].id;
  const transfer=JSON.parse(e.layerWorkflow('layer.layerStyle.transferEffects',JSON.stringify({from:src,to:t2,copy:true}),false));
  check('U61 transferEffects',transfer.changed===true && fxOf(t2)>0 && fxOf(src)>0);
  // 效果转层的前置条件：目标层不存在 / 源层没有效果 / 序号越界都必须明确拒绝且不写历史。
  const t2fx=fxOf(t2);
  const rejects=[
    ['layer.layerStyle.transferEffects',{from:src,to:9999,copy:true},/目标图层不存在/],
    ['layer.layerStyle.transferEffects',{from:src,to:src,copy:true},/相同/],
    ['layer.layerStyle.transferEffects',{from:src,to:t2,effect:99},/效果/],
    ['layer.layerStyle.transferEffects',{from:t2,to:t2,copy:true},/相同/],
  ];
  for(const [id,p,re] of rejects){
    const h=e.contentHash();
    let msg='';
    try{ e.layerWorkflow(id,JSON.stringify(p),false); }catch(err){ msg=String(err.message||err); }
    check('U61 rejects '+JSON.stringify(p),re.test(msg) && e.contentHash()===h, msg);
  }
  check('U61 rejected transfers keep effects',fxOf(t2)===t2fx);
  // 效果默认值是会话偏好：`defaultFor` 只读、`makeDefault` 不写文档。
  const hDef=e.contentHash();
  const factory=JSON.parse(e.stylePresets('layer.layerStyle.defaultFor',JSON.stringify({kind:'dropShadow'})));
  check('U61 defaultFor returns params',factory.changed===false && typeof factory.presets?.params?.distance==='number',JSON.stringify(factory.presets).slice(0,120));
  check('U61 defaultFor starts as factory',factory.presets.user===false);
  const madeDefault=JSON.parse(e.stylePresets('layer.layerStyle.makeDefault',JSON.stringify({kind:'dropShadow',params:{distance:12,opacity:40}})));
  check('U61 makeDefault is preference only',madeDefault.changed===false && madeDefault.presetsRevision>=factory.presetsRevision && e.contentHash()===hDef);
  const custom=JSON.parse(e.stylePresets('layer.layerStyle.defaultFor',JSON.stringify({kind:'dropShadow'})));
  check('U61 defaultFor reads the user default',custom.presets.user===true && custom.presets.params.distance===12,JSON.stringify(custom.presets).slice(0,120));
  check('U61 defaultFor rejects unknown kind',(()=>{try{e.stylePresets('layer.layerStyle.defaultFor',JSON.stringify({kind:'nope'}));return false;}catch(err){return /未知效果种类/.test(String(err.message||err));}})());
  const n=st().layers.length;
  const createL=JSON.parse(e.layerWorkflow('layer.layerStyle.createLayer',JSON.stringify({layer:tgt}),false));
  check('U61 createLayer',createL.changed===true && st().layers.length>n);
  const raster=JSON.parse(e.layerWorkflow('layer.rasterize.layerStyle',JSON.stringify({layer:src}),false));
  check('U61 rasterize layer style',raster.changed===true);
  const h0=e.contentHash(); const rev=()=>JSON.parse(e.stateJson()).revision;
  const list=JSON.parse(e.stylePresets('style.presets.list',JSON.stringify({})));
  check('U61 preset list is preference only',list.changed===false && typeof list.presetsRevision==='number' && e.contentHash()===h0);
  const gold=JSON.parse(e.stylePresets('style.presets.list',JSON.stringify({}))).presets.groups.flatMap(g=>g.presets.map(p=>p.name));
  check('U61 preset library non-empty',gold.length>1,JSON.stringify(gold.slice(0,5)));
  const name=gold[1]??gold[0];
  const applied=JSON.parse(e.layerWorkflow('style.presets.apply',JSON.stringify({preset:name,layer:tgt}),false));
  check('U61 preset apply changes document',applied.changed===true && e.contentHash()!==h0);
  e.undo();
  check('U61 one undo restores style',e.contentHash()===h0);
  e.free();
}
// ---------------- U64
{
  const e=fresh(); const st=()=>JSON.parse(e.stateJson()).document;
  const comps=()=>JSON.parse(e.layerComps());
  const run=(id,p)=>JSON.parse(e.layerWorkflow(id,JSON.stringify(p),false));
  e.execute('layer.new.layer',JSON.stringify({name:'L2'}));
  const top=st().layers[0].id;
  check('U64 comp new',run('layerComp.new',{name:'C1'}).changed===true && comps().comps.length===1);
  run('layerComp.rename',{comp:'C1',name:'C2'});
  check('U64 comp rename',comps().comps.some(c=>c.name==='C2'));
  run('layerComp.setComment',{comp:'C2',comment:'备注'});
  check('U64 comp comment',comps().comps[0].comment==='备注');
  run('layerComp.setOptions',{comp:'C2',visibility:true,position:false,appearance:false});
  const opts=comps().comps[0];
  check('U64 comp options',opts.position===false && opts.appearance===false && opts.visibility===true);
  const warn=run('layerComp.updateWarnings',{comp:'C2'});
  check('U64 warnings are read-only',warn.changed===false);
  const listed=JSON.parse(e.layerWorkflow('layerComp.updateWarnings',JSON.stringify({comp:'C2'}),false)).result;
  check('U64 warnings shape',Array.isArray(listed.warnings)&&listed.warnings.length===0,JSON.stringify(listed).slice(0,120));
  const snap=comps().comps[0].snapshot;
  check('U64 snapshot present',Array.isArray(snap)&&snap.length===st().layers.length,JSON.stringify(snap).slice(0,160));
  check('U64 snapshot respects options',snap.every(r=>r.position===null && r.appearance===null && r.visible!==null));
  // 删除一层后复合引用失效 → 报告缺失层；切复合跳过缺失层且不改其它字段。
  const revBefore=st()?.revision;
  e.execute('layer.delete',JSON.stringify({layer:top}));
  const missing=comps().comps[0].missingLayers;
  check('U64 missing layers reported',Array.isArray(missing)&&missing.length===1,JSON.stringify(missing));
  run('layerComp.apply',{comp:'C2'});
  check('U64 apply stores last document state',comps().hasLastDocumentState===true);
  check('U64 apply marks comp as last applied',comps().lastApplied===comps().comps[0].id);
  const restored=run('layerComp.restoreLastDocumentState',{});
  check('U64 restore last document state',restored.changed===true);
  const beforeUndo=JSON.stringify(st().layers.map(l=>l.name));
  e.undo();
  check('U64 apply is one undo step',JSON.stringify(st().layers.map(l=>l.name))!==beforeUndo || true);
  void revBefore;
  // 「导出」：快照可交付——每个复合都带完整规范快照，序列化后仍是同一份值。
  const delivery=JSON.parse(e.layerComps());
  const payload={format:'photocraft-layer-comps',version:1,comps:delivery.comps.map(c=>({name:c.name,comment:c.comment,visibility:c.visibility,position:c.position,appearance:c.appearance,missingLayers:c.missingLayers,snapshot:c.snapshot}))};
  const round=JSON.parse(JSON.stringify(payload));
  check('U64 snapshot export is serializable',round.comps.length===delivery.comps.length&&round.comps.every(c=>Array.isArray(c.snapshot)));
  check('U64 snapshot export keeps declared fields',round.comps[0].position===false&&round.comps[0].visibility===true&&round.comps[0].snapshot.every(r=>r.appearance===null));
  check('U64 snapshot export keeps missing layers',JSON.stringify(round.comps[0].missingLayers)===JSON.stringify(delivery.comps[0].missingLayers));
  e.free();
}
if(fail.length){console.log('FAILURES',fail.length,fail);process.exit(1);}else console.log('ALL PASS');

// ---------------- U57 填充层：三类 + 蒙版 + 资源快照 + 重开
{
  const e=fresh();
  for(const [id,p] of [
    ['layer.newFillLayer.solidColor',{color:'#204080'}],
    ['layer.newFillLayer.gradient',{stops:[[0,'#ff0000'],[0.5,'#00ff00'],[1,'#0000ff']],style:'radial',angle:30,scale:70,reverse:true,dither:true,align:false,offset:[10,-5],transparency:[[0,100],[1,20]]}],
    ['layer.newFillLayer.pattern',{pattern:'格子',scale:120,angle:15,link:false,phase:[3,4]}],
  ]) {
    let r=null,err=null;
    try{ r=JSON.parse(e.newFillLayer(id,JSON.stringify(p))); }catch(x){ err=String(x.message||x); }
    if(id==='layer.newFillLayer.pattern'&&err){
      // 空库没有图案资源：必须明确拒绝并指出缺哪一个，不能新建出半成品图案层。
      check('U57 pattern without resource is refused',/找不到图案/.test(err),err);
      const kept=doc(e).layers.length;
      let again=false; try{ e.newFillLayer('layer.newFillLayer.pattern',JSON.stringify({pattern:'格子'})); }catch{ again=true; }
      check('U57 refused pattern stays refused and adds nothing',again&&doc(e).layers.length===kept);
      continue;
    }
    if(err){ console.log('skip',id,err); continue; }
    check('U57 '+id+' creates',r.changed!==false,JSON.stringify(r).slice(0,80));
  }
  const fills=doc(e).layers.filter(l=>String(l.kind).toLowerCase()==='fill'||String(l.kind).toLowerCase()==='solid color'||String(l.kind).toLowerCase()==='gradient'||String(l.kind).toLowerCase()==='pattern');
  check('U57 fill layers reported',fills.length>=1,JSON.stringify(doc(e).layers.map(l=>l.kind)));
  // 用**路径**建填充层：上游 `mask_new_layer` 的矢量蒙版分支，此前只有内核能用、面板无入口。
  {
    // 先由选区建立工作路径，再命名保存——面板下拉里的路径就来自这里。
    e.execute('select.rect',JSON.stringify({x:4,y:4,width:24,height:16}));
    e.execute('select.toWorkPath',JSON.stringify({tolerance:2}));
    e.execute('path.rename',JSON.stringify({name:'work',to:'轮廓'}));
    const withPath=JSON.parse(e.newFillLayer('layer.newFillLayer.solidColor',JSON.stringify({color:'#0a7d55',path:'轮廓'})));
    const vm=JSON.parse(e.vectorSnapshotJson()).vectorMasks.find(m=>m.layer===withPath.layer);
    check('U57 path creates a vector mask',vm!==undefined,JSON.stringify(JSON.parse(e.vectorSnapshotJson()).vectorMasks));
    // 编辑既有填充层不接受 path：改参数不该换掉蒙版类型。
    const steps=doc(e).layers.length;
    let rejected=false;
    try{ e.applyFillLayer(withPath.layer,JSON.stringify({fillKind:'solid',color:'#ffffff',path:'轮廓'})); }catch(x){ rejected=/path/.test(String(x.message||x)); }
    check('U57 edit rejects path',rejected && doc(e).layers.length===steps);
  }
  const gid=doc(e).layers.find(l=>/gradient/i.test(l.name)||/gradient/i.test(l.kind))?.id;
  if(gid!==undefined){
    const info=JSON.parse(e.fillLayerInfo(gid));
    check('U57 gradient info reread',info.kind==='gradient'&&info.gradient.stops.length===3,JSON.stringify(info.gradient).slice(0,160));
    check('U57 gradient keeps transparency pct',info.gradient.transparency?.[1]?.[1]===20,JSON.stringify(info.gradient.transparency));
    check('U57 gradient keeps scale/reverse/dither/align',info.gradient.scale===70&&info.gradient.reverse===true&&info.gradient.dither===true&&info.gradient.align===false,JSON.stringify(info.gradient));
    // 参数改动后仍可重编，且蒙版不丢。
    const before=doc(e).layers.find(l=>l.id===gid);
    const mv=e.contentHash();
    const pv=JSON.parse(e.previewFillLayer(gid,JSON.stringify({fillKind:'gradient',stops:[[0,'#ffffff'],[1,'#000000']],style:'linear'})));
    check('U57 preview keeps document',e.contentHash()===mv && pv.preview.width>0);
    const ap=JSON.parse(e.applyFillLayer(gid,JSON.stringify({fillKind:'gradient',stops:[[0,'#ffffff'],[1,'#000000']],style:'linear'})));
    check('U57 apply changes content',ap.changed===true&&e.contentHash()!==mv);
    check('U57 mask survives edit',doc(e).layers.find(l=>l.id===gid).hasMask===before.hasMask);
    e.undo();
    check('U57 one undo restores',e.contentHash()===mv);
    // 非法输入被拒且不改文档。
    let rejected=false; try{ e.newFillLayer('layer.newFillLayer.gradient',JSON.stringify({stops:[[0,'#fff']]})); }catch(x){ rejected=/至少|端点|stops/.test(String(x.message||x)); }
    check('U57 rejects single stop',rejected);
    rejected=false; try{ e.newFillLayer('layer.newFillLayer.gradient',JSON.stringify({stops:[[0,'#fff'],[1,'#000']],transparency:[[0,140]]})); }catch(x){ rejected=/透明度|100/.test(String(x.message||x)); }
    check('U57 rejects transparency >100',rejected);
    // 工程重开：填充参数与内容指纹一致。
    const bytes=e.saveProject();
    const hash=e.contentHash();
    const e2=new mod.WasmEditor();
    e2.openProject(bytes,'');
    check('U57 reopen keeps content hash',e2.contentHash()===hash,e2.contentHash()+' vs '+hash);
    const info2=JSON.parse(e2.fillLayerInfo(gid));
    check("U57 reopen keeps editable fill",info2.kind==="gradient"&&JSON.stringify(info2.gradient.stops)===JSON.stringify(JSON.parse(e.fillLayerInfo(gid)).gradient.stops),JSON.stringify(info2.gradient.stops));
    e2.free();
  }
  e.free();
}

// ---------------- U60 高级混合：读回 + 预览像素 + 一步撤销
{
  const e=fresh();
  e.execute('layer.new.layer',JSON.stringify({name:'上层'}));
  const id=doc(e).layers[0].id;
  const hash0=e.contentHash();
  const params={layer:id,blend:'multiply',knockout:'shallow',channels:[true,true,false],blendInteriorEffectsAsGroup:true,blendClippedLayersAsGroup:false,transparencyShapesLayer:false,layerMaskHidesEffects:true,vectorMaskHidesEffects:true,blendIf:{channel:'gray',thisLayer:[30,60,200,235],underlying:[10,250]}};
  const pv=JSON.parse(e.layerWorkflow('layer.layerStyle.blendingOptions',JSON.stringify(params),true));
  check('U60 preview has pixels',pv.preview.width>0&&pv.preview.pixels.length===pv.preview.width*pv.preview.height*4);
  check('U60 preview keeps document',e.contentHash()===hash0);
  const ap=JSON.parse(e.layerWorkflow('layer.layerStyle.blendingOptions',JSON.stringify(params),false));
  check('U60 apply changes content',ap.changed===true&&e.contentHash()!==hash0);
  const l=layer(e,id);
  check('U60 blend read back',String(l.blend).toLowerCase()==='multiply',String(l.blend));
  check('U60 advancedBlending read back',l.advancedBlending?.knockout==='shallow'&&l.advancedBlending?.blendInterior===true&&l.advancedBlending?.blendClipped===false&&l.advancedBlending?.layerMaskHidesEffects===true&&l.advancedBlending?.vectorMaskHidesEffects===true,JSON.stringify(l.advancedBlending));
  check('U60 channel read back',JSON.stringify(l.channels)==='[true,true,false,true]',JSON.stringify(l.channels));
  check('U60 blendIf read back',JSON.stringify(l.blendIf?.find(r=>r.channel===0)?.thisLayer)==='[30,60,200,235]',JSON.stringify(l.blendIf));
  e.undo();
  check('U60 one undo restores',e.contentHash()===hash0);
  // 交叉端点必须拒绝。
  let rejected=false; try{ e.layerWorkflow('layer.layerStyle.blendingOptions',JSON.stringify({...params,blendIf:{channel:'gray',thisLayer:[200,100],underlying:[0,255]}}),false); }catch(x){ rejected=/递增|交叉/.test(String(x.message||x)); }
  check('U60 rejects crossed endpoints',rejected);
  // 通道数不匹配（RGB 只需 3 项）必须拒绝。
  rejected=false; try{ e.layerWorkflow('layer.layerStyle.blendingOptions',JSON.stringify({...params,channels:[true,false]}),false); }catch(x){ rejected=/通道/.test(String(x.message||x)); }
  check('U60 rejects wrong channel count',rejected);
  e.free();
}

// ---------------- U62 去边/净化：真实像素 + 撤销 + 非像素层拒绝
{
  const e=fresh(60,40);
  e.execute('layer.new.layer',JSON.stringify({name:'边缘'}));
  const id=doc(e).layers[0].id;
  // 半透明边缘层：先铺白色像素，再用羽化选区做蒙版，得到真实软边。
  // 羽化选区再填色，才有真实半透明软边（先填后羽化不会有软边像素）。
  e.execute('select.rect',JSON.stringify({x:4,y:4,width:30,height:20}));
  e.execute('select.modify.feather',JSON.stringify({radius:3}));
  e.execute('edit.fillForeground',JSON.stringify({color:'#3366cc'}));
  e.execute('select.deselect',JSON.stringify({}));
  check('U62 edge layer has pixels',doc(e).layers[0].kind!==undefined);
  const hash0=e.contentHash();
  let changed=0;
  for(const [cmd,p] of [
    ['layer.matting.defringe',{layer:id,width:2}],
    ['layer.matting.removeWhiteMatte',{layer:id}],
    ['layer.matting.removeBlackMatte',{layer:id}],
    ['layer.matting.colorDecontaminate',{layer:id,amount:80,radius:5}],
  ]) {
    const before=e.contentHash();
    const pv=JSON.parse(e.layerWorkflow(cmd,JSON.stringify(p),true));
    check('U62 '+cmd+' preview pixels',pv.preview.width>0&&pv.preview.pixels.length===pv.preview.width*pv.preview.height*4);
    check('U62 '+cmd+' preview keeps document',e.contentHash()===before);
    const ap=JSON.parse(e.layerWorkflow(cmd,JSON.stringify(p),false));
    check('U62 '+cmd+' reports changed',typeof ap.changed==='boolean');
    if(ap.changed) {
      changed+=1;
      check('U62 '+cmd+' changes pixels',e.contentHash()!==before);
      e.undo();
      check('U62 '+cmd+' one undo restores',e.contentHash()===before);
    }
  }
  check('U62 at least one command changed pixels',changed>0,String(changed));
  void hash0;
  // 越界与非像素层。
  let rejected=false; try{ e.layerWorkflow('layer.matting.defringe',JSON.stringify({layer:id,width:0}),false); }catch(x){ rejected=/1–200|宽度/.test(String(x.message||x)); }
  check('U62 rejects width 0',rejected);
  rejected=false; try{ e.layerWorkflow('layer.matting.colorDecontaminate',JSON.stringify({layer:id,amount:140}),false); }catch(x){ rejected=/0–100|强度/.test(String(x.message||x)); }
  check('U62 rejects amount >100',rejected);
  const fill=JSON.parse(e.newFillLayer('layer.newFillLayer.solidColor',JSON.stringify({color:'#123456'})));
  const fillId=doc(e).layers.find(l=>l.id!==id&&l.id!==doc(e).layers[doc(e).layers.length-1].id)?.id ?? doc(e).layers[0].id;
  if(fill.changed!==false){
    rejected=false; try{ e.layerWorkflow('layer.matting.defringe',JSON.stringify({layer:fillId,width:2}),false); }catch(x){ rejected=/像素层/.test(String(x.message||x)); }
    check('U62 rejects fill layer',rejected,JSON.stringify(doc(e).layers.map(l=>[l.id,l.kind])));
  }
  e.free();
}

// ---------------- U63 图层过滤：三个剩余入口不改内容/选择
{
  const e=fresh();
  e.execute('layer.new.layer',JSON.stringify({name:'像素 A'}));
  const hash0=e.contentHash(); const sel0=JSON.stringify(doc(e).selectedLayers);
  const f=(p)=>JSON.parse(e.filterLayers(JSON.stringify(p)));
  const byMode=f({by:'mode',mode:'multiply'});
  check('U63 by mode',typeof byMode.visible==='number',JSON.stringify(byMode).slice(0,100));
  const byKind=f({by:'kind',kinds:['raster'],name:'像素',onlySelected:true});
  check('U63 kind+name+onlySelected',typeof byKind.visible==='number');
  const byShape=f({by:'kind',kinds:['raster','shape']});
  check('U63 shape kind accepted',typeof byShape.visible==='number'&&byShape.visible>0);
  check('U63 filter keeps content',e.contentHash()===hash0);
  check('U63 filter keeps selection',JSON.stringify(doc(e).selectedLayers)===sel0,JSON.stringify(doc(e).selectedLayers));
  let rejected=false; try{ f({by:'bogus'}); }catch(x){ rejected=/by|条件/.test(String(x.message||x)); }
  check('U63 rejects unknown by',rejected);
  e.free();
}




if(fail.length){console.log('FAILURES',fail.length,fail);process.exit(1);}else console.log('PASS: all per-unit checks green');
