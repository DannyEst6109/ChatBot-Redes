---
name: Supply Control MCP
description: Una cartera de ruta operativa que convierte riesgo, material, recomendación y evidencia MCP en un recorrido verificable.
colors:
  paper: "#fbf9f4"
  paper-deep: "#f2eee5"
  carrier-ink: "#102747"
  carrier-mid: "#24466d"
  signal: "#b51f35"
  signal-bright: "#d33c4e"
  protocol-carbon: "#492b63"
  graphite: "#626a73"
  rule: "#d8d3ca"
  success: "#1f6a50"
  warning: "#a45b05"
typography:
  display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "42px"
    fontWeight: 700
    lineHeight: 0.8
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "29px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.04em"
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.48
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "10px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.13em"
rounded:
  coupon: "4px"
  control: "5px"
  chain: "6px"
  message: "10px"
  pill: "999px"
spacing:
  hairline: "4px"
  compact: "8px"
  standard: "12px"
  section: "16px"
  gutter: "22px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "#ffffff"
    rounded: "{rounded.coupon}"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.signal-bright}"
  button-send:
    backgroundColor: "{colors.carrier-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    height: "48px"
    width: "46px"
  risk-selector:
    backgroundColor: "transparent"
    textColor: "{colors.carrier-mid}"
    rounded: "{rounded.control}"
    padding: "7px 11px"
    height: "48px"
  status-badge:
    backgroundColor: "rgba(181, 31, 53, 0.09)"
    textColor: "{colors.signal}"
    rounded: "{rounded.pill}"
    padding: "4px 7px"
---

# Design System: Supply Control MCP

## Overview

**Creative North Star: "Cartera de Ruta"**

Supply Control MCP convierte una investigación de abastecimiento en un itinerario verificable. Su mundo material es una cartera de cupones operativos: papel cálido, tinta azul carrier, señal roja, tinta carbón y costuras perforadas que explican cómo una pregunta avanza desde el riesgo hasta la evidencia MCP.

La interfaz es densa pero ordenada, técnica sin parecer una terminal y evocadora sin imitar literalmente a una aerolínea. La jerarquía procede de franjas, columnas alineadas, numeración y cambios de tinta; no de tarjetas genéricas ni de efectos decorativos. La conversación conserva el foco humano y la traza hace visible la mecánica del protocolo.

**Key Characteristics:**

- Secuencia causal explícita: riesgo → material → recomendación → evidencia.
- Superficies planas de papel unidas por reglas sólidas o perforadas.
- Titulares compactos, lectura funcional y evidencia monoespaciada.
- Estados comunicados con texto, forma e icono además del color.
- Movimiento corto y causal, con una alternativa sin movimiento.

## Colors

La paleta combina papel cálido y tinta carrier con dos acentos funcionales: señal para prioridad y carbón para recomendación o protocolo.

### Primary

- **Tinta Carrier:** navegación, acciones de conversación, titulares y cajón de protocolo.
- **Azul de Ruta:** estados secundarios y hover de controles carrier.

### Secondary

- **Rojo de Señal:** riesgo alto y acción prioritaria; nunca aparece sin etiqueta o icono.
- **Rojo de Acción:** respuesta interactiva de la acción prioritaria en dispositivos con hover.

### Tertiary

- **Carbón de Evidencia:** recomendación determinística, ejecución y protocolo.
- **Verde Operativo:** servicio disponible y estados saludables.
- **Ámbar de Advertencia:** riesgo intermedio y parámetros incompletos.

### Neutral

- **Papel de Cabina:** superficie principal de lectura.
- **Papel Profundo:** fondo secundario y globo de respuesta.
- **Grafito Técnico:** texto auxiliar, divisores enfáticos y avatares neutrales.
- **Regla de Cupón:** bordes, costuras y separadores ordinarios.

### Named Rules

**The Red Requires Language Rule.** La señal roja nunca comunica prioridad por sí sola; el estado incluye siempre texto y, cuando corresponde, icono.

**The Ink Has a Job Rule.** Carrier estructura, señal prioriza, carbón explica el protocolo y verde confirma salud; no se intercambian como adornos.

## Typography

**Display Font:** Barlow Condensed (with sans-serif fallback)

**Body Font:** IBM Plex Sans (with sans-serif fallback)
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** Barlow Condensed aporta la voz compacta de manifiesto y billete a títulos, etapas y magnitudes. IBM Plex Sans mantiene clara la operación; IBM Plex Mono reserva una voz verificable para identificadores y JSON-RPC.

### Hierarchy

- **Display** (700, 42px, 0.8): magnitudes operativas aisladas, como días de cobertura.
- **Headline** (600, 29px, 1): marca y encabezados principales.
- **Title** (600, 17px, 1): títulos de inspector, etapas y cupones, habitualmente en mayúsculas.
- **Body** (400, 13px, 1.48): conversación y explicación funcional, con máximo de 68ch.
- **Label** (400, 10px, 0.13em): códigos, versiones, sellos y metadatos técnicos.

### Named Rules

**The Three Voices Rule.** Condensada para nombrar y medir, sans para leer y actuar, mono para identificar y auditar.

## Layout

El escritorio usa una cabecera de 76px y un espacio de trabajo de tres columnas: itinerario fijo de 188px, conversación flexible con mínimo de 460px e inspector de 340px. La conversación recibe gutters de 22px; el cajón de evidencia ocupa el borde inferior. A 1120px las columnas se compactan y la cadena de cuatro cupones pasa a dos filas.

A 860px la ruta se vuelve una franja horizontal, seguida por conversación e inspector en dos columnas. A 560px el inspector se apila, la evidencia usa una columna y las etiquetas de ruta se acortan. La superficie admite desde 320px, pero los controles conservan 42–48px de alto.

**The Route Survives Rule.** El orden causal nunca cambia al responder: la ruta precede a la conversación, que precede al inspector y a la evidencia.

## Elevation & Depth

El sistema es plano por defecto. La profundidad procede del contraste tonal, las franjas de tinta y los límites sólidos o perforados; las superficies base no usan sombras. El único halo observado rodea el punto verde de servicio para reforzar disponibilidad, no para elevar un contenedor.

### Shadow Vocabulary

- **Pulso operativo** (`0 0 0 3px rgba(31, 106, 80, .13)`): halo estático exclusivo del indicador de servicio activo.

### Named Rules

**The Flat Ticket Rule.** Ningún panel gana importancia mediante una sombra; prioridad significa tinta, posición o sello.

## Shapes

Las esquinas son contenidas: 4px para cupones y acciones, 5px para campos y selectores, 6px para una cadena completa y hasta 10px en la esquina exterior de un mensaje. Píldoras y círculos se reservan para estado, avatar y nodos del itinerario.

Las perforaciones son geometría informativa. Una costura discontinua separa regiones relacionadas y las muescas radiales aparecen donde dos hojas se encuentran. La marca inclinada y el sello circular son firmas escasas, no ornamento repetido.

## Components

### Buttons

- **Shape:** Acciones rectangulares y compactas con esquinas de cupón o control (4–5px).
- **Primary:** Señal roja, texto blanco, ancho completo en el inspector y altura mínima de 42px.
- **Hover / Focus:** En hover preciso cambia a rojo de acción; en pulsación escala a .97. El foco usa un contorno azul de 3px con separación de 3px.
- **Secondary:** El envío usa tinta carrier en 46×48px; las sugerencias son transparentes con borde de regla.

### Chips

- **Style:** Los selectores de riesgo son cupones transparentes con borde de regla, texto carrier y padding de 7px × 11px.
- **State:** La selección toma borde y texto de señal más un tinte rojo. Los estados usan píldora, icono y etiqueta en rojo, verde o ámbar.

### Cards / Containers

- **Corner Style:** Contenido individual entre 4 y 5px; cadenas conectadas con 6px.
- **Background:** Papel de cabina o papel profundo según el nivel de lectura.
- **Shadow Strategy:** Planas; véase Elevation & Depth.
- **Border:** Regla sólida para contener; discontinua o con muesca para expresar unión desmontable.
- **Internal Padding:** Ritmo de 8–16px; gutters estructurales de 22px.

### Inputs / Fields

- **Style:** Campo blanco, borde gris frío de 1px, esquinas de control y altura mínima de 48px.
- **Focus:** Contorno azul de 3px separado 3px; no depende solo del color del borde.
- **Error / Disabled:** Los botones conservan forma y etiqueta, reducen opacidad y cambian el cursor según espera o indisponibilidad.

### Navigation

La cabecera combina marca geométrica, procedencia sintética y salud del servicio. El itinerario lateral usa fondo carrier, línea continua, nodos numerados y una franja de señal para la etapa activa. En móvil se transforma en cuatro segmentos horizontales y elimina detalles secundarios antes de reducir la legibilidad.

### Ticket Chain

La cadena de cupones es el componente firma. Cuatro segmentos numerados sintetizan riesgo, material, recomendación y evidencia; costuras, muescas y flechas mantienen la lectura izquierda-a-derecha. El rojo señala riesgo y el carbón señala protocolo.

### Protocol Drawer

Una franja carrier persistente abre solicitudes y respuestas reales en IBM Plex Mono. Usa dos columnas en escritorio, una en móvil y bloques desplazables para contener trazas extensas.

## Do's and Don'ts

### Do:

- **Do** conservar el recorrido riesgo → material → recomendación → evidencia.
- **Do** usar reglas, costuras y muescas para describir relaciones reales.
- **Do** reservar IBM Plex Mono para códigos, versiones, sellos y JSON-RPC.
- **Do** combinar cada estado con texto y forma o icono; sostener foco visible y `prefers-reduced-motion`.
- **Do** animar causalidad con transform y opacity, usando 120–180ms y la curva de salida establecida.

### Don't:

- **Don't** sustituir la secuencia por una cuadrícula de tarjetas KPI desconectadas.
- **Don't** introducir gradientes, glassmorphism, grandes sombras o radios blandos de dashboard SaaS.
- **Don't** repetir aviones, sellos o perforaciones cuando no expliquen estructura o estado.
- **Don't** usar señal como decoración ni presentar los datos sintéticos como operación real.
- **Don't** convertir la evidencia en estética de terminal: debe ser legible, semántica y navegable.
