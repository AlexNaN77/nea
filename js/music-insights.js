/* Explainable symbolic estimates. No key label is treated as ground truth. */
'use strict';
window.MusicInsights = (() => {
  const names = ['Do','Do♯ / Re♭','Re','Re♯ / Mi♭','Mi','Fa','Fa♯ / Sol♭','Sol','Sol♯ / La♭','La','La♯ / Si♭','Si'];
  const round = n => Math.round(n * 1000) / 1000;
  const modes = [
    ['mayor', [0,2,4,5,7,9,11], [6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88]],
    ['menor natural', [0,2,3,5,7,8,10], [6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17]],
    ['menor armónica', [0,2,3,5,7,8,11]], ['menor melódica ascendente', [0,2,3,5,7,9,11]],
    ['dórica', [0,2,3,5,7,9,10]], ['frigia', [0,1,3,5,7,8,10]],
    ['lidia', [0,2,4,6,7,9,11]], ['mixolidia', [0,2,4,5,7,9,10]], ['locria', [0,1,3,5,6,8,10]],
    ['pentatónica mayor', [0,2,4,7,9]], ['pentatónica menor', [0,3,5,7,10]],
    ['blues menor', [0,3,5,6,7,10]], ['tonos enteros', [0,2,4,6,8,10]]
  ];
  const correlation = (a,b) => {
    const ma=a.reduce((s,x)=>s+x,0)/12, mb=b.reduce((s,x)=>s+x,0)/12;
    let xy=0, xx=0, yy=0;
    for(let i=0;i<12;i++){xy+=(a[i]-ma)*(b[i]-mb);xx+=(a[i]-ma)**2;yy+=(b[i]-mb)**2;}
    return xx&&yy ? xy/Math.sqrt(xx*yy) : 0;
  };
  function estimate(tracks, start=0, end=Infinity) {
    const histogram=Array(12).fill(0), endings=Array(12).fill(0), bass=Array(12).fill(0);
    let count=0;
    for(const t of tracks){
      if(t.channel===9)continue;
      let last=null;
      for(const n of t.notes){
        const overlap=Math.min(end,n[0]+n[2])-Math.max(start,n[0]);
        if(overlap<=0)continue;
        const weight=Math.min(overlap,8)*(.5+n[3]/254);
        histogram[n[1]%12]+=weight; if(n[1]<55)bass[n[1]%12]+=weight;
        if(!last||n[0]+n[2]>last[0]+last[2])last=n;count++;
      }
      if(last)endings[last[1]%12]++;
    }
    const total=histogram.reduce((s,x)=>s+x,0), distinct=histogram.filter(x=>x>0).length;
    const noData={status:'insufficient',label:'Sin suficientes notas con altura',confidence:'insuficiente',candidates:[],notesInspected:count,histogram:histogram.map(round),notAProbability:true};
    if(count<4||distinct<3)return noData;
    const endingTotal=endings.reduce((s,x)=>s+x,0)||1, bassTotal=bass.reduce((s,x)=>s+x,0)||1;
    const candidates=[];
    for(let root=0;root<12;root++)for(const [mode,intervals,profile] of modes){
      const pcs=intervals.map(x=>(x+root)%12), coverage=pcs.reduce((s,pc)=>s+histogram[pc],0)/total;
      const observed=pcs.filter(pc=>histogram[pc]>total*.005).length/pcs.length;
      const template=Array.from({length:12},(_,pc)=>{
        const r=(pc-root+12)%12;
        return profile?profile[r] : r===0?6.3:r===7?4.6:intervals.includes(r)?3.6:1.8;
      });
      const corr=correlation(histogram,template);
      const tonic=histogram[root]/total, cadence=endings[root]/endingTotal, low=bass[root]/bassTotal;
      // Coverage carries most weight; root evidence resolves some relative/modal ambiguity.
      const score=.55*coverage+.23*corr+.09*cadence+.07*tonic+.04*low+.02*observed;
      candidates.push({root,mode,label:names[root]+' '+mode,notes:pcs.map(pc=>names[pc]),pitchClasses:pcs,coverage:round(coverage),profileFit:round(corr),score:round(score),outsideNotes:histogram.map((w,pc)=>({pc,name:names[pc],weight:round(w)})).filter(x=>x.weight>0&&!pcs.includes(x.pc))});
    }
    candidates.sort((a,b)=>b.score-a.score);
    const best=candidates[0], gap=best.score-candidates[1].score;
    const confidence=count>=24&&distinct>=5&&best.coverage>.96&&best.profileFit>.65&&gap>.055?'alta':count>=12&&best.coverage>.88&&gap>.018?'media':'baja';
    const ambiguous=confidence==='baja'||best.coverage<.82;
    return {status:ambiguous?'ambiguous':'estimated',label:best.label,confidence,candidates:candidates.slice(0,5),notesInspected:count,histogram:histogram.map(round),scoreGap:round(gap),notAProbability:true,reason:best.coverage<.82?'Muchas notas quedan fuera: posible cromatismo, mezcla modal o cambios de centro.':confidence==='baja'?'Varias escalas explican las mismas notas. La tónica y los finales no las distinguen con claridad.':'Las notas, su duración, el registro grave y los finales apoyan este candidato. No es una certeza.'};
  }
  function tonality(p){
    const global=estimate(p.tracks), length=NEA.duration(p), bar=p.meter[0]*4/p.meter[1];
    const windowBeats=Math.max(bar*8,length/24), windows=[];
    for(let start=0;start<length;start+=windowBeats){
      const end=Math.min(length,start+windowBeats), r=estimate(p.tracks,start,end);
      windows.push({start:round(start),end:round(end),label:r.candidates[0]?.label||'Sin datos',root:r.candidates[0]?.root??null,confidence:r.confidence,coverage:r.candidates[0]?.coverage??0});
    }
    const changes=windows.filter((w,i)=>i&&w.root!==null&&windows[i-1].root!==null&&w.root!==windows[i-1].root&&w.confidence!=='baja'&&w.confidence!=='insuficiente').map(w=>({...w,interpretation:'Posible cambio de centro; no confirma una modulación.'}));
    return {...global,declaredKey:p.key||null,windows,changes,tracks:p.tracks.map((t,i)=>({trackId:t.id,trackIndex:i,name:t.name,channel:t.channel,...(t.channel===9?{status:'percussion',label:'Percusión: no se estima escala',candidates:[]}:estimate([t]))})),method:'13 familias × 12 raíces; duración/velocidad, perfiles tonales, finales y registro grave. Canal 10 excluido. No usa la etiqueta key para decidir.',limitations:['Una colección de notas puede pertenecer a varios modos y tonalidades relativas.','No se interpretan sustain, pitch bend, afinación microtonal ni acordes funcionales.','Ventanas de al menos 8 compases iniciales; los cambios son candidatos, no una segmentación armónica.','Menor melódica ascendente no modela por separado su descenso. El catálogo de escalas no es exhaustivo.']};
  }
  // Greedy voice continuity; keeps inner chord notes, unlike a highest-note skyline alone.
  function voices(t, ppq){
    const sorted=[...t.notes].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    if(t.channel===9){const byPitch=new Map();for(const n of sorted){if(!byPitch.has(n[1]))byPitch.set(n[1],[]);byPitch.get(n[1]).push(n);}return [...byPitch].map(([pitch,notes])=>({name:'Percusión '+pitch,notes}));}
    const streams=[];
    for(const n of sorted){
      let chosen=null, cost=Infinity;
      for(const v of streams){const last=v.notes.at(-1);if(last[0]+last[2]>n[0]+Math.max(.04,1/ppq))continue;
        const c=Math.abs(n[1]-last[1])+Math.min(12,Math.max(0,n[0]-last[0]-last[2]));if(c<cost){chosen=v;cost=c;}}
      if(!chosen&&streams.length<8){chosen={name:'Voz '+(streams.length+1),notes:[]};streams.push(chosen);}
      if(chosen)chosen.notes.push(n);
    }
    return streams;
  }
  function motifs(p){
    const exact=new Map(), contour=new Map(), coverage=[];
    const bar=p.meter[0]*4/p.meter[1], maxWindows=160000, perTrack=Math.floor(maxWindows/Math.max(1,p.tracks.length));
    for(let ti=0;ti<p.tracks.length;ti++){
      const t=p.tracks[ti], streams=voices(t,p.ppq), perVoice=Math.floor(perTrack/Math.max(1,streams.length));
      let processed=0, truncated=false;
      for(const v of streams){let checks=0;
        const stride=Math.max(1,Math.ceil(Math.max(0,v.notes.length-3)*4/Math.max(1,perVoice)));
        if(stride>1)truncated=true;
        for(let i=0;i<=v.notes.length-4;i+=stride){
          if(checks>=perVoice){truncated=true;break;}
          for(const size of [4,6,8,12]){
            if(checks>=perVoice){truncated=true;break;}
            if(i+size>v.notes.length)continue;checks++;processed++;
            const notes=v.notes.slice(i,i+size), gaps=notes.slice(1).map((n,j)=>n[0]-notes[j][0]);
            if(gaps.some(g=>g<=0||g>bar*2)||notes.at(-1)[0]-notes[0][0]>bar*8)continue;
            const unit=gaps[0], rhythm=gaps.map(g=>Math.round(g/unit*24)/24), durations=notes.map(n=>Math.round(n[2]/unit*12)/12);
            const ints=notes.slice(1).map((n,j)=>n[1]-notes[j][1]), drum=t.channel===9;
            const base=(drum?'drum:'+notes[0][1]:'pitched')+'|'+size+'|'+rhythm.join(',')+'|'+durations.join(',');
            const occurrence={index:i,trackIndex:ti,trackId:t.id,trackName:t.name,channel:t.channel,voice:v.name,at:notes[0][0],end:notes.at(-1)[0]+notes.at(-1)[2],pitch:notes[0][1],unit};
            const add=(map,key,approximate)=>{
              let g=map.get(key);
              if(!g){g={length:size,intervals:ints,rhythms:gaps,notes:notes.map(n=>[NEA.round(n[0]-notes[0][0]),...n.slice(1)]),occurrences:[],approximate,drum,unit};map.set(key,g);}
              const last=g.occurrences.at(-1);
              if(!last||last.trackId!==t.id||last.voice!==v.name||i>=last.index+size)g.occurrences.push({...occurrence,shift:approximate||drum?null:notes[0][1]-g.notes[0][1],timeScale:round(unit/g.unit)});
            };
            add(exact,base+'|'+ints.join(','),false);
            // Deliberately weaker evidence: matching contour can be coincidental.
            if(!drum&&new Set(notes.map(n=>n[1])).size>=3)add(contour,base+'|'+ints.map(Math.sign).join(','),true);
          }
        }
      }
      const assigned=streams.reduce((s,v)=>s+v.notes.length,0);
      coverage.push({trackId:t.id,trackIndex:ti,channel:t.channel,notes:t.notes.length,assignedNotes:assigned,voices:streams.length,windowsInspected:processed,truncated:truncated||assigned<t.notes.length});
    }
    const candidates=[...exact.values(),...contour.values()].filter(g=>g.occurrences.length>=2);
    const rank=g=>g.length*Math.log2(1+g.occurrences.length)*(g.approximate?.35:1)*(new Set(g.occurrences.map(o=>o.trackId)).size>1?1.4:1);
    candidates.sort((a,b)=>rank(b)-rank(a));
    const results=[], indexes=[];
    const voiceKey=o=>JSON.stringify([o.trackId,o.voice]);
    const covers=(index,o)=>{const ranges=index.get(voiceKey(o));if(!ranges)return false;let lo=0,hi=ranges.length;while(lo<hi){const mid=(lo+hi)>>1;if(ranges[mid][0]<=o.at)lo=mid+1;else hi=mid;}return lo>0&&ranges[lo-1][1]>=o.end-.05;};
    for(const g of candidates){
      // Binary-search containment, per voice: avoid quadratic scans and suppressing inner melodies.
      if(indexes.some(index=>g.occurrences.every(o=>covers(index,o))))continue;
      const index=new Map();for(const o of g.occurrences){const key=voiceKey(o);if(!index.has(key))index.set(key,[]);index.get(key).push([o.at,o.end]);}
      for(const ranges of index.values()){ranges.sort((a,b)=>a[0]-b[0]);let end=-Infinity;for(const range of ranges){end=Math.max(end,range[1]);range[1]=end;}}
      indexes.push(index);
      const cross=new Set(g.occurrences.map(o=>o.trackId)).size>1;
      results.push({...g,id:'M'+(results.length+1),kind:g.drum?'Patrón rítmico de percusión':g.approximate?'Contorno parecido · revisar':g.occurrences.some(o=>Math.abs(o.timeScale-1)>.04)?'Motivo con cambio de velocidad':g.occurrences.some(o=>o.shift)?'Repetido / transpuesto':'Repetido',crossTrack:cross});
      if(results.length>=24)break;
    }
    return {motifs:results,coverage,limited:coverage.some(c=>c.truncated),inspected:coverage.reduce((s,c)=>s+c.windowsInspected,0),method:'Continuidad de hasta 8 voces por pista; percusión separada por altura. Ventanas 4/6/8/12. Intervalos, proporción de ritmo y duración; contorno como evidencia débil. Hasta 160 000 ventanas repartidas entre todas las pistas; en pistas grandes se muestrea a lo largo de la voz, no solo al inicio.'};
  }
  return {tonality,estimate,motifs,voices};
})();
