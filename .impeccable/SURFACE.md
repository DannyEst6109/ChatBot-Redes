# Superficie web aprobada

- Composición: `mocks/comp-conversation.png`
- Aprobación: delegada por el usuario al responder “continúa” después de recibir la recomendación explícita.
- Dirección: Cartera de Ruta.
- Viewport de referencia: escritorio 1440 × 900; traducción responsiva obligatoria hasta 360 px.

## Contrato de dirección

La pantalla se comporta como una cartera de cupones operativos: una pregunta entra por el centro, avanza por Riesgo, Material, Recomendación y Evidencia, y termina en una traza que el evaluador puede inspeccionar. Papel cálido, tinta azul carrier, rojo de señal y carbón para protocolo. La columna izquierda mantiene el itinerario; la conversación ocupa el foco; el material y su recomendación viven a la derecha; la evidencia se abre al pie. Las perforaciones explican relaciones y límites, no decoran. Barlow Condensed da voz a títulos y magnitudes; IBM Plex Sans conserva la lectura; Plex Mono queda reservado a JSON-RPC. Movimiento corto y causal: revelar la respuesta, activar la etapa y desplegar la evidencia. En móvil, el itinerario se vuelve una franja horizontal, la conversación permanece primero y el inspector aparece después. Todo dato se identifica como sintético y cada estado combina texto, forma e icono.

## Inventario de fidelidad

| Ingrediente | Compromiso | Medio |
| --- | --- | --- |
| Cabecera | Marca, dato sintético, búsqueda/atajo y estado remoto | HTML/CSS + Lucide |
| Itinerario 01–04 | Espina vertical perforada, etapa activa inequívoca | HTML/CSS + SVG geométrico |
| Conversación | Pregunta, respuesta estructurada y sugerencias | HTML semántico + React |
| Cupones de resultado | Riesgo → material → recomendación → evidencia enlazados | HTML/CSS |
| Inspector de material | Cobertura, inventario, demanda, proveedor y alertas | HTML/CSS |
| Acción primaria | Ejecutar análisis con estado carga/éxito/error | Botón HTML; tratamiento de cupón rojo |
| Estado del servicio | Local/Render, latencia y herramienta usada | HTML + Lucide; valores reales del servidor |
| Cajón de protocolo | Solicitud y respuesta JSON-RPC verdaderas | `details`/React + texto semántico `pre` |
| Perforaciones | Costuras entre regiones, densidad aproximada 8–16 muescas por unión | CSS radial mask/background |
| Código de barras | Firma visual no interactiva, un solo uso principal | CSS/SVG geométrico |
| Textura de papel | Grano material sutil, cubre toda la superficie | Raster generado o CSS plano si no afecta lectura |
| Iconos | Riesgo, material, recomendación, evidencia, estado | Lucide React, trazo consistente |

## No literalizar

- No usar fotografías inventadas de materiales ni mapas mundiales.
- No presentar botones de compra real: el sistema es de recomendación sintética y solo lectura.
- El avión queda reducido a una única marca de ruta; no se repite como decoración.
- La maqueta muestra nombres ilustrativos; la implementación usa exclusivamente el dataset real del repositorio.
