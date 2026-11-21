const {app,webContents,session,BaseWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const project=fs.readFileSync(path.join(__dirname,'project.txt'),'utf8');
const stageFile=path.join(project,'test-results','workspace-180-stage.json');const stage=fs.existsSync(stageFile)?JSON.parse(fs.readFileSync(stageFile,'utf8')):null;
const results=stage?.results??path.join(project,'test-results','workspace-180-'+Date.now());fs.mkdirSync(results,{recursive:true});
process.env.MULTIDOCK_TEST_DATA=path.join(results,'profile');
const checks=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f){for(let n=0;n<240;n++){const value=await f();if(value)return value;await wait(50)}throw Error('Timeout')}
let requests=0;const server=http.createServer((req,res)=>{requests++;res.setHeader('Content-Type','text/html');res.end('<html><body>IndigoDock test</body></html>')});
const realFetch=global.fetch;
global.fetch=async(u,...args)=>{
 const url=String(u);
 if(url.startsWith('https://geocoding-api.open-meteo.com/'))return {ok:true,json:async()=>({results:[{name:'Berlin',country:'Deutschland',latitude:52.52,longitude:13.41}]})};
 if(url.startsWith('https://api.open-meteo.com/'))return {ok:true,json:async()=>({current:{temperature_2m:18,weather_code:2,is_day:1},daily:{time:Array.from({length:6},(_,i)=>`2026-11-${17+i}`),weather_code:[2,3,61,0,3,80],temperature_2m_min:[5,6,7,8,4,3],temperature_2m_max:[18,17,15,18,12,14],precipitation_probability_max:[20,30,70,0,25,80]}})};
 return realFetch(u,...args);
};
require(path.join(project,'dist/main.cjs'));
app.whenReady().then(async()=>{
 try{
 await new Promise(r=>server.listen(stage?.port??0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
 const ui=await until(()=>webContents.getAllWebContents().find(w=>w.getURL().endsWith('/ui/index.html')));
 const js=s=>{fs.appendFileSync(path.join(results,'trace.txt'),s+'\n');return ui.executeJavaScript(s)}; ui.on('console-message',(_e,...args)=>fs.appendFileSync(path.join(results,'console.txt'),JSON.stringify(args)+'\n'));await until(()=>js('!!window.multidock && !!document.querySelector(".dock")'));
 const cmd=async c=>{await js(`window.multidock.command(${JSON.stringify(c)})`);await wait(80)};
 const state=async()=>{await wait(70);return js('window.multidock.snapshot()')};
 await cmd({type:'settings',settings:{...(await state()).config.settings,language:'de'}});
 const ready=id=>until(async()=>(await state()).status[id]?.state==='ready');
 if(stage?.phase===2){
   await ready('f0');await ready('f1');
   const c=(await state()).config;assert.equal(c.settings.groupMode,'icon-group');assert.equal(c.groups[0].icon,'heart');assert.deepEqual(c.groups[0].layout.ratios,[0.3,0.7]);
   const w=webContents.getAllWebContents().find(w=>w.session===session.fromPartition('persist:multidock-isolated-0')&&w.getURL().startsWith(url));
   assert.equal(await w.executeJavaScript('localStorage.getItem("isolation")'),'private');
   assert.equal((await session.fromPartition('persist:multidock-isolated-0').cookies.get({name:'isolation'}))[0]?.value,'private');
   assert.equal((await session.fromPartition('persist:multidock-shared-global').cookies.get({name:'shared'}))[0]?.value,'yes');
   fs.writeFileSync(path.join(results,'result.json'),JSON.stringify({passed:true,checks:[...stage.checks,'private and shared browser storage, group icon and widths survive real process restart']},null,2));
   fs.writeFileSync(stageFile,JSON.stringify({...stage,phase:3}));await cmd({type:'window',action:'quit'});return;
 }
 for(let i=0;i<4;i++)await cmd({type:'saveService',service:{id:`f${i}`,name:`Fixture ${i}`,profile:`isolated-${i}`,url,allowHttp:true}});
 await js(`document.querySelector('[aria-label="Fixture 0"]').click()`);await until(async()=>(await state()).config.count===1&&(await state()).config.layouts[1].columns[0].active==='f0');await ready('f0');checks.push('normal click starts service and opens single view');
 for(let i=1;i<4;i++){await js(`document.querySelector('[aria-label="Fixture ${i}"]').dispatchEvent(new MouseEvent('click',{bubbles:true,ctrlKey:true}))`);await until(async()=>(await state()).config.count===i+1);await ready(`f${i}`)}
 checks.push('CTRL click builds two, three and four column selections');
 await js(`document.querySelector('[aria-label="Fixture 1"]').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:400}))`);
 await until(()=>js(`[...document.querySelectorAll('.context-menu button')].some(b=>b.textContent==='Als Gruppe speichern')`));
 await js(`[...document.querySelectorAll('.context-menu button')].find(b=>b.textContent==='Als Gruppe speichern').click()`);await until(async()=>(await state()).config.groups.length===1);
 const group=(await state()).config.groups[0];assert.equal(group.layout.columns.length,4);checks.push('selection saved through service context menu');
 await js(`document.querySelector('.group-slot').click()`);await until(async()=>(await state()).config.count===1);
 await js(`document.querySelector('.group-activate').click()`);await until(async()=>(await state()).config.count===4);checks.push('group icon opens solo and group control restores workspace');
 await js(`document.querySelector('.group-slot').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,clientX:400}))`);
 await until(()=>js(`!!document.querySelector('.context-menu')`));assert.equal(await js(`[...document.querySelectorAll('.context-menu button')].some(b=>b.textContent==='Als Gruppe speichern')`),false);
 await js(`[...document.querySelectorAll('.context-menu button')].find(b=>b.textContent==='Gruppen-Icon wählen').click()`);await until(()=>js(`!!document.querySelector('.group-icon-grid')`));
 assert.equal(await js(`document.querySelectorAll('.group-icon-grid button').length`),24);await js(`document.querySelector('.group-icon-grid [aria-label="Herz"]').click()`);await until(async()=>(await state()).config.groups[0].icon==='heart');checks.push('24 selectable group icons and no redundant save action for grouped apps');
 await cmd({type:'settings',settings:{...(await state()).config.settings,groupMode:'group-only'}});assert.equal(await js(`document.querySelectorAll('.group-activate').length`),0);
 await js(`document.querySelector('.group-slot').click()`);await until(async()=>(await state()).config.count===4);
 await js(`document.querySelector('.group-slot').dispatchEvent(new MouseEvent('dblclick',{bubbles:true,detail:2}))`);await until(async()=>(await state()).config.count===1);
 await js(`document.querySelector('.group-slot').click()`);await until(async()=>(await state()).config.count===4);checks.push('group-only mode single click, double click solo, single click restores split');
 await cmd({type:'settings',settings:{...(await state()).config.settings,groupMode:'icon-only'}});assert.equal(await js(`document.querySelectorAll('.group-slot').length`),0);assert.equal(await js(`document.querySelectorAll('.group-activate').length`),1);
 await js(`document.querySelector('[aria-label="Fixture 0"]').click()`);await until(async()=>(await state()).config.count===1);
 await js(`document.querySelector('.group-activate').click()`);await until(async()=>(await state()).config.count===4);checks.push('icon-only mode retains ordinary dock apps and opens group from icon');
 await cmd({type:'settings',settings:{...(await state()).config.settings,groupMode:'icon-group'}});
 const win=BaseWindow.getAllWindows()[0],beforeIds=webContents.getAllWebContents().filter(w=>w.getURL().startsWith(url)).map(w=>w.id),beforeRequests=requests;
 win.minimize();await wait(100);win.restore();win.focus();await wait(350);
 win.hide();await wait(100);win.show();await wait(350);
 const restoredViews=win.contentView.children.filter(v=>v.webContents?.getURL().startsWith(url));assert.equal(restoredViews.filter(v=>v.getVisible()).length,4);
 assert.ok(restoredViews.every(v=>v.getBounds().width>0&&v.getBounds().height>0));assert.equal(requests,beforeRequests);assert.deepEqual(webContents.getAllWebContents().filter(w=>w.getURL().startsWith(url)).map(w=>w.id),beforeIds);checks.push('minimize/restore and hide/show preserve visible views and never reload services');
 await cmd({type:'deleteGroup',id:group.id});
 await js(`document.querySelector('.layout-trigger').click()`);await until(()=>js(`!!document.querySelector('.layout-options')`));assert.equal(await js(`!!document.querySelector('.save-group')`),false);
 await js(`document.querySelectorAll('.layout-options button')[1].click()`);await until(async()=>(await state()).config.groups.length===1);const empty=(await state()).config.groups[0];assert.equal(empty.layout.columns.length,2);assert.ok(empty.layout.columns.every(c=>!c.active));
 await until(()=>js(`document.querySelectorAll('.empty-slot').length===2`));
 await js(`(()=>{let d=new DataTransfer();d.setData('text/plain','f0');document.querySelectorAll('.group-slot')[1].dispatchEvent(new DragEvent('drop',{bubbles:true,dataTransfer:d}));})()`);
 await until(async()=>(await state()).config.groups[0].layout.columns[1].active==='f0');assert.equal((await state()).config.count,2);checks.push('layout menu creates empty slots; dropping fills exact slot');
 await cmd({type:'ratios',ratios:[0.3,0.7]});assert.deepEqual((await state()).config.groups[0].layout.ratios,[0.3,0.7]);checks.push('group widths persist while editing');
 await cmd({type:'addKnown',id:'gmail'});await cmd({type:'addKnown',id:'gmail'});const gmail=(await state()).config.services.filter(s=>s.url==='https://mail.google.com/');assert.equal(gmail.length,3);assert.equal(new Set(gmail.map(s=>s.profile)).size,3);checks.push('known services support repeated isolated instances');
 const wcFor=p=>webContents.getAllWebContents().find(w=>w.session===session.fromPartition('persist:multidock-'+p)&&w.getURL().startsWith(url));
 await wcFor('isolated-0').executeJavaScript(`localStorage.setItem('isolation','private');document.cookie='isolation=private;max-age=86400;path=/'`);
 assert.equal(await wcFor('isolated-1').executeJavaScript(`localStorage.getItem('isolation')`),null);
 for(const id of ['f0','f1']){const s=(await state()).config.services.find(s=>s.id===id);await cmd({type:'saveService',service:{...s,globalAccess:true}});await ready(id)}
 const shared=webContents.getAllWebContents().filter(w=>w.session===session.fromPartition('persist:multidock-shared-global')&&w.getURL().startsWith(url));assert.equal(shared.length,2);
 await shared[0].executeJavaScript(`localStorage.setItem('shared','yes');document.cookie='shared=yes;max-age=86400;path=/'`);assert.equal(await shared[1].executeJavaScript(`localStorage.getItem('shared')`),'yes');
 let f0=(await state()).config.services.find(s=>s.id==='f0');await cmd({type:'saveService',service:{...f0,globalAccess:false}});await ready('f0');assert.equal(await wcFor('isolated-0').executeJavaScript(`localStorage.getItem('isolation')`),'private');checks.push('native sessions isolate storage, explicitly share, and restore private profile');
 await cmd({type:'sidebar',patch:{open:true,widgets:['weather'],weatherLocation:null}});await until(()=>js(`!!document.querySelector('.weather-setup')`));assert.equal(await js(`document.querySelector('.weather-setup').textContent`),'Standort auswählen');checks.push('unconfigured weather shows only setup control');
 const places=await js(`window.multidock.weatherSearch('Berlin')`);await cmd({type:'sidebar',patch:{weatherLocation:places[0]}});await until(()=>js(`document.querySelectorAll('.weather-days > div').length===5`));assert.equal(await js(`document.querySelector('.weather-temperature').textContent`),'18°C');checks.push('weather location IPC, current conditions and five-day forecast');
 assert.equal(await js(`!!document.querySelector('[title="Wetterstandort ändern"]')`),false);assert.equal(await js(`document.querySelector('.weather-heading').nextElementSibling.className`),'weather-credit');checks.push('configured weather has no settings gear and attribution sits below location');
 await cmd({type:'settings',settings:{...(await state()).config.settings,accentColor:'#ef6688',dockColor:'#202040'}});await until(()=>js(`getComputedStyle(document.querySelector('.dock')).backgroundColor==='rgb(32, 32, 64)'`));assert.equal(await js(`getComputedStyle(document.querySelector('.weather-icon')).color`),'rgb(239, 102, 136)');checks.push('appearance colors propagate to dock and weather');
 await js(`document.querySelector('[title="Einstellungen"]').click()`);await until(()=>js(`!!document.querySelector('.settings-modal')`));assert.equal(await js(`[...document.querySelectorAll('.settings-tabs button')].some(b=>b.textContent==='Aussehen')`),true);
 await js(`[...document.querySelectorAll('.settings-tabs button')].find(b=>b.textContent==='Aussehen').click()`);await until(()=>js(`document.querySelectorAll('.settings-content input[type=color]').length===5`));checks.push('appearance tab contains all five colors');
// Settings: dropdown width, no preselected new layout, non-destructive child dialogs and apply.
assert.ok(await js(`document.querySelector('[aria-label="Gruppen-Modus"]').getBoundingClientRect().width>=180`));
await js(`[...document.querySelectorAll('.settings-tabs button')].find(b=>b.textContent==='Dienste').click()`);
await js(`document.querySelector('.add-service-settings').click()`);await until(()=>js(`!!document.querySelector('.known-services-modal')`));
assert.equal(await js(`!!document.querySelector('.settings-modal')`),true);
await js(`document.querySelector('.known-services-modal .modal-heading button').click()`);assert.equal(await js(`!!document.querySelector('.settings-modal .service-list')`),true);
await js(`[...document.querySelectorAll('.settings-tabs button')].find(b=>b.textContent==='Allgemein').click()`);
await js(`(()=>{const e=document.querySelector('[aria-label="Sprache"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'en');e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
await js(`document.querySelector('.settings-footer .primary').click()`);await until(()=>js(`document.querySelector('.settings-modal h2').textContent==='Settings'`));
assert.equal((await state()).config.settings.language,'en');checks.push('settings language applies without closing; child catalog returns to preserved services tab; group select is readable');
await js(`[...document.querySelectorAll('.settings-tabs button')].find(b=>b.textContent==='Appearance').click()`);
await js(`(()=>{const e=document.querySelector('[aria-label="Font size"]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,'20');e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
await js(`document.querySelector('.settings-footer .primary').click()`);await until(()=>js(`getComputedStyle(document.querySelector('.settings-footer .primary')).fontSize==='20px'`));checks.push('UI font size applies to settings controls');
await js(`document.querySelector('.settings-modal .modal-heading button').click()`);
await js(`document.querySelector('.layout-trigger').click()`);await until(()=>js(`!!document.querySelector('.layout-options')`));assert.equal(await js(`document.querySelectorAll('.layout-options .chosen').length`),0);await js(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);checks.push('new group popup never preselects current layout');
// Only a synthetic local fixture window is offered to screen capture. No desktop pixels are saved or transmitted.
const {BrowserWindow,desktopCapturer}=require('electron');const captureFixture=new BrowserWindow({width:480,height:320,title:'IndigoDock capture fixture',webPreferences:{sandbox:true}});
await captureFixture.loadURL('data:text/html,<title>IndigoDock capture fixture</title><body style="background:teal;color:white">Local capture fixture</body>');
const realSources=desktopCapturer.getSources.bind(desktopCapturer);desktopCapturer.getSources=async options=>(await realSources(options)).filter(x=>x.name==='IndigoDock capture fixture');
const captureWC=wcFor('isolated-0');
await captureWC.executeJavaScript(`window.captureTest={}; navigator.mediaDevices.getDisplayMedia({video:true,audio:false}).then(async stream=>{window.testStream=stream;const video=document.createElement('video');video.srcObject=stream;video.muted=true;document.body.append(video);await video.play();window.captureTest={state:stream.getVideoTracks()[0].readyState,width:video.videoWidth,height:video.videoHeight};}).catch(e=>window.captureTest={error:e.name+': '+e.message}); true`,true);
const picker=await until(()=>BrowserWindow.getAllWindows().find(w=>w!==captureFixture&&w.webContents.getURL().startsWith('data:text/html;charset')));
await until(()=>picker.webContents.executeJavaScript(`!!document.querySelector('main button')`));
assert.equal(await picker.webContents.executeJavaScript(`document.querySelector('main').children.length`),1);
await picker.webContents.executeJavaScript(`document.querySelector('main button').click();document.querySelector('footer .primary').click()`);
const captureResult=await until(async()=>{const r=await captureWC.executeJavaScript('window.captureTest');return r.state||r.error?r:null});assert.equal(captureResult.error,undefined);assert.equal(captureResult.state,'live');assert.ok(captureResult.width>0&&captureResult.height>0);await captureWC.executeJavaScript('window.testStream.getTracks().forEach(t=>t.stop())');
checks.push('actual getDisplayMedia produces a live video track with decoded frames from the selected local fixture window');
// Cancel returns AbortError rather than leaving a pending browser promise.
await captureWC.executeJavaScript(`window.captureTest={};navigator.mediaDevices.getDisplayMedia({video:true}).then(s=>{s.getTracks().forEach(t=>t.stop());window.captureTest={unexpected:true}}).catch(e=>window.captureTest={error:e.name});true`,true);
const cancelPicker=await until(()=>BrowserWindow.getAllWindows().find(w=>w!==captureFixture&&w.webContents.getURL().startsWith('data:text/html;charset')));await until(()=>cancelPicker.webContents.executeJavaScript(`!!document.querySelector('footer button')`));await cancelPicker.webContents.executeJavaScript(`document.querySelector('footer button').click()`);assert.ok((await until(async()=>{const r=await captureWC.executeJavaScript('window.captureTest');return r.error?r:null})).error);checks.push('screen picker cancellation rejects request cleanly');
// External link dialog uses the app theme and does not navigate on cancel.
await captureWC.executeJavaScript(`window.open('https://example.com/');true`);const linkPrompt=await until(()=>BrowserWindow.getAllWindows().find(w=>w!==captureFixture&&w.webContents.getURL().startsWith('data:text/html;charset')));await until(()=>linkPrompt.webContents.executeJavaScript(`!!document.querySelector('footer button')`));assert.equal(await linkPrompt.webContents.executeJavaScript('getComputedStyle(document.body).backgroundColor'),'rgb(32, 32, 64)');await linkPrompt.webContents.executeJavaScript(`document.querySelector('footer button').click()`);checks.push('external link confirmation follows dock theme and can be cancelled');
captureFixture.close();desktopCapturer.getSources=realSources;
await js(`document.querySelector('[title="Settings"]').click()`);await until(()=>js(`!!document.querySelector('.settings-modal')`));await js(`[...document.querySelectorAll('.settings-tabs button')].find(b=>b.textContent==='Appearance').click()`);

 try{fs.writeFileSync(path.join(results,'appearance.png'),(await ui.capturePage()).toPNG())}catch{}
 await js(`document.querySelector('.modal-heading button').click()`);await cmd({type:'overlay',visible:true});await wait(100);try{fs.writeFileSync(path.join(results,'weather.png'),(await ui.capturePage()).toPNG())}catch{}await cmd({type:'overlay',visible:false});
 await cmd({type:'groupIcon',id:empty.id,icon:'heart'});
 fs.writeFileSync(stageFile,JSON.stringify({phase:2,results,port:server.address().port,checks}));await cmd({type:'window',action:'quit'});
 }catch(e){fs.writeFileSync(path.join(results,'failure.txt'),String(e.stack||e));app.exit(1)}finally{server.close()}
});
