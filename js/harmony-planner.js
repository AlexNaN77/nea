/* A composition brief, never a destructive transposer. Recommendations are local theory heuristics. */
'use strict';
window.HarmonyPlanner = (() => {
  const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roots=['Do · C','Do♯ / Re♭','Re · D','Re♯ / Mi♭','Mi · E','Fa · F','Fa♯ / Sol♭','Sol · G','Sol♯ / La♭','La · A','La♯ / Si♭','Si · B'];
  const names=['C','C♯/D♭','D','D♯/E♭','E','F','F♯/G♭','G','G♯/A♭','A','A♯/B♭','B'];
  const scales=[];
  function family(group,base,entries){entries.forEach(([id,name,detail],i)=>scales.push({id,name,group,detail,intervals:base.map((_,j)=>(base[(j+i)%base.length]-base[i]+12)%12)}));}
  family('Modos de la mayor',[0,2,4,5,7,9,11],[
    ['ionian','Mayor / jónico','Tercera mayor y séptima mayor; reposo tonal claro si la armonía lo establece.'],
    ['dorian','Dórico','Menor con sexta natural: destaca ese sexto grado frente al menor natural.'],
    ['phrygian','Frigio','Menor con segunda bemol: semitono sobre la tónica.'],
    ['lydian','Lidio','Mayor con cuarta aumentada: evita resolver siempre esa cuarta como en la tonalidad mayor.'],
    ['mixolydian','Mixolidio','Mayor con séptima bemol; útil para un centro modal sin sensible mayor.'],
    ['aeolian','Menor natural / eólico','Tercera, sexta y séptima menores.'],
    ['locrian','Locrio','Segunda bemol y quinta disminuida: centro deliberadamente inestable.']
  ]);
  family('Menor melódica y sus modos',[0,2,3,5,7,9,11],[
    ['melodic-minor','Menor melódica (jazz)','Sexta y séptima naturales; aquí se usa la misma colección al subir y bajar.'],
    ['dorian-b2','Dórico ♭2','Dórico con segunda bemol; combina sexta natural y fricción de semitono.'],
    ['lydian-aug','Lidio aumentado','Cuarta y quinta aumentadas sobre una tercera mayor.'],
    ['lydian-dominant','Lidio dominante','Cuarta aumentada y séptima bemol; color de dominante con ♯11.'],
    ['mixolydian-b6','Mixolidio ♭6','Tercera mayor, sexta menor y séptima menor.'],
    ['locrian-n2','Locrio ♮2','Quinta disminuida con segunda natural; color semidisminuido.'],
    ['altered','Alterada / superlocria','Colección de dominante alterada; decide cuidadosamente su resolución.']
  ]);
  family('Menor armónica y sus modos',[0,2,3,5,7,8,11],[
    ['harmonic-minor','Menor armónica','Sensible mayor en un contexto menor; segunda aumentada entre ♭6 y 7.'],
    ['locrian-n6','Locrio ♮6','Segunda bemol, quinta disminuida y sexta natural.'],
    ['ionian-aug','Jónico aumentado','Mayor con quinta aumentada.'],
    ['dorian-s4','Dórico ♯4','Menor con cuarta aumentada y sexta natural.'],
    ['phrygian-dominant','Frigio dominante','Segunda bemol y tercera mayor: contraste entre semitono y tercera.'],
    ['lydian-s2','Lidio ♯2','Segunda y cuarta aumentadas.'],
    ['ultralocrian','Ultralocrio','Locrio con séptima disminuida; requiere una conducción especialmente deliberada.']
  ]);
  family('Mayor armónica y sus modos',[0,2,4,5,7,8,11],[
    ['harmonic-major','Mayor armónica','Mayor con sexta bemol: un contraste prestado sin perder la tercera mayor.'],
    ['dorian-b5','Dórico ♭5','Menor con quinta disminuida y sexta natural.'],
    ['phrygian-b4','Frigio ♭4','Segunda bemol y cuarta disminuida.'],
    ['lydian-b3','Lidio ♭3','Tercera menor, cuarta aumentada y séptima mayor.'],
    ['mixolydian-b2','Mixolidio ♭2','Tercera mayor, segunda bemol y séptima bemol.'],
    ['lydian-aug-s2','Lidio aumentado ♯2','Segunda, cuarta y quinta aumentadas.'],
    ['locrian-bb7','Locrio ♭♭7','Quinta y séptima disminuidas con segunda bemol.']
  ]);
  [
    ['major-pent','Pentatónica mayor',[0,2,4,7,9],'Cinco notas, sin semitonos internos.','Pentatónicas y blues'],
    ['minor-pent','Pentatónica menor',[0,3,5,7,10],'Cinco notas con tercera menor y séptima menor.','Pentatónicas y blues'],
    ['major-blues','Blues mayor',[0,2,3,4,7,9],'Pentatónica mayor con tercera menor de paso.','Pentatónicas y blues'],
    ['minor-blues','Blues menor',[0,3,5,6,7,10],'Pentatónica menor con quinta disminuida de paso.','Pentatónicas y blues'],
    ['whole-tone','Tonos enteros',[0,2,4,6,8,10],'Seis notas simétricas; no hay semitonos ni quinta justa.','Simétricas y cromáticas'],
    ['diminished-wh','Disminuida tono–semitono',[0,2,3,5,6,8,9,11],'Ocho notas alternando tono y semitono.','Simétricas y cromáticas'],
    ['diminished-hw','Disminuida semitono–tono',[0,1,3,4,6,7,9,10],'Ocho notas; color habitual sobre dominantes con tensiones.','Simétricas y cromáticas'],
    ['chromatic','Cromática',[0,1,2,3,4,5,6,7,8,9,10,11],'Las doce alturas: la jerarquía depende del fraseo y la armonía.','Simétricas y cromáticas'],
    ['double-harmonic','Doble armónica mayor',[0,1,4,5,7,8,11],'Segunda y sexta menores con tercera y séptima mayores.','Otros colores'],
    ['hungarian-minor','Menor húngara',[0,2,3,6,7,8,11],'Menor armónica con cuarta aumentada.','Otros colores'],
    ['neapolitan-minor','Menor napolitana',[0,1,3,5,7,8,11],'Menor armónica con segunda bemol.','Otros colores'],
    ['enigmatic','Enigmática',[0,1,4,6,8,10,11],'Segunda menor, tercera mayor y cuarta y quinta aumentadas; pide una conducción deliberada.','Otros colores']
  ].forEach(([id,name,intervals,detail,group])=>scales.push({id,name,intervals,detail,group}));
  const getScale=id=>scales.find(s=>s.id===id);
  function pitches(root,id){const s=getScale(id);return s?s.intervals.map(i=>(Number(root)+i)%12):[];}
  const noteList=pcs=>pcs.map(i=>names[i]).join(' · ')||'ninguna';
  const label=(root,id)=>roots[Number(root)]+' — '+getScale(id).name;
  const steps={common:'Nota común / pedal',pivot:'Acorde pivote (si encaja)',gradual:'Transformación gradual',direct:'Corte directo preparado',borrow:'Préstamo modal breve',return:'Regreso al centro inicial'};
  function compare(from,to){const a=pitches(from.root,from.scale),b=pitches(to.root,to.scale);return {common:a.filter(n=>b.includes(n)),added:b.filter(n=>!a.includes(n)),removed:a.filter(n=>!b.includes(n))};}
  function recommendations(from,kind='close'){
    if(!getScale(from.scale))return [];
    const initial=getScale(from.scale),candidates=[];
    for(const s of scales)for(const root of (kind==='relative'?Array.from({length:12},(_,i)=>i):[Number(from.root)])){
      if(root===Number(from.root)&&s.id===from.scale)continue;
      const to={root,scale:s.id},diff=compare(from,to),distance=diff.added.length+diff.removed.length;
      if(root===Number(from.root)&&distance===0)continue;
      const brightness=s.intervals.reduce((a,b)=>a+b,0)-initial.intervals.reduce((a,b)=>a+b,0);
      if(kind==='relative'&&(root===Number(from.root)||distance!==0))continue;
      if(['bright','dark'].includes(kind)&&(initial.intervals.length!==7||s.intervals.length!==7||(kind==='bright'?brightness<=0:brightness>=0)))continue;
      if(kind==='tension'&&!['phrygian','locrian','altered','phrygian-dominant','double-harmonic','diminished-hw','whole-tone','harmonic-minor'].includes(s.id))continue;
      candidates.push({...to,...diff,distance,detail:s.detail,rank:distance+(s.intervals.length===initial.intervals.length?0:5)});
    }
    return candidates.sort((a,b)=>a.rank-b.rank||a.root-b.root||a.scale.localeCompare(b.scale)).slice(0,4);
  }
  function validate(state){
    if(!state||typeof state!=='object'||!Number.isInteger(state.root)||state.root<0||state.root>11||typeof state.scale!=='string'||(state.scale&&!getScale(state.scale)))throw new Error('Elige una tónica y una escala válidas.');
    const tempo=value=>{if(value!==''&&(typeof value!=='string'||!Number.isFinite(Number(value))||!value.trim()||Number(value)<20||Number(value)>300))throw new Error('Los BPM deben estar entre 20 y 300, o quedar vacíos.');};
    tempo(state.bpm);
    if(typeof state.note!=='string'||!Array.isArray(state.changes))throw new Error('Plan modal no válido.');
    for(const c of state.changes){if(!Number.isInteger(c.root)||c.root<0||c.root>11||!getScale(c.scale)||!Object.hasOwn(steps,c.transition)||typeof c.where!=='string'||typeof c.note!=='string')throw new Error('Revisa los destinos del plan modal.');tempo(c.bpm);if(c.transition==='return'&&(!state.scale||c.root!==state.root||c.scale!==state.scale))throw new Error('El paso de regreso debe coincidir con la escala inicial. Elige el inicio o cambia el tipo de transición.');}
    return state;
  }
  function instructions(o={}){
    if(!o.harmony)return '';const h=validate(o.harmony);
    if(!h.scale&&!h.bpm&&!h.note&&!h.changes.length)return '';
    const lines=['MAPA TONAL Y TEMPO SOLICITADOS — PARA LA COMPOSICIÓN DE SALIDA', 'Estos ajustes no describen ni modifican la referencia. Prevalecen sobre sus valores orientativos, no sobre una prohibición explícita de cambiar la melodía: si hay incompatibilidad, pide una decisión antes de alterar material que deba conservarse.'];
    lines.push(h.scale?`Escala inicial elegida: ${label(h.root,h.scale)}. Intervalos desde la tónica en semitonos: ${getScale(h.scale).intervals.join(', ')}. Clases de altura: ${noteList(pitches(h.root,h.scale))}. Establece ese centro desde el comienzo; no basta con cambiar la etiqueta key.`:'Escala inicial: decide según el encargo; no impongas la escala detectada de la referencia.');
    if(h.bpm)lines.push(`BPM inicial obligatorio: ${Number(h.bpm)}. Escribe bpm ${Number(h.bpm)} y, si usas tempos, comienza con 0/${Number(h.bpm)}. No dejes el tempo de la referencia en el mapa. Los pulsos son negras; calcula la duración en segundos con el mapa real.`);
    else lines.push('BPM inicial sin fijar: sigue la idea o usa el tempo de referencia como orientación.');
    if(h.changes.length){
      lines.push('CAMBIOS EN ESTE ORDEN (no los conviertas en cambios de tempo salvo BPM explícitos):');
      h.changes.forEach((c,i)=>lines.push(`${i+1}. ${c.where.trim()||'Lugar a elección de la IA, después del paso anterior'} → ${label(c.root,c.scale)}; intervalos ${getScale(c.scale).intervals.join(', ')}; alturas ${noteList(pitches(c.root,c.scale))}. Transición: ${steps[c.transition]}.${c.bpm?' BPM desde este cambio: '+Number(c.bpm)+'.':' Mantén el tempo salvo otra petición explícita.'}${c.note?' Indicación: '+c.note:''}`));
      lines.push('Distingue cambio de modo sobre la misma tónica, modulación a otro centro y préstamo de un acorde. Haz audibles las notas características, prepara las voces y conserva un motivo reconocible. Un préstamo breve vuelve al centro anterior. Un regreso debe conducir realmente al centro inicial. Si las ubicaciones se contradicen con el orden o la duración, pide aclaración. No amontones transiciones.');
    }
    if(h.note)lines.push('INTENCIÓN MODAL / OTRAS PETICIONES DEL USUARIO\n'+h.note);
    lines.push('Realiza modos y modulaciones con notas y armonía explícitas, no con comandos mode/modulate inexistentes. key es una etiqueta inicial, no una orden de transposición ni un mapa modal. Si necesitas anotar secciones usa meta sin sobrescribir campos musicales. Las alturas enarmónicas mostradas son clases MIDI, no ortografía armónica obligatoria. Las escalas se expresan en temperamento igual de 12 sonidos. Las descripciones de color no garantizan emociones. Si el final es loop, prepara el regreso al centro, tempo y estados de control iniciales.');
    return lines.join('\n');
  }
  const empty=()=>({root:0,scale:'',bpm:'',note:'',changes:[]});
  let state=empty(),shown=[];
  const key='nea-harmony-preferences-v1',testMode=new URLSearchParams(location.search).get('test')==='1';
  function scaleOptions(blank=false){return (blank?'<option value="">Que la IA elija según mi idea</option>':'')+[...new Set(scales.map(s=>s.group))].map(g=>`<optgroup label="${g}">${scales.filter(s=>s.group===g).map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}</optgroup>`).join('');}
  const rootOptions=()=>roots.map((r,i)=>`<option value="${i}">${r}</option>`).join('');
  function capture(){return {root:Number($('composition-root').value),scale:$('composition-scale').value,bpm:$('composition-bpm').value,note:$('modal-intent').value,changes:state.changes.map(c=>({...c}))};}
  function options(){if($('composition-bpm').validity.badInput||[...$('modal-plan').querySelectorAll('[data-field="bpm"]')].some(el=>el.validity.badInput))throw new Error('Escribe un número válido en los BPM.');return {harmony:validate(capture())};}
  function notify(){state=capture();let error='';try{validate(state);}catch(e){error=e.message;}$('harmony-status').textContent=error;$('composition-bpm').setAttribute('aria-invalid',String(!!error));if(!error&&!testMode)try{localStorage.setItem(key,JSON.stringify(state));}catch(e){$('harmony-status').textContent='No se pudo guardar el plan en este navegador. Copia el prompt para conservarlo.';}window.dispatchEvent(new Event('nea:brief-changed'));}
  function renderSummary(){
    const h=capture(),s=getScale(h.scale);$('composition-root').disabled=!s;
    $('scale-description').textContent=s?s.detail:'Elige entre 40 escalas y modos, en cualquiera de las 12 tónicas. O deja que la IA decida.';
    $('scale-notes').textContent=s?noteList(pitches(h.root,h.scale)):'';
    $('scale-intervals').textContent=s?'Semitonos desde la tónica: '+s.intervals.join(' · '):'No se transpone ni se cambia el BPM de tu referencia.';
    const last=h.changes.at(-1),from=last||h;
    $('modal-origin').textContent=getScale(from.scale)?'Recomendaciones desde '+label(from.root,from.scale)+(last?' · último paso del plan':' · inicio elegido'):'Elige una escala inicial para ver recomendaciones.';
    shown=recommendations(from,$('modal-contrast').value);
    $('modal-recommendations').innerHTML=shown.map((r,i)=>`<article class="modal-suggestion"><strong>${esc(label(r.root,r.scale))}</strong><p>${esc(r.detail)}</p><small>${r.common.length} alturas comunes · ${r.root===Number(from.root)?'misma tónica':'nuevo centro, mismas alturas'}</small><p class="modal-diff">Entran: ${esc(noteList(r.added))}<br>Salen: ${esc(noteList(r.removed))}</p><button type="button" class="button" data-modal-suggestion="${i}">Añadir al recorrido +</button></article>`).join('')||'<p class="harmony-help">Sin propuestas para este filtro. Prueba «Cercano» o elige libremente un destino abajo.</p>';
    $('modal-plan-summary').textContent=h.changes.length?`${h.changes.length} cambios en el encargo. Puedes editarlos, reordenarlos o quitarlos.`:'Todavía no has pedido cambios. Las recomendaciones no se aplican solas.';
  }
  function renderRows(){
    $('modal-plan').innerHTML=state.changes.map((c,i)=>`<article class="modal-step" data-modal-step="${i}"><header><strong>Paso ${i+1}</strong><div><button type="button" class="button" data-modal-up="${i}" ${i===0?'disabled':''} aria-label="Subir paso ${i+1}">↑</button><button type="button" class="button" data-modal-down="${i}" ${i===state.changes.length-1?'disabled':''} aria-label="Bajar paso ${i+1}">↓</button><button type="button" class="button" data-modal-remove="${i}" aria-label="Eliminar paso ${i+1}">Quitar</button></div></header><div class="harmony-fields"><label>¿Dónde ocurre?<input data-field="where" value="${esc(c.where)}" placeholder="Ej.: pulso 32 / puente / compás 9"></label><label>Tónica de destino<select data-field="root">${rootOptions()}</select></label><label>Escala de destino<select data-field="scale">${scaleOptions()}</select></label><label>Cómo llegar<select data-field="transition">${Object.entries(steps).map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label><label>BPM al llegar · opcional<input data-field="bpm" type="number" min="20" max="300" step="any" value="${esc(c.bpm)}" placeholder="Mantener tempo"></label><label>Intención del cambio<input data-field="note" value="${esc(c.note)}" placeholder="Ej.: iluminar el regreso del tema"></label></div></article>`).join('');
    $('modal-plan').querySelectorAll('[data-modal-step]').forEach((row,i)=>{for(const f of ['root','scale','transition'])row.querySelector(`[data-field="${f}"]`).value=state.changes[i][f];});
  }
  function addChange(root,scale){state.changes.push({root:Number(root),scale,where:'',transition:'common',bpm:'',note:''});renderRows();renderSummary();notify();$('modal-plan').lastElementChild.querySelector('input').focus({preventScroll:true});}
  function mount(){
    const host=$('harmony-planner');if(!host)return;
    host.innerHTML=`<header class="harmony-heading"><div><span class="harmony-kicker">EL PUNTO DE PARTIDA DE TU NUEVA PIEZA</span><h3>Tu escala. Tu tempo. Tu recorrido.</h3><p>Elige dónde empieza la música y hacia dónde quieres llevarla.</p></div><span class="harmony-badge">40 escalas × 12 tónicas</span></header><div class="harmony-fields harmony-start"><label>Tónica inicial<select id="composition-root">${rootOptions()}</select></label><label>Escala / modo inicial<select id="composition-scale">${scaleOptions(true)}</select></label><label>BPM inicial · opcional<input id="composition-bpm" type="number" min="20" max="300" step="any" placeholder="Ej.: 112 · vacío = libre" aria-describedby="harmony-status"></label></div><div class="scale-preview" aria-live="polite"><p id="scale-description"></p><strong id="scale-notes"></strong><small id="scale-intervals"></small></div><p class="harmony-help">Estos ajustes van al prompt de la nueva composición. El tempo y la tonalidad del estudio siguen describiendo tu referencia. Las notas mostradas son alturas MIDI; la escritura enarmónica puede variar.</p><p id="harmony-status" role="status"></p><details id="modal-explorer" class="modal-explorer"><summary>Explorar cambios modales y planear mi recorrido <span>Recomendaciones + destinos libres</span></summary><div class="modal-explorer-body"><div class="modal-recommend-heading"><div><h4>¿Hacia dónde seguimos?</h4><p id="modal-origin"></p></div><label>Buscar un contraste<select id="modal-contrast"><option value="close">Cercano · pocas notas cambian</option><option value="bright">Más abierto · grados elevados</option><option value="dark">Más oscuro · grados rebajados</option><option value="tension">Más tensión / ambigüedad</option><option value="relative">Otro centro · mismas notas</option></select></label></div><div id="modal-recommendations" class="modal-recommendations"></div><p class="harmony-help">Sugerencias locales por notas comunes y grados alterados, no por IA ni por análisis del audio. «Abierto/oscuro» compara los grados de escalas de 7 notas sobre la misma tónica: no predice emociones. Cambiar de modo no es solo tocar la misma escala desde otra nota; hay que establecer un centro.</p><h4>Tu recorrido, paso a paso</h4><p id="modal-plan-summary" class="harmony-help" aria-live="polite"></p><div id="modal-plan"></div><div class="modal-add"><label>Tónica de destino<select id="modal-target-root">${rootOptions()}</select></label><label>Escala de destino<select id="modal-target-scale">${scaleOptions()}</select></label><button type="button" class="button" id="modal-add">Añadir cambio +</button><button type="button" class="button" id="modal-return">Volver al inicio ↩</button></div><label class="modal-intent-label">Otros cambios o indicaciones<textarea id="modal-intent" rows="3" placeholder="Ej.: empezar en Re dórico, pasar a Re lidio en el puente y regresar al dórico para cerrar. Quiero que el motivo siga siendo reconocible."></textarea></label><p class="harmony-help">Puedes añadir tantos pasos como necesites. Sin ubicación, la IA elige el lugar respetando el orden. Un cambio modal mantiene la tónica; otro centro es una modulación. Un préstamo es un color breve, no necesariamente un cambio de centro.</p></div></details><p class="harmony-save-note">Se recuerda en este navegador · la IA genera la partitura; tú validas y aplicas el resultado.</p>`;
    let loadError='';
    if(!testMode)try{const saved=localStorage.getItem(key);if(saved)state=validate(JSON.parse(saved));}catch(e){loadError='No se pudo leer el plan guardado. No se ha borrado; exporta tu prompt antes de cambiar estos ajustes.';}
    $('composition-root').value=state.root;$('composition-scale').value=state.scale;$('composition-bpm').value=state.bpm;$('modal-intent').value=state.note;
    if(state.changes.length||state.note)$('modal-explorer').open=true;
    renderRows();renderSummary();$('harmony-status').textContent=loadError;
    host.addEventListener('input',e=>{const row=e.target.closest('[data-modal-step]');if(row&&e.target.dataset.field){const f=e.target.dataset.field;state.changes[Number(row.dataset.modalStep)][f]=f==='root'?Number(e.target.value):e.target.value;}
      if(['composition-root','composition-scale'].includes(e.target.id)&&$('composition-scale').value){for(const c of state.changes)if(c.transition==='return'){c.root=Number($('composition-root').value);c.scale=$('composition-scale').value;}renderRows();}
      if(!e.target.closest('.modal-add')&&e.target.id!=='modal-contrast')notify();renderSummary();
    });
    host.addEventListener('click',e=>{
      const b=e.target.closest('button');if(!b)return;
      if(b.dataset.modalSuggestion!==undefined){const r=shown[Number(b.dataset.modalSuggestion)];if(r)addChange(r.root,r.scale);}
      else if(b.id==='modal-add')addChange($('modal-target-root').value,$('modal-target-scale').value);
      else if(b.id==='modal-return'){const h=capture();if(!h.scale){$('harmony-status').textContent='Elige primero una escala inicial para poder volver a ella.';return;}addChange(h.root,h.scale);state.changes.at(-1).transition='return';renderRows();notify();}
      else for(const action of ['remove','up','down'])if(b.dataset['modal'+action[0].toUpperCase()+action.slice(1)]!==undefined){const i=Number(b.dataset['modal'+action[0].toUpperCase()+action.slice(1)]);if(action==='remove')state.changes.splice(i,1);else{const j=i+(action==='up'?-1:1);if(j<0||j>=state.changes.length)return;[state.changes[i],state.changes[j]]=[state.changes[j],state.changes[i]];}renderRows();renderSummary();notify();break;}
    });
  }
  mount();return {scales,roots,pitches,compare,recommendations,instructions,validate,options};
})();
