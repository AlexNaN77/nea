/* Manual external-AI context assistant. JSON populates text controls, never note arrays. */
'use strict';
window.PrimeContext = (() => {
  const $=id=>document.getElementById(id);
  const fields={idea:['prompt-input','Idea de la composición'],scene:['scene-input','Escena / contexto'],artist:['artist-reference','Artistas y obras de referencia'],artistTraits:['artist-traits','Qué me gusta de las referencias'],startFeeling:['feeling-start','Sensación inicial'],endFeeling:['feeling-end','Sensación final'],blend:['style-blend','Fusión de géneros'],customStyle:['custom-style','Estilo descrito con mis palabras'],avoid:['creative-avoid','Qué quiero evitar'],groove:['groove-request','Groove por instrumento']};
  const settings={task:['creative-task','Tipo de encargo'],format:['creative-format','Uso de la pieza'],style:['style-select','Género'],creativity:['creativity-select','Creatividad'],instruments:['creative-instruments','Instrumentos'],melody:['melody-character','Carácter de la melodía'],seconds:['creative-duration','Duración orientativa'],ending:['creative-ending','Tipo de final']};
  const paths=['prompts/expresion-prime-v2.txt','prompts/prime-buen-gusto.txt','prompts/prime-preguntas.txt'];
  let assets=null,loading=null,validated=null,undoState=null,lastApplied=null;
  const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  const clone=x=>JSON.parse(JSON.stringify(x));
  const fail=s=>{throw new Error(s);};
  function exactKeys(obj,keys,label){if(!plain(obj))fail(label+' debe ser un objeto.');for(const k of Object.keys(obj))if(!keys.includes(k))fail(label+': campo desconocido «'+k+'».');}
  function enums(){return Object.fromEntries(Object.entries(settings).map(([key,[id]])=>[key,[...$(id).options].map(o=>o.value)]));}
  function validate(value){
    let data=value;
    if(typeof value==='string'){
      let s=value.trim();if(s.startsWith('```')){const m=/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i.exec(s);if(!m)fail('Pega un único JSON completo, sin explicaciones ni otros bloques.');s=m[1];}
      try{data=JSON.parse(s);}catch(e){fail('JSON no válido: '+e.message);}
    }
    exactKeys(data,['format','fields','settings','techniques','moods','proposals'],'Raíz');
    if(data.format!=='nea-context/1')fail('Este validador espera format: "nea-context/1". No pegues aquí una partitura NEA ni un informe de análisis.');
    exactKeys(data.fields,Object.keys(fields),'fields');
    for(const [key,value] of Object.entries(data.fields))if(value!==null&&typeof value!=='string')fail('fields.'+key+' debe ser texto o null.');
    if(data.settings!==undefined){exactKeys(data.settings,Object.keys(settings),'settings');const allowed=enums();for(const [key,value] of Object.entries(data.settings))if(value!==null&&(typeof value!=='string'||!allowed[key].includes(value)))fail('settings.'+key+': opción no admitida. Usa una del contrato o null.');}
    if(data.techniques!==undefined){
      if(!Array.isArray(data.techniques)||data.techniques.length>MusicCraft.catalog.length)fail('techniques debe ser una lista de recursos conocidos, sin repetir.');
      const ids=new Set();for(const t of data.techniques){exactKeys(t,['id','enabled','note'],'techniques[]');if(!MusicCraft.catalog.some(x=>x.id===t.id)||ids.has(t.id))fail('Recurso desconocido o duplicado: '+t.id);ids.add(t.id);if(typeof t.enabled!=='boolean'||typeof t.note!=='string')fail('Cada recurso requiere enabled booleano y note de texto.');}
    }
    if(data.moods!==undefined&&data.moods!==null){const choices=[...document.querySelectorAll('[data-mood]')].map(b=>b.dataset.mood);if(!Array.isArray(data.moods)||data.moods.length>3||new Set(data.moods).size!==data.moods.length||!data.moods.every(m=>choices.includes(m)))fail('moods debe contener hasta tres emociones del catálogo, sin duplicados, o null.');}
    if(data.proposals!==undefined&&(!Array.isArray(data.proposals)||!data.proposals.every(x=>typeof x==='string')))fail('proposals debe ser una lista de textos.');
    return clone(data);
  }
  function capture(){return {fields:Object.fromEntries(Object.entries(fields).map(([k,[id]])=>[k,$(id).value])),settings:Object.fromEntries(Object.entries(settings).map(([k,[id]])=>[k,$(id).value])),stage:$('composition-stage').value,techniques:MusicCraft.catalog.map(x=>({id:x.id,enabled:$('craft-check-'+x.id).checked,note:$('craft-note-'+x.id).value})),moods:[...document.querySelectorAll('[data-mood][aria-pressed="true"]')].map(b=>b.dataset.mood)};}
  function changes(data){
    const now=capture(),out=[];
    for(const group of ['fields','settings'])for(const [key,value] of Object.entries(data[group]||{}))if(value!==null&&now[group][key]!==value)out.push({kind:group,key,label:(group==='fields'?fields:settings)[key][1],before:now[group][key],after:value});
    for(const t of data.techniques||[]){const old=now.techniques.find(x=>x.id===t.id);if(t.enabled!==old.enabled||t.note!==old.note)out.push({kind:'techniques',key:t.id,label:MusicCraft.catalog.find(x=>x.id===t.id).name,before:(old.enabled?'Activado':'Desactivado')+'\n'+old.note,after:(t.enabled?'Activado':'Desactivado')+'\n'+t.note,value:t});}
    if(data.moods!==undefined&&data.moods!==null&&JSON.stringify(data.moods)!==JSON.stringify(now.moods))out.push({kind:'moods',key:'moods',label:'Emociones',before:now.moods.join(', '),after:data.moods.join(', '),value:data.moods});
    return out;
  }
  function notify(){
    // Recompute once through the real UI hooks; no code execution from the imported JSON.
    $('groove-request').dispatchEvent(new Event('input',{bubbles:true}));
    window.dispatchEvent(new Event('nea:brief-changed'));
  }
  function restore(state){
    for(const [k,v] of Object.entries(state.fields))$(fields[k][0]).value=v;
    for(const [k,v] of Object.entries(state.settings))$(settings[k][0]).value=v;
    $('composition-stage').value=state.stage;
    for(const t of state.techniques){$('craft-check-'+t.id).checked=t.enabled;$('craft-note-'+t.id).value=t.note;}
    for(const b of document.querySelectorAll('[data-mood]'))b.setAttribute('aria-pressed',String(state.moods.includes(b.dataset.mood)));
    notify();
  }
  function applyRows(rows){
    const before=capture();
    try{
      for(const r of rows){
        if(r.kind==='fields')$(fields[r.key][0]).value=r.after;
        else if(r.kind==='settings'){$(settings[r.key][0]).value=r.after;if(r.key==='task')$('composition-stage').value=r.after==='new'?'reference':'revision';}
        else if(r.kind==='techniques'){$('craft-check-'+r.key).checked=r.value.enabled;$('craft-note-'+r.key).value=r.value.note;}
        else if(r.kind==='moods')for(const b of document.querySelectorAll('[data-mood]'))b.setAttribute('aria-pressed',String(r.value.includes(b.dataset.mood)));
      }
      notify();undoState=before;lastApplied=capture();$('prime-undo').disabled=false;
    }catch(e){restore(before);throw e;}
  }
  async function loadAssets(){
    if(assets)return assets;if(loading)return loading;
    loading=Promise.all(paths.map(async path=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);try{const r=await fetch(path,{signal:controller.signal});if(!r.ok)throw new Error(path+': HTTP '+r.status);return await r.text();}finally{clearTimeout(timer);}})).then(texts=>{assets={style:texts[0],taste:texts[1],questions:texts[2]};return assets;}).finally(()=>{loading=null;});
    return loading;
  }
  function contract(){
    return {format:'nea-context/1',fields:Object.fromEntries(Object.keys(fields).map(k=>[k,'Texto completo, o null para conservar el campo actual'])),settings:Object.fromEntries(Object.entries(enums()).map(([k,v])=>[k,v])),techniques:MusicCraft.catalog.map(x=>({id:x.id,name:x.name,description:x.description})),moods:[...document.querySelectorAll('[data-mood]')].map(b=>b.dataset.mood)};
  }
  function buildMaster({brief,style,taste,questions,ask=false,current=null}){
    if(typeof brief!=='string'||!brief.trim())fail('Escribe primero tu brief.');
    if(typeof style!=='string'||!style.trim())fail('Falta el texto base de PRIME. Reintenta su carga o pega tu versión.');
    const sample={format:'nea-context/1',fields:Object.fromEntries(Object.keys(fields).map(k=>[k,null])),settings:{},techniques:[],moods:null,proposals:[]};
    return `ENCARGO: EXPLICAR MI IDEA Y REPARTIRLA EN LOS CAMPOS DE NEA\nNo compongas notas ni entregues MIDI/NEA musical. Tu tarea es transformar mi brief en textos claros, detallados y fieles a mi intención, con mi estilo PRIME.\n\n--- INICIO ESTILO PRIME V2 ---\n${style}\n--- FIN ESTILO PRIME V2 ---\n\n--- AÑADIDO DE BUEN GUSTO ---\n${taste}\n\n${ask?'--- PREGUNTAS ACTIVADAS ---\n'+questions+'\n\nFASE ACTUAL: formula primero de 3 a 15 preguntas concretas en el chat. Espera mis respuestas; todavía NO entregues el JSON. Después, integra mis respuestas y devuelve el JSON final según el contrato. Esta instrucción de preguntas prevalece sobre «la manga nunca pregunta» del texto de estilo.':'PREGUNTAS DESACTIVADAS: no abras una entrevista; genera directamente el JSON final. Si falta una decisión, conserva el campo con null o formula una propuesta explícita; no inventes que ya lo pedí.'}\n\nREGLAS PARA ESTE ENCARGO\n- El texto PRIME es una guía de voz. Sus ejemplos, historias, edades, biografías, nombres de modelos y temas ajenos NO son datos del encargo musical: no los traslades al brief.\n- Conserva cada intención, restricción, referencia y detalle musical que aporte. Mejora cómo lo explicas, no sustituyas la idea por otra. No confundas buen gusto con muchos instrumentos, mucho texto o muchos adornos.\n- Redacta los valores de texto con mi voz; mantén claves, IDs, tipos y opciones del JSON exactamente como indica el contrato. El JSON válido prevalece sobre el formato informal. Escapa comillas y saltos de línea (\\n); nada de comentarios ni comas finales. Los diagramas útiles pueden ir dentro de una cadena, no fuera del JSON.\n- Distingue lo explícito de lo propuesto. Si añades una decisión creativa no indicada, escribe «Propongo…» en el campo correspondiente y recógela también en proposals. Nunca presentes una deducción como mi decisión confirmada. Si es incompatible con una restricción, no la añadas.\n- Rellena todos los campos de texto pertinentes. Incluye todas las claves de fields; usa null en lo no pertinente o que deba conservarse. Una cadena vacía solicita vaciar un campo y se revisará antes de aplicar. No recortes por un máximo de caracteres: no lo hay en los textos de contexto. El navegador y la IA sí tienen límites prácticos.\n- settings es opcional: usa valores exactos del catálogo, como cadenas, o null. Si mi estilo no está en la lista, explícalo en customStyle en lugar de inventar una opción.\n- techniques es opcional: solo recursos que pido o propongo expresamente; cada entrada debe tener id, enabled (booleano), note (texto explicando dónde/cómo). No actives los treinta por defecto. Los IDs omitidos se conservan. moods: hasta tres valores exactos o null.\n- No alteres nombres de proyecto, notas, tempo, canales, archivos, credenciales ni ajustes de publicación. No entregues un análisis musical de una partitura que no recibiste. No muestres razonamiento privado; entrega preguntas cuando correspondan y después el documento final.\n\nCATÁLOGO Y MAPA DE DESTINOS\n${JSON.stringify(contract(),null,2)}\n\nFORMA DEL JSON FINAL (ejemplo de estructura, sustituye los null pertinentes por tu redacción)\n${JSON.stringify(sample,null,2)}\n\n${current?'CAMPOS ACTUALES, para mantener lo ya decidido salvo que mi nuevo brief lo cambie explícitamente:\n'+JSON.stringify(current,null,2)+'\n\n':''}--- INICIO DE MI BRIEF REAL ---\n${brief}\n--- FIN DE MI BRIEF REAL ---\n\n${ask?'Empieza ahora por las preguntas. Tras mis respuestas, entrega un único JSON nea-context/1 completo, sin texto fuera del JSON.':'Entrega ahora un único JSON nea-context/1 completo, sin texto fuera del JSON.'}`;
  }
  function invalidate(){validated=null;$('prime-apply').disabled=true;$('prime-preview').replaceChildren();$('prime-validation').textContent='';}
  function preview(){
    invalidate();
    try{
      const data=validate($('prime-json').value),rows=changes(data);validated={data,rows,source:$('prime-json').value,state:JSON.stringify(capture())};
      const frag=document.createDocumentFragment();
      rows.forEach((r,i)=>{const card=document.createElement('article');card.className='prime-diff';const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.dataset.primeRow=i;check.checked=r.after!=='';label.append(check,document.createTextNode(r.label));card.append(label);const columns=document.createElement('div');columns.className='prime-diff-columns';for(const [heading,value] of [['Ahora',r.before],['Propuesta',r.after]]){const box=document.createElement('details'),sum=document.createElement('summary'),pre=document.createElement('pre');sum.textContent=heading+' · '+value.length.toLocaleString('es-ES')+' caracteres';pre.textContent=value||'(vacío)';box.append(sum,pre);columns.append(box);}card.append(columns);frag.append(card);});
      $('prime-preview').append(frag);
      if(data.proposals?.length){const panel=document.createElement('div');panel.className='prime-proposals';const title=document.createElement('strong');title.textContent='Decisiones propuestas por la IA · revísalas';panel.append(title);for(const s of data.proposals){const p=document.createElement('p');p.textContent=s;panel.append(p);}$('prime-preview').prepend(panel);}
      $('prime-validation').textContent=rows.length?`JSON válido. ${rows.length} cambios propuestos. Abre «Ahora» y «Propuesta» para comparar. Los vaciados quedan desmarcados.`:'JSON válido. No hay cambios respecto a los campos actuales.';
      $('prime-apply').disabled=!rows.some(r=>r.after!=='');
    }catch(e){$('prime-validation').textContent=e.message;}
  }
  function mount(){
    const host=$('prime-assistant');if(!host)return;
    // Long context needs real multiline controls, not horizontally scrolling one-line inputs.
    for(const [, [id]] of Object.entries(fields)){const old=$(id);if(old.tagName==='INPUT'){const area=document.createElement('textarea');for(const a of old.attributes)if(!['type','maxlength','value'].includes(a.name))area.setAttribute(a.name,a.value);area.rows=3;area.value=old.value;old.replaceWith(area);}else old.removeAttribute('maxlength');}
    host.innerHTML=`<div class="prime-heading"><div><span class="prime-kicker">Antes de empezar · opcional</span><h2>Cuéntalo una vez.</h2><p>Tu idea, como te salga. PRIME prepara un encargo para que tu IA la explique y reparta entre los campos.</p></div><label class="prime-switch"><input id="prime-enabled" type="checkbox" role="switch" aria-controls="prime-workspace"><span class="prime-switch-track" aria-hidden="true"></span><span>Rellenar casillas de contexto con ayuda de IA</span></label></div>
      <div id="prime-workspace" hidden>
        <ol class="prime-steps"><li><b>1</b> Cuenta tu idea</li><li><b>2</b> Lleva el prompt a tu IA</li><li><b>3</b> Pega el JSON y revisa</li></ol>
        <label class="prime-label" for="prime-brief">¿Qué te estás imaginando?</label><p class="prime-help">Escribe tu brief completo, a tu manera. Puedes mezclar sensaciones, referencias, instrumentos, detalles y cosas que no quieres. No hace falta ordenar todo.</p><textarea id="prime-brief" rows="9" placeholder="Okey, me imagino una pieza de city pop nocturna… El Rhodes tranquilo, el bajo bien vivo y una melodía que al volver se sienta distinta. Quiero explicar eso mejor, sin perder mi idea."></textarea>
        <div class="prime-options"><label class="prime-switch"><input id="prime-ask" type="checkbox" role="switch"><span class="prime-switch-track" aria-hidden="true"></span><span>Hacer preguntas antes de generar los briefs<small>De 3 a 15 preguntas en tu conversación con la IA. Después devuelve el JSON.</small></span></label><label class="prime-check"><input id="prime-current" type="checkbox" checked> Incluir mis campos actuales para no empezar de cero</label></div>
        <details class="prime-source"><summary>Ver o editar el texto base de EXPRESIÓN PRIME</summary><p>Se incluye completo. Los dos añadidos de buen gusto y preguntas se conservan como textos separados. Este estilo puede contener lenguaje adulto y ejemplos ajenos a la música: se usan como referencia de voz, no como contenido del encargo.</p><textarea id="prime-style" rows="10" aria-label="Texto base de EXPRESIÓN PRIME"></textarea><div class="prime-links"><a href="prompts/expresion-prime-v2.txt" target="_blank" rel="noopener">Abrir texto base</a><a href="prompts/prime-buen-gusto.txt" target="_blank" rel="noopener">Añadido de buen gusto</a><a href="prompts/prime-preguntas.txt" target="_blank" rel="noopener">Añadido de preguntas</a></div></details>
        <div class="prime-actions"><button class="button primary-button" id="prime-build">Preparar prompt maestro ↗</button><button class="text-button" id="prime-retry" hidden>Reintentar carga del estilo</button></div><p id="prime-status" class="prime-help" role="status">Nada se envía automáticamente. Tú eliges qué IA usar.</p>
        <details class="prime-output" id="prime-output" hidden><summary>Prompt maestro listo · copiar o descargar</summary><textarea id="prime-master" rows="10" aria-label="Prompt maestro para tu IA" spellcheck="false"></textarea><div class="prime-actions"><button class="button" id="prime-copy">Copiar todo</button><button class="button" id="prime-download">Descargar .txt</button></div><p id="prime-output-help" class="prime-help"></p></details>
        <section class="prime-return"><h3>Trae el JSON de vuelta</h3><p>Este JSON rellena el contexto. No es el archivo musical ni modifica tus notas. Primero revisa; después aplica solo lo que quieras.</p><label class="prime-label" for="prime-json">Respuesta JSON de tu IA</label><textarea id="prime-json" rows="7" placeholder='{"format":"nea-context/1","fields":{"idea":"…"}}' spellcheck="false"></textarea><div class="prime-actions"><button class="button" id="prime-validate">Validar y ver cambios</button><button class="button primary-button" id="prime-apply" disabled>Aplicar campos elegidos</button><button class="text-button" id="prime-undo" disabled>Deshacer último relleno</button></div><p id="prime-validation" class="prime-help" role="status" aria-live="polite"></p><div id="prime-preview"></div></section>
        <p class="prime-footnote">Sin límite artificial de caracteres en los contextos. Textos muy grandes pueden agotar la memoria del navegador o el contexto de tu IA. El borrador de este asistente no se guarda automáticamente: descarga el prompt o copia tu brief antes de cerrar.</p>
      </div>`;
    const ensureStyle=async()=>{try{const a=await loadAssets();if(!$('prime-style').value)$('prime-style').value=a.style;$('prime-retry').hidden=true;return a;}catch(e){$('prime-status').textContent='No se pudo cargar PRIME. Tu brief sigue aquí; pulsa Reintentar. '+e.message;$('prime-retry').hidden=false;throw e;}};
    $('prime-enabled').onchange=()=>{$('prime-workspace').hidden=!$('prime-enabled').checked;if($('prime-enabled').checked){ensureStyle().catch(()=>{});$('prime-brief').focus();}};
    $('prime-retry').onclick=()=>ensureStyle().then(()=>{$('prime-status').textContent='Textos cargados. Ya puedes preparar el prompt.';}).catch(()=>{});
    for(const id of ['prime-brief','prime-style','prime-ask','prime-current'])$(id).addEventListener('input',()=>{if(!$('prime-output').hidden)$('prime-status').textContent='Has cambiado el brief o los ajustes. Vuelve a preparar el prompt para incluir los cambios.';});
    $('prime-build').onclick=async()=>{
      if(!$('prime-brief').value.trim()){$('prime-status').textContent='Escribe primero lo que te estás imaginando.';$('prime-brief').focus();return;}
      $('prime-build').disabled=true;
      try{const a=await ensureStyle();const s=buildMaster({brief:$('prime-brief').value,style:$('prime-style').value,taste:a.taste,questions:a.questions,ask:$('prime-ask').checked,current:$('prime-current').checked?capture():null});$('prime-master').value=s;$('prime-output').hidden=false;$('prime-output').open=true;$('prime-status').textContent=`Preparado: ${s.length.toLocaleString('es-ES')} caracteres. No se ha enviado nada.`;$('prime-output-help').textContent=$('prime-ask').checked?'Responde las preguntas en la misma conversación con tu IA. Cuando te entregue el JSON final, pégalo abajo.':'Pega el prompt en tu IA y trae el JSON que te devuelva. Si no cabe en un mensaje, adjunta el .txt si tu IA admite archivos.';}catch(e){$('prime-status').textContent=e.message;}finally{$('prime-build').disabled=false;}
    };
    $('prime-copy').onclick=async()=>{const ok=await NEAStudio.copyText($('prime-master').value);$('prime-status').textContent=ok?'Prompt completo copiado. Llévalo a tu IA.':'No se pudo copiar. Selecciona el texto o descarga el .txt.';};
    $('prime-download').onclick=()=>NEAStudio.download($('prime-master').value,'nea-prime-contexto.txt','text/plain');
    $('prime-json').oninput=invalidate;$('prime-validate').onclick=preview;
    $('prime-preview').addEventListener('change',()=>{$('prime-apply').disabled=!$('prime-preview').querySelector('[data-prime-row]:checked');});
    $('prime-apply').onclick=()=>{
      if(!validated)return;
      if(validated.source!==$('prime-json').value||validated.state!==JSON.stringify(capture())){invalidate();$('prime-validation').textContent='El JSON o los campos han cambiado. Vuelve a validar antes de aplicar.';return;}
      const rows=[...$('prime-preview').querySelectorAll('[data-prime-row]:checked')].map(b=>validated.rows[Number(b.dataset.primeRow)]);if(!rows.length)return;
      try{applyRows(rows);invalidate();$('prime-validation').textContent=`Aplicados ${rows.length} cambios de contexto. Revisa los campos en «¿Qué quieres crear?» y prepara el prompt de composición.`;}catch(e){$('prime-validation').textContent='No se pudo aplicar: '+e.message;}
    };
    $('prime-undo').onclick=()=>{if(!undoState)return;if(JSON.stringify(capture())!==JSON.stringify(lastApplied)&&!confirm('Has editado campos después del relleno. Deshacer restaurará el contexto anterior y reemplazará esas ediciones. ¿Continuar?'))return;restore(undoState);undoState=null;lastApplied=null;$('prime-undo').disabled=true;invalidate();$('prime-validation').textContent='Contexto anterior restaurado. Las notas no han cambiado.';};
  }
  mount();return {fields,settings,validate,capture,changes,buildMaster,loadAssets,contract};
})();
