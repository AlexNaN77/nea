'use strict';
window.runExpressionTests=async({test,assert,equal,win,doc,by,click,get})=>{
  const E=NEAExpression;
  const input=id=>by(id).dispatchEvent(new win.Event('input',{bubbles:true}));
  const p=NEA.validate({version:'nea/0.1',name:'Gestos MIDI',bpm:120,meter:[4,4],ppq:480,length:4,tracks:[{id:'lead',name:'Lead',channel:0,program:80,notes:[[0,69,2,90],[2,72,2,80]],cc:[[0,7,100],[0,11,32],[0,101,0],[0,100,0],[0,6,2],[0,38,0],[0,101,127],[0,100,127],[.5,11,64],[1,11,127],[2,11,80]],bend:[[0,-4096],[.25,-3072],[.5,-2048],[.75,-1024],[1,0],[2,0]]}]});
  test('Expresión: ambas opciones están activadas de inicio',()=>assert(by('craft-check-volume-automation').checked&&by('craft-check-pitch-slides').checked));
  test('Expresión: instrucciones de volumen y slides llegan al prompt completo',()=>{const s=win.NEACreative.getBrief().text;assert(s.includes('Automatización de volumen:')&&s.includes('Slides de tono:'));assert(s.includes('EXPRESIÓN MIDI REAL')&&s.includes('0/6/2')&&s.includes('phrase/use solo repiten NOTAS'));});
  test('Expresión: editar intención no modifica notas ni CC existentes',()=>{const before=JSON.stringify(get());by('craft-note-pitch-slides').value='Un slide de llegada de un semitono en el bajo al pulso 12.';input('craft-note-pitch-slides');assert(win.NEACreative.getBrief().text.includes(by('craft-note-pitch-slides').value));assert(JSON.stringify(get())===before);});
  test('Expresión: desmarcar excluye la petición, no borra su texto',()=>{click('craft-check-pitch-slides');assert(!win.NEACreative.getBrief().text.includes('Slides de tono:'));assert(by('craft-note-pitch-slides').value.includes('pulso 12'));click('craft-check-pitch-slides');by('craft-note-pitch-slides').value='';input('craft-note-pitch-slides');});
  test('Expresión: PRIME acepta los dos recursos nuevos',()=>{const x=win.PrimeContext.validate({format:'nea-context/1',fields:{},techniques:[{id:'volume-automation',enabled:true,note:'Crescendo al cierre'},{id:'pitch-slides',enabled:true,note:'Bajo mono'}]});assert(x.techniques.length===2);});
  test('Expresión: NEA compacto conserva exactamente CC, RPN y bend',()=>{const t=NEA.parse(NEA.compact(p)).tracks[0];equal(t.cc,p.tracks[0].cc);equal(t.bend,p.tracks[0].bend);});
  test('Expresión: MIDI exportado e importado conserva curvas, RPN y reset',()=>{const t=NEA.importMidi(NEA.exportMidi(p).buffer).project.tracks[0];equal(t.cc,p.tracks[0].cc);equal(t.bend,p.tracks[0].bend);});
  const controls=E.compile(p).get(0);
  test('Expresión: CC7 y CC11 se multiplican; estado correcto al buscar/pausar',()=>{assert(Math.abs(E.valueAt(controls.gain,.75,1)-100/127*64/127)<1e-10);assert(E.valueAt(controls.detune,.75,0)===-25);assert(E.valueAt(controls.detune,2,0)===0);});
  test('Expresión: pistas sin eventos mantienen volumen y afinación originales',()=>{const c=E.compile(NEA.demo()).get(0);assert(E.valueAt(c.gain,0,1)===1&&E.valueAt(c.detune,0,0)===0);});
  test('Expresión: rango RPN de 12 semitonos y centésimas',()=>{const q=NEA.clone(p);q.tracks[0].cc=[[0,101,0],[0,100,0],[0,6,12],[0,38,50]];const c=E.compile(q).get(0);assert(E.valueAt(c.detune,0,0)===-625);});
  test('Expresión: CC6 después de cerrar RPN no cambia el rango',()=>{const q=NEA.clone(p);q.tracks[0].cc.push([.1,6,12]);assert(E.valueAt(E.compile(q).get(0).detune,.25,0)===-75);});
  test('Expresión: NRPN no se interpreta como sensibilidad de bend',()=>{const q=NEA.clone(p);q.tracks[0].cc=[[0,101,0],[0,100,0],[0,99,1],[0,98,2],[0,6,12]];assert(E.valueAt(E.compile(q).get(0).detune,0,0)===-100);});
  test('Expresión: canales compartidos reciben el mismo control',()=>{const q=NEA.clone(p);q.tracks.push({...NEA.makeTrack('Otra voz',0,0,'#ffffff'),cc:[[3,7,0]]});assert(E.valueAt(E.compile(q).get(0).gain,3,1)===0);});
  test('Expresión: agenda temporal respeta tempo variable y estado de entrada',()=>{const q=NEA.clone(p);q.tempos=[[0,120],[1,60]];const calls=[];E.schedule({setValueAtTime:(v,t)=>calls.push([v,t])},controls.gain,q,.5,10,20,1);equal(calls.map(x=>x[1]),[10,10.25,11.25]);});
  test('Expresión: aplicar respuesta con gestos y deshacer restaura el proyecto',()=>{const before=get();click('paste-response');by('ai-response').value=NEA.compact(p);click('validate-response');assert(!by('apply-response').disabled);click('apply-response');equal(get().tracks[0].bend,p.tracks[0].bend);doc.querySelector('[data-view="automation"]').click();by('cc-controller').value='bend';by('cc-controller').dispatchEvent(new win.Event('change'));assert(by('automation-points').querySelectorAll('[data-remove-cc]').length===6);click('undo-button');equal(get(),before);doc.querySelector('[data-view="arrangement"]').click();});
  // Render actual Web Audio samples, not merely mocked scheduling calls.
  try {
    const ctx=new OfflineAudioContext(1,48000,48000),osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.frequency.value=220;osc.connect(gain);gain.connect(ctx.destination);
    const q=NEA.clone(p);q.tempos=[[0,120]];
    E.schedule(gain.gain,[[0,.25],[1,1]],q,0,0,1,1);
    E.schedule(osc.detune,[[0,0],[1,1200]],q,0,0,1,0);
    osc.start(0);osc.stop(1);const samples=(await ctx.startRendering()).getChannelData(0);
    const stats=(start,end)=>{let sum=0,crossings=0;for(let i=start;i<end;i++){sum+=samples[i]**2;if(i>start&&samples[i-1]<=0&&samples[i]>0)crossings++;}return {rms:Math.sqrt(sum/(end-start)),hz:crossings*48000/(end-start)};};
    const a=stats(4800,19200),b=stats(28800,43200);
    test('Audio renderizado: CC cambia la amplitud dentro de la misma nota',()=>assert(b.rms/a.rms>3.95&&b.rms/a.rms<4.05));
    test('Audio renderizado: pitch bend cambia frecuencia sin otro ataque',()=>assert(Math.abs(a.hz-220)<4&&Math.abs(b.hz-440)<4));
  }catch(e){test('Audio Offline: generación de muestras',()=>{throw e;});}
};
