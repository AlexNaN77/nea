/* NEA 0.2: a small declarative score language; no eval, no executable code. */
'use strict';
(() => {
  const legacyParse=NEA.parse, q=JSON.stringify, r=NEA.round;
  const ROOT=['version','name','bpm','meter','ppq','key','length','tempos','meters','events','tracks'];
  const TRACK=['id','name','channel','program','color','volume','muted','solo','notes','cc','bend','events'];
  const nameOf=p=>['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][p%12]+(Math.floor(p/12)-1);
  function pitch(s){if(/^\d+$/.test(s))return Number(s);const m=/^([A-Ga-g])([#b]?)(-?\d+)$/.exec(s);if(!m)throw new Error('Altura no válida: '+s+'. Usa D5, F#4, Bb3 o 0–127.');return (Number(m[3])+1)*12+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1].toUpperCase()])+(m[2]==='#'?1:m[2]==='b'?-1:0);}
  function numeric(s){if(typeof s!=='string'||!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(s))throw new Error('Se esperaba un número, no «'+s+'».');const n=Number(s);if(!Number.isFinite(n))throw new Error('Número no finito.');return n;}
  function extras(object,known){return Object.fromEntries(Object.entries(object).filter(([key])=>!known.includes(key)));}
  function noteTokens(notes){return notes.map(n=>`${n[0]}:${nameOf(n[1])}/${n[2]}${n[3]===80?'':'/'+n[3]}`).join(' ');}
  function chunkLines(prefix,tokens,max=140){const result=[];let line=prefix;for(const token of tokens){if(line.length+token.length+1>max&&line!==prefix){result.push(line);line=prefix;}line+=' '+token;}if(line!==prefix)result.push(line);return result;}
  function compact(source){
    const p=NEA.validate(source),bar=p.meter[0]*4/p.meter[1];
    const out=['nea 0.2',`title ${q(p.name)}`,`bpm ${p.bpm}`,`meter ${p.meter.join('/')}`,`ppq ${p.ppq}`];
    if(p.key!==undefined)out.push('key '+q(p.key));if(p.length!==undefined)out.push('length '+p.length);
    const rootExtras=extras(p,ROOT);if(Object.keys(rootExtras).length)out.push('meta '+q(rootExtras));
    // Store complete maps, including simultaneous entries, without dropping raw MIDI data.
    out.push(...chunkLines('tempos',p.tempos.map(a=>a.join('/'))));out.push(...chunkLines('meters',p.meters.map(a=>a.join('/'))));
    p.events.forEach(e=>out.push('raw '+q(e)));
    for(const t of p.tracks){
      out.push('',`track ${q(t.id)} ${q(t.name)} ch=${t.channel} gm=${t.program}`,`mix ${t.volume} ${t.color} ${Number(t.muted)} ${Number(t.solo)}`);
      const extra=extras(t,TRACK);if(Object.keys(extra).length)out.push('meta '+q(extra));
      // Compare literal notation with 1-, 2- and 4-bar dictionaries. Every note stays present.
      const literal=chunkLines('notes',noteTokens(t.notes).split(' ').filter(Boolean));
      let best=literal;
      const eligible=t.notes.every(n=>r(n[0])===n[0]);
      if(eligible)for(const span of [bar,bar*2,bar*4]){
        const groups=new Map(),dictionary=new Map(),encoded=new Set(),candidate=[];let index=1;
        for(const n of t.notes){const at=Math.floor(n[0]/span)*span;if(!groups.has(at))groups.set(at,[]);groups.get(at).push([r(n[0]-at),...n.slice(1)]);}
        for(const [at,notes] of groups){
          const root=t.channel===9?0:notes[0][1];
          const signature=q(notes.map(n=>[n[0],n[1]-root,n[2],n[3]]));
          if(!dictionary.has(signature))dictionary.set(signature,{notes,root,occurrences:[]});
          const g=dictionary.get(signature);g.occurrences.push({at,shift:root-g.root});
        }
        for(const g of dictionary.values()){
          if(g.occurrences.length<2)continue;
          const id='P'+index,definition=`phrase ${id} = ${noteTokens(g.notes)}`,byShift=new Map();
          for(const o of g.occurrences){if(!byShift.has(o.shift))byShift.set(o.shift,[]);byShift.get(o.shift).push(o.at);}
          const uses=[];
          for(const [shift,ats] of byShift){
            let placement='at='+ats.join(',');
            const step=ats.length>1?r(ats[1]-ats[0]):0;
            if(ats.length>2&&step>0&&ats.every((at,i)=>r(ats[0]+i*step)===at)){
              const repeated=`at=${ats[0]} repeat=${ats.length} every=${step}`;if(repeated.length<placement.length)placement=repeated;
            }
            uses.push(`use ${id} ${placement}${shift?' shift='+shift:''}`);
          }
          const plain=g.occurrences.reduce((sum,o)=>sum+noteTokens(g.notes.map(n=>[r(o.at+n[0]),n[1]+o.shift,n[2],n[3]])).length+6,0);
          if(definition.length+uses.join('\n').length+2<plain){candidate.push(definition,...uses);g.occurrences.forEach(o=>encoded.add(o.at));index++;}
        }
        candidate.push(...chunkLines('notes',noteTokens(t.notes.filter(n=>!encoded.has(Math.floor(n[0]/span)*span))).split(' ').filter(Boolean)));
        if(candidate.join('\n').length<best.join('\n').length)best=candidate;
      }
      out.push(...best);
      out.push(...chunkLines('cc',t.cc.map(a=>a.join('/'))),...chunkLines('bend',t.bend.map(a=>a.join('/'))));
      t.events.forEach(e=>out.push('raw '+q(e)));out.push('end');
    }
    return out.join('\n')+'\n';
  }
  function parseCompact(text){
    if(text.length>5*1024*1024)throw new Error('NEA supera 5 MB.');
    const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/),p={version:'nea/0.1',name:'Sin título',bpm:120,meter:[4,4],ppq:480,tracks:[],events:[]};
    let current=null,phrases=new Map(),noteCount=0,definitionCount=0,header=false,seen=new Set();
    function parseNotes(body){if(!body.trim())return [];return body.trim().split(/\s+/).map(token=>{const m=/^([^:]+):([^/]+)\/([^/]+)(?:\/([^/]+))?$/.exec(token);if(!m)throw new Error('Nota no válida «'+token+'». Sintaxis: pulso:D5/duración/velocidad.');return [numeric(m[1]),pitch(m[2]),numeric(m[3]),m[4]===undefined?80:numeric(m[4])];});}
    function addNotes(notes){noteCount+=notes.length;if(noteCount>100000||current.notes.length+notes.length>50000)throw new Error('La expansión supera 100 000 notas totales o 50 000 por pista.');for(const n of notes)current.notes.push(n);}
    for(let i=0;i<lines.length;i++){
      const line=lines[i].trim();if(!line||line.startsWith('//'))continue;
      try{
        if(!header){if(line!=='nea 0.2')throw new Error('La primera línea debe ser «nea 0.2».');header=true;continue;}
        const split=line.indexOf(' '),cmd=split<0?line:line.slice(0,split),body=split<0?'':line.slice(split+1).trim();
        if(cmd==='track'){
          if(current)throw new Error('Falta «end» antes de otra pista.');
          const m=/^("(?:[^"\\]|\\.)*")\s+("(?:[^"\\]|\\.)*")\s+ch=(\d+)\s+gm=(\d+)$/.exec(body);
          if(!m)throw new Error('Usa track "id" "nombre" ch=0 gm=0 (ambos desde 0).');
          if(p.tracks.length>=64)throw new Error('Máximo 64 pistas.');
          current=NEA.makeTrack(JSON.parse(m[2]),Number(m[4]),Number(m[3]),NEA.colors[p.tracks.length%6]);current.id=JSON.parse(m[1]);p.tracks.push(current);phrases=new Map();continue;
        }
        if(cmd==='end'){if(!current||body)throw new Error('«end» solo cierra una pista abierta.');current=null;continue;}
        if(cmd==='raw'){const e=JSON.parse(body);(current?current.events:p.events).push(e);continue;}
        if(cmd==='meta'){const extra=JSON.parse(body);if(!extra||Array.isArray(extra)||typeof extra!=='object')throw new Error('meta requiere un objeto JSON.');const reserved=current?TRACK:ROOT;if(Object.keys(extra).some(k=>reserved.includes(k)||['__proto__','constructor','prototype'].includes(k)))throw new Error('meta no puede sobrescribir campos reservados.');Object.assign(current||p,extra);continue;}
        if(current){
          if(cmd==='mix'){const a=body.split(/\s+/);if(a.length!==4||!['0','1'].includes(a[2])||!['0','1'].includes(a[3]))throw new Error('mix volumen #RRGGBB mute(0/1) solo(0/1).');current.volume=numeric(a[0]);current.color=a[1];current.muted=a[2]==='1';current.solo=a[3]==='1';}
          else if(cmd==='notes')addNotes(parseNotes(body));
          else if(cmd==='phrase'){const m=/^([A-Za-z][\w-]*)\s*=\s*(.+)$/.exec(body);if(!m)throw new Error('Usa phrase A = 0:D5/1/80 …');if(phrases.has(m[1]))throw new Error('Frase duplicada: '+m[1]);const notes=parseNotes(m[2]);definitionCount+=notes.length;if(definitionCount>100000)throw new Error('Demasiadas notas en definiciones.');if(notes.some(n=>n[0]<0||n[1]<0||n[1]>127||!Number.isInteger(n[1])||n[2]<=0||n[3]<1||n[3]>127||!Number.isInteger(n[3])))throw new Error('La frase contiene notas fuera de rango.');phrases.set(m[1],notes);}
          else if(cmd==='use'){
            const parts=body.split(/\s+/),id=parts.shift(),args={};if(!phrases.has(id))throw new Error('Frase no definida: '+id);
            for(const token of parts){const pair=token.split('=');if(pair.length!==2||!['at','shift','repeat','every'].includes(pair[0])||Object.hasOwn(args,pair[0]))throw new Error('Parámetro use no válido: '+token);args[pair[0]]=pair[1];}
            if(!args.at)throw new Error('use requiere at=0 o una lista como at=0,4.');
            const ats=args.at.split(',').map(numeric),shift=args.shift===undefined?0:numeric(args.shift),times=args.repeat===undefined?1:numeric(args.repeat),every=args.every===undefined?0:numeric(args.every),notes=phrases.get(id);
            if(!Number.isInteger(times)||times<1||times>100000||!Number.isInteger(shift)||Math.abs(shift)>127||ats.some(x=>x<0||x>1000000)||every<0||(times>1&&every<=0))throw new Error('Posición, repetición o transposición fuera de rango.');
            if(noteCount+ats.length*times*notes.length>100000||current.notes.length+ats.length*times*notes.length>50000)throw new Error('Expansión de frases demasiado grande.');
            for(const at of ats)for(let rep=0;rep<times;rep++)addNotes(notes.map(n=>[r(at+rep*every+n[0]),n[1]+shift,n[2],n[3]]));
          }
          else if(cmd==='cc'||cmd==='bend'){if(body)for(const token of body.split(/\s+/))current[cmd].push(token.split('/').map(numeric));}
          else throw new Error('Comando no reconocido dentro de pista: '+cmd);
        }else{
          if(['title','bpm','meter','ppq','key','length'].includes(cmd)){if(seen.has(cmd))throw new Error('Cabecera duplicada: '+cmd);seen.add(cmd);}
          if(cmd==='title'||cmd==='key'){const value=JSON.parse(body);if(typeof value!=='string')throw new Error('Texto entre comillas requerido.');p[cmd==='title'?'name':'key']=value;}
          else if(['bpm','ppq','length'].includes(cmd))p[cmd]=numeric(body);
          else if(cmd==='meter')p.meter=body.split('/').map(numeric);
          else if(cmd==='tempos'||cmd==='meters'){p[cmd]??=[];if(body)p[cmd].push(...body.split(/\s+/).map(token=>token.split('/').map(numeric)));}
          else throw new Error('Comando no reconocido fuera de pista: '+cmd);
        }
      }catch(e){throw new Error('Línea '+(i+1)+': '+e.message);}
    }
    if(!header)throw new Error('Archivo NEA vacío.');if(current)throw new Error('Falta «end» en la última pista.');
    return NEA.validate(p);
  }
  NEA.parse=text=>{let s=text.trim();if(s.startsWith('```'))s=s.replace(/^```(?:json|nea)?\s*/i,'').replace(/\s*```\s*$/,'');return /^nea\s/.test(s)?parseCompact(s):legacyParse(s);};
  NEA.compact=compact;NEA.parseCompact=parseCompact;NEA.pitchName=nameOf;
  NEA.compactSpec=`NEA 0.2 (lenguaje declarativo; NO JSON). Devuelve SOLO el archivo completo. Sintaxis exacta, una instrucción por línea:
nea 0.2
title "Nombre"
bpm 112
meter 4/4
ppq 480
length 32
track "lead" "Melodía" ch=0 gm=10
phrase A = 0:D5/0.5/85 0.5:F5/0.5/75 1:E5/1/80
use A at=0,4 shift=0
use A at=8 shift=2
notes 12:A5/1/90 13:G5/1/75
cc 0/11/90 16/11/110
bend 8/0
end
Tiempo en pulsos de negra desde 0; nota = inicio:altura/duración/velocidad. Altura: C4=60; sostenido #, bemol b o número MIDI 0–127. Duración positiva; velocidad entera 1–127 (opcional, por defecto 80). Varias notas con el mismo inicio forman acordes. ch=0..15 (9 batería); gm=0..127 (0 piano). Cada pista termina en end. IDs únicos entre comillas. phrase define notas relativas locales a su pista, no las reproduce; use las instancia en at (lista de pulsos), shift transpone semitonos sin cambiar ritmo. Opcional: use A at=0 repeat=8 every=4 repite la frase 8 veces, separadas 4 pulsos; puede combinarse con shift. La expansión incluye TODAS las notas, no un resumen. Sin llamadas recursivas. Las transformaciones de ritmo o contorno se escriben como otra frase explícita.
Opcionales raíz: key "D minor"; tempos 0/112 16/120; meters 0/4/4 16/3/4. Mapas desde 0 prevalecen sobre bpm/meter. mix 0.75 #bc9fea 0 0 dentro de pista = volumen de preescucha, color, mute, solo. CC = pulso/controlador/valor (0–127). bend = pulso/valor (-8192..8191), centro 0. Volumen MIDI: CC7; expresión de frase: CC11. Slides: puntos bend intermedios sobre una nota sostenida y retorno a 0, no shift ni solo velocity. Cada punto mantiene su valor hasta el siguiente. Pitch bend afecta al canal entero; usa canales independientes y no batería. Rango por defecto ±2 semitonos; configúralo con RPN 0: cc 0/101/0 0/100/0 0/6/2 0/38/0 0/101/127 0/100/127. phrase/use solo repiten notas, no cc/bend. raw [pulso,status,...bytes] conserva otros eventos MIDI; meta {"campo":"valor"} conserva anotaciones, nunca campos musicales reservados. Máximo 64 pistas, 100000 notas expandidas, 50000 por pista. No VST, audio ni comandos inventados. Comentarios solo en líneas que empiezan //.`;
})();
