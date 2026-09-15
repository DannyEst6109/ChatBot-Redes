# Demostración en vivo - Entrega final

Documento de apoyo para seguir la prueba frente al profesor.

> No abrir `.env`, no mostrar la API key y no abrir archivos o sistemas del trabajo.

## Preparación antes de compartir pantalla

Abrir dos ventanas de PowerShell. En ambas ejecutar:

```powershell
cd "C:\Users\carlos.estrada\Documents\GitHub\ChatBot-Redes"
```

En la primera ventana verificar el proyecto:

```powershell
npm run check
npm run demo:remote
npm run demo:scenario
```

Resultados que deben aparecer:

- 58 pruebas aprobadas.
- Servidor remoto de Render accesible y autenticado.
- Filesystem y Git conectados.
- README creado en `demo-workspace`.
- Archivo agregado, revisado y comprometido mediante MCP.

Dejar abierta esta ventana como respaldo y limpiar la segunda:

```powershell
Clear-Host
```

## 1. Iniciar el chatbot

En la segunda ventana:

```powershell
npm run chatbot
```

Verificar en el encabezado:

```text
supply · supply-remote · filesystem · git
```

Decir:

> El anfitrión inicia tres servidores locales y conecta el mismo servidor
> industrial desplegado en Render. El cliente fue implementado manualmente y
> usa JSON-RPC 2.0 sobre stdio local y HTTPS remoto.

## 2. Mostrar servidores y herramientas

Escribir:

```text
/servers
```

Verificar:

- `supply`
- `supply-remote`
- `filesystem`
- `git`

Escribir:

```text
/tools
```

Verificar aproximadamente:

- Supply: 5 herramientas.
- Supply remoto: las mismas 5 herramientas.
- Filesystem: 14 herramientas.
- Git: 12 herramientas.
- Total observado: 36 herramientas.

Decir:

> Las herramientas se descubren dinámicamente con `tools/list`. El administrador agrega el nombre del servidor para evitar colisiones, por ejemplo `supply__get_material_status`.

## 3. Probar la API del LLM

Escribir:

```text
¿Quién fue Alan Turing? Responde en una oración.
```

Después:

```text
¿En qué año nació? Responde únicamente con el año.
```

Resultado esperado:

```text
1912
```

Decir:

> La segunda pregunta no repite el nombre. El chatbot conserva los mensajes de la sesión y por eso comprende que la pregunta todavía se refiere a Alan Turing.

## 4. Probar riesgos de abastecimiento

Escribir exactamente:

```text
Usa la herramienta de riesgos de abastecimiento. Lista los materiales de DC-PROD con estado SIN_STOCK, CRITICO o EN_RIESGO para un horizonte de siete días.
```

Resultados principales:

- `SYN-PROD-004`: `SIN_STOCK`.
- `SYN-PROD-003`: `CRITICO`.
- `SYN-PROD-001`: `CRITICO`.

Decir:

> Claude interpreta la solicitud, pero los resultados vienen del servidor MCP y de los archivos sintéticos. El modelo no calcula ni inventa el inventario.

## 5. Consultar un material

Escribir:

```text
Usa la herramienta de abastecimiento para explicar por qué SYN-PROD-001 de DC-PROD está en estado crítico.
```

Datos que deben aparecer:

- Existencia: 180 KG.
- Reservado: 30 KG.
- Disponible: 150 KG.
- Demanda promedio: 55 KG diarios.
- Cobertura: aproximadamente 2.73 días.
- Tiempo de entrega: 4 días.

Decir:

> La disponibilidad es existencia menos inventario reservado. La cobertura se obtiene dividiendo el disponible entre la demanda diaria. Como la cobertura es menor que el tiempo de entrega, existe riesgo de quiebre.

## 6. Probar contexto y recomendación

Escribir:

```text
¿Cuánto debería comprar para ese mismo material y qué riesgo permanecería?
```

Resultados esperados:

- 27 sacos.
- 675 KG.
- Existe quiebre antes de que llegue la compra.
- Se necesita una contingencia operativa.

Si preguntan por el cálculo:

```text
Disponible = 180 - 30 = 150 KG
Objetivo = 55 × 12 días = 660 KG
Proyectado a la entrega = 0 KG
Necesidad neta = 660 - 0 = 660 KG
Compra = techo(660 / 25) = 27 sacos
Cantidad base = 27 × 25 = 675 KG
```

Decir:

> La pregunta dice "ese mismo material", por lo que también demuestra conservación de contexto. La cantidad se calcula en el servidor con reglas determinísticas.

## 7. Validar las fuentes

Escribir:

```text
Usa la herramienta de estado de datos. ¿Están actualizadas todas las fuentes y están aisladas de sistemas externos?
```

Verificar:

- `synthetic: true`.
- `isolatedFromExternalSystems: true`.
- El maestro de materiales está atrasado.
- Existe un material con parámetros incompletos.

Decir:

> El servidor también informa problemas de calidad. No oculta ni reemplaza parámetros faltantes con valores inventados.

## 8. Mostrar un mensaje JSON-RPC completo

Activar modo detallado:

```text
/verbose
```

Escribir:

```text
Usa supply__get_material_status con center DC-PROD y material_code SYN-PROD-001.
```

Señalar en pantalla:

- `jsonrpc: "2.0"`
- `id`
- `method: "tools/call"`
- `params`
- `result`

Decir:

> El identificador permite relacionar la solicitud con su respuesta. Una notificación no contiene ID porque no espera respuesta.

Regresar al modo compacto:

```text
/verbose
```

Mostrar la ruta del registro:

```text
/log
```

Decir:

> La terminal puede resumir el tráfico, pero el archivo JSONL siempre conserva las solicitudes y respuestas completas.

## 9. Mostrar la evidencia de Wireshark

Abrir `evidence/remote-mcp.pcapng` y aplicar:

```text
dns.qry.name contains "supply-control-mcp.onrender.com" || ip.addr == 216.24.57.7
```

Señalar:

- DNS en las tramas 43-44.
- Saludo TCP en las tramas 45-47.
- ClientHello y ServerHello en las tramas 49 y 51.
- Datos MCP cifrados en las tramas 73-101.
- Cierre TCP en las tramas 22, 24 y 25.

Mostrar también `evidence/remote-mcp-analysis.png` y decir:

> Wireshark demuestra DNS, TCP y TLS. HTTPS protege el Bearer token y los
> cuerpos JSON-RPC, por lo que la captura los identifica honestamente como
> datos de aplicación cifrados y se correlaciona con el log MCP.

## 10. Finalizar el chatbot

```text
/exit
```

Decir:

> Al salir, el administrador cierra los clientes y termina los procesos de los servidores.

## 11. Demostrar Filesystem y Git

En la primera terminal volver a ejecutar, si el tiempo lo permite:

```powershell
npm run demo:scenario
```

Señalar estas etapas:

```text
Filesystem: create the README
Git: status before staging
Git: stage the README
Git: review the staged diff
Git: commit the README
Git: commit history
```

Decir:

> El escenario utiliza `demo-workspace`, un repositorio descartable que no modifica el historial académico. Filesystem escribe el README y Git realiza status, add, diff, commit y log mediante `tools/call`.

Si preguntan por `git init`:

> El servidor oficial Git no publica una herramienta `git_init`. Por eso solamente preparo el repositorio temporal de forma local; las operaciones evaluadas se ejecutan mediante MCP.

## Cierre

> La entrega final demuestra conexión con un LLM, memoria de sesión, registro
> completo del protocolo, dos servidores oficiales y un servidor industrial
> propio ejecutado localmente y en Render. La captura real documenta DNS, TCP,
> TLS y el tráfico MCP cifrado. Los cálculos son determinísticos y todos los
> datos son sintéticos.

## Contingencias

### Si falla Claude o Internet

```powershell
npm run demo
```

Explicar que esta demostración prueba el cliente, el protocolo y el servidor sin depender de la API.

### Si falla Filesystem

```powershell
npm run demo:filesystem
```

### Si falla Git

```powershell
npm run demo:git
```

### Si Claude no selecciona la herramienta esperada

Utilizar una instrucción explícita:

```text
Usa obligatoriamente supply__get_material_status con center DC-PROD y material_code SYN-PROD-001.
```

### Si solo quedan cinco minutos

Mostrar únicamente:

1. `/servers`.
2. Las dos preguntas de Alan Turing.
3. Riesgos de DC-PROD.
4. Recomendación de `SYN-PROD-001`.
5. Una llamada con `/verbose`.
6. Resultado final de `npm run demo:scenario`.

## Lista rápida antes de comenzar

- [ ] API configurada sin mostrar `.env`.
- [ ] Cuatro servidores conectados y 36 herramientas descubiertas.
- [ ] 58 pruebas aprobadas.
- [ ] `demo:remote` ejecutado correctamente.
- [ ] `demo:scenario` ejecutado una vez.
- [ ] Captura `evidence/remote-mcp.pcapng` abierta en Wireshark.
- [ ] Terminal con letra grande.
- [ ] Sin ventanas ni información laboral visible.
- [ ] Primera terminal abierta como respaldo.
