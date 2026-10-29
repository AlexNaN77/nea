# NEA Studio

Estudio estático HTML/CSS/JavaScript para importar, editar y preescuchar MIDI/NEA, analizar referencias y preparar encargos completos para una IA externa. No usa backend propio ni API de IA. El usuario copia el prompt, obtiene una partitura, la valida y decide aplicarla.

## Entradas

- `index.html`: estudio, editor, automatizaciones, análisis, prompts y asistente PRIME.
- `index.html?test=1`: estudio aislado; no lee ni guarda proyecto, biblioteca ni preferencias locales.
- `tests.html`: pruebas automáticas y un iframe del estudio real en modo aislado.
- `docs/NEA-0.1.md`: modelo JSON y compatibilidad MIDI.
- `docs/NEA-0.2.md`: notación compacta, flujo creativo y expresión.
- `prompts/`: textos base del asistente PRIME.
- URL pública: no identificada ni desplegada en esta intervención. Los cambios del repositorio no acreditan un despliegue público.

No necesita compilación. Servir los archivos por HTTP para cargar los textos PRIME con `fetch`. Fuentes, iconos y Tailwind se cargan desde CDN.

## Funciones

- Importación/exportación MIDI 0/1 PPQ, NEA compacto y JSON compatible; conservación de CC, bend, tempo/compás y eventos raw compatibles.
- Arreglo, piano roll, puntos de automatización, deshacer, biblioteca local y sintetizador Web Audio aproximado.
- Análisis local de escalas y motivos; contexto completo, fragmento o informe seleccionado explícitamente.
- Catálogo de 10 adornos, 20 recursos y 2 recursos de expresión MIDI; modo taller o entrega directa.
- PRIME prepara contexto mediante intercambio manual de JSON; revisa cambios antes de aplicarlos, sin editar la música.

### Volumen y slides de tono

En **Crear con IA → Dale tu toque → Movimiento y expresión**:

- **Automatización de volumen**: pide CC7/CC11 con puntos intermedios para crescendos, swells y respiraciones.
- **Slides de tono**: pide bend sobre notas sostenidas, rango RPN 0, canales independientes y vuelta al centro.
- Ambas opciones se activan al incorporarse por primera vez; pueden desmarcarse y conservan sus campos de intención. Las preferencias anteriores de los otros recursos se mantienen. PRIME reconoce ambos IDs nuevos.
- Los requisitos se añaden al prompt, no generan música automáticamente en el navegador. El resultado musical depende de la IA externa y se aplica tras validación manual. Se pide uso localizado, claridad y contraste, no efectos constantes.

`js/nea-expression.js` contiene el contrato expresivo, compilación de eventos por canal y programación de AudioParams. La preescucha interpreta CC7 y CC11 como ganancias lineales multiplicativas y pitch bend melódico con RPN 0 (CC101/100, CC6/38; ±2 semitonos por defecto). Recupera estados al buscar/reanudar y sigue el mapa de tempo. Puntos discretos, sin interpolación implícita. Batería admite volumen/expresión, pero no bend en esta síntesis. Otros CC, RPN/NRPN, aftertouch, SysEx y cambios posteriores de programa no se interpretan sonoramente, aunque se exportan. Los controles se comparten entre pistas del mismo canal incluso si una está silenciada.

### Escala inicial, tempo y recorrido modal

En **Crear con IA → Tu escala. Tu tempo. Tu recorrido.**:

- 40 escalas/modos agrupados y 12 tónicas: modos de la mayor, menor melódica, menor armónica y mayor armónica; pentatónicas, blues, simétricas y otros colores. Se muestran las clases de altura y los intervalos desde la tónica.
- BPM inicial opcional entre 20 y 300, con decimales. Sin elección de escala ni BPM, no se añaden restricciones nuevas. Los ajustes son para la composición de salida: no transponen ni alteran la referencia.
- Recomendaciones locales desde el inicio elegido o el último paso del plan. Filtros: cercano, grados elevados, grados rebajados, tensión/ambigüedad y otro centro con las mismas notas. Cada propuesta muestra notas comunes, entrantes y salientes. Son heurísticas de teoría, no una IA ni una predicción de emoción o calidad.
- Plan de cambios editable: tónica, escala, ubicación en texto, transición, intención y BPM opcional al llegar. Permite añadir, reordenar y eliminar pasos, elegir destinos libres y volver al inicio. Los regresos siguen la escala inicial cuando se edita. No impone un máximo de pasos; la duración y el contexto de la IA siguen siendo límites prácticos.
- El prompt distingue cambios modales, modulaciones y préstamos, prioriza los parámetros elegidos frente a los datos orientativos de referencia y exige realizarlos con notas/armonía reales. Pide sincronizar `bpm` y el inicio de `tempos`, y respetar cualquier restricción de conservar melodía.

Implementación: `js/harmony-planner.js` y `css/harmony-planner.css`. `js/creative.js` recoge los ajustes y `js/nea-analysis.js` los incorpora al prompt completo. El panel no genera ni aplica partituras por sí solo. Las opciones estructuradas de este panel se eligen manualmente; no amplían el contrato de relleno JSON de PRIME.

## Datos y conservación

Todo se procesa en el navegador. No hay tablas, cargas remotas de archivos ni almacenamiento servidor.

Claves `localStorage` existentes, conservadas:

- `nea-studio-project-v1`: proyecto actual normalizado `nea/0.1`.
- `nea-studio-library-v1`: hasta 12 copias guardadas explícitamente; guardar con mismo nombre actualiza su copia.
- `nea-craft-preferences-v1`: técnicas elegidas, notas de intención, groove y opciones del taller.

Nueva clave independiente `nea-harmony-preferences-v1`: `{root, scale, bpm, note, changes}`. `root` es una clase de altura 0–11; `scale` es un ID del catálogo o vacío; BPM es texto numérico opcional. Cada cambio conserva `{root, scale, where, transition, bpm, note}`. Solo se guarda al editar un plan válido. No migra, vacía ni sustituye las claves de proyecto, biblioteca o preferencias anteriores. El modo `?test=1` tampoco lee ni escribe esta clave.

Las automatizaciones siguen usando `track.cc = [[pulso,controlador,valor]]` y `track.bend = [[pulso,valor]]`. No se cambia el formato ni se sustituyen proyectos existentes. Exportar `.nea` permite copias independientes del navegador/origen. El brief de PRIME no se guarda automáticamente.

## Verificación

Última ejecución: **198 pruebas correctas, 0 fallos** en `tests.html`. La suite espera a que estudio, PRIME y planificador estén listos antes de probarlos.

Incluye validación, edición real, deshacer, contrato de prompts, PRIME, NEA/MIDI roundtrip con CC/RPN/bend, rango de bend, independencia por canal, estado al buscar, cambios de tempo y muestras Web Audio Offline que verifican amplitud y frecuencia dentro de una nota. Capturas del estudio real revisadas en escritorio (1280 px) y móvil (390 px), sin desbordamientos visibles en el nuevo panel. El navegador automatizado bloquea la audición interactiva por política de autoplay; las pruebas de muestras usan OfflineAudioContext y no sustituyen la escucha artística humana.

Las pruebas del planificador (`js/tests-harmony.js`) verifican intervalos y recomendaciones, prioridad de escala/BPM en el prompt, pasos y reordenación, regreso coherente, rechazo de BPM inválidos, conservación de la referencia, textos largos y HTML tratado como texto, planes con más de doce cambios y controles expandidos dentro de 390 px. Capturas del nuevo panel revisadas en escritorio y móvil.

## Límites y siguientes pasos

- Revisar musicalmente resultados reales de una IA y escucharlos con los instrumentos del DAW: estructura válida no garantiza calidad ni timbre final.
- Sintetizador básico, no banco GM completo ni VST. No FLP, slides propietarios, MPE, audio o MIDI 2.0.
- El editor permite puntos individuales; no hay editor gráfico de curvas por arrastre ni generador local de composiciones.
- CC de sustain, panorama y modulación solo se exportan; pueden implementarse en la síntesis en una ampliación futura.
- Publicación únicamente con autorización explícita y flujo aprobado de Hosted Deploy.
