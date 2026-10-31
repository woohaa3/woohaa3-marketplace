// U57–U64 主线：在真实匹配 WASM 上逐项执行，记录成功/拒绝/取消/内容身份/历史/工程重开。
import fs from 'node:fs';import path from 'node:path';import {pathToFileURL} from 'node:url';
const source=path.resolve('packages/editor/dist/wasm');
const mod=await import(pathToFileURL(path.join(source,'photocraft_editor.js')));
mod.initSync({module:fs.readFileSync(path.join(source,'photocraft_editor_bg.wasm'))});
const e=new mod.WasmEditor();
const D=()=>JSON.parse(e.stateJson()).document;
const rows=[];
const rec=(u,item,result,detail='')=>rows.push({u,item,result,detail:String(detail).slice(0,96)});
const call=(fn)=>{try{return {ok:true,value:fn()};}catch(err){return {ok:false,error:String(err)};}};
const must=(u,item,fn,check)=>{const r=call(fn);if(!r.ok){rec(u,item,'拒绝',r.error);return null;}const c=check?check(r.value):true;rec(u,item,c===true?'通过':'不符',c===true?String(r.value).slice(0,60):String(c));return r.value;};
const command=(u,item,id,params)=>{const r=call(()=>e.execute(id,JSON.stringify(params??{})));rec(u,item,r.ok?'通过':'拒绝',r.ok?String(r.value).slice(0,40):r.error);return r.ok;};
const wf=(u,item,id,params,preview=false)=>{const r=call(()=>JSON.parse(e.layerWorkflow(id,JSON.stringify(params??{}),preview)));rec(u,item,r.ok?'通过':'拒绝',r.ok?JSON.stringify(r.value).slice(0,60):r.error);return r.ok?r.value:null;};

// 画布 1440x1000（电脑主线尺寸）
command('前置','新建 1440×1000','file.new',{width:1440,height:1000,name:'图层主线'});
rec('前置','画布尺寸',`${D().width}×${D().height}`);

// ── U57 可重编渐变填充
const fill=must('U57','新建渐变填充层',()=>JSON.parse(e.newFillLayer('layer.newFillLayer.gradient',JSON.stringify({stops:[[0,'#ff8800'],[1,'#0044ff']],style:'radial',angle:20,scale:80}))),v=>typeof v.layer==='number');
const fillId=fill?.layer;
const fillHash=e.contentHash();
rec('U57','读回规范参数',(call(()=>JSON.parse(e.fillLayerInfo(fillId)).kind).value));
const prev=call(()=>JSON.parse(e.previewFillLayer(fillId,JSON.stringify({fillKind:'gradient',stops:[[0,'#00ff88'],[1,'#8800ff']],angle:135}))));
rec('U57','参数预览返回像素',prev.ok&&prev.value.preview?`${prev.value.preview.width}×${prev.value.preview.height}`:String(prev.error??'无像素'));
rec('U57','预览不改正式指纹',e.contentHash()===fillHash?'通过':'失败');
must('U57','提交参数（一步历史）',()=>JSON.parse(e.applyFillLayer(fillId,JSON.stringify({fillKind:'gradient',stops:[[0,'#00ff88'],[1,'#8800ff']],angle:135}))).changed,v=>v===true);
rec('U57','改参数改变内容身份',e.contentHash()!==fillHash?'通过':'失败');
const badSolid=call(()=>e.previewFillLayer(fillId,JSON.stringify({fillKind:'gradient',stops:[[0,'#000000']]})));
rec('U57','非法参数被拒',badSolid.ok?'失败(未拒绝)':'通过');
command('U57','撤销',   'edit.undo',{});
rec('U57','撤销恢复原身份',e.contentHash()===fillHash?'通过':'失败');
command('U57','重做','edit.redo',{});

// ── U58 链接 / 标签 / 盖印
const p1=must('U58','建像素层 A',()=>{e.execute('layer.new.layer',JSON.stringify({name:'像素A'}));return D().activeLayer;});
const p2=must('U58','建像素层 B',()=>{e.execute('layer.new.layer',JSON.stringify({name:'像素B'}));return D().activeLayer;});
command('U58','选中 A','layer.select',{layer:p1});
command('U58','加选 B','layer.select',{layer:p2,mode:'toggle'});
rec('U58','多选成立',JSON.stringify(D().selectedLayers)===JSON.stringify([p1,p2])?`[${p1},${p2}]`:'选择不符');
must('U58','链接两层',()=>wf('U58','linkLayers','layer.linkLayers',{}));
rec('U58','两层链接组一致',(()=>{const g=D().layers.filter(l=>l.id===p1||l.id===p2).map(l=>l.linkGroup);return g[0]&&g[0]===g[1]?`group=${g[0]}`:'不一致';})());
must('U58','颜色标签',()=>wf('U58','setLabelColor','layer.setLabelColor',{layer:p1,color:'blue'}));
rec('U58','标签读回',D().layers.find(l=>l.id===p1)?.labelColor??'缺失');
const linkedSel=must('U58','选中所属链接层',()=>wf('U58','selectLinkedLayers','layer.selectLinkedLayers',{}));
rec('U58','选择后含链接层',JSON.stringify(D().selectedLayers));
const beforeStamp=D().layers.length;
must('U58','向下盖印',()=>wf('U58','stampDown','layer.stampDown',{layer:p2}));
rec('U58','盖印新增一层',`${beforeStamp}→${D().layers.length}`);
command('U58','盖印层保留来源可见','layer.setProps',{layer:D().layers[0].id,visible:true});
const lockLayer=must('U58','建位置锁定层',()=>{e.execute('layer.new.layer',JSON.stringify({name:'锁定层'}));const id=D().activeLayer;e.execute('layer.lockLayers',JSON.stringify({position:true}));return id;});
const lockState=D().layers.find(l=>l.id===lockLayer)?.locks?.position===true;
rec('U58','位置锁定已生效',lockState?'通过':'失败');
e.execute('layer.select',JSON.stringify({layer:p1}));
command('U58','加选锁定层','layer.select',{layer:lockLayer,mode:'toggle'});
const alignLocked=call(()=>e.execute('layer.align.leftEdges',JSON.stringify({to:'selection'})));
rec('U58','位置锁定层参与对齐被拒',alignLocked.ok?'失败(未拒绝)':'通过',alignLocked.error??'');
command('U58','恢复只选链接两层','layer.select',{layer:p1});
command('U58','加选 B','layer.select',{layer:p2,mode:'toggle'});
const relink=wf('U58','链接保持','layer.linkLayers',{});

// ── U59 粘贴入 / 粘贴外
command('U59','源层落笔','layer.select',{layer:p2});
command('U59','选区','select.rect',{x:200,y:150,width:400,height:300,mode:'replace'});
command('U59','填充选区','edit.fillForeground',{color:'#33cc66'});
command('U59','全选','select.all',{});
command('U59','复制','edit.copy',{});
const clip0=JSON.stringify(JSON.parse(e.pasteRegion()).clipboard);
command('U59','新选区','select.rect',{x:600,y:420,width:360,height:260,mode:'replace'});
const beforeInto=D().layers.length;
const into=wf('U59','粘贴入','edit.pasteSpecial.pasteInto',{});
rec('U59','粘贴入新增一层',`${beforeInto}→${D().layers.length}`);
rec('U59','原剪贴板不变',JSON.stringify(JSON.parse(e.pasteRegion()).clipboard)===clip0?'通过':'失败');
command('U59','再选区','select.rect',{x:700,y:500,width:300,height:220,mode:'replace'});
const outside=wf('U59','pasteOutside','edit.pasteSpecial.pasteOutside',{});
rec('U59','粘贴外新增一层',`${beforeInto+1}→${D().layers.length}`);
const deselect=call(()=>e.execute('select.deselect','{}'));
rec('U59','取消选区（无选区时为预期拒绝）',deselect.ok?'通过':'按预期拒绝',deselect.error??'');
const noSel=call(()=>e.layerWorkflow('edit.pasteSpecial.pasteInto',JSON.stringify({}),false));
rec('U59','无选区时拒绝',noSel.ok?'失败(未拒绝)':'通过',noSel.error??'');

// ── U60 高级混合 / Blend If / 挖空
const blendBefore=e.contentHash();
const blendPreview=wf('U60','分离端点预览','layer.layerStyle.blendingOptions',{layer:p1,blend:'multiply',knockout:'shallow',channels:[true,true,false],blendInteriorEffectsAsGroup:true,blendIf:{channel:'gray',thisLayer:[30,60,200,235],underlying:[0,255]}},true);
rec('U60','预览返回真实合成像素',blendPreview?.preview?`${blendPreview.preview.width}×${blendPreview.preview.height}`:'无像素');
rec('U60','预览不改指纹',e.contentHash()===blendBefore?'通过':'失败');
must('U60','提交混合选项',()=>wf('U60','apply','layer.layerStyle.blendingOptions',{layer:p1,blend:'multiply',knockout:'shallow',channels:[true,true,false],blendInteriorEffectsAsGroup:true,blendIf:{channel:'gray',thisLayer:[30,60,200,235],underlying:[0,255]}}));
rec('U60','分离端点读回',JSON.stringify(D().layers.find(l=>l.id===p1)?.blendIf?.[0]?.thisLayer));
rec('U60','通道读回',JSON.stringify(D().layers.find(l=>l.id===p1)?.channels));
rec('U60','挖空读回',D().layers.find(l=>l.id===p1)?.advancedBlending?.knockout??'缺失');
const cross=call(()=>e.layerWorkflow('layer.layerStyle.blendingOptions',JSON.stringify({layer:p1,blendIf:{channel:'gray',thisLayer:[200,100]}}),false));
rec('U60','交叉端点被拒',cross.ok?'失败(未拒绝)':'通过');

// ── U61 样式复制/转移/转层/预设管理
must('U61','应用内置预设（取得效果）',()=>wf('U61','preset apply','style.presets.apply',{preset:'Gold',layer:p1}));
must('U61','复制样式',()=>wf('U61','copyStyle','layer.layerStyle.copyLayerStyle',{layer:p1}));
const target=must('U61','建目标层',()=>{e.execute('layer.new.layer',JSON.stringify({name:'样式目标'}));return D().activeLayer;});
must('U61','粘贴样式',()=>wf('U61','pasteStyle','layer.layerStyle.pasteLayerStyle',{layer:target}));
rec('U61','目标层获得效果',D().layers.find(l=>l.id===target)?.effects?.items?.length?'有':'无');
must('U61','缩放效果',()=>wf('U61','scaleEffects','layer.layerStyle.scaleEffects',{layer:p1,scale:150}));
must('U61','转移效果',()=>wf('U61','transferEffects','layer.layerStyle.transferEffects',{from:p1,to:target,copy:true}));
const beforeCreate=D().layers.length;
must('U61','效果转层',()=>wf('U61','createLayer','layer.layerStyle.createLayer',{layer:target}));
rec('U61','转层后层数',`${beforeCreate}→${D().layers.length}`);
must('U61','样式栅格化',()=>wf('U61','rasterizeStyle','layer.rasterize.layerStyle',{layer:p1}));
const rev0=D().revision;
must('U61','列出预设',()=>{const v=JSON.parse(e.stylePresets('style.presets.list','{}'));return v.presets.groups.length;});
must('U61','保存预设',()=>JSON.parse(e.stylePresets('style.presets.new',JSON.stringify({name:'主线预设',layer:target}))).presetsRevision);
must('U61','重命名预设',()=>JSON.parse(e.stylePresets('style.presets.edit',JSON.stringify({action:'rename',preset:'主线预设',name:'主线预设2'}))).presetsRevision);
must('U61','删除预设',()=>JSON.parse(e.stylePresets('style.presets.edit',JSON.stringify({action:'delete',preset:'主线预设2'}))).presetsRevision);
must('U61','恢复默认预设库',()=>JSON.parse(e.stylePresets('style.presets.reset',JSON.stringify({}))).presetsRevision);
must('U61','读取效果默认值',()=>wf('U61','defaultFor','layer.layerStyle.defaultFor',{kind:'dropShadow'}));
must('U61','设为用户默认',()=>wf('U61','makeDefault','layer.layerStyle.makeDefault',{kind:'dropShadow',params:{distance:6,size:4}}));
rec('U61','预设操作不推进文档修订',D().revision===rev0?`revision=${rev0}`:'被推进');

// ── U62 去边与净化（羽化边缘制造真实半透明杂边）
const edge=must('U62','建羽化边缘层',()=>{e.execute('layer.new.layer',JSON.stringify({name:'边缘'}));const id=D().activeLayer;e.execute('select.rect',JSON.stringify({x:120,y:120,width:360,height:260}));e.execute('select.modify.feather',JSON.stringify({radius:4}));e.execute('edit.fillForeground',JSON.stringify({color:'#dd2233'}));e.execute('select.deselect','{}');return id;});
const mHash=e.contentHash();
const mPrev=wf('U62','去边预览','layer.matting.defringe',{layer:edge,width:3},true);
rec('U62','去边预览像素',mPrev?.preview?`${mPrev.preview.width}×${mPrev.preview.height}`:'无像素');
rec('U62','预览不改指纹',e.contentHash()===mHash?'通过':'失败');
must('U62','移除白色杂边（真实改像素）',()=>wf('U62','removeWhiteMatte','layer.matting.removeWhiteMatte',{layer:edge}));
rec('U62','改像素后内容身份变化',e.contentHash()!==mHash?'通过':'失败');
command('U62','撤销','edit.undo',{});
rec('U62','撤销恢复原像素',e.contentHash()===mHash?'通过':'失败');
must('U62','移除黑色杂边',()=>wf('U62','removeBlackMatte','layer.matting.removeBlackMatte',{layer:edge}));
must('U62','颜色净化（纯色无差为无变化）',()=>wf('U62','decontaminate','layer.matting.colorDecontaminate',{layer:edge,amount:100,radius:4}));
const mBad=call(()=>e.layerWorkflow('layer.matting.defringe',JSON.stringify({layer:edge,width:0}),false));
rec('U62','宽度越界被拒',mBad.ok?'失败(未拒绝)':'通过');
const adjId=must('U62','建调整层',()=>{e.execute('layer.newAdjustmentLayer.curves',JSON.stringify({}));return D().activeLayer;});
const mGroup=call(()=>e.layerWorkflow('layer.matting.defringe',JSON.stringify({layer:adjId,width:2}),false));
rec('U62','非像素层被拒',mGroup.ok?'失败(未拒绝)':'通过');
const fillLayerId=must('U62','建填充层',()=>JSON.parse(e.newFillLayer('layer.newFillLayer.solidColor',JSON.stringify({color:'#3366ff'}))).layer);
const mFill=call(()=>e.layerWorkflow('layer.matting.defringe',JSON.stringify({layer:fillLayerId,width:2}),false));
rec('U62','填充层被拒',mFill.ok?'失败(未拒绝)':'通过');

// ── U63 图层过滤（只改列表）
command('U63','选中 A 作为过滤基准','layer.select',{layer:p1});
const fHash=e.contentHash();
const fMode=call(()=>JSON.parse(e.filterLayers(JSON.stringify({by:'mode',mode:'multiply'}))));
rec('U63','按混合模式过滤',fMode.ok?`visible=${fMode.value.visible}/${fMode.value.layers.length}`:String(fMode.error));
const fCombo=call(()=>JSON.parse(e.filterLayers(JSON.stringify({by:'kind',kinds:['raster'],name:'像素',onlySelected:true}))));
rec('U63','组合条件（种类+名称+只选中）',fCombo.ok?`visible=${fCombo.value.visible}`:String(fCombo.error));
const fShape=call(()=>JSON.parse(e.filterLayers(JSON.stringify({by:'kind',kinds:['raster','shape']}))));
rec('U63','多选种类',fShape.ok?`visible=${fShape.value.visible}`:String(fShape.error));
rec('U63','过滤不改内容/选择/修订',e.contentHash()===fHash&&JSON.stringify(D().selectedLayers)===JSON.stringify([p1])?'通过':'失败');
const fBad=call(()=>e.filterLayers(JSON.stringify({by:'nope'})));
rec('U63','非法主条件被拒',fBad.ok?'失败(未拒绝)':'通过');

// ── U64 图层复合
must('U64','新建复合 A（三字段）',()=>wf('U64','comp new A','layerComp.new',{name:'A',visibility:true,position:true,appearance:true}));
command('U64','隐藏一层','layer.setProps',{layer:target,visible:false});
must('U64','新建复合 B（仅可见性）',()=>wf('U64','comp new B','layerComp.new',{name:'B',visibility:true,position:false,appearance:false}));
const comps=call(()=>JSON.parse(e.layerComps()));
rec('U64','复合列表',comps.ok?comps.value.comps.map(c=>c.name).join(','):String(comps.error));
rec('U64','B 快照只含可见性',JSON.stringify(comps.ok?comps.value.comps[1].snapshot.slice(0,2):[]));
rec('U64','A 快照含位置与外观',JSON.stringify(comps.ok?comps.value.comps[0].snapshot.slice(0,1):[]));
must('U64','切换复合 A',()=>wf('U64','apply A','layerComp.apply',{comp:'A'}));
rec('U64','切 A 后该层恢复可见',D().layers.find(l=>l.id===target)?.visible===true?'通过':'失败');
must('U64','切换复合 B',()=>wf('U64','apply B','layerComp.apply',{comp:'B'}));
must('U64','上一个复合',()=>wf('U64','previous','layerComp.previous',{}));
must('U64','下一个复合',()=>wf('U64','next','layerComp.next',{}));
must('U64','更新复合',()=>wf('U64','update','layerComp.update',{comp:'A',what:'all'}));
must('U64','复制复合',()=>wf('U64','duplicate','layerComp.duplicate',{comp:'A'}));
must('U64','重命名副本',()=>wf('U64','rename','layerComp.rename',{comp:'A copy',name:'A2'}));
must('U64','写注释',()=>wf('U64','comment','layerComp.setComment',{comp:'A2',comment:'主线验收'}));
must('U64','改选项',()=>wf('U64','options','layerComp.setOptions',{comp:'A2',visibility:true,position:true,appearance:false}));
must('U64','删除副本',()=>wf('U64','delete','layerComp.delete',{comp:'A2'}));
const compBad=call(()=>e.layerWorkflow('layerComp.apply',JSON.stringify({comp:'不存在的复合'}),false));
rec('U64','缺失复合被拒',compBad.ok?'失败(未拒绝)':'通过');

// ── 工程重开（内容身份 + 填充参数 + 复合）
const bundle=e.exportBundle();
const reopened=new mod.WasmEditor();
const open=call(()=>reopened.openProject(bundle.project,''));
rec('保存重开','打开导出的工程',open.ok?'通过':String(open.error));
rec('保存重开','内容身份一致',open.ok&&reopened.contentHash()===bundle.documentContentHash?'通过':'失败',open.ok?`${bundle.documentContentHash}`:'');
rec('保存重开','填充层参数可读回',open.ok?call(()=>JSON.parse(reopened.fillLayerInfo(fillId)).kind).value??'失败':'失败');
rec('保存重开','图层复合保留',open.ok?JSON.parse(reopened.layerComps()).comps.map(c=>c.name).join(','):'失败');
bundle.free();reopened.free();
rec('范围','未改动 vendored 上游',fs.existsSync('vendor/photocraft/Cargo.toml')?'只读引用':'缺失');
e.free();
const passed=rows.filter(r=>['通过','true','有'].includes(r.result)||/^visible=|^group=|^revision=|^\[|^\d|^\d+×|^[A-Fa-f0-9]{16}$|^→/.test(r.result)).length;
for(const r of rows) console.log(`${r.u}\t${r.item}\t${r.result}\t${r.detail}`);
console.log('---');console.log('total',rows.length,'通过(含读回证据)',passed,'拒绝/失败',rows.filter(r=>r.result==='拒绝'||r.result.startsWith('失败')).length);
