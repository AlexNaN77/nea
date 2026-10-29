/* Optional creative requirements. This module builds prompts; it never edits the score. */
'use strict';
window.MusicCraft = (() => {
  const ornaments = [
    ['neighbor','Bordadura','Visita una nota vecina y vuelve a la principal.','Fa–Mi–Fa. Decide la vecina según el contexto; el ejemplo no obliga a usar Fa.'],
    ['mordent','Mordiente (mordente)','Un giro muy breve: principal, vecina, principal.','Fa–Mi–Fa, rápido. Especifica superior o inferior y conserva el destino de la frase.'],
    ['appoggiatura','Apoyatura','Una nota con peso expresivo que crea tensión y resuelve.','Sol→Fa. Suele ocupar parte del tiempo de la nota principal; no confundir con una nota de gracia fugaz.'],
    ['acciaccatura','Acciaccatura','Una nota de gracia muy breve junto al ataque principal.','Mi♭→Fa. Realiza la nota corta con duración positiva, sin posiciones negativas al principio de la pieza.'],
    ['turn','Grupeto o giro','Rodea una nota con sus vecinas superior e inferior.','Fa–Sol–Fa–Mi–Fa es un giro ilustrativo. Ajusta el orden, la duración y las vecinas al fraseo.'],
    ['run','Escala o run','Un recorrido rápido que conecta dos puntos de la melodía.','Do–Re–Mi–Fa. Debe tener un destino claro, no ser relleno permanente.'],
    ['arpeggio','Arpegio','Las notas del acorde, una detrás de otra.','Fa–La–Do–Fa. Decide acorde, registro, dirección y acentos; no es solo subir una escala.'],
    ['anticipation','Anticipación','Una nota llega antes que el acorde o la frase que la sostiene.','Adelanta una nota del acorde siguiente y haz que el nuevo contexto justifique su llegada.'],
    ['chromatic-pass','Nota de paso cromática','Conecta notas con un pequeño recorrido por semitonos.','Fa–Mi–Mi♭–Re. Conserva dirección, apoyo armónico y una llegada reconocible.'],
    ['trill','Trino','Alterna repetidamente dos notas vecinas.','Fa–Sol–Fa–Sol… Ajusta velocidad y duración al instrumento; resuelve sin tapar la siguiente frase.']
  ].map(([id,name,description,detail])=>({id,name,description,detail,group:'Adornos'}));
  const resources = [
    ['sequence','Secuencia','Repite una frase desde otra altura.','Fa–Sol–La / Sol–La–Si♭. Decide si la secuencia es tonal (ajusta intervalos) o exacta.','Transformar el tema'],
    ['inversion','Inversión melódica','Refleja el movimiento: lo que subía ahora baja.','Inversión exacta de Fa–Sol–La alrededor de Fa: Fa–Mi♭–Re♭. Una inversión tonal adapta los intervalos a la escala; especifica cuál usas.','Transformar el tema'],
    ['retrograde','Retrogradación','Recorre el tema desde su final hasta su comienzo.','Fa–Sol–La–Do → Do–La–Sol–Fa. Decide también si inviertes el ritmo o solo las alturas.','Transformar el tema'],
    ['augmentation','Aumentación / disminución','El mismo tema con duraciones más largas o más cortas.','Multiplica las duraciones y distancias entre ataques por un factor coherente, por ejemplo ×2 o ×0.5.','Transformar el tema'],
    ['rhythmic-variation','Variación rítmica','Cambia acentos, silencios y ritmo sin perder el tema.','Conserva alturas o puntos de apoyo reconocibles; deja que la nueva versión dialogue con la original.','Transformar el tema'],
    ['modal-mixture','Intercambio modal','Toma un color armónico prestado de otro modo.','Por ejemplo, un acorde de Fa menor dentro de Fa mayor. Prepara la conducción de voces y el regreso; no equivale automáticamente a tristeza.','Tensión y reposo'],
    ['suspension','Suspensión armónica','Una nota se queda y tarda en resolver al cambiar la armonía.','Prepara la nota en el acorde anterior, mantenla sobre el nuevo y resuelve por grado conjunto cuando proceda.','Tensión y reposo'],
    ['chromaticism','Cromatismo','Usa semitonos y notas ajenas a la escala con intención.','Fa–Mi–Mi♭–Re. Construye dirección y función; no añadas alteraciones al azar.','Tensión y reposo'],
    ['dissonance','Disonancia y resolución','Un choque que conduce a una llegada más estable.','Haz audible la preparación, la tensión y su resolución; no confundas más disonancia con más calidad.','Tensión y reposo'],
    ['pedal','Nota pedal','Una nota permanece mientras la armonía cambia.','Un Do grave sostenido o reiterado bajo acordes cambiantes. Decide duración y salida del pedal.','Tensión y reposo'],
    ['orchestration','Orquestación','Reparte funciones y transforma el color entre instrumentos.','Asigna melodía, respuestas, bajo y apoyo con registros y articulaciones claros. No dupliques todo en todas las pistas.','Identidad sonora'],
    ['octaves','Duplicación a la octava','Refuerza una melodía en dos registros.','Usa diferencias de 12 semitonos y reserva la duplicación para un propósito; deja espacio a las otras voces.','Identidad sonora'],
    ['counterpoint','Contrapunto','Dos o más melodías independientes que conviven.','Diseña contornos, respiraciones y ritmos propios, con consonancias y disonancias intencionadas.','Identidad sonora'],
    ['ostinato','Ostinato','Una figura insistente sostiene capas que evolucionan.','Repite una célula rítmica o melódica; cambia contexto, instrumentación o densidad sin ahogar el tema.','Identidad sonora'],
    ['density','Densidad progresiva','Construye un clímax añadiendo actividad o capas poco a poco.','Planifica entradas y salidas: evita que todos los instrumentos toquen desde el principio hasta el final.','Identidad sonora'],
    ['fragmentation','Fragmentación','Desarrolla solo un trozo reconocible del tema.','Fa–La–Do–Si♭–La–Fa → Fa–La / Fa–La / Fa. Conserva la relación con el tema.','Finales y transformaciones'],
    ['descending-harmony','Secuencia de acordes descendentes','El acompañamiento desciende mientras la melodía continúa.','Define si desciende el bajo o las raíces; cuida inversiones y notas comunes para no hacer saltos arbitrarios.','Finales y transformaciones'],
    ['dramatic-silence','Silencio dramático','Un hueco preparado antes de una entrada o resolución.','Decide qué voces callan y cuánto dura. El silencio debe sentirse parte del fraseo, no un fallo del archivo.','Finales y transformaciones'],
    ['coda','Coda','Una sección final que da sentido al cierre.','Recupera o transforma el tema. Si se pide loop, prepara una coda de vuelta al inicio o señala la incompatibilidad, no fuerces un corte.','Finales y transformaciones'],
    ['reharmonization','Rearmonización','Cambia los acordes para iluminar de otra forma una melodía.','Conserva la melodía indicada y cuida el bajo, las inversiones y la conducción de voces.','Finales y transformaciones']
  ].map(([id,name,description,detail,group])=>({id,name,description,detail,group}));
  const expression = [
    {id:'volume-automation',name:'Automatización de volumen',description:'Crescendos, entradas suaves y respiraciones dentro de las notas.',detail:'Usa CC7 para el nivel de la pista y CC11 para crescendos, diminuendos y swells. Elige frases concretas, deja contraste y recupera el nivel al terminar; no sustituyas la curva por velocidades de ataque.',group:'Expresión MIDI'},
    {id:'pitch-slides',name:'Slides de tono',description:'Desliza la afinación hacia una nota con intención, sin saltos bruscos.',detail:'Usa pitch bend en un lead o bajo monofónico: acercamientos breves a la nota y algún slide de llegada. Indica destino y duración, mantén una nota sonando durante el recorrido y vuelve al centro al terminar. Evita deslizar acordes o batería.',group:'Expresión MIDI'}
  ];
  const catalog=[...ornaments,...resources,...expression], $=id=>document.getElementById(id);
  function selections(){return catalog.filter(x=>$('craft-check-'+x.id)?.checked).map(x=>({id:x.id,note:($('craft-note-'+x.id)?.value||'').trim()}));}
  function options(){return {techniques:selections(),groove:$('groove-request')?.value.trim()||'',process:$('composition-process')?.value||'direct',passes:Number($('composition-passes')?.value||3),analysisDetail:$('analysis-detail')?.value||'current'};}
  function instructions(o={}){
    const chosen=(o.techniques||[]).map(s=>({item:catalog.find(x=>x.id===s.id),note:String(s.note||'')})).filter(s=>s.item);
    const lines=[];
    if(chosen.length){
      lines.push('RECURSOS SOLICITADOS EXPLÍCITAMENTE', 'Incluye cada selección de manera audible y localizada. Las indicaciones particulares del usuario sobre notas, instrumento y lugar tienen prioridad sobre los ejemplos genéricos. Si no hay lugar especificado, elige uno con función musical. No distribuyas todos los adornos en cada frase. Si dos requisitos se contradicen, señala el conflicto y pide una decisión; no omitas uno silenciosamente.');
      for(const {item,note} of chosen)lines.push(`- ${item.name}: ${item.description} ${note?'Cómo lo quiere el usuario: '+note:item.detail}`);
      lines.push('Realiza adornos y transformaciones de notas como notas, tiempos, duraciones y velocidades explícitos en NEA 0.2; las automatizaciones de volumen y tono se realizan con cc y bend, no solo con velocity. No confundas shift de una frase (transposición fija) con un slide continuo; no inventes comandos ornament, trill, humanize, invert o swing. Escribe una nueva phrase cuando cambie el ritmo o el contorno. Los ejemplos no fijan una tonalidad ni garantizan una emoción.');
    }
    if(chosen.some(s=>expression.includes(s.item)))lines.push(NEAExpression.contract);
    if(o.groove)lines.push('GROOVE PEDIDO POR EL USUARIO\n'+String(o.groove),'Respeta las diferencias entre instrumentos: articulación, silencios, acentos y relación rítmica entre bajo, batería y acompañamiento. Si procede, usa microdesplazamientos coherentes y velocidades diferenciadas; no apliques jitter aleatorio ni retrases todas las voces por igual. No prometas un timbre de Rhodes real: GM y la preescucha son aproximaciones.');
    return lines.join('\n');
  }
  function protocol(o={}){
    if(o.process!=='versions')return '';
    const passes=Math.max(2,Math.min(4,Math.floor(Number(o.passes)||3)));
    return `MODO TALLER — VERSIONES Y AVANCES VISIBLES\nTrabaja en ${passes} versiones como máximo, no en un bucle infinito ni hasta una supuesta perfección. Prioriza la idea del usuario y conserva lo que ya funciona. CONTINUIDAD: realiza el borrador y las revisiones en una misma tarea, sin pedir «¿continúo?» ni esperar aprobación entre versiones. Publica los avances durante el trabajo, antes y después de los cambios relevantes, no reconstruyas al final un supuesto pensamiento en tiempo real. Si tu plataforma no permite intercalar mensajes y acciones, explica esa limitación y entrega los hitos identificados sin fingir una transmisión en directo.\n1. Antes del primer borrador, publica una ficha breve de intención (máximo 5 líneas): carácter, roles, forma aproximada y dónde incorporarás los recursos elegidos. Es un resumen de decisiones comunicables, no una cadena de pensamiento privada ni un monólogo interno.\n2. Produce primero un borrador NEA completo que tenga tema, dirección y final. No te detengas en un análisis largo ni pidas aprobación entre versiones salvo conflicto real en el encargo.\n3. Después de cada versión, publica un registro breve (máximo 3 puntos): sección/pulso o pista cambiada, cambio observable y objetivo musical. Por ejemplo: «Final del tema: añadida figura Fa–Mi–Fa; acortada la nota anterior para conservar la duración». No presentes una hipótesis como algo que has escuchado.\n4. Revisa fraseo, groove y cumplimiento de selecciones; mejora un problema concreto por pasada. No reescribas la pieza entera sin motivo ni sumes ornamentos por inercia. Detente al llegar al límite y deja los aspectos pendientes al usuario.\nARCHIVOS, SOLO SI TU ENTORNO LO PERMITE\nSi tienes herramientas reales como Write File, Edit File o MultiEdit, guarda versiones separadas (composicion-v1.nea, composicion-v2.nea…) y el resultado en composicion-final.nea. Lee la versión actual antes de editarla y conserva una copia anterior. No afirmes haber usado una herramienta, guardado un archivo, validado sintaxis o reproducido audio si no ocurrió. Si no hay herramientas de archivo, publica cada versión completa en un bloque de código NEA separado y claramente identificado; nunca inventes enlaces de descarga.\nENTREGA\nEl archivo composicion-final.nea debe contener solo NEA válido, no el registro ni la ficha. Adjunta o identifica inequívocamente el archivo final; si no hay archivos, el último bloque NEA es la versión final completa. El usuario importará ese archivo o copiará solo ese bloque a NEA Studio, no la conversación. El contrato de formato de esta petición se aplica al contenido de cada archivo/bloque, no prohíbe estos avances breves. No hace falta producir ni importar un JSON de análisis.\nLÍMITES\nNEA admite hasta 64 pistas, pero el MIDI estándar de esta app tiene 16 canales (0–15, 9 percusión). No prometas 60 canales independientes ni asignes programas incompatibles a pistas que comparten canal. Ninguna versión certifica calidad artística: la escucha y la elección final corresponden al usuario.`;
  }
  function mount(){
    const parent=$('creative-guide');if(!parent)return;
    const host=document.createElement('section');host.id='music-craft';host.setAttribute('aria-label','Adornos y recursos de composición');
    const cards=items=>items.map(x=>`<article class="craft-card"><label class="craft-choice" for="craft-check-${x.id}"><input type="checkbox" id="craft-check-${x.id}" data-technique="${x.id}" ${expression.includes(x)?'checked':''}><span><strong>${x.name}</strong><small>${x.description}</small></span></label><div class="craft-note-wrap" id="craft-wrap-${x.id}" hidden><p class="craft-example">${x.detail}</p><label for="craft-note-${x.id}">¿Dónde y cómo lo quieres? <span>Opcional</span></label><textarea id="craft-note-${x.id}" rows="3" placeholder="Ej.: al final del leitmotiv, en la melodía principal…"></textarea></div></article>`).join('');
    host.innerHTML=`<header class="craft-heading"><h3>Dale tu toque</h3><p>Elige lo que quieres escuchar. Solo lo seleccionado se añade al prompt; tus notas no cambian aquí.</p></header>
      <details class="craft-menu expression-menu" id="expression-menu" open><summary><span>Movimiento y expresión <small>Curvas que respiran · notas que se deslizan</small></span><span class="craft-count" id="expression-count">2 elegidos</span></summary><p class="expression-intro">Pídele a tu IA que genere también los gestos, no solo las notas. Activos por defecto; tú eliges dónde y cuánto.</p><div class="craft-grid">${cards(expression)}</div><p class="expression-footer">CC7 / CC11 + pitch bend · se escuchan en la preescucha y viajan en el MIDI. El timbre final depende de tu instrumento.</p></details>
      <details class="craft-menu" id="ornament-menu"><summary><span>Adornos de la melodía <small>10 opciones</small></span><span class="craft-count" id="ornament-count">0 elegidos</span></summary><div class="craft-grid">${cards(ornaments)}</div></details>
      <details class="craft-menu" id="resource-menu"><summary><span>Recursos para componer <small>20 opciones</small></span><span class="craft-count" id="resource-count">0 elegidos</span></summary>${[...new Set(resources.map(x=>x.group))].map(g=>`<h4 class="craft-group-title">${g}</h4><div class="craft-grid">${cards(resources.filter(x=>x.group===g))}</div>`).join('')}</details>
      <div class="craft-selection-bar"><span id="craft-selection-status" role="status">Ningún recurso obligatorio. La IA decide según tu idea.</span><button type="button" class="text-button" id="clear-techniques">Quitar selecciones</button></div>
      <label class="groove-label" for="groove-request">¿Cómo quieres el groove? <small>Opcional · dilo con tus palabras</small></label><textarea id="groove-request" rows="3" placeholder="Quiero Rhodes relajado y con espacio, bajo que converse con el bombo y batería con acentos vivos, sin sonar robótica."></textarea>
      <details class="craft-menu" id="process-menu"><summary><span>Cómo quiero que trabaje la IA <small>Versiones, avances y contexto</small></span></summary><div class="craft-process"><label>Forma de entrega<select id="composition-process"><option value="versions" selected>Taller continuo · avances y versiones</option><option value="direct">Directa · solo NEA, como antes</option></select></label><label id="passes-label">Máximo de versiones<select id="composition-passes"><option value="2">2 · borrador y revisión</option><option value="3" selected>3 · tema, desarrollo y pulido</option><option value="4">4 · una revisión adicional</option></select></label><p class="insight-help">Pide trabajo seguido, sin esperar tu «continúa»: decisiones resumidas, borradores y cambios observables, no razonamiento privado. Las herramientas disponibles y los avances dependen de la IA externa. NEA no controla su sesión.</p><label>Análisis que acompaña a la partitura<select id="analysis-detail"><option value="current">Como hasta ahora · informe actual</option><option value="brief">Breve · pistas, escala y hasta 3 motivos</option><option value="none">Sin informe · solo mi encargo y la partitura</option></select></label><p class="insight-help">No recorta la pieza. Solo afecta al informe añadido cuando envías partitura; «solo análisis» conserva su informe. Puedes comparar resultados sin cambiar tu MIDI.</p></div></details>
      <p class="craft-footer-note">Los recursos piden resultados; no son efectos automáticos ni garantizan calidad. Los campos de este panel se recuerdan en este navegador.</p>`;
    parent.append(host);
    $('craft-note-mordent').placeholder='Quiero que al final del leitmotiv se haga un mordiente entre Fa y Mi, con intención nostálgica.';
    const testMode=new URLSearchParams(location.search).get('test')==='1', key='nea-craft-preferences-v1';
    function update(){
      const selected=selections();for(const x of catalog)$('craft-wrap-'+x.id).hidden=!$('craft-check-'+x.id).checked;
      $('expression-count').textContent=selected.filter(s=>expression.some(x=>x.id===s.id)).length+' elegidos';
      $('ornament-count').textContent=selected.filter(s=>ornaments.some(x=>x.id===s.id)).length+' elegidos';
      $('resource-count').textContent=selected.filter(s=>resources.some(x=>x.id===s.id)).length+' elegidos';
      $('craft-selection-status').textContent=selected.length?`${selected.length} recursos explícitos.${selected.length>8?' Son muchos: concreta dónde va cada uno para no saturar la pieza.':''}`:'Ningún recurso obligatorio. La IA decide según tu idea.';
      $('clear-techniques').disabled=!selected.length;$('passes-label').hidden=$('composition-process').value!=='versions';
      if(!testMode)try{localStorage.setItem(key,JSON.stringify({...options(),notes:Object.fromEntries(catalog.map(x=>[x.id,$('craft-note-'+x.id).value]))}));}catch(e){/* Persistence is optional; prompt generation still works. */}
      window.dispatchEvent(new Event('nea:brief-changed'));
    }
    if(!testMode)try{
      const s=JSON.parse(localStorage.getItem(key)||'null');if(s&&typeof s==='object'){
        for(const x of catalog){$('craft-check-'+x.id).checked=(expression.includes(x)&&!Object.hasOwn(s.notes||{},x.id))||(Array.isArray(s.techniques)&&s.techniques.some(t=>t.id===x.id));if(typeof s.notes?.[x.id]==='string')$('craft-note-'+x.id).value=s.notes[x.id];}
        if(typeof s.groove==='string')$('groove-request').value=s.groove;
        for(const [id,value] of [['composition-process',s.process],['composition-passes',String(s.passes)],['analysis-detail',s.analysisDetail]])if([...$(id).options].some(o=>o.value===value))$(id).value=value;
      }
    }catch(e){/* Ignore malformed/stale browser preferences. */}
    host.addEventListener('input',update);
    $('clear-techniques').onclick=()=>{for(const x of catalog)$('craft-check-'+x.id).checked=false;update();};
    update();
  }
  mount();return {ornaments,resources,expression,catalog,options,instructions,protocol};
})();
