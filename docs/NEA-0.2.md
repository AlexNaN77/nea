# NEA 0.2 — partitura compacta y flujo creativo

NEA (Notation for Expressive Arrangements) es una notación declarativa. NEA Studio (New Era Audio) convierte entre MIDI y esa partitura y prepara encargos para una IA externa. No se conecta a ninguna API de IA.

## Ejemplo

```text
nea 0.2
title "Mi tema"
bpm 112
meter 4/4
ppq 480
length 32
track "lead" "Melodía" ch=0 gm=10
phrase A = 0:D5/0.5/85 0.5:F5/0.5/75 1:E5/1
use A at=0,4
use A at=8 shift=2
use A at=16 repeat=4 every=4
notes 12:A5/1/90
cc 0/11/90 16/11/110
bend 8/0
end
```

- Una instrucción por línea. Comentarios en líneas que empiezan por `//`.
- Tiempos en pulsos de negra, no segundos. Nota: `inicio:altura/duración/velocidad`; velocidad opcional, por defecto 80.
- Altura: `C4=60`, sostenido `#`, bemol `b` o número MIDI. Altura 0–127, duración positiva, velocidad entera 1–127.
- `phrase` define notas relativas locales a una pista; `use` las instancia. `at` admite listas; `shift` transpone semitonos; `repeat` y `every` repiten en el tiempo, no estiran notas.
- Transformaciones rítmicas, inversiones y adornos requieren notas/frases nuevas explícitas. No existen comandos `trill`, `ornament`, `humanize` o `swing`.
- IDs de pista únicos. `ch=0..15`, canal 9 percusión. `gm=0..127`. Cada pista termina con `end`.
- 64 pistas no equivalen a 64 canales MIDI independientes. Compartir canal puede causar conflictos de programa/controladores en un reproductor MIDI externo.
- `mix 0.75 #ff963f 0 0`: volumen de preescucha, color, mute, solo.
- Raíz opcional: `key "D minor"`, `tempos 0/112 16/120`, `meters 0/4/4 16/3/4`. Los mapas desde cero prevalecen sobre la cabecera.
- `cc`: pulso/controlador/valor; `bend`: pulso/valor firmado -8192..8191.
- `raw [pulso,status,...bytes]` preserva eventos compatibles. `meta {"scene":"Bosque"}` conserva anotaciones, no sobrescribe campos reservados.
- Límite: 5 MB de entrada, 64 pistas, 100 000 notas expandidas, 50 000 por pista. No hay recursión ni ejecución de código.

## Compatibilidad y compresión

El texto se convierte al modelo normalizado JSON `nea/0.1`, documentado en [NEA-0.1.md](NEA-0.1.md). Se mantienen ambas entradas. La compresión compara diccionarios de 1, 2 y 4 compases iniciales con notas literales. Reutiliza repeticiones exactas y transposiciones; no transpone batería. Cuando no hay ahorro o la precisión no admite factorización, conserva las notas literales.

Los parecidos encontrados por el analizador no se usan para sustituir notas durante la compresión. La conservación se refiere al modelo compatible, no a cada byte del MIDI original. MIDI cuantiza a ticks PPQ y microsegundos por negra y normaliza algunos eventos. Se admiten formatos 0/1 PPQ; no formato 2, SMPTE, UMP, audio ni proyectos de DAW. La preescucha es síntesis básica, no instrumentos comerciales. Interpreta CC7, CC11 y pitch bend melódico con sensibilidad RPN 0 (±2 semitonos si no se configura). El resto de controladores y eventos se conserva para exportación sin interpretación sonora.

## Escalas y motivos

El motor compara 13 familias de escalas en 12 raíces: mayor, menores natural/armónica/melódica ascendente, modos dórico/frigio/lidio/mixolidio/locrio, pentatónicas mayor/menor, blues menor y tonos enteros. Usa duración y velocidad de las notas, perfiles, finales y registro grave; excluye percusión. Devuelve candidatos, confianza cualitativa y cobertura, no una escala infalible. Cobertura no es probabilidad de acierto. La etiqueta manual `key` no determina el resultado ni se cambia automáticamente. Hay estimaciones globales, por pista y en ventanas de al menos 8 compases iniciales (hasta unas 24). Un cambio de candidato no prueba modulación.

Los motivos se buscan en todas las pistas. Se separan hasta ocho voces aproximadas por pista; percusión por altura/instrumento. Compara ventanas de 4, 6, 8 y 12 ataques, intervalos y proporciones de ritmo/duración. Reconoce transposiciones, cambios de velocidad y coincidencias entre pistas. Un parecido de contorno es evidencia más débil, identificado como aproximado.

Presupuesto: hasta 160 000 ventanas repartidas entre pistas/voces, con muestreo a lo largo de las voces grandes; hasta 24 familias mostradas. La cobertura por pista informa truncamientos y notas no asignadas. La separación de voces puede fallar con legato, cruces o mucha polifonía. Un patrón no demuestra un leitmotiv: la asociación narrativa la aporta el usuario.

## JSON de análisis

El informe `nea-analysis/0.2` incluye `reference`, `method`, `tonality`, `motifCoverage`, `motifMethod`, perfiles de pistas, candidatos melódicos, motivos con apariciones (pista/canal/pulso/transposición/escala temporal), actividad, frases, cambios y límites. No duplica todas las voces ni sustituye la partitura. No escucha audio, reconoce emociones o puntúa calidad. No hay un flujo de importar análisis generado por una IA.

## Adornos y recursos

«Dale tu toque» contiene los 10 adornos y los 20 recursos solicitados, con definición breve y campo opcional de implementación por selección. Solo se incluye lo elegido; desmarcar conserva el texto local pero lo excluye del encargo. «Quitar selecciones» desmarca todas sin borrar el groove. Los campos se recuerdan como preferencias del navegador, no como propiedades musicales del proyecto.

Las indicaciones específicas (por ejemplo, «mordiente Fa–Mi–Fa al final del leitmotiv») se mantienen literalmente y tienen prioridad sobre el ejemplo genérico. El modelo debe realizarlo como notas y duraciones explícitas. La app no añade esos adornos al MIDI por sí misma ni comprueba automáticamente su cumplimiento artístico. Los ejemplos orientan: no fijan emociones, escala o instrumentos. Se ha corregido la inversión exacta de Fa–Sol–La: alrededor de Fa resulta Fa–Mi♭–Re♭; una inversión tonal puede usar otros intervalos.

## Movimiento y expresión: volumen y slides

«Dale tu toque → Movimiento y expresión» añade dos recursos independientes, activos por defecto al incorporarlos: **Automatización de volumen** y **Slides de tono**. Cada uno tiene un campo para concretar pista, intensidad, lugar y duración. Desmarcar excluye su petición y conserva el texto; las elecciones se guardan en la misma clave de preferencias existente. PRIME también admite los IDs `volume-automation` y `pitch-slides` para rellenarlos con revisión previa. No se modifican las notas por activar estas opciones: se incorporan al encargo de la IA externa, cuyo NEA final se valida y aplica manualmente.

El encargo pide CC7 para nivel, CC11 para expresión, curvas con puntos intermedios reales, inicialización y recuperación del nivel. Para slides solicita bend sobre notas sostenidas, rango explícito mediante RPN 0, canales melódicos independientes, retornos a cero y uso localizado con función musical. La velocidad de ataque no sustituye a la automatización. `shift` transpone notas: no es un slide. `phrase/use` no repite controladores; los gestos repetidos necesitan eventos en cada aparición.

- `cc pulso/7/valor` y `cc pulso/11/valor`: enteros 0–127. En preescucha se multiplican como ganancias lineales normalizadas, junto al volumen de pista y velocidad.
- `bend pulso/valor`: entero −8192…8191, centro 0. Rango inicial de preescucha ±2 semitonos. RPN 0 selecciona CC101=0 y CC100=0; CC6 fija semitonos y CC38 centésimas (0–99). CC101/100=127 cierran la selección. No se implementan incrementos/decrementos de RPN ni otros parámetros RPN/NRPN.
- Ejemplo de configuración dentro de una pista: `cc 0/101/0 0/100/0 0/6/2 0/38/0 0/101/127 0/100/127`.
- Un semitono por debajo de la nota con rango ±2 corresponde a bend −4096. Ascender hacia cero llega a la altura escrita. Para una curva suave, escribir puntos intermedios, normalmente cada 1/32–1/16 de pulso: **no existe interpolación implícita**. El gráfico y la preescucha mantienen cada valor hasta el siguiente evento.
- Los controles se resuelven por canal, incluidas otras pistas que lo compartan. Mutear una pista no aísla sus controladores de otras voces del mismo canal. Para independencia, asignar canales distintos (solo hay 16, uno reservado a percusión).
- La preescucha aplica CC7/11 también a percusión, pero no bend a batería. Los eventos de bend de percusión siguen conservándose y exportándose.
- El transporte restaura el estado de control al buscar o reanudar y usa el mapa de tempo al agendar eventos. El sintetizador sigue siendo aproximado: un DAW puede usar curvas de ganancia o instrumentos distintos. No son slides nativos de FL Studio, automatización VST ni MPE.

Los proyectos NEA/JSON y MIDI mantienen sus formatos actuales. No hay una migración de notas ni nuevos campos musicales obligatorios.

## Escala inicial, BPM y recorrido modal

El panel **«Tu escala. Tu tempo. Tu recorrido.»** configura la composición que se pide a la IA, no modifica el proyecto de referencia. La escala detectada en el análisis, la etiqueta manual `key` del estudio y la escala solicitada son tres cosas distintas. Elegir un modo no transpone las notas existentes.

### Punto de partida

- 40 escalas/modos, agrupados por familia, disponibles en 12 tónicas. Incluye los siete modos de la mayor y los de la menor melódica, menor armónica y mayor armónica, además de pentatónicas, blues, escalas simétricas y otros colores.
- Se muestra la colección de alturas y sus intervalos en semitonos desde la tónica. El sistema trabaja en temperamento igual de 12 sonidos; las etiquetas enarmónicas compartidas no imponen la ortografía de cada grado. La menor melódica se entiende como colección jazz, igual al subir y bajar.
- BPM inicial opcional entre 20 y 300, incluidos decimales. El encargo exige que `bpm` y la entrada inicial de `tempos`, si existe, coincidan con ese valor. No arrastra el mapa de tempo anterior como si fuera una instrucción obligatoria.
- Se puede dejar la escala a elección de la IA y el BPM vacío. Por defecto no se fijan nuevos valores.

### Recomendaciones y plan

Las sugerencias se calculan localmente desde la escala inicial o desde el último destino del plan. No analizan audio ni consultan una IA. «Cercano» prioriza poca diferencia entre colecciones; «más abierto/oscuro» compara el balance de los intervalos de escalas de siete notas sobre la misma tónica; «tensión» usa una selección de colecciones con colores específicos; «otro centro» busca la misma colección de alturas con otra tónica. Son propuestas teóricas, **no garantías de emoción, buena conducción ni calidad musical**. Cada tarjeta explica qué alturas se conservan, entran y salen. Añadir una propuesta es una decisión explícita, no automática.

El plan admite múltiples pasos reordenables y eliminables. Cada uno contiene tónica y escala de destino, ubicación libre («pulso 32», «puente»…), tipo de transición, intención y BPM opcional al llegar. Sin ubicación, se pide a la IA que elija un lugar respetando el orden. Las transiciones incluyen nota común/pedal, acorde pivote si encaja, transformación gradual, corte preparado, préstamo breve y regreso al inicio. También se puede elegir cualquier destino del catálogo sin usar recomendaciones. El botón de regreso crea un paso que sigue los cambios posteriores de la escala inicial; un regreso incoherente se bloquea antes de preparar el prompt.

Las instrucciones distinguen cambio modal sobre una tónica, modulación a otro centro y préstamo breve. Exigen notas y armonía explícitas: no hay comandos NEA `mode` ni `modulate`. `key` es solo una etiqueta inicial. Los cambios de BPM sí usan `tempos`, con posiciones en pulsos de negra. Si se pide conservar una melodía que contradice una nueva escala, la IA debe pedir una decisión en lugar de cambiarla silenciosamente. Un loop debe preparar el regreso al centro, tempo y estados iniciales.

Estos campos se recuerdan en `nea-harmony-preferences-v1`, separada de los proyectos y las preferencias anteriores. No hay migración de partituras. Se sigue copiando el prompt a una IA externa, validando su resultado y aplicándolo expresamente. Las opciones del plan no se rellenan mediante el contrato JSON de PRIME en esta versión.

## Taller continuo y entrega directa

El modo taller pide trabajo seguido sin pedir «¿continúo?» entre versiones: ficha inicial breve, borrador completo, revisiones localizadas y registros de cambios observables. Son decisiones resumidas, **no razonamiento interno privado**. Se solicitan entre dos y cuatro versiones y entrega final, no un bucle infinito o perfección garantizada.

Solo si la IA dispone de herramientas reales de archivo podrá usar Write File/Edit File/MultiEdit. El encargo solicita versiones independientes y `composicion-final.nea`; sin herramientas, bloques NEA completos identificados. No inventar enlaces, audiciones, validaciones ni acciones. La visibilidad/tiempo real de avances depende de la plataforma externa. NEA no puede activar thinking, imponer streaming o controlar la sesión externa.

Importa el archivo final o pega únicamente su bloque, no toda la conversación. El archivo contiene solo NEA; los registros van fuera. El modo directo mantiene la entrega de un único NEA sin avances.

## Mantener el contexto útil

La partitura completa sigue incluida por defecto. El umbral de caracteres solo avisa: no recorta ni impide copiar. Se puede mantener el informe actual, usar uno breve o quitarlo, sin cambiar notas. «Solo análisis» sigue siendo un contexto incompleto que no sirve para preservar fielmente una obra. El catálogo entero de recursos no se envía.

Para comparar resultados entre variantes: misma referencia, misma idea, mismo modelo/configuración y varias generaciones por condición. Cambiar solo una opción por prueba (informe, técnica o modo de entrega); escuchar sin saber cuál es cuál si es posible. No atribuir diferencias de calidad a un factor sin esa comparación. La complejidad, longitud o cantidad de adornos no garantizan una mejor composición.
