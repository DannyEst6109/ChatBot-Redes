#!/usr/bin/env python3
"""Generate a compact evidence figure from the verified Wireshark capture."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "evidence" / "remote-mcp-analysis.png"


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    family = "seguisb.ttf" if bold else "segoeui.ttf"
    try:
        return ImageFont.truetype(str(Path("C:/Windows/Fonts") / family), size)
    except OSError:
        return ImageFont.load_default()


rows = [
    ("43", "DNS", "192.168.0.18 -> DNS", "AAAA supply-control-mcp.onrender.com"),
    ("44", "DNS", "DNS -> 192.168.0.18", "Respuesta con CNAME de Render/Cloudflare"),
    ("45", "TCP", "192.168.0.18 -> 216.24.57.7:443", "SYN"),
    ("46", "TCP", "216.24.57.7:443 -> 192.168.0.18", "SYN, ACK"),
    ("47", "TCP", "192.168.0.18 -> 216.24.57.7:443", "ACK"),
    ("49", "TLS 1.2", "Cliente -> Render", "Client Hello; SNI visible"),
    ("51", "TLS 1.3", "Render -> cliente", "Server Hello + Change Cipher Spec"),
    ("55-58", "TLS 1.3", "Cliente <-> Render", "Handshake final y datos cifrados"),
    ("73-101", "TLS 1.3", "Cliente <-> Render", "Solicitudes y respuestas MCP cifradas"),
    ("22,24,25", "TCP", "Cliente <-> Render", "Cierre FIN/ACK de conexion HTTPS"),
]

width, height = 1500, 850
image = Image.new("RGB", (width, height), "#F7F9FC")
draw = ImageDraw.Draw(image)

navy = "#102A43"
blue = "#1769AA"
cyan = "#D9F0FF"
grid = "#C8D4E3"
muted = "#52667A"
white = "#FFFFFF"

draw.rounded_rectangle((42, 34, width - 42, 145), radius=18, fill=navy)
draw.text((70, 55), "Evidencia Wireshark - MCP remoto en Render", font=font(34, True), fill=white)
draw.text(
    (70, 103),
    "Captura real: evidence/remote-mcp.pcapng | Wi-Fi | 14-09-2026",
    font=font(20),
    fill="#D9E6F2",
)

summary_y = 170
summary = [
    ("Cliente", "192.168.0.18"),
    ("Servidor", "216.24.57.7:443"),
    ("Paquetes", "102"),
    ("Transporte", "TCP + TLS 1.3"),
]
card_width = 335
for index, (label, value) in enumerate(summary):
    x = 42 + index * (card_width + 16)
    draw.rounded_rectangle((x, summary_y, x + card_width, summary_y + 88), radius=12, fill=white, outline=grid)
    draw.text((x + 18, summary_y + 14), label, font=font(17, True), fill=muted)
    draw.text((x + 18, summary_y + 45), value, font=font(21, True), fill=navy)

table_x, table_y = 42, 286
col_widths = [130, 165, 430, 690]
headers = ["Trama", "Protocolo", "Direccion", "Interpretacion"]
row_height = 42

draw.rounded_rectangle(
    (table_x, table_y, width - 42, table_y + row_height * (len(rows) + 1)),
    radius=12,
    fill=white,
    outline=grid,
)
draw.rectangle((table_x, table_y, width - 42, table_y + row_height), fill=blue)

x = table_x
for label, col_width in zip(headers, col_widths):
    draw.text((x + 12, table_y + 10), label, font=font(17, True), fill=white)
    x += col_width

for row_index, row in enumerate(rows):
    y = table_y + row_height * (row_index + 1)
    if row_index % 2 == 0:
        draw.rectangle((table_x, y, width - 42, y + row_height), fill=cyan)
    x = table_x
    for value, col_width in zip(row, col_widths):
        draw.text((x + 12, y + 10), value, font=font(15), fill=navy)
        x += col_width
    draw.line((table_x, y + row_height, width - 42, y + row_height), fill=grid)

draw.text(
    (42, 790),
    "El contenido JSON-RPC y el Bearer token no son visibles en Wireshark porque HTTPS los cifra.",
    font=font(18, True),
    fill=muted,
)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
image.save(OUTPUT, format="PNG", optimize=True)
print(OUTPUT)
