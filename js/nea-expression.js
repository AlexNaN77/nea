/* Expression uses standard MIDI points, not a new score format. */
'use strict';
window.NEAExpression = (() => {
  const contract = `EXPRESIÓN MIDI REAL — VOLUMEN Y SLIDES
Cuando se soliciten estos recursos, escríbelos como eventos cc y bend dentro de las pistas del NEA final, no solo como comentarios o promesas. Selecciona momentos con función musical: entrada, respiración, llegada o transición; evita el efecto permanente y conserva la claridad del tema.
Volumen: cc pulso/7/valor fija el nivel (0..127); cc pulso/11/valor modela la expresión (0..127). Inicializa ambos en el pulso 0 de las pistas automatizadas. Velocity solo cambia el ataque: no reemplaza un crescendo durante una nota. Dibuja cada rampa con puntos intermedios, normalmente cada 1/32–1/16 de pulso, y un valor final explícito. Usa más espacio entre puntos para curvas largas; evita miles de eventos innecesarios. Los valores se mantienen hasta el siguiente punto, no se interpolan mágicamente. Recupera un nivel útil tras un fade si la pista vuelve a entrar.
Slides: bend pulso/valor usa enteros -8192..8191, centro 0. Usa un canal melódico independiente (no ch=9) para cada voz que necesite afinación independiente; pitch bend afecta a TODAS las notas del mismo canal, no a una nota aislada. Un slide requiere una nota sostenida mientras cambia bend, no una escala de notas cortas ni shift. Usa por defecto rango ±2 semitonos, configura RPN 0 en pulso 0 con cc 0/101/0 0/100/0 0/6/2 0/38/0 0/101/127 0/100/127 y centra bend al inicio. Si hacen falta recorridos mayores, cambia CC6 y calcula cada valor en ese rango. Valor aproximado = semitonos/rango * 8192, limitado a -8192..8191. Para llegar a la nota escrita desde un semitono por debajo con rango 2: comienza en -4096 y termina en 0. Incluye puntos intermedios cada 1/32–1/16 de pulso y restablece bend 0 antes del siguiente ataque que no lleve slide; no provoques un salto audible al resetear una nota sostenida. No fuerces slides sobre piano, acordes o percusión sin una petición concreta.
phrase/use solo repiten NOTAS: repite también los cc/bend en tiempos absolutos donde vuelvan los gestos. Para un loop, iguala estados de final e inicio. Evita valores contradictorios del mismo controlador en el mismo pulso. En una revisión conserva las automatizaciones existentes salvo en los pasajes que se pida cambiar. No inventes comandos slide, ramp, automation o portamento; usa cc y bend válidos. Revisa en cada versión que haya eventos reales, notas sonando durante los gestos, retornos al centro y canales sin conflictos. El sonido final depende del instrumento/DAW; no prometas slides nativos de FL Studio, MPE ni automatización de plugins.`;

  // Resolve control state per MIDI channel, including RPN 0 pitch-bend sensitivity.
  // Built once per transport start; sorted arrays are shared by all voices.
  function compile(project) {
    const channels=new Map();
    for(const t of project.tracks){
      if(!channels.has(t.channel))channels.set(t.channel,[]);
      const events=channels.get(t.channel);
      for(const [beat,cc,value] of t.cc)if([7,11,101,100,99,98,6,38].includes(cc))events.push({beat,cc,value});
      for(const [beat,value] of t.bend)events.push({beat,cc:'bend',value});
    }
    const result=new Map();
    for(const [channel,events] of channels){
      events.sort((a,b)=>a.beat-b.beat || (a.cc==='bend')-(b.cc==='bend'));
      let volume=127,expression=127,bend=0,msb=127,lsb=127,semitones=2,cents=0;
      const gain=[],detune=[];
      for(const e of events){
        if(e.cc===7)volume=e.value;
        if(e.cc===11)expression=e.value;
        if(e.cc===101)msb=e.value;
        if(e.cc===100)lsb=e.value;
        if(e.cc===99||e.cc===98){msb=127;lsb=127;}
        if(e.cc===6&&msb===0&&lsb===0)semitones=e.value;
        if(e.cc===38&&msb===0&&lsb===0)cents=Math.min(99,e.value);
        if(e.cc==='bend')bend=e.value;
        if(e.cc===7||e.cc===11)gain.push([e.beat,volume/127*expression/127]);
        if(e.cc==='bend'||((e.cc===6||e.cc===38)&&msb===0&&lsb===0))detune.push([e.beat,bend/8192*(semitones*100+cents)]);
      }
      result.set(channel,{gain,detune});
    }
    return result;
  }
  function upperBound(points,beat){let lo=0,hi=points.length;while(lo<hi){const mid=(lo+hi)>>>1;if(points[mid][0]<=beat)lo=mid+1;else hi=mid;}return lo;}
  function valueAt(points,beat,fallback){const i=upperBound(points,beat);return i?points[i-1][1]:fallback;}
  function schedule(param,points,project,beat,start,end,fallback){
    param.setValueAtTime(valueAt(points,beat,fallback),start);
    const base=NEA.beatToSeconds(project,beat);
    for(let i=upperBound(points,beat);i<points.length;i++){
      const when=start+NEA.beatToSeconds(project,points[i][0])-base;
      if(when>end)break;
      param.setValueAtTime(points[i][1],when);
    }
  }
  return {contract,compile,valueAt,schedule};
})();
