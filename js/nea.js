/* NEA 0.1 — Browser-only musical interchange. No remote services. */
'use strict';
window.NEA = (() => {
  const colors = ['#ff963f', '#f1c5a1', '#d8d2cb', '#cb7c45', '#ffe0be', '#e9a669'];
  const instruments = ['Acoustic Grand Piano','Bright Acoustic Piano','Electric Grand Piano','Honky-tonk Piano','Electric Piano 1','Electric Piano 2','Harpsichord','Clavinet','Celesta','Glockenspiel','Music Box','Vibraphone','Marimba','Xylophone','Tubular Bells','Dulcimer','Drawbar Organ','Percussive Organ','Rock Organ','Church Organ','Reed Organ','Accordion','Harmonica','Tango Accordion','Acoustic Guitar (nylon)','Acoustic Guitar (steel)','Electric Guitar (jazz)','Electric Guitar (clean)','Electric Guitar (muted)','Overdriven Guitar','Distortion Guitar','Guitar Harmonics','Acoustic Bass','Electric Bass (finger)','Electric Bass (pick)','Fretless Bass','Slap Bass 1','Slap Bass 2','Synth Bass 1','Synth Bass 2','Violin','Viola','Cello','Contrabass','Tremolo Strings','Pizzicato Strings','Orchestral Harp','Timpani','String Ensemble 1','String Ensemble 2','Synth Strings 1','Synth Strings 2','Choir Aahs','Voice Oohs','Synth Voice','Orchestra Hit','Trumpet','Trombone','Tuba','Muted Trumpet','French Horn','Brass Section','Synth Brass 1','Synth Brass 2','Soprano Sax','Alto Sax','Tenor Sax','Baritone Sax','Oboe','English Horn','Bassoon','Clarinet','Piccolo','Flute','Recorder','Pan Flute','Blown Bottle','Shakuhachi','Whistle','Ocarina','Lead 1 (square)','Lead 2 (sawtooth)','Lead 3 (calliope)','Lead 4 (chiff)','Lead 5 (charang)','Lead 6 (voice)','Lead 7 (fifths)','Lead 8 (bass + lead)','Pad 1 (new age)','Pad 2 (warm)','Pad 3 (polysynth)','Pad 4 (choir)','Pad 5 (bowed)','Pad 6 (metallic)','Pad 7 (halo)','Pad 8 (sweep)','FX 1 (rain)','FX 2 (soundtrack)','FX 3 (crystal)','FX 4 (atmosphere)','FX 5 (brightness)','FX 6 (goblins)','FX 7 (echoes)','FX 8 (sci-fi)','Sitar','Banjo','Shamisen','Koto','Kalimba','Bag Pipe','Fiddle','Shanai','Tinkle Bell','Agogo','Steel Drums','Woodblock','Taiko Drum','Melodic Tom','Synth Drum','Reverse Cymbal','Guitar Fret Noise','Breath Noise','Seashore','Bird Tweet','Telephone Ring','Helicopter','Applause','Gunshot'];
  const clone = x => JSON.parse(JSON.stringify(x));
  const round = n => Math.round(n * 1000000) / 1000000;
  function duration(p) {
    let end = 0;
    for (const t of p.tracks) {
      for (const n of t.notes) end = Math.max(end, n[0] + n[2]);
      for (const a of [...(t.cc || []), ...(t.bend || []), ...(t.events || [])]) end = Math.max(end, a[0]);
    }
    for (const a of [...(p.tempos || []), ...(p.meters || []), ...(p.events || [])]) end = Math.max(end, a[0]);
    return Math.max(end, p.length || 0, 4);
  }
  function serialize(p) {
    return JSON.stringify(p, null, 2).replace(/\[\s*(-?\d+(?:\.\d+)?(?:\s*,\s*-?\d+(?:\.\d+)?)+)\s*\]/g, (_, a) => '[' + a.replace(/\s+/g, ' ') + ']');
  }
  function parse(text) {
    let s = text.trim();
    if (s.startsWith('```')) s = s.replace(/^```(?:json|nea)?\s*/i, '').replace(/\s*```\s*$/, '');
    let data;
    try { data = JSON.parse(s); } catch (e) { throw new Error('JSON no válido: ' + e.message + '. Pega solo el objeto NEA completo, sin explicaciones.'); }
    return validate(data);
  }
  function validate(input) {
    const errors = [];
    const fail = message => { if (errors.length < 15) errors.push(message); };
    const number = (v, min, max, integer = false) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!integer || Number.isInteger(v));
    const object = v => v && typeof v === 'object' && !Array.isArray(v);
    if (!object(input)) throw new Error('NEA debe ser un objeto JSON.');
    const p = clone(input);
    if (p.version !== 'nea/0.1') fail('version debe ser "nea/0.1".');
    if (typeof p.name !== 'string' || !p.name.trim()) fail('name debe ser un texto no vacío.');
    if (!number(p.bpm, 1, 1000)) fail('bpm debe ser un número entre 1 y 1000.');
    if (p.ppq === undefined) p.ppq = 480;
    if (!number(p.ppq, 24, 32767, true)) fail('ppq debe ser un entero de 24 a 32767.');
    if (!Array.isArray(p.meter) || p.meter.length !== 2 || !number(p.meter[0], 1, 64, true) || ![1, 2, 4, 8, 16, 32, 64].includes(p.meter[1])) fail('meter debe ser [numerador, denominador], p. ej. [4,4].');
    if (p.key !== undefined && (typeof p.key !== 'string')) fail('key debe ser texto.');
    if (p.length !== undefined && !number(p.length, 0, 1000000)) fail('length debe estar entre 0 y 1000000 pulsos.');
    function sequence(value, label, specs, max = 100000) {
      if (!Array.isArray(value) || value.length > max) { fail(label + ': se esperaba un array con máximo ' + max + ' elementos.'); return; }
      for (let i = 0; i < value.length; i++) {
        const row = value[i];
        if (!Array.isArray(row) || row.length !== specs.length || !specs.every((s, j) => number(row[j], ...s))) { fail(label + '[' + i + ']: valores fuera de rango o estructura incorrecta.'); if (errors.length >= 15) break; }
      }
    }
    function raw(events, label) {
      if (!Array.isArray(events) || events.length > 100000) { fail(label + ' debe ser un array de eventos.'); return; }
      for (const e of events) {
        if (!Array.isArray(e) || e.length < 2 || e.length > 65538 || !number(e[0], 0, 1000000) || !e.slice(1).every(b => number(b, 0, 255, true))) { fail(label + ': evento raw no válido.'); continue; }
        const status = e[1], kind = status >> 4;
        if (status === 255) {
          if (e.length < 3 || e[2] > 127 || [0x2f,0x51,0x58].includes(e[2])) fail(label + ': usa tempos/meters en lugar de meta tempo/compás; no incluyas fin de pista.');
        } else if (status === 240 || status === 247) { /* SysEx payload, writer adds length. */ }
        else if ([10, 12, 13].includes(kind)) {
          if (e.length !== (kind === 10 ? 4 : 3) || e.slice(2).some(b => b > 127)) fail(label + ': presión/programa MIDI no válido.');
        } else fail(label + ': usa notes, cc y bend para mensajes de notas, control y pitch bend.');
      }
    }
    if (p.tempos === undefined) p.tempos = [[0, p.bpm]];
    sequence(p.tempos, 'tempos', [[0, 1000000], [1, 1000]]);
    if (Array.isArray(p.tempos) && p.tempos.length && !errors.length) {
      p.tempos.sort((a,b) => a[0]-b[0]);
      if (p.tempos[0][0] !== 0) p.tempos.unshift([0,p.bpm]);
      p.bpm = p.tempos[0][1];
    } else if (Array.isArray(p.tempos) && !p.tempos.length) p.tempos = [[0,p.bpm]];
    if (p.meters === undefined) p.meters = [[0, ...(Array.isArray(p.meter) ? p.meter : [4,4])]];
    sequence(p.meters, 'meters', [[0,1000000], [1,64,true], [1,64,true]]);
    if (Array.isArray(p.meters)) {
      if (p.meters.some(m => Array.isArray(m) && ![1,2,4,8,16,32,64].includes(m[2]))) fail('meters: los denominadores deben ser potencias de 2.');
      if (!errors.length) { p.meters.sort((a,b) => a[0]-b[0]); if (!p.meters.length || p.meters[0][0] !== 0) p.meters.unshift([0,...p.meter]); p.meter = p.meters[0].slice(1); }
    }
    p.events ??= []; raw(p.events, 'events');
    if (!Array.isArray(p.tracks) || !p.tracks.length || p.tracks.length > 64) fail('tracks debe contener de 1 a 64 pistas.');
    let totalNotes = 0;
    if (Array.isArray(p.tracks)) p.tracks.slice(0,64).forEach((t,i) => {
      const label = 'tracks[' + i + ']';
      if (!object(t)) { fail(label + ' debe ser un objeto.'); return; }
      t.id ??= 'track-' + (i+1);
      if (typeof t.id !== 'string' || t.id.length > 100 || !t.id) fail(label + '.id no válido.');
      if (typeof t.name !== 'string' || !t.name) fail(label + '.name debe ser texto no vacío.');
      if (!number(t.channel,0,15,true)) fail(label + '.channel debe ser un entero 0–15 (9 = batería).');
      if (!number(t.program,0,127,true)) fail(label + '.program debe ser un entero 0–127.');
      sequence(t.notes, label + '.notes [pulso,altura,duración,velocidad]', [[0,1000000], [0,127,true], [0.000001,1000000], [1,127,true]], 50000);
      totalNotes += Array.isArray(t.notes) ? t.notes.length : 0;
      t.cc ??= []; sequence(t.cc, label + '.cc', [[0,1000000],[0,127,true],[0,127,true]]);
      t.bend ??= []; sequence(t.bend, label + '.bend', [[0,1000000],[-8192,8191,true]]);
      t.events ??= []; raw(t.events, label + '.events');
      t.volume ??= .75;
      if (!number(t.volume,0,1)) fail(label + '.volume debe estar entre 0 y 1.');
      for (const flag of ['muted','solo']) { t[flag] ??= false; if (typeof t[flag] !== 'boolean') fail(label + '.' + flag + ' debe ser booleano.'); }
      t.color ??= colors[i % colors.length];
      if (typeof t.color !== 'string' || !/^#[a-f0-9]{6}$/i.test(t.color)) fail(label + '.color debe ser hexadecimal #RRGGBB.');
      if (Array.isArray(t.notes) && !errors.length) t.notes.sort((a,b) => a[0]-b[0] || a[1]-b[1]);
    });
    if (totalNotes > 100000) fail('El proyecto supera el límite de 100 000 notas.');
    if (Array.isArray(p.tracks) && new Set(p.tracks.filter(object).map(t => t.id)).size !== p.tracks.length) fail('Cada pista necesita un id único.');
    if (errors.length) throw new Error(errors.join('\n'));
    return p;
  }
  function makeTrack(name, program, channel, color, notes = []) {
    return {id:'t-' + (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)),name,channel,program,color,volume:.75,muted:false,solo:false,notes,cc:[],bend:[],events:[]};
  }
  function demo(kind = 'fantasy') {
    const p = {version:'nea/0.1',name:'Ecos de otro mundo',bpm:112,ppq:480,key:'D minor',meter:[4,4],length:32,tempos:[[0,112]],meters:[[0,4,4]],events:[],tracks:[]};
    const melody = [74,77,81,77,76,74,72,69,70,74,77,74,72,69,67,69,74,77,81,84,82,81,77,76,74,72,69,72,76,74,73,74];
    const keys = makeTrack('Celestial Keys',10,0,colors[0]);
    melody.forEach((pitch,i) => keys.notes.push([i,pitch,i%4===3?.85:.65, i%4===0?88:70+(i%3)*5]));
    const pad = makeTrack('Velvet Atmosphere',89,1,colors[1]); pad.volume=.38;
    const chords = [[50,57,62,65],[48,55,60,64],[46,53,58,62],[45,52,57,61]];
    for(let bar=0;bar<8;bar++) chords[bar%4].forEach(pitch => pad.notes.push([bar*4,pitch,3.9,55]));
    pad.cc = [[0,11,55],[8,11,80],[16,11,100],[24,11,70],[31,11,40]];
    const bass = makeTrack('Moonlight Bass',33,2,colors[2]); bass.volume=.6;
    for(let bar=0;bar<8;bar++) { const root=chords[bar%4][0]-12; bass.notes.push([bar*4,root,1.7,83],[bar*4+2,root,1.2,69],[bar*4+3.5,root+7,.4,55]); }
    const drums = makeTrack('Dust & Rhythm',0,9,colors[3]); drums.volume=.38;
    for(let beat=0;beat<32;beat++) { drums.notes.push([beat,beat%2===0?36:38,.15,beat%4===0?77:56]); drums.notes.push([beat,42,.12,38],[beat+.5,42,.1,25]); }
    p.tracks=[keys,pad,bass,drums];
    if(kind==='electronic') { p.name='Después de medianoche'; p.bpm=124; p.tempos=[[0,124]]; keys.program=80; keys.name='Neon Sequence'; keys.notes=keys.notes.flatMap(n=>[[n[0],n[1],.2,75],[n[0]+.5,n[1]-12,.2,60]]); pad.program=90; pad.name='City Lights'; bass.program=38; bass.name='Sub Motion'; drums.name='Night Drive'; }
    if(kind==='ambient') { p.name='La memoria del agua'; p.bpm=72; p.tempos=[[0,72]]; keys.program=8; keys.name='Water Bells'; keys.notes=keys.notes.filter((n,i)=>i%2===0).map(n=>[n[0],n[1],1.7,60]); pad.name='Slow Horizon'; pad.program=91; bass.volume=.3; drums.muted=true; }
    return validate(p);
  }
  // Beat/second conversion preserves a variable tempo map in the preview transport.
  function beatToSeconds(p, beat) {
    let seconds=0, previous=0, bpm=p.bpm;
    for(const [at,nextBpm] of p.tempos) { if(at>beat) break; seconds+=(at-previous)*60/bpm; previous=at; bpm=nextBpm; }
    return seconds+(beat-previous)*60/bpm;
  }
  function secondsToBeat(p, seconds) {
    let previous=0, bpm=p.bpm, remaining=seconds;
    for(const [at,nextBpm] of p.tempos) { const part=(at-previous)*60/bpm; if(remaining<part) return previous+remaining*bpm/60; remaining-=part; previous=at; bpm=nextBpm; }
    return previous+remaining*bpm/60;
  }
  function importMidi(buffer, filename='MIDI importado') {
    const bytes=new Uint8Array(buffer), view=new DataView(buffer); let pos=0;
    const ensure=n=>{if(pos+n>bytes.length) throw new Error('El MIDI está truncado o no es válido.');};
    const u8=()=>{ensure(1);return bytes[pos++];};
    const u16=()=>{ensure(2);const n=view.getUint16(pos);pos+=2;return n;};
    const u32=()=>{ensure(4);const n=view.getUint32(pos);pos+=4;return n;};
    const str=n=>{ensure(n);let s='';for(let i=0;i<n;i++) s+=String.fromCharCode(u8());return s;};
    const vlq=()=>{let n=0;for(let i=0;i<4;i++){const b=u8();n=n*128+(b&127);if(!(b&128))return n;}throw new Error('Longitud variable MIDI no válida.');};
    if(str(4)!=='MThd') throw new Error('No es un archivo Standard MIDI (.mid).');
    const headerLength=u32(); if(headerLength<6)throw new Error('Cabecera MIDI no válida.');
    const format=u16(),trackCount=u16(),ppq=u16();
    if(format>1)throw new Error('NEA 0.1 admite MIDI tipo 0 y 1. Convierte el tipo 2 a tipo 1 desde tu DAW.');
    if(ppq&0x8000)throw new Error('El MIDI usa temporización SMPTE. Expórtalo con pulsos PPQ desde tu DAW.');
    if(ppq<24)throw new Error('Resolución MIDI demasiado baja: se necesitan al menos 24 PPQ.');
    if(trackCount>256)throw new Error('Este archivo tiene demasiadas pistas (máximo 256 pistas fuente).');
    ensure(headerLength-6);pos+=headerLength-6;
    const p={version:'nea/0.1',name:filename.replace(/\.(mid|midi)$/i,''),bpm:120,ppq,key:'C major',meter:[4,4],tempos:[],meters:[],events:[],tracks:[],length:0};
    const warnings=[];let count=0;
    const decode=data=>new TextDecoder().decode(data);
    for(let ti=0;ti<trackCount;ti++) {
      if(str(4)!=='MTrk')throw new Error('Bloque de pista MIDI no válido.');
      const length=u32();ensure(length);const end=pos+length;let tick=0,running=0,trackName='Pista '+(ti+1);const groups=new Map(),active=new Map();
      const group=channel=>{if(!groups.has(channel))groups.set(channel,makeTrack(trackName,0,channel,colors[p.tracks.length%colors.length]));return groups.get(channel);};
      while(pos<end) {
        if(++count>1000000)throw new Error('El MIDI supera el límite de eventos.');
        tick+=vlq();const beat=round(tick/ppq);p.length=Math.max(p.length,beat);
        let status=u8();if(status<128){if(!running)throw new Error('Running status MIDI no válido.');pos--;status=running;}else if(status<240)running=status;
        if(status===255) {
          running=0; const type=u8(),len=vlq();ensure(len);const data=Array.from(bytes.slice(pos,pos+len));pos+=len;
          if(type===0x2f){pos=end;break;}
          if(type===0x51 && len===3){const micros=data[0]*65536+data[1]*256+data[2];if(!micros)throw new Error('Tempo MIDI igual a cero.');p.tempos.push([beat,60000000/micros]);}
          else if(type===0x58 && len>=2){p.meters.push([beat,data[0],2**data[1]]);}
          else if(type===3){trackName=decode(new Uint8Array(data))||trackName;groups.forEach(g=>g.name=trackName);}
          else p.events.push([beat,255,type,...data]);
        } else if(status===240 || status===247) {running=0;const len=vlq();ensure(len);p.events.push([beat,status,...bytes.slice(pos,pos+len)]);pos+=len;}
        else if(status>=128 && status<240) {
          const channel=status&15,kind=status>>4,a=u8(),b=[12,13].includes(kind)?null:u8();
          if(a>127 || (b!==null && b>127))throw new Error('Datos de canal MIDI fuera de rango.');
          const g=group(channel),key=channel+':'+a;
          if(kind===9 && b>0) {if(!active.has(key))active.set(key,[]);active.get(key).push({beat,pitch:a,velocity:b,track:g});}
          else if(kind===8 || (kind===9 && b===0)) {const note=active.get(key)?.shift();if(note)note.track.notes.push([note.beat,note.pitch,round(Math.max(1/ppq,beat-note.beat)),note.velocity]);}
          else if(kind===11)g.cc.push([beat,a,b]);
          else if(kind===14)g.bend.push([beat,(a|(b<<7))-8192]);
          else if(kind===12 && beat===0)g.program=a;
          else if(kind===12 || kind===13)g.events.push([beat,status,a]);
          else if(kind===10)g.events.push([beat,status,a,b]);
        } else throw new Error('Evento de sistema no compatible con Standard MIDI.');
        if(pos>end)throw new Error('Evento MIDI fuera de los límites de la pista.');
      }
      active.forEach(list=>list.forEach(n=>{n.track.notes.push([n.beat,n.pitch,round(Math.max(1/ppq,tick/ppq-n.beat)),n.velocity]);warnings.push('Se cerró una nota sin note-off al final de la pista.');}));
      groups.forEach((g,ch)=>{g.color=colors[p.tracks.length%colors.length];if(groups.size>1)g.name+=' · CH '+(ch+1);p.tracks.push(g);});
      pos=end;
    }
    if(!p.tracks.length)p.tracks.push(makeTrack('Pista 1',0,0,colors[0]));
    p.tempos.sort((a,b)=>a[0]-b[0]);p.meters.sort((a,b)=>a[0]-b[0]);
    if(!p.tempos.length || p.tempos[0][0]!==0)p.tempos.unshift([0,120]);
    if(!p.meters.length || p.meters[0][0]!==0)p.meters.unshift([0,4,4]);
    p.bpm=p.tempos[0][1];p.meter=p.meters[0].slice(1);
    const seen=new Set();for(const t of p.tracks){if(seen.has(t.channel))warnings.push('Varias pistas comparten canal: los instrumentos y CC de ese canal se comparten en MIDI.');seen.add(t.channel);}
    return {project:validate(p),warnings:[...new Set(warnings)]};
  }
  function exportMidi(source) {
    const p=validate(source),ppq=p.ppq,encoder=new TextEncoder();
    const vlq=n=>{if(n<0 || n>0xfffffff)throw new Error('Intervalo demasiado largo para MIDI; reduce la longitud del proyecto.');const a=[n&127];while((n=Math.floor(n/128)))a.unshift((n&127)|128);return a;};
    const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
    const u16=n=>[(n>>8)&255,n&255];
    const ascii=s=>Array.from(s).map(c=>c.charCodeAt(0));
    const text=(type,s)=>{const b=Array.from(encoder.encode(s));return [255,type,...vlq(b.length),...b];};
    const raw=e=>{const b=e.slice(1);if(b[0]===255)return [255,b[1],...vlq(b.length-2),...b.slice(2)];if(b[0]===240||b[0]===247)return [b[0],...vlq(b.length-1),...b.slice(1)];return b;};
    const block=events=>{events.sort((a,b)=>a.tick-b.tick || a.order-b.order);let tick=0;const data=[];for(const e of events){data.push(...vlq(e.tick-tick));for(const b of e.bytes)data.push(b);tick=e.tick;}const end=Math.max(tick,Math.round(duration(p)*ppq));data.push(...vlq(end-tick),255,47,0);return new Uint8Array([...ascii('MTrk'),...u32(data.length),...data]);};
    const event=(beat,bytes,order=1)=>({tick:Math.round(beat*ppq),bytes,order});
    const conductor=[event(0,text(3,p.name),0)];
    for(const [beat,bpm] of p.tempos){const us=Math.round(60000000/bpm);if(us<1||us>16777215)throw new Error('Tempo fuera del rango representable en MIDI (mínimo aproximado: 3.5763 BPM).');conductor.push(event(beat,[255,81,3,(us>>16)&255,(us>>8)&255,us&255]));}
    for(const [beat,n,d] of p.meters)conductor.push(event(beat,[255,88,4,n,Math.log2(d),24,8]));
    for(const e of p.events)conductor.push(event(e[0],raw(e)));
    const chunks=[block(conductor)];
    for(const t of p.tracks) {
      const ch=t.channel,events=[event(0,text(3,t.name),-2),event(0,[192|ch,t.program],-1)];
      for(const [beat,pitch,length,vel] of t.notes){const on=event(beat,[144|ch,pitch,vel],2);const off=event(beat+length,[128|ch,pitch,0],0);off.tick=Math.max(off.tick,on.tick+1);events.push(on,off);}
      for(const [beat,controller,value] of t.cc)events.push(event(beat,[176|ch,controller,value]));
      for(const [beat,value] of t.bend){const b=value+8192;events.push(event(beat,[224|ch,b&127,(b>>7)&127]));}
      for(const e of t.events){const data=raw(e);if(data[0]>=128&&data[0]<240)data[0]=(data[0]&240)|ch;events.push(event(e[0],data));}
      chunks.push(block(events));
    }
    const header=new Uint8Array([...ascii('MThd'),0,0,0,6,0,1,...u16(chunks.length),...u16(ppq)]);
    const output=new Uint8Array(header.length+chunks.reduce((n,c)=>n+c.length,0));output.set(header);let offset=header.length;chunks.forEach(c=>{output.set(c,offset);offset+=c.length;});return output;
  }
  const spec = `NEA 0.1 es JSON estricto, no un lenguaje ejecutable. Devuelve SOLO un objeto JSON completo, sin prosa ni bloques Markdown.
Campos raíz obligatorios: version:"nea/0.1", name:string, bpm:number, meter:[numerador,denominador], tracks:array. Opcionales: ppq:480, key:string, length:duración en pulsos de negra, tempos:[[pulso,bpm]], meters:[[pulso,numerador,denominador]], events:array.
Cada pista: {id:string único, name:string, channel:entero 0..15 (9 batería), program:General MIDI 0..127, color:"#RRGGBB", volume:0..1, muted:false, solo:false, notes:[[pulso,alturaMIDI,duración,velocidad]], cc:[[pulso,controlador,valor]], bend:[[pulso,valor]], events:[]}.
Cada nota tiene exactamente 4 números: inicio >=0 en pulsos de negra, altura entera 0..127, duración >0 en pulsos, velocidad entera 1..127. Ejemplo [0,60,0.5,90]. El tiempo siempre empieza en 0. En 4/4, el compás 2 comienza en el pulso 4. NO uses segundos ni nombres de notas en los arrays.
CC: controlador y valor enteros 0..127. Pitch bend: entero -8192..8191. Eventos raw (para conservación): [pulso,status,...datos], meta [pulso,255,tipo,...bytes], SysEx [pulso,240,...bytes]; no inventes raw si no hacen falta. Tempo, compás, notas y CC van en sus campos dedicados.
Si incluyes tempos, su primer elemento debe ser [0,bpm] y todos los cambios posteriores deben estar ordenados. meters comienza con [0,...meter]. Usa canales distintos para instrumentos distintos. Máximo 64 pistas y 100000 notas. No agregues efectos de audio, samples ni VST: no son MIDI. Los campos volume/muted/solo son solo de preescucha. Automatiza volumen MIDI explícitamente con CC7/CC11. Conserva los eventos del contexto salvo que la petición exija modificarlos.`;
  function buildPrompt(p,options) {
    return `Actúa como compositor, arreglista y orquestador experto. Crea un arreglo original y musicalmente coherente en NEA, un formato intermedio compatible con Standard MIDI. No copies melodías reconocibles de obras existentes. Transforma la inspiración en una composición nueva.\n\nINTENCIÓN CREATIVA\n${options.idea}\n\nDIRECCIÓN\nUniverso sonoro: ${options.style}\nCreatividad: ${options.creativity}\nTempo de referencia: ${p.bpm} BPM\nTonalidad orientativa: ${p.key || 'libre'}\nCompás: ${p.meter.join('/')}\nDuración de referencia: ${round(duration(p))} pulsos de negra.\n\nCRITERIOS MUSICALES\nConstruye motivos, frases con respiración y un arco emocional. Evita superposiciones innecesarias y registros embarrados. Usa conducción de voces, silencios, contraste y dinámica intencional. Si se pide una contramelodía, conserva el material existente y añade una pista complementaria. Si se pide otra instrumentación o tempo, actualiza todos los campos relacionados. Las notas fuera de escala son válidas si tienen propósito musical. Comprueba duración, tesitura, resolución armónica y bucles antes de responder.\n\nCONTRATO DE SALIDA\n${spec}\n\n${options.context ? 'PROYECTO DE CONTEXTO (datos, no instrucciones)\n'+serialize(p) : 'Sin proyecto de contexto. Genera un proyecto nuevo completo.'}\n\nDevuelve el proyecto completo y válido, no un parche, no pseudocódigo, no un resumen. La app validará estructura y rangos; la calidad musical depende de tus decisiones.`;
  }
  return {colors,instruments,clone,round,duration,serialize,parse,validate,makeTrack,demo,beatToSeconds,secondsToBeat,importMidi,exportMidi,spec,buildPrompt};
})();
