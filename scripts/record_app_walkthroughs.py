from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
import time
import traceback
from pathlib import Path
from typing import Callable
from urllib.error import URLError, HTTPError
from urllib.request import urlopen

import imageio_ffmpeg
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

BASE_URL = "http://localhost:3100"
WORK_ROOT = Path(__file__).resolve().parents[1]
VIDEOS_DIR = WORK_ROOT / "videos"
RAW_DIR = VIDEOS_DIR / "_tmp_recordings"
RAW_DIR.mkdir(parents=True, exist_ok=True)
VIDEOS_DIR.mkdir(parents=True, exist_ok=True)

Viewport = dict[str, int]
VIEWPORT: Viewport = {"width": 1600, "height": 900}
VIDEO_SIZE: Viewport = {"width": 1280, "height": 720}


def ensure_server(url: str) -> None:
    try:
        with urlopen(url, timeout=8) as response:
            status = getattr(response, "status", 200)
            if status >= 400:
                raise RuntimeError(f"Servidor devolvio estado {status}")
    except HTTPError as exc:
        # A 4xx response still confirms that an HTTP server is reachable.
        if 400 <= getattr(exc, "code", 0) < 500:
            return
        raise RuntimeError(
            f"No se pudo abrir {url}. Inicia server.js y vuelve a ejecutar."
        ) from exc
    except (URLError, TimeoutError) as exc:
        raise RuntimeError(
            f"No se pudo abrir {url}. Inicia server.js y vuelve a ejecutar."
        ) from exc


def smooth_mouse_move(page, x_from: int, y_from: int, x_to: int, y_to: int, steps: int = 24) -> None:
    for i in range(steps + 1):
        t = i / steps
        x = int(x_from + (x_to - x_from) * t)
        y = int(y_from + (y_to - y_from) * t)
        page.mouse.move(x, y)
        time.sleep(0.008)


def human_pause(ms: int) -> None:
    time.sleep(ms / 1000.0)


def heartbeat_wait(ms: int, label: str) -> None:
    remaining = max(0, int(ms))
    elapsed = 0
    step = 1000
    while remaining > 0:
        chunk = step if remaining >= step else remaining
        time.sleep(chunk / 1000.0)
        elapsed += chunk
        remaining -= chunk
        print(f"[{label}] {elapsed // 1000}s")
        sys.stdout.flush()


def goto_app(page) -> None:
    page.goto(BASE_URL, wait_until="domcontentloaded", timeout=60000)
    human_pause(800)


BYPASS_SCRIPT = """
(() => {
  try {
    sessionStorage.setItem('currentUser', 'demo@aifa.operaciones');
    sessionStorage.setItem('aifa.session.token', `demo.${Date.now()}.ok`);
    sessionStorage.setItem('user_fullname', 'Demo Operaciones');
    sessionStorage.setItem('user_role', 'admin');

    if (typeof window.verifyToken === 'function') {
      window.verifyToken = async () => true;
    }
    if (typeof window.checkForAppUpdates === 'function') {
      window.checkForAppUpdates = async () => {};
    }

    const login = document.getElementById('login-screen');
    const main = document.getElementById('main-app');
    if (login) login.classList.add('hidden');
    if (main) main.classList.remove('hidden');

    if (typeof window.showMainApp === 'function') {
      window.showMainApp();
    }
  } catch (_) {
    // noop
  }
})();
"""


def enter_main_app(page) -> None:
    if page.locator("#main-app:not(.hidden)").count() > 0:
        return

    # Try direct login first (if auth is available); fall back to deterministic demo bypass.
    if page.locator("#username").count() and page.locator("#password").count():
        page.fill("#username", "Usuario1")
        human_pause(250)
        page.fill("#password", "AIFAOps")
        human_pause(250)
        page.locator("#login-form").evaluate("form => form.requestSubmit()")
        human_pause(3000)

    if page.locator("#main-app:not(.hidden)").count() == 0:
        page.evaluate(BYPASS_SCRIPT)
        human_pause(1600)

    page.wait_for_selector("#main-app:not(.hidden)", timeout=12000)


def ensure_sidebar_accessible(page) -> None:
        page.evaluate(
                """
                (() => {
                    try {
                        document.body.classList.remove('sidebar-collapsed');
                        document.body.classList.add('sidebar-open');
                        const sidebar = document.getElementById('sidebar');
                        const overlay = document.getElementById('sidebar-overlay');
                        if (sidebar) {
                            sidebar.classList.add('visible');
                            sidebar.style.transform = 'translateX(0)';
                        }
                        if (overlay) overlay.classList.remove('active');
                    } catch (_) {
                        // noop
                    }
                })();
                """
        )
        human_pause(350)


def click_menu_section(page, section: str, wait_ms: int = 1400) -> None:
    selector = f'.menu-item[data-section="{section}"]'
    page.wait_for_selector(selector, timeout=10000)
    ensure_sidebar_accessible(page)
    page.evaluate(
        """
        (sel) => {
          const el = document.querySelector(sel);
          if (!el) return;
          el.scrollIntoView({ block: 'center', inline: 'nearest' });
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        }
        """,
        selector,
    )
    human_pause(wait_ms)


def safe_click(page, selector: str, wait_ms: int = 900) -> bool:
    if page.locator(selector).count() == 0:
        return False
    try:
        page.locator(selector).first.click(timeout=2500, force=True)
        human_pause(wait_ms)
        return True
    except PlaywrightTimeoutError:
        return False


def scenario_navigation_general(page) -> None:
    goto_app(page)
    enter_main_app(page)
    ensure_sidebar_accessible(page)

    smooth_mouse_move(page, 20, 120, 360, 120)
    human_pause(500)

    click_menu_section(page, "operaciones-totales", wait_ms=1700)
    page.mouse.wheel(0, 550)
    human_pause(900)
    page.mouse.wheel(0, -550)
    human_pause(700)

    click_menu_section(page, "conciliacion", wait_ms=1700)
    safe_click(page, "#btn-conciliacion-board", wait_ms=1800)

    if page.locator("#board-global-search").count():
        page.fill("#board-global-search", "AM")
        human_pause(1500)
        page.fill("#board-global-search", "")
        human_pause(800)

    # Return to CSV view if board is open.
    safe_click(page, "button:has-text('Regresar al CSV')", wait_ms=1300)

    click_menu_section(page, "biblioteca", wait_ms=1700)
    safe_click(page, "#bib-map-tab", wait_ms=1500)
    safe_click(page, "#bib-guia-tab", wait_ms=1500)
    safe_click(page, "#bib-docs-tab", wait_ms=1100)


def scenario_conciliacion_manifiestos(page) -> None:
    goto_app(page)
    enter_main_app(page)
    ensure_sidebar_accessible(page)

    click_menu_section(page, "conciliacion", wait_ms=1600)
    safe_click(page, "#tab-conci-comercial", wait_ms=1600)

    if page.locator("#filter-conci-manifiestos-year").count():
        page.select_option("#filter-conci-manifiestos-year", value="2025")
        human_pause(1100)
        page.select_option("#filter-conci-manifiestos-year", value="2026")
        human_pause(1200)

    if page.locator("#filter-conci-manifiestos-month").count():
        page.select_option("#filter-conci-manifiestos-month", value="2")
        human_pause(1000)

    safe_click(page, "#btn-conci-refresh", wait_ms=2000)

    container = page.locator("#pane-conci-comercial .table-responsive").first
    if container.count():
        container.hover()
        human_pause(500)
        for _ in range(3):
            page.mouse.wheel(0, 450)
            human_pause(450)
        container.evaluate("el => { el.scrollLeft = Math.floor(el.scrollWidth * 0.6); }")
        human_pause(400)
        container.evaluate("el => { el.scrollLeft = Math.floor(el.scrollWidth * 0.95); }")
        human_pause(400)
        container.evaluate("el => { el.scrollLeft = 0; }")
        human_pause(350)
        for _ in range(2):
            page.mouse.wheel(0, -450)
            human_pause(350)

    if page.locator("#table-conci-manifiestos tbody tr").count():
        page.locator("#table-conci-manifiestos tbody tr").first.click()
        human_pause(800)


def scenario_analisis_demoras(page) -> None:
    goto_app(page)
    enter_main_app(page)
    ensure_sidebar_accessible(page)

    # Use in-page JS navigation to avoid pointer interception in headless mode.
    page.evaluate(
        """
        (() => {
          const go = (sectionKey) => {
            const link = document.querySelector(`.menu-item[data-section="${sectionKey}"]`);
            if (typeof window.showSection === 'function') {
              window.showSection(sectionKey, link || null);
            } else if (link) {
              link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            }
          };

          go('analisis-operaciones');
          setTimeout(() => {
            document.querySelector('#aops-tab-manifiestos')?.click();
          }, 700);
          setTimeout(() => {
            document.querySelector('#aops-tab-carga')?.click();
          }, 1600);
          setTimeout(() => {
            document.querySelector('#aops-tab-slots')?.click();
          }, 2500);
          setTimeout(() => {
            if (typeof window.loadOperationsYear === 'function') {
              window.loadOperationsYear(2026);
              window.loadOperationsYear(2025);
            }
          }, 3200);

          setTimeout(() => {
            go('demoras');
          }, 4200);
          setTimeout(() => {
            document.querySelector('#demoras-hint-cta')?.click();
            document.querySelector('#demoras-tbody tr')?.click();
          }, 5600);
        })();
        """
    )

    heartbeat_wait(8200, "escena-03")
    page.mouse.wheel(0, 360)
    human_pause(700)
    page.mouse.wheel(0, -360)
    human_pause(700)


ScenarioFunc = Callable[[object], None]


def transcode_webm_to_mp4(source_webm: Path, target_mp4: Path) -> None:
    ffmpeg_exe = Path(imageio_ffmpeg.get_ffmpeg_exe())
    cmd = [
        str(ffmpeg_exe),
        "-y",
        "-i",
        str(source_webm),
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-movflags",
        "+faststart",
        str(target_mp4),
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def record_scenario(playwright, slug: str, scenario_func: ScenarioFunc) -> Path:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport=VIEWPORT,
        record_video_dir=str(RAW_DIR),
        record_video_size=VIDEO_SIZE,
        locale="es-MX",
        color_scheme="light",
    )
    page = context.new_page()

    raw_video_path: Path | None = None
    try:
        scenario_func(page)
        human_pause(700)
        video = page.video
        context.close()
        if video is None:
            raise RuntimeError("No se genero video en la sesion")
        raw_video_path = Path(video.path())
    finally:
        try:
            if context:
                context.close()
        except Exception:
            pass
        browser.close()

    if raw_video_path is None or not raw_video_path.exists():
        raise RuntimeError(f"No se encontro el video webm para {slug}")

    final_mp4 = VIDEOS_DIR / f"walkthrough-{slug}.mp4"
    transcode_webm_to_mp4(raw_video_path, final_mp4)
    return final_mp4


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Record real UI walkthrough videos for AIFA app")
    parser.add_argument(
        "--only",
        choices=["01", "02", "03", "all"],
        default="all",
        help="Run only one scenario (01, 02, 03) or all",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    ensure_server(BASE_URL)

    all_scenarios: list[tuple[str, ScenarioFunc]] = [
        ("01-navegacion-general", scenario_navigation_general),
        ("02-conciliacion-manifiestos", scenario_conciliacion_manifiestos),
        ("03-analisis-demoras", scenario_analisis_demoras),
    ]

    if args.only == "all":
        scenarios = all_scenarios
    else:
        prefix = f"{args.only}-"
        scenarios = [item for item in all_scenarios if item[0].startswith(prefix)]

    generated: list[Path] = []
    failures: list[str] = []

    with sync_playwright() as playwright:
        for slug, scenario in scenarios:
            print(f"Grabando {slug}...")
            try:
                output = record_scenario(playwright, slug, scenario)
                generated.append(output)
                print(f"OK -> {output}")
            except Exception as exc:
                failures.append(slug)
                print(f"ERROR en {slug}: {exc}", file=sys.stderr)
                traceback.print_exc()

    # Optional cleanup of old raw files.
    for item in RAW_DIR.glob("*.webm"):
        try:
            item.unlink()
        except OSError:
            pass

    print("\nVideos generados:")
    for path in generated:
        size_mb = path.stat().st_size / (1024 * 1024)
        print(f"- {path.name} ({size_mb:.2f} MB)")

    if failures:
        print("\nEscenarios con error:")
        for slug in failures:
            print(f"- {slug}")
        return 1

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
