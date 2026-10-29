# NEA 0.1 — Notation for Expressive Arrangements

NEA es una representación musical declarativa, no un lenguaje ejecutable. Un archivo `.nea` contiene JSON UTF-8 estricto. Su propósito es conectar arreglos MIDI, edición visual e intercambio manual con modelos de lenguaje. «New Era Audio» es el concepto de producto; «Notation for Expressive Arrangements» describe el formato.

## Principios

- Un único modelo para edición visual, prompts y exportación MIDI.
- Notas compactas en arrays: fácil de escribir y relativamente económico en tokens.
- Tiempo absoluto en **pulsos de negra**, empezando en 0, independiente del BPM.
- Alturas MIDI, programas General MIDI y controladores MIDI estándar.
- Sin ejecutar instrucciones, scripts ni código recibido de una IA.
- Validación de estructura y rangos antes de aplicar una respuesta.
- No se afirma compatibilidad sin pérdidas con todos los dialectos MIDI.

## Ejemplo mínimo

```json
{
  "version": "nea/0.1",
  "name": "Primera luz",
  "bpm": 112,
  "ppq": 480,
  "key": "D minor",
  "meter": [4, 4],
  "tracks": [
    {
      "id": "piano",
      "name": "Piano",
      "channel": 0,
      "program": 0,
      "notes": [[0, 62, 1, 85], [1, 65, 1, 72], [2, 69, 2, 90]],
      "cc": [[0, 11, 95]],
      "bend": []
    }
  ]
}
```

## Campos del proyecto

| Campo | Tipo / semántica |
| --- | --- |
| `version` | Obligatorio: `nea/0.1` |
| `name` | Texto de 1–200 caracteres |
| `bpm` | Número 1–1000; la exportación MIDI exige al menos aproximadamente 3.5763 BPM por su campo de 24 bits. La interfaz de tempo permite 20–300 BPM. |
| `meter` | `[numerador, denominador]`. Numerador entero 1–64. Denominador 1, 2, 4, 8, 16, 32 o 64. |
| `tracks` | Entre 1 y 64 pistas |
| `ppq` | Entero 24–32767, por defecto 480. Resolución de exportación MIDI. |
| `key` | Texto orientativo opcional, hasta 60 caracteres. No transpone, detecta ni impone una escala. |
| `length` | Longitud mínima opcional en pulsos (incluye silencio final), 0–1 000 000. |
| `tempos` | `[[pulso, bpm], …]`, por defecto `[[0,bpm]]`. Ordenado al validar. |
| `meters` | `[[pulso, numerador, denominador], …]`, por defecto `[[0,...meter]]`. |
| `events` | Eventos MIDI raw globales; por defecto `[]`. |

Si el mapa de tempo tiene una entrada en 0, esa entrada es la fuente del `bpm` principal al normalizar. El compás en 0 de `meters` tiene la misma precedencia sobre `meter`. Para cambiar estas propiedades en JSON, mantener sincronizados los mapas y los campos principales. Si los mapas comienzan después de 0, se inserta la entrada inicial correspondiente. Los campos desconocidos del JSON se conservan, pero no se interpretan ni se exportan a MIDI.

La longitud efectiva es el máximo entre 4 pulsos, `length`, los finales de notas y la posición de los eventos. El lienzo muestra al menos 8 compases con la métrica inicial.

## Pistas

| Campo | Tipo / semántica |
| --- | --- |
| `id` | Identificador único, 1–100 caracteres. Si falta, se asigna `track-N`. |
| `name` | Texto obligatorio, 1–150 caracteres |
| `channel` | Entero obligatorio 0–15. **9 = canal de percusión General MIDI** (canal 10 en interfaces con numeración desde 1). |
| `program` | Entero obligatorio 0–127. Piano acústico = 0. El selector visual muestra programas 1–128. |
| `notes` | Array obligatorio de notas, hasta 50 000 por pista y 100 000 por proyecto |
| `cc` | Array de controladores, por defecto `[]` |
| `bend` | Array de pitch bend, por defecto `[]` |
| `events` | Eventos raw asociados a la pista, por defecto `[]` |
| `color` | `#RRGGBB`; se asigna uno de la paleta si falta |
| `volume` | 0–1; por defecto 0.75. Solo preescucha. |
| `muted`, `solo` | Booleanos; por defecto `false`. Solo preescucha. |

### Notas

`[inicio, altura, duración, velocidad]`

- Inicio >= 0, hasta 1 000 000 pulsos.
- Altura entera 0–127; C4 = 60 según la convención de esta app.
- Duración > 0, hasta 1 000 000 pulsos; mínimo validado 0.000001.
- Velocidad entera 1–127. Una nota de velocidad 0 no representa una nota NEA.
- Ejemplo: `[4, 69, 0.5, 95]` = A4 en el inicio del segundo compás de 4/4, duración de corchea.
- La exportación redondea inicios/finales al tick PPQ más cercano y garantiza al menos un tick de duración. No es matemáticamente posible conservar una fracción temporal menor que la resolución MIDI elegida.

### Controladores continuos

`[pulso, controlador, valor]`, los últimos dos enteros 0–127.

Ejemplos: CC1 modulación, CC7 volumen, CC10 panorama, CC11 expresión, CC64 sustain. Cada punto es un evento MIDI discreto; el gráfico muestra tramos escalonados, no interpolación que el archivo no contenga. El editor visual incluye esos cinco CC. El código y el importador admiten los 128.

### Pitch bend

`[pulso, valor]` con valor entero −8192…8191 y centro en 0. El rango en semitonos depende del instrumento receptor y de su configuración/RPN; no se supone que siempre sean dos semitonos.

### Eventos raw

- Cambio de programa: `[pulso, 0xC0 + canal, programa]`.
- Presión de canal: `[pulso, 0xD0 + canal, presión]`.
- Presión polifónica: `[pulso, 0xA0 + canal, altura, presión]`.
- Metaevento: `[pulso, 255, tipo, ...bytes]`.
- SysEx: `[pulso, 240, ...bytes]` o `[pulso, 247, ...bytes]`.
- **JSON usa números decimales, no literales hexadecimales.** La notación hexadecimal de arriba es solo explicativa.
- Longitudes MIDI se añaden al escribir. No incluir longitudes dentro de los arrays raw.
- Notas, CC, pitch bend, tempo y compás deben usar sus campos dedicados; no se aceptan duplicados raw de estos tipos ni End of Track.
- Los eventos de canal guardados en una pista se remapean a `track.channel` al exportar.
- Hasta 100 000 eventos por colección; hasta 65 538 elementos por evento raw.

## Compatibilidad MIDI

### Admitido

- Standard MIDI File tipo 0 y tipo 1, PPQ >= 24.
- Running status, note-off y note-on de velocidad cero.
- Notas, velocidad de ataque, pistas por canal, programas General MIDI.
- CC 0–127 y pitch bend de 14 bits.
- Cambios de tempo y compás.
- SysEx, metadatos, armadura, letras, aftertouch y cambios de programa posteriores como raw.
- Exportación tipo 1, con pista conductora y una pista MIDI por pista NEA.

### Normalización y límites

- No es un archivador binario exacto. No se conserva la estructura original de chunks ni running status.
- Una pista fuente con varios canales se divide en pistas NEA por canal.
- Metadatos globales y SysEx se trasladan a la pista conductora; su posición por pista no se preserva.
- La velocidad de liberación de note-off se normaliza a 0.
- Campos auxiliares de metronomo y subdivisión de Time Signature se normalizan a 24 y 8.
- El tempo se cuantiza a microsegundos por negra (resolución estándar MIDI).
- Notas sin cierre se cierran al final de su pista, con advertencia.
- Canales compartidos pueden compartir programa y controladores incluso si visualmente son pistas distintas.
- Notas solapadas de la misma altura y canal se emparejan FIFO; MIDI 1.0 no incluye identificadores únicos de notas.
- Exportación de todas las pistas, incluso Mute/Solo. Mute/Solo/volume son preferencias de audición, no eventos destructivos del arreglo.
- MIDI tipo 2, SMPTE y MIDI 2.0 UMP no están implementados. Estos no deben anunciarse como soportados.
- No importa WAV/MP3 ni transcribe audio. No importa `.flp` ni carga VST.

## Preescucha

Web Audio con síntesis oscilatoria y percusión de ruido. No es un banco General MIDI real. Respeta notas, velocidad, programa aproximado, volumen de preescucha, M/S, bucle y cambios de tempo. Interpreta **CC7 (volumen), CC11 (expresión) y pitch bend en canales melódicos**, con sensibilidad RPN 0 y ±2 semitonos por defecto. Los valores se mantienen entre puntos; las curvas suaves requieren puntos intermedios. Se comparte el estado por canal, se recupera al reanudar y sigue el mapa de tempo. No interpreta otros CC (incluido sustain), aftertouch, SysEx ni cambios de programa posteriores; sí los conserva para la exportación. El rango de un instrumento externo puede diferir. Véase [Movimiento y expresión](NEA-0.2.md).

La cuadrícula y el contador usan el compás inicial. Un asterisco en el resumen avisa de cambios de compás; estos se conservan aunque no transformen visualmente la cuadrícula. La reproducción usa el mapa de tempo completo.

## Circuito manual con IA

1. Proyecto existente o vacío.
2. Intención en lenguaje natural y estilo/creatividad.
3. Prompt exportable con contrato y contexto opcional.
4. El usuario lleva el texto a su proveedor favorito.
5. El proveedor devuelve un proyecto NEA completo, no un parche.
6. El usuario pega la respuesta. Se valida antes de habilitar Aplicar.
7. Aplicar sustituye el proyecto y genera un punto de deshacer.
8. Escuchar, editar y exportar.

La app no llama a una IA, no contiene claves y no promete que una estructura válida sea musicalmente buena. Rechaza datos inválidos sin ejecutar código recibido.
