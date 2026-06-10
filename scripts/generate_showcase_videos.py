from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable

import imageio.v2 as imageio
import numpy as np
from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
IMAGES_DIR = ROOT / "images"
VIDEOS_DIR = ROOT / "videos"

WIDTH = 1920
HEIGHT = 1080
FPS = 20


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = []
    if bold:
        candidates.extend(
            [
                Path("C:/Windows/Fonts/segoeuib.ttf"),
                Path("C:/Windows/Fonts/arialbd.ttf"),
                Path("C:/Windows/Fonts/calibrib.ttf"),
            ]
        )
    else:
        candidates.extend(
            [
                Path("C:/Windows/Fonts/segoeui.ttf"),
                Path("C:/Windows/Fonts/arial.ttf"),
                Path("C:/Windows/Fonts/calibri.ttf"),
            ]
        )

    for font_path in candidates:
        if font_path.exists():
            try:
                return ImageFont.truetype(str(font_path), size=size)
            except OSError:
                pass

    return ImageFont.load_default()


FONT_TITLE = load_font(88, bold=True)
FONT_SUBTITLE = load_font(42, bold=True)
FONT_BODY = load_font(34)
FONT_SMALL = load_font(26)
FONT_TINY = load_font(22)


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def ease_out_cubic(value: float) -> float:
    value = clamp(value)
    return 1 - pow(1 - value, 3)


def scene_fade_alpha(t_sec: float, duration_sec: float, fade_sec: float = 0.65) -> float:
    fade_in = clamp(t_sec / max(0.001, fade_sec))
    fade_out = clamp((duration_sec - t_sec) / max(0.001, fade_sec))
    return fade_in * fade_out


def fit_cover(image: Image.Image, target_w: int, target_h: int) -> Image.Image:
    src_w, src_h = image.size
    if src_w <= 0 or src_h <= 0:
        return Image.new("RGB", (target_w, target_h), "#0f172a")

    scale = max(target_w / src_w, target_h / src_h)
    new_size = (max(1, int(src_w * scale)), max(1, int(src_h * scale)))
    resized = image.resize(new_size, Image.Resampling.LANCZOS)

    left = (resized.width - target_w) // 2
    top = (resized.height - target_h) // 2
    return resized.crop((left, top, left + target_w, top + target_h))


def get_background(path: Path, color: str = "#111827") -> Image.Image:
    if path.exists():
        try:
            with Image.open(path) as image:
                return image.convert("RGB")
        except OSError:
            pass
    return Image.new("RGB", (WIDTH, HEIGHT), color)


def color_rgba(value: str, alpha: int) -> tuple[int, int, int, int]:
    r, g, b = ImageColor.getrgb(value)
    return (r, g, b, alpha)


def draw_title_block(
    draw: ImageDraw.ImageDraw,
    title: str,
    subtitle: str,
    y_start: int,
    alpha: float,
    offset_x: int,
) -> None:
    title_fill = (255, 255, 255, int(255 * alpha))
    sub_fill = (206, 221, 255, int(245 * alpha))

    draw.text(
        (120 + offset_x, y_start),
        title,
        font=FONT_TITLE,
        fill=title_fill,
        stroke_width=2,
        stroke_fill=(8, 16, 37, int(220 * alpha)),
    )
    draw.text(
        (124 + offset_x, y_start + 120),
        subtitle,
        font=FONT_SUBTITLE,
        fill=sub_fill,
    )


def draw_capsule(
    base: Image.Image,
    x: int,
    y: int,
    w: int,
    h: int,
    title: str,
    text: str,
    alpha: float,
) -> None:
    if alpha <= 0:
        return

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    d.rounded_rectangle(
        (0, 0, w - 1, h - 1),
        radius=26,
        fill=color_rgba("#0b1329", int(185 * alpha)),
        outline=color_rgba("#79b8ff", int(160 * alpha)),
        width=2,
    )

    d.text((28, 20), title, font=FONT_SUBTITLE, fill=(228, 241, 255, int(250 * alpha)))
    d.text((30, 88), text, font=FONT_BODY, fill=(210, 224, 246, int(245 * alpha)))

    base.alpha_composite(overlay, dest=(x, y))


def draw_top_brand(base: Image.Image, label: str, alpha: float) -> None:
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    d.rounded_rectangle(
        (86, 52, 660, 128),
        radius=22,
        fill=color_rgba("#061430", int(188 * alpha)),
        outline=color_rgba("#7dd3fc", int(200 * alpha)),
        width=2,
    )
    d.text((120, 74), "AIFA OPERACIONES", font=FONT_BODY, fill=(234, 246, 255, int(252 * alpha)))
    d.text((470, 78), label, font=FONT_SMALL, fill=(152, 216, 255, int(240 * alpha)))

    base.alpha_composite(overlay)


def draw_bottom_hint(base: Image.Image, text: str, alpha: float) -> None:
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)

    d.rounded_rectangle(
        (112, HEIGHT - 126, WIDTH - 112, HEIGHT - 52),
        radius=18,
        fill=color_rgba("#020617", int(168 * alpha)),
        outline=color_rgba("#334155", int(210 * alpha)),
        width=1,
    )
    d.text((146, HEIGHT - 102), text, font=FONT_TINY, fill=(219, 234, 254, int(250 * alpha)))
    base.alpha_composite(overlay)


def compose_frame(scene: dict, t_sec: float, duration_sec: float) -> Image.Image:
    bg_src = scene.get("_bg_image")
    if bg_src is None:
        bg_src = get_background(IMAGES_DIR / scene["bg"], color="#0f172a")
        scene["_bg_image"] = bg_src

    move = 1.0 + (0.08 * (1 - (t_sec / duration_sec)))
    zoom_w = int(WIDTH * move)
    zoom_h = int(HEIGHT * move)
    bg_zoomed = fit_cover(bg_src, zoom_w, zoom_h)

    drift_x = int(math.sin(t_sec * 0.7) * 36)
    drift_y = int(math.cos(t_sec * 0.45) * 20)
    crop_left = clamp((bg_zoomed.width - WIDTH) / 2 + drift_x, 0, bg_zoomed.width - WIDTH)
    crop_top = clamp((bg_zoomed.height - HEIGHT) / 2 + drift_y, 0, bg_zoomed.height - HEIGHT)
    bg = bg_zoomed.crop((int(crop_left), int(crop_top), int(crop_left) + WIDTH, int(crop_top) + HEIGHT))

    base = bg.convert("RGBA")

    # Color treatment for cinematic look
    color_layer = Image.new("RGBA", (WIDTH, HEIGHT), color_rgba(scene.get("tint", "#0b1329"), 112))
    base.alpha_composite(color_layer)

    gradient = Image.new("L", (1, HEIGHT))
    for y in range(HEIGHT):
        value = int(220 * (y / HEIGHT))
        gradient.putpixel((0, y), value)
    gradient = gradient.resize((WIDTH, HEIGHT))
    vignette = Image.new("RGBA", (WIDTH, HEIGHT), (2, 6, 23, 0))
    vignette.putalpha(gradient)
    base.alpha_composite(vignette)

    scene_alpha = scene_fade_alpha(t_sec, duration_sec)

    draw = ImageDraw.Draw(base)
    title_in = ease_out_cubic(clamp((t_sec - 0.15) / 0.7)) * scene_alpha
    title_offset = int((1 - title_in) * 90)
    draw_title_block(
        draw,
        scene["title"],
        scene["subtitle"],
        y_start=168,
        alpha=title_in,
        offset_x=title_offset,
    )

    draw_top_brand(base, scene.get("label", "Demo"), alpha=scene_alpha)

    bullet_texts: Iterable[str] = scene["bullets"]
    for idx, bullet in enumerate(bullet_texts):
        local = clamp((t_sec - (1.0 + idx * 0.38)) / 0.55)
        bullet_alpha = ease_out_cubic(local) * scene_alpha
        x = 120 + int((1 - ease_out_cubic(local)) * 76)
        y = 420 + idx * 160
        draw_capsule(
            base,
            x,
            y,
            w=1680,
            h=132,
            title=f"Paso {idx + 1}",
            text=bullet,
            alpha=bullet_alpha,
        )

    draw_bottom_hint(base, scene["footer"], alpha=scene_alpha)

    # Subtle sharpen for crisp text on compressed video
    rgb = base.convert("RGB")
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.2, percent=130, threshold=2))
    return rgb


def render_video(output_path: Path, scenes: list[dict], sec_per_scene: float = 4.2) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    total_frames = int(len(scenes) * sec_per_scene * FPS)

    for scene in scenes:
        scene["_bg_image"] = get_background(IMAGES_DIR / scene["bg"], color="#0f172a")

    writer = imageio.get_writer(
        output_path,
        fps=FPS,
        codec="libx264",
        pixelformat="yuv420p",
        macro_block_size=1,
        ffmpeg_log_level="error",
        quality=8,
    )

    try:
        for frame_idx in range(total_frames):
            t_global = frame_idx / FPS
            scene_idx = min(int(t_global / sec_per_scene), len(scenes) - 1)
            scene_start = scene_idx * sec_per_scene
            t_scene = t_global - scene_start
            frame = compose_frame(scenes[scene_idx], t_scene, sec_per_scene)
            writer.append_data(np.asarray(frame, dtype=np.uint8))
    finally:
        writer.close()


def main() -> None:
    videos = [
        {
            "name": "app-demo-01-vision-general.mp4",
            "scenes": [
                {
                    "bg": "fondo-aifa.jpg",
                    "tint": "#03153b",
                    "label": "Vision General",
                    "title": "Control Total de Operacion",
                    "subtitle": "Una sola plataforma para monitoreo diario.",
                    "bullets": [
                        "Visualiza modulos de Operaciones, Demoras, Manifiestos y Frecuencias.",
                        "Consulta indicadores clave en tableros claros y rapidos.",
                        "Navega por secciones sin perder contexto operativo.",
                    ],
                    "footer": "Demo corto: recorrido de alto nivel del aplicativo.",
                },
                {
                    "bg": "torre.jpg",
                    "tint": "#102a43",
                    "label": "Monitoreo",
                    "title": "Estado Operativo en Tiempo Real",
                    "subtitle": "Visibilidad para decisiones inmediatas.",
                    "bullets": [
                        "Detecta carga operativa por franjas de tiempo y posiciones.",
                        "Identifica picos de operaciones simultaneas rapidamente.",
                        "Compara tendencia diaria para anticipar cuellos de botella.",
                    ],
                    "footer": "Ideal para briefing de turno y coordinacion interareas.",
                },
                {
                    "bg": "slots.png",
                    "tint": "#0f172a",
                    "label": "Resultado",
                    "title": "Toma de Decision con Datos",
                    "subtitle": "Informacion accionable para cada equipo.",
                    "bullets": [
                        "Prioriza acciones con evidencia y trazabilidad de registros.",
                        "Acelera reportes ejecutivos con vistas analiticas listas.",
                        "Alinea operaciones, seguridad y coordinacion comercial.",
                    ],
                    "footer": "AIFA Operaciones: de la captura al analisis en minutos.",
                },
            ],
        },
        {
            "name": "app-demo-02-flujo-registro.mp4",
            "scenes": [
                {
                    "bg": "Pax.jpeg",
                    "tint": "#102a43",
                    "label": "Uso Diario",
                    "title": "Como Registrar Informacion",
                    "subtitle": "Flujo simple para captura y validacion.",
                    "bullets": [
                        "Ingresa al modulo requerido y selecciona periodo de trabajo.",
                        "Filtra por anio y mes para enfocar tu operacion del dia.",
                        "Carga la tabla y verifica conteo de registros activos.",
                    ],
                    "footer": "Paso a paso para usuarios operativos y supervisores.",
                },
                {
                    "bg": "Slot.jpeg",
                    "tint": "#06254d",
                    "label": "Edicion",
                    "title": "Editar, Guardar y Confirmar",
                    "subtitle": "Captura confiable con control de cambios.",
                    "bullets": [
                        "Activa modo editar y modifica celdas necesarias por fila.",
                        "Guarda cambios en bloque y valida resultado de escritura.",
                        "Usa Actualizar para traer la ultima version de la base.",
                    ],
                    "footer": "Menos friccion, mas velocidad para registrar operaciones.",
                },
                {
                    "bg": "Pasillo.jpeg",
                    "tint": "#1e293b",
                    "label": "Colaboracion",
                    "title": "Trabajo Continuo sin Interrupciones",
                    "subtitle": "Pensado para turnos y operacion constante.",
                    "bullets": [
                        "La sesion se mantiene estable al cambiar de pestaña.",
                        "Evita perdida de datos durante captura operativa.",
                        "Facilita continuidad entre usuarios editor y admin.",
                    ],
                    "footer": "Captura segura para mantener trazabilidad completa.",
                },
            ],
        },
        {
            "name": "app-demo-03-analitica-conciliacion.mp4",
            "scenes": [
                {
                    "bg": "Análisis_carga.jpg",
                    "tint": "#082f49",
                    "label": "Analitica",
                    "title": "Analisis que Explica la Operacion",
                    "subtitle": "Graficas claras para lectura ejecutiva.",
                    "bullets": [
                        "Explora comportamiento por hora, dia y tipo de posicion.",
                        "Ubica periodos criticos con indicadores visuales directos.",
                        "Detecta variaciones entre carga, pasajeros y movimientos.",
                    ],
                    "footer": "Convierte datos operativos en decisiones concretas.",
                },
                {
                    "bg": "Analisis_pax.jpg",
                    "tint": "#0c4a6e",
                    "label": "Demoras",
                    "title": "Seguimiento de Demoras y Causas",
                    "subtitle": "Priorizacion basada en evidencia.",
                    "bullets": [
                        "Consulta codigos de demora y tiempos acumulados.",
                        "Analiza tendencia para definir acciones preventivas.",
                        "Documenta observaciones para control y auditoria.",
                    ],
                    "footer": "Visibilidad total sobre puntualidad y desempeno.",
                },
                {
                    "bg": "pistas_aifa.jpg",
                    "tint": "#172554",
                    "label": "Conciliacion",
                    "title": "Conciliacion de Manifiestos",
                    "subtitle": "Cruce de fuentes para calidad de dato.",
                    "bullets": [
                        "Compara registros entre tablas y completa campos faltantes.",
                        "Valida slot asignado, hora de operacion y estado del vuelo.",
                        "Presenta resultados listos para seguimiento institucional.",
                    ],
                    "footer": "Analitica + conciliacion para una operacion mas precisa.",
                },
            ],
        },
    ]

    print("Generating showcase videos...")
    for spec in videos:
        target = VIDEOS_DIR / spec["name"]
        print(f"  - {target.name}")
        render_video(target, spec["scenes"], sec_per_scene=3.8)
    print("Done.")


if __name__ == "__main__":
    main()
