# Reporte final - Chatbot MCP para control de abastecimiento

## 1. Resumen

El proyecto implementa manualmente un anfitrion MCP en terminal, un cliente
JSON-RPC 2.0 independiente del transporte y un servidor industrial de control
de abastecimiento. El mismo servidor se ejecuta localmente sobre `stdio` y de
forma remota sobre HTTPS. No se utiliza un SDK de MCP ni un SDK de Anthropic.

## 2. Arquitectura y especificacion

El anfitrion mantiene la conversacion con la API Messages de Anthropic y
descubre las herramientas mediante `initialize`,
`notifications/initialized`, `tools/list` y `tools/call`. Cada solicitud tiene
`jsonrpc`, `id`, `method` y `params`; cada respuesta conserva el mismo `id` y
contiene `result` o `error`. Las notificaciones no llevan `id`.

El servidor `synthetic-supply-control` version 1.0.0 negocia MCP
`2025-11-25`. Ofrece cinco herramientas, documentadas con parámetros y
resultados en el README:

1. `list_inventory_risks`
2. `get_material_status`
3. `get_purchase_recommendations`
4. `explain_purchase_recommendation`
5. `get_supply_data_status`

Todos los datos son sinteticos y todas las recomendaciones se calculan con
reglas deterministicas. El LLM interpreta y explica; no calcula inventario.

## 3. Ejecucion local y remota

La variante local intercambia un objeto JSON por linea a traves de la entrada y
salida estandar. La variante remota usa `POST /mcp`, cuerpo
`application/json`, autenticacion Bearer y una cabecera `Mcp-Session-Id`. La
solicitud `initialize` abre la sesion y las solicitudes posteriores reutilizan
esa cabecera junto con `Mcp-Protocol-Version: 2025-11-25`. `GET /healthz`
permite verificar la instancia sin abrir una
sesion MCP.

El `Dockerfile` construye TypeScript en una etapa y ejecuta solamente los
artefactos y datos necesarios en una imagen Node.js 22. `render.yaml` describe
el servicio remoto, su health check y la generacion de la credencial. Como
alternativa, `scripts/deploy-cloud-run.ps1` despliega la misma imagen en Google
Cloud Run. Ambos flujos usan una sola instancia, pues las sesiones viven en
memoria.

## 4. Analisis de mensajes JSON-RPC

Durante la captura deben identificarse, en este orden:

| Clase | Metodo o forma | Identificador | Funcion |
|---|---|---:|---|
| Sincronizacion | `initialize` | Si | Negocia version, capacidades e identidad |
| Sincronizacion | `notifications/initialized` | No | Confirma que el cliente termino el inicio |
| Solicitud | `tools/list` | Si | Descubre las cinco herramientas |
| Respuesta | `result.tools` | Mismo `id` | Devuelve definiciones y esquemas |
| Solicitud | `tools/call` | Si | Invoca una herramienta con argumentos |
| Respuesta | `result.content` | Mismo `id` | Devuelve texto y contenido estructurado |

Con HTTPS, Wireshark muestra TLS cifrado y no puede leer el JSON sin claves de
sesion. Para demostrar el contenido de aplicacion se debe correlacionar la
captura con `logs/mcp-interactions.jsonl`, o habilitar `SSLKEYLOGFILE` en un
cliente compatible y configurar ese archivo en Wireshark. No se debe afirmar
que un paquete contiene un metodo concreto si el payload sigue cifrado.

### Procedimiento reproducible de captura

1. Ejecutar `npm run demo:remote` una vez para calentar el servicio.
2. Abrir Wireshark y capturar en la interfaz que tiene la ruta hacia Internet.
3. Aplicar el filtro `tcp.port == 443` y, si se conoce la IP, agregar
   `ip.addr == <IP_REMOTA>`.
4. Ejecutar nuevamente `npm run demo:remote`.
5. Detener y guardar la captura como `evidence/remote-mcp.pcapng`.
6. Exportar una imagen con DNS, establecimiento TCP, TLS y cierre visibles.
7. Anotar abajo las direcciones y numeros de trama observados. No usar valores
   de ejemplo como evidencia final.

### Evidencia a completar despues de la captura real

- URL del servicio: `https://supply-control-mcp.onrender.com/mcp`
- Verificacion remota: `initialize` HTTP 200, sesion MCP creada,
  `notifications/initialized` HTTP 202, `tools/list` HTTP 200 con cinco
  herramientas y `tools/call(get_supply_data_status)` HTTP 200 sin error.
- IP local: `[PENDIENTE DE CAPTURA]`
- IP remota: `[PENDIENTE DE CAPTURA]`
- Tramas DNS: `[PENDIENTE DE CAPTURA]`
- Tramas TCP SYN/SYN-ACK/ACK: `[PENDIENTE DE CAPTURA]`
- Tramas TLS ClientHello/ServerHello: `[PENDIENTE DE CAPTURA]`
- Tramas de datos cifrados asociadas a la demostracion: `[PENDIENTE DE CAPTURA]`
- Archivo y figura de evidencia: `[PENDIENTE DE CAPTURA]`

## 5. Capas de red

### Enlace

En la red local, la trama transporta el paquete IP hacia el siguiente salto. En
Ethernet contiene direcciones MAC de origen y destino y un EtherType para IPv4
o IPv6. La MAC remota observada normalmente pertenece al gateway local, no al
servidor de Cloud Run. En Wi-Fi existen cabeceras 802.11 equivalentes; el medio
concreto debe registrarse a partir de la interfaz capturada.

### Red

IP proporciona direccionamiento y encaminamiento entre el cliente y el
frontend de Google Cloud. El paquete contiene direcciones IP, limite de saltos
y el identificador del protocolo de transporte. DNS resuelve el nombre HTTPS a
una direccion alcanzable. La IP observada puede pertenecer a infraestructura
compartida y cambiar entre ejecuciones.

### Transporte

TCP establece una conexion confiable con el saludo SYN, SYN-ACK y ACK. Los
numeros de secuencia, confirmaciones, retransmisiones y ventana permiten ordenar
y entregar los bytes. El puerto destino normal es 443 y el puerto origen es
efimero. TLS se ejecuta sobre TCP y protege confidencialidad e integridad.

### Aplicacion

HTTP transporta cada mensaje MCP en un `POST /mcp`. Dentro del cuerpo se usa
JSON-RPC 2.0. HTTPS cifra tanto cabeceras sensibles, incluido Bearer, como el
contenido JSON-RPC. El log de auditoria conserva solicitudes, notificaciones y
respuestas completas con marca de tiempo y nombre del servidor.

## 6. Dificultades y soluciones

- Se separo el protocolo del transporte para reutilizar exactamente la misma
  logica sobre `stdio` y HTTP.
- Los servidores oficiales exponen herramientas distintas; se agrego el nombre
  del servidor a cada herramienta descubierta para evitar colisiones.
- El servidor Git oficial no implementa `git_init`; el escenario prepara un
  repositorio descartable y realiza por MCP las operaciones evaluadas.
- El transporte remoto requiere estado de sesion; se agrego
  `Mcp-Session-Id` y se limito el despliegue academico a una instancia.
- Los errores HTTP no validos ahora fallan inmediatamente en vez de esperar el
  timeout del cliente.

## 7. Conclusiones y lecciones aprendidas

MCP permite que el anfitrion coordine herramientas heterogeneas sin acoplar la
logica del LLM a cada servidor. JSON-RPC resuelve la correlacion entre
solicitudes y respuestas, mientras que el transporte resuelve el movimiento de
bytes. La separacion hace posible cambiar de un proceso local a HTTPS sin
modificar el ciclo MCP. La observabilidad es esencial: una interfaz resumida
ayuda a operar el chatbot, pero el JSONL completo permite auditar y explicar la
comunicacion. Finalmente, una captura de red debe distinguir hechos observados
de inferencias: con TLS, los metodos MCP se prueban con logs correlacionados o
con descifrado autorizado, no leyendo directamente paquetes cifrados.

## 8. Verificacion

La aceptacion automatizada se ejecuta con `npm run check`. La demostracion local
completa usa `npm run demo` y `npm run demo:scenario`; la remota usa
`npm run demo:remote`. La guia de presentacion esta en `docs/DEMO.md`.
