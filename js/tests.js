'use strict';
(async () => {
  let passed=0,failed=0;const results=document.getElementById('test-results');
  function test(name,fn){try{fn();passed++;results.textContent+='✓ '+name+'\n';if(new URLSearchParams(location.search).has('verbose'))console.log('PASS '+name);}catch(e){failed++;results.textContent+='✗ '+name+' — '+e.message+'\n';console.error('FAIL '+name+': '+e.message);}}
  function assert(value,message='Aserción fallida'){if(!value)throw new Error(message);}
  function equal(a,b){assert(JSON.stringify(a)===JSON.stringify(b),JSON.stringify(a)+' ≠ '+JSON.stringify(b));}
  function rejects(fn,pattern){let error;try{fn();}catch(e){error=e;}assert(error,'Se esperaba un rechazo');if(pattern)assert(pattern.test(error.message),error.message);}
  function roundtrip(p){return NEA.importMidi(NEA.exportMidi(p).buffer,p.name+'.mid').project;}
  const demo=NEA.demo();
  test('Demo válida con cuatro pistas',()=>assert(demo.tracks.length===4));
  test('JSON / NEA conserva exactamente el proyecto',()=>equal(NEA.parse(NEA.serialize(demo)),demo));
  test('Acepta bloque Markdown JSON de una IA',()=>equal(NEA.parse('```json\n'+JSON.stringify(demo)+'\n```'),demo));
  test('Rechaza JSON inválido',()=>rejects(()=>NEA.parse('{invalid'),/JSON/));
  test('Rechaza versión desconocida',()=>rejects(()=>NEA.validate({...demo,version:'nea/2'}),/version/));
  test('Rechaza tracks nulo sin aplicar nada',()=>rejects(()=>NEA.validate({...demo,tracks:null}),/tracks/));
  test('Rechaza nombre mal tipado',()=>rejects(()=>NEA.validate({...demo,name:6}),/name/));
  test('Rechaza altura fuera de MIDI',()=>{const p=NEA.clone(demo);p.tracks[0].notes[0][1]=128;rejects(()=>NEA.validate(p),/notes/);});
  test('Rechaza notas de duración cero',()=>{const p=NEA.clone(demo);p.tracks[0].notes[0][2]=0;rejects(()=>NEA.validate(p),/notes/);});
  test('Rechaza velocidad cero en notas NEA',()=>{const p=NEA.clone(demo);p.tracks[0].notes[0][3]=0;rejects(()=>NEA.validate(p),/notes/);});
  test('Rechaza IDs duplicados',()=>{const p=NEA.clone(demo);p.tracks[1].id=p.tracks[0].id;rejects(()=>NEA.validate(p),/id único/);});
  test('Rechaza controlador fuera de rango',()=>{const p=NEA.clone(demo);p.tracks[0].cc=[[0,128,90]];rejects(()=>NEA.validate(p),/cc/);});
  test('Rechaza pitch bend fuera de rango',()=>{const p=NEA.clone(demo);p.tracks[0].bend=[[0,8192]];rejects(()=>NEA.validate(p),/bend/);});
  test('Rechaza denominadores no binarios',()=>rejects(()=>NEA.validate({...demo,meter:[4,3]}),/meter/));
  test('Defaults seguros para propiedades opcionales',()=>{const p=NEA.validate({version:'nea/0.1',name:'Mínimo',bpm:100,meter:[4,4],tracks:[{name:'Piano',channel:0,program:0,notes:[]}]});equal(p.tempos,[[0,100]]);assert(p.tracks[0].volume===.75);});
  const converted=roundtrip(demo);
  test('MIDI exportado tiene cabecera MThd y formato 1',()=>{const b=NEA.exportMidi(demo);equal(Array.from(b.slice(0,4)),[77,84,104,100]);assert(b[9]===1);});
  test('MIDI roundtrip conserva número de pistas',()=>assert(converted.tracks.length===demo.tracks.length));
  test('MIDI roundtrip conserva notas a resolución de un tick PPQ',()=>{for(let i=0;i<demo.tracks.length;i++){const a=converted.tracks[i].notes,b=demo.tracks[i].notes;assert(a.length===b.length);for(let j=0;j<a.length;j++){assert(a[j][1]===b[j][1]&&a[j][3]===b[j][3],'Altura y velocidad deben ser exactas');assert(Math.abs(a[j][0]-b[j][0])<=1/demo.ppq+.000001,'Inicio fuera de resolución PPQ');assert(Math.abs(a[j][2]-b[j][2])<=1/demo.ppq+.000001,'Duración fuera de resolución PPQ');}}});
  test('MIDI roundtrip conserva instrumentos y canales',()=>equal(converted.tracks.map(t=>[t.program,t.channel]),demo.tracks.map(t=>[t.program,t.channel])));
  test('MIDI roundtrip conserva CC de expresión',()=>equal(converted.tracks[1].cc,demo.tracks[1].cc));
  test('MIDI roundtrip conserva duración y PPQ',()=>{assert(converted.length===32);assert(converted.ppq===480);});
  test('MIDI roundtrip conserva tempo con precisión MIDI',()=>assert(Math.abs(converted.bpm-demo.bpm)<.001));
  test('MIDI conserva nombres Unicode de pistas',()=>{const p=NEA.clone(demo);p.tracks[0].name='Arpa · mañana ✨';assert(roundtrip(p).tracks[0].name===p.tracks[0].name);});
  test('MIDI conserva cambios de tempo, compás, CC, pitch y aftertouch',()=>{const p=NEA.clone(demo);p.tempos=[[0,120],[8,90],[16,150]];p.bpm=120;p.meters=[[0,4,4],[16,3,4]];p.tracks[0].cc=[[0,64,127],[6,64,0],[12,1,85]];p.tracks[0].bend=[[1,-8192],[2,0],[3,8191]];p.tracks[0].events=[[4,192,10],[5,208,72],[6,160,64,90]];const r=roundtrip(p);assert(r.tempos.length===p.tempos.length);r.tempos.forEach((tempo,i)=>{assert(tempo[0]===p.tempos[i][0]);assert(Math.abs(60000000/tempo[1]-60000000/p.tempos[i][1])<=.500001,'Tempo fuera de resolución de un microsegundo');});equal(r.meters,p.meters);equal(r.tracks[0].cc,p.tracks[0].cc);equal(r.tracks[0].bend,p.tracks[0].bend);equal(r.tracks[0].events,p.tracks[0].events);});
  test('MIDI conserva SysEx, letras y armadura como raw',()=>{const p=NEA.clone(demo);p.events=[[0,240,126,127,9,1,247],[0,255,89,255,1],[2,255,5,72,111,108,97]];equal(roundtrip(p).events,p.events);});
  test('Tempo variable: pulso → segundos → pulso',()=>{const p=NEA.clone(demo);p.bpm=120;p.tempos=[[0,120],[8,60],[16,180]];assert(NEA.beatToSeconds(p,12)===8);for(const beat of [0,1,8,10,16,22,32])assert(Math.abs(NEA.secondsToBeat(p,NEA.beatToSeconds(p,beat))-beat)<1e-8);});
  test('Rechaza tempo no representable, sin truncarlo silenciosamente',()=>{const p=NEA.clone(demo);p.bpm=1;p.tempos=[[0,1]];rejects(()=>NEA.exportMidi(p),/Tempo fuera/);});
  const midi0=new Uint8Array([77,84,104,100,0,0,0,6,0,0,0,1,1,224,77,84,114,107,0,0,0,19,0,192,10,0,144,60,90,129,112,64,80,129,112,60,0,0,255,47,0]);
  test('Importa MIDI tipo 0 con running status y note-on cero',()=>{const r=NEA.importMidi(midi0.buffer);assert(r.project.tracks[0].program===10);equal(r.project.tracks[0].notes[0],[0,60,1,90]);assert(r.warnings.length===1);});
  test('Rechaza MIDI SMPTE con explicación',()=>{const b=NEA.exportMidi(demo);b[12]=0xe7;rejects(()=>NEA.importMidi(b.buffer),/SMPTE/);});
  test('Rechaza MIDI tipo 2 con explicación',()=>{const b=NEA.exportMidi(demo);b[9]=2;rejects(()=>NEA.importMidi(b.buffer),/tipo 2/);});
  test('Rechaza MIDI truncado',()=>rejects(()=>NEA.importMidi(new Uint8Array([77,84,104,100]).buffer),/truncado/));
  test('Prompt incluye intención, contrato y contexto',()=>{const p=NEA.buildPrompt(demo,{idea:'Arpa brillante',style:'OST',creativity:'Atrevida',context:true});assert(p.includes('Arpa brillante')&&p.includes('nea/0.1')&&p.includes('Celestial Keys')&&p.includes('program:General MIDI'));});
  test('Prompt sin contexto no filtra el arreglo',()=>{const p=NEA.buildPrompt(demo,{idea:'Nueva idea',style:'Jazz',creativity:'Libre',context:false});assert(!p.includes('Celestial Keys'));});
  // Exercise actual application controls, in an isolated no-storage session.
  const frame=document.getElementById('studio-test-frame');
  for(let i=0;i<120;i++){if(frame.contentWindow?.NEACreative&&frame.contentWindow?.PrimeContext&&frame.contentWindow?.HarmonyPlanner)break;await new Promise(r=>setTimeout(r,250));}
  const win=frame.contentWindow,doc=frame.contentDocument,by=id=>doc.getElementById(id),click=id=>by(id).click(),get=()=>win.NEAStudio.getProject();
  test('El estudio real arranca',()=>assert(!!win.NEAStudio));
  if(win.NEAStudio){
    test('Renderiza cuatro pistas y notas',()=>{assert(doc.querySelectorAll('.track-row').length===4);assert(by('piano-canvas').width>0);});
    test('Mute modifica el modelo',()=>{doc.querySelector('[data-mute="0"]').click();assert(get().tracks[0].muted);});
    test('Deshacer restaura el modelo',()=>{click('undo-button');assert(!get().tracks[0].muted);});
    test('Solo modifica el modelo y se puede deshacer',()=>{doc.querySelector('[data-solo="1"]').click();assert(get().tracks[1].solo);click('undo-button');assert(!get().tracks[1].solo);});
    test('Cambiar pista actualiza el piano roll',()=>{doc.querySelector('[data-clip="1"]').click();assert(by('selected-track-name').textContent==='Velvet Atmosphere');});
    test('Nueva pista desde el formulario',()=>{click('add-track');by('track-name-input').value='Pista de prueba';by('track-form').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert(get().tracks.length===5);assert(get().tracks[4].name==='Pista de prueba');});
    test('Control CC desde formulario y eliminación',()=>{doc.querySelector('[data-view="automation"]').click();by('cc-beat').value='2';by('cc-value').value='90';click('add-cc');equal(get().tracks[4].cc,[[2,11,90]]);doc.querySelector('[data-remove-cc]').click();assert(get().tracks[4].cc.length===0);});
    test('Validación de código no aplica JSON incorrecto',()=>{doc.querySelector('[data-view="code"]').click();by('code-editor').value='{bad';click('apply-code');assert(get().tracks.length===5);assert(by('code-status').textContent.includes('JSON'));by('code-editor').value=NEA.serialize(get());});
    test('Código válido actualiza el proyecto',()=>{const p=get();p.name='Prueba de código';by('code-editor').value=NEA.serialize(p);click('apply-code');assert(get().name==='Prueba de código');});
    test('Armador de prompts abre un prompt con contexto',()=>{by('prompt-input').value='Una contramelodía con arpa';click('build-prompt');assert(by('generated-prompt').value.includes('Una contramelodía con arpa'));assert(by('generated-prompt').value.includes('Prueba de código'));click('close-dialog');});
    test('Respuesta IA inválida se bloquea',()=>{click('paste-response');by('ai-response').value='{}';click('validate-response');assert(by('apply-response').disabled);assert(by('validation-message').classList.contains('error'));});
    test('Respuesta IA válida se valida y aplica explícitamente',()=>{const p=NEA.demo('ambient');by('ai-response').value=NEA.serialize(p);click('validate-response');assert(!by('apply-response').disabled);assert(get().name==='Prueba de código');click('apply-response');assert(get().name==='La memoria del agua');});
    test('Aplicar respuesta de IA se puede deshacer',()=>{click('undo-button');assert(get().name==='Prueba de código');});
    test('Añadir nota precisa modifica el arreglo',()=>{doc.querySelector('[data-view="arrangement"]').click();const before=get().tracks[0].notes.length;click('add-note-form');by('note-beat').value='3.25';by('note-pitch').value='66';by('note-length').value='.5';by('note-velocity').value='97';by('note-form').dispatchEvent(new win.Event('submit',{bubbles:true,cancelable:true}));assert(get().tracks[0].notes.length===before+1);assert(get().tracks[0].notes.some(n=>n[0]===3.25&&n[1]===66&&n[3]===97));});
    test('Exportación del proyecto editado produce MIDI importable',()=>{const b=win.NEAStudio.exportMidi();const r=NEA.importMidi(b.buffer);assert(r.project.tracks.length===5);});
    test('La guía explica los límites MIDI y la preescucha',()=>{click('help-button');assert(by('dialog-content').textContent.includes('SMPTE'));assert(by('dialog-content').textContent.includes('sintetizador básico'));click('close-dialog');});
    if(window.runNEA2Tests)window.runNEA2Tests({test,assert,equal,rejects,demo,converted,win,doc,by,click,get});
    if(window.runInsightTests)window.runInsightTests({test,assert,equal,rejects,demo,converted,win,doc,by,click,get});
    if(window.runExpressionTests)await window.runExpressionTests({test,assert,equal,rejects,demo,converted,win,doc,by,click,get});
    if(window.runCraftTests)window.runCraftTests({test,assert,equal,rejects,demo,converted,win,doc,by,click,get});
    if(window.runPrimeTests)await window.runPrimeTests({test,assert,equal,rejects,demo,converted,win,doc,by,click,get});
    if(window.runHarmonyTests)await window.runHarmonyTests({test,assert,equal,rejects,win,doc,by,click,get});
    // Restore the isolated demo for human inspection, never touch actual storage.
    click('paste-response');by('ai-response').value=NEA.serialize(demo);click('validate-response');click('apply-response');
  }
  const summary=document.getElementById('test-summary');summary.textContent=`${passed} pruebas correctas · ${failed} fallos`;summary.dataset.complete='true';if(failed)summary.classList.add('error');console.log(`NEA TEST RESULT: ${passed} passed, ${failed} failed`);
})();
