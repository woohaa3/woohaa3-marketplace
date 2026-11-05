#!/usr/bin/env node
// Optional composition-root packaging. Public client never reads this workspace.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2), option=name=>{const i=args.indexOf(name);if(i<0||!args[i+1])throw Error(`Missing ${name}`);return path.resolve(args[i+1]);};
const template=option('--app-template'), executable=option('--executable'), host=option('--host-root'), extension=option('--extension-root'), output=option('--out'), identity=option('--identity');
if(process.platform!=='darwin'||process.arch!=='arm64')throw Error('This trial package requires an Apple Silicon macOS builder');
if(fs.existsSync(output))throw Error('Output already exists; choose a fresh trial directory');
for(const file of [template,executable,host,extension,identity])if(!fs.existsSync(file))throw Error(`Missing input ${file}`);
fs.mkdirSync(output,{recursive:true});
const app=path.join(output,'WooHaa3 PhotoCraft Experimental.app');
execFileSync('/usr/bin/ditto',[template,app]);
const contents=path.join(app,'Contents'), resources=path.join(contents,'Resources');
fs.rmSync(path.join(contents,'_CodeSignature'),{recursive:true,force:true});
fs.copyFileSync(executable,path.join(contents,'MacOS/woohaa-desktop'));fs.chmodSync(path.join(contents,'MacOS/woohaa-desktop'),0o755);
const plist=path.join(contents,'Info.plist');
for(const [key,value] of Object.entries({CFBundleIdentifier:'com.woohaa3.photocraft.experimental',CFBundleName:'WooHaa3 PhotoCraft Experimental',CFBundleDisplayName:'WooHaa3 PhotoCraft Experimental'}))execFileSync('/usr/libexec/PlistBuddy',['-c',`Set :${key} ${value}`,plist]);
const archive=path.join(resources,'desktop-host.tar.gz');
execFileSync('/usr/bin/tar',['-czf',archive,'-C',host,'.']);
const sha256=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
fs.writeFileSync(path.join(resources,'desktop-runtime.json'),JSON.stringify({hostArchiveSha256:sha256(archive),nodeVersion:'24.22.0'}));
// The local variant has no update endpoint and cannot replace the ordinary app.
fs.writeFileSync(path.join(resources,'woohaa-desktop.defaults.json'),JSON.stringify({version:1,uiUrl:null}));
fs.cpSync(extension,path.join(output,'photocraft'),{recursive:true});
if(args.includes('--workload'))fs.cpSync(option('--workload'),path.join(output,'test-image'),{recursive:true});
fs.copyFileSync(identity,path.join(output,'build-identity.json'));
fs.copyFileSync(option('--capture-exporter'),path.join(output,'export-webview-performance.mjs'));
const runner=fs.readFileSync(option('--launcher'),'utf8').replace('WooHaa3.app/Contents/MacOS/woohaa-desktop','WooHaa3 PhotoCraft Experimental.app/Contents/MacOS/woohaa-desktop').replace("build: 'debug'","build: 'optimized-native-experimental'");
fs.writeFileSync(path.join(output,'run-diagnostic.mjs'),runner);
fs.writeFileSync(path.join(output,'启动试用版.command'),'#!/bin/zsh\ncd -- "${0:A:h}"\nexec "./WooHaa3 PhotoCraft Experimental.app/Contents/MacOS/woohaa-node" ./run-diagnostic.mjs\n',{mode:0o755});
fs.writeFileSync(path.join(output,'使用说明.txt'),'PhotoCraft 原生试用版（Apple 芯片 Mac）\n\n1. 解压到本机目录，双击“启动试用版.command”。\n2. 使用同一张图，分别试画笔、修复/移除，观察拖动与松开后的响应；再试取消、撤销、应用到节点、下载工程。\n3. 关闭 App 后，把 records 中本轮记录目录压缩发回来，并说明哪一步最卡。\n\n本包使用独立 workspace，不会覆盖正式版工作区。records 记录运行与硬件信息；不会记录图片像素或输入文字。\n原生功能为试验版本，是否稳定达到 60fps 需要本轮真实设备结果确认。\n');
fs.writeFileSync(path.join(output,'package-manifest.json'),JSON.stringify({schemaVersion:1,builtAt:new Date().toISOString(),platform:process.platform,arch:process.arch,executableSha256:sha256(executable),hostArchiveSha256:sha256(archive),buildIdentity:JSON.parse(fs.readFileSync(identity,'utf8'))},null,2));
execFileSync('/usr/bin/codesign',['--force','--deep','--sign','-','--entitlements',option('--entitlements'),app]);
execFileSync('/usr/bin/codesign',['--verify','--deep','--strict',app]);
console.log(app);
