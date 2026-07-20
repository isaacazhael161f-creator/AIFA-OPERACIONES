/* ========================================================================
   Conciliación Board View — vista alternativa (board) para Conciliación.
   Extraído de index.html (inline, ~370 líneas) en v=20260616m.
   Funciones globales conservadas (referenciadas desde onclick inline en HTML):
     toggleConciliacionBoard, renderConciliacionBoard, filterBoardTables,
     clearBoardColFilters, parseBoardDate, toggleBoardDatePanel,
     setBoardDateMode, stepBoardOffset, applyBoardDateFilter,
     clearBoardDateFilter, selectBoardFlight.
   ======================================================================== */
async function toggleConciliacionBoard() {
    const board   = document.getElementById('conciliacion-board-view');
    const csvView = document.getElementById('conciliacion-csv-view');
    const btn     = document.getElementById('btn-conciliacion-board');
    if (!board || !csvView) return;

    const showingBoard = !board.classList.contains('d-none');

    if (showingBoard) {
        board.classList.add('d-none');
        csvView.classList.remove('d-none');
        if (btn) { btn.classList.remove('btn-primary'); btn.classList.add('btn-outline-primary'); }
        return;
    }

    csvView.classList.add('d-none');
    board.classList.remove('d-none');
    if (btn) { btn.classList.add('btn-primary'); btn.classList.remove('btn-outline-primary'); }

    const tbodyArr = document.getElementById('tbody-board-arrivals');
    const tbodyDep = document.getElementById('tbody-board-departures');
    const spinner  = `<tr><td colspan="7" class="text-center py-3"><span class="spinner-border spinner-border-sm text-secondary"></span></td></tr>`;
    if (tbodyArr) tbodyArr.innerHTML = spinner;
    if (tbodyDep) tbodyDep.innerHTML = spinner;

    let data = (window.opsFlights && typeof window.opsFlights.getData === 'function') ? window.opsFlights.getData() : [];
    if (!data || data.length === 0) {
        if (window.opsFlights && typeof window.opsFlights.loadFlights === 'function') {
            await window.opsFlights.loadFlights();
        }
    }

    renderConciliacionBoard();
}

function renderConciliacionBoard() {
    const data = (window.opsFlights && typeof window.opsFlights.getData === 'function')
        ? window.opsFlights.getData()
        : [];

    const tbodyArr = document.getElementById('tbody-board-arrivals');
    const tbodyDep = document.getElementById('tbody-board-departures');
    const cntArr   = document.getElementById('board-arr-count');
    const cntDep   = document.getElementById('board-dep-count');
    const footArr  = document.getElementById('board-arr-footer');
    const footDep  = document.getElementById('board-dep-footer');

    const arrivals   = (data || []).filter(r => (r['[Arr] Flight Designator'] || '').trim());
    const departures = (data || []).filter(r => (r['[Dep] Flight Designator'] || '').trim());

    if (cntArr)  cntArr.textContent  = arrivals.length   + ' vuelos';
    if (cntDep)  cntDep.textContent  = departures.length + ' vuelos';
    if (footArr) footArr.textContent = arrivals.length;
    if (footDep) footDep.textContent = departures.length;

    function statusBadge(status) {
        const s = (status || '').toLowerCase();
        let cls = 'bg-secondary';
        if (s.includes('block'))                                   cls = 'bg-success';
        else if (s.includes('activated') || s.includes('active')) cls = 'bg-success';
        else if (s.includes('cancel'))                             cls = 'bg-danger';
        else if (s.includes('delay'))                              cls = 'bg-warning text-dark';
        return `<span class="badge ${cls} text-wrap" style="min-width:90px;font-size:.9rem;padding:6px 8px">${status || ''}</span>`;
    }
    function esc(v) {
        return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    function rowBg(i) { return i % 2 === 0 ? '#ffffff' : '#f0f4f8'; }

    if (tbodyArr) {
        if (!arrivals.length) {
            tbodyArr.innerHTML = '<tr><td colspan="7" class="text-muted py-4">Sin datos de llegadas. Importa un CSV primero.</td></tr>';
        } else {
            tbodyArr.innerHTML = arrivals.map((r, i) => {
                const reg = esc(r['Registration']);
                const fecha = parseBoardDate(r['[Arr] SIBT'] || r['[Arr] AIBT'] || '');
                return `
                <tr data-registration="${reg}" data-board-type="arr" data-fecha="${fecha}"
                    onclick="selectBoardFlight(this,'arr')"
                    style="cursor:pointer;background:${rowBg(i)};transition:background .15s;">
                    <td>${statusBadge(r['Status'])}</td>
                    <td class="fw-bold" style="font-size:1.1rem;letter-spacing:.3px">${esc(r['[Arr] Flight Designator'])}</td>
                    <td>${esc(r['[Arr] SIBT'])}</td>
                    <td>${esc(r['[Arr] AIBT'])}</td>
                    <td>${esc(r['Routing'])}</td>
                    <td>${esc(r['Aircraft type'])}</td>
                    <td><span class="badge bg-light text-dark border">${reg}</span></td>
                </tr>`;
            }).join('');
        }
    }

    if (tbodyDep) {
        if (!departures.length) {
            tbodyDep.innerHTML = '<tr><td colspan="7" class="text-muted py-4">Sin datos de salidas. Importa un CSV primero.</td></tr>';
        } else {
            tbodyDep.innerHTML = departures.map((r, i) => {
                const reg = esc(r['Registration']);
                const fecha = parseBoardDate(r['[Dep] SOBT'] || r['[Dep] AOBT'] || '');
                return `
                <tr data-registration="${reg}" data-board-type="dep" data-fecha="${fecha}"
                    onclick="selectBoardFlight(this,'dep')"
                    style="cursor:pointer;background:${rowBg(i)};transition:background .15s;">
                    <td>${statusBadge(r['Status'])}</td>
                    <td class="fw-bold" style="font-size:1.1rem;letter-spacing:.3px">${esc(r['[Dep] Flight Designator'])}</td>
                    <td>${esc(r['[Dep] SOBT'])}</td>
                    <td>${esc(r['[Dep] AOBT'])}</td>
                    <td>${esc(r['Routing'])}</td>
                    <td>${esc(r['Aircraft type'])}</td>
                    <td><span class="badge bg-light text-dark border">${reg}</span></td>
                </tr>`;
            }).join('');
        }
    }

    filterBoardTables();
}

/**
 * Filters both board tables (Llegadas + Salidas) cooperatively:
 * global search + per-column inputs all work together.
 */
function filterBoardTables() {
    const globalTerm = (document.getElementById('board-global-search') || {}).value || '';
    const gt = globalTerm.trim().toLowerCase();

    ['arr', 'dep'].forEach(side => {
        const tbody = document.getElementById(`tbody-board-${side === 'arr' ? 'arrivals' : 'departures'}`);
        const badge = document.getElementById(`board-${side}-count`);
        const footer = document.getElementById(`board-${side}-footer`);
        if (!tbody) return;

        const colInputs = Array.from(
            document.querySelectorAll(`.board-col-filter[data-table="${side}"]`)
        );

        const ds = boardDateState[side];
        let dateFrom = null, dateTo = null;
        if (ds && ds.active) {
            const win = _getBoardDateWindow(side);
            dateFrom = win.from;
            dateTo   = win.to;
        }

        let visible = 0;
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const total = rows.length;

        rows.forEach(r => {
            const text = r.textContent.toLowerCase();

            if (gt && !text.includes(gt)) {
                r.style.display = 'none';
                return;
            }

            let show = true;
            colInputs.forEach((inp, colIdx) => {
                const term = inp.value.trim().toLowerCase();
                if (!term) return;
                const cell = r.cells[colIdx];
                if (cell && !cell.textContent.toLowerCase().includes(term)) {
                    show = false;
                }
            });

            if (show && dateFrom && dateTo) {
                const fecha = r.getAttribute('data-fecha') || '';
                if (!fecha || fecha < dateFrom || fecha > dateTo) show = false;
            }

            r.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        const hasFilter = gt || colInputs.some(i => i.value.trim()) || (ds && ds.active);
        const label = hasFilter ? `${visible} / ${total} vuelos` : `${total} vuelos`;
        if (badge)  badge.textContent  = label;
        if (footer) footer.textContent = hasFilter ? `${visible} / ${total}` : String(total);
    });
}

function clearBoardColFilters(side) {
    document.querySelectorAll(`.board-col-filter[data-table="${side}"]`).forEach(inp => inp.value = '');
    filterBoardTables();
}

/* -- Board Date Filter State & Functions ------------------------- */
const boardDateState = {
    arr: { mode: 'rel', relStart: -4, relEnd: 0, absDate: '', active: false },
    dep: { mode: 'rel', relStart: -4, relEnd: 0, absDate: '', active: false }
};

/** Parse "26JAN 13:05" o "26JAN\n13:05" → "YYYY-MM-DD" */
function parseBoardDate(str) {
    if (!str) return '';
    const months = { JAN:0,FEB:1,MAR:2,APR:3,MAY:4,JUN:5,JUL:6,AUG:7,SEP:8,OCT:9,NOV:10,DEC:11 };
    const m = String(str).trim().match(/^(\d{1,2})([A-Z]{3})/);
    if (!m) return '';
    const day = parseInt(m[1], 10);
    const mon = months[m[2]];
    if (mon === undefined) return '';
    const now = new Date();
    let year = now.getFullYear();
    const candidate = new Date(year, mon, day);
    if (candidate - now > 60 * 86400 * 1000) year--;
    return `${year}-${String(mon + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}

function _getBoardDateWindow(side) {
    const ds = boardDateState[side];
    if (ds.mode === 'abs') {
        return { from: ds.absDate, to: ds.absDate };
    }
    const today = new Date();
    function offsetDate(d, days) {
        const r = new Date(d); r.setDate(r.getDate() + days);
        return r.toISOString().slice(0,10);
    }
    const s = parseInt(document.getElementById(`board-${side}-rel-start`)?.value ?? ds.relStart, 10);
    const e = parseInt(document.getElementById(`board-${side}-rel-end`)?.value   ?? ds.relEnd,   10);
    const from = offsetDate(today, Math.min(s, e));
    const to   = offsetDate(today, Math.max(s, e));
    return { from, to };
}

function _updateBoardDateLabels(side) {
    const win = _getBoardDateWindow(side);
    const fmt = d => d ? new Date(d + 'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'}) : '';
    const sl = document.getElementById(`board-${side}-rel-start-label`);
    const el = document.getElementById(`board-${side}-rel-end-label`);
    if (sl) sl.textContent = fmt(win.from);
    if (el) el.textContent = fmt(win.to);
}

function toggleBoardDatePanel(side) {
    const panel = document.getElementById(`board-date-panel-${side}`);
    if (!panel) return;
    const opening = panel.classList.contains('d-none');
    ['arr','dep'].forEach(s => {
        document.getElementById(`board-date-panel-${s}`)?.classList.add('d-none');
    });
    if (opening) {
        panel.classList.remove('d-none');
        _updateBoardDateLabels(side);
    }
}

function setBoardDateMode(side, mode) {
    const ds = boardDateState[side];
    ds.mode = mode;
    const relEl  = document.getElementById(`board-${side}-rel-mode`);
    const absEl  = document.getElementById(`board-${side}-abs-mode`);
    const btnRel = document.getElementById(`board-${side}-mode-rel`);
    const btnAbs = document.getElementById(`board-${side}-mode-abs`);
    if (relEl) relEl.classList.toggle('d-none', mode !== 'rel');
    if (absEl) absEl.classList.toggle('d-none', mode !== 'abs');
    if (btnRel) { btnRel.classList.toggle('active', mode === 'rel'); }
    if (btnAbs) { btnAbs.classList.toggle('active', mode === 'abs'); }
    if (mode === 'rel') _updateBoardDateLabels(side);
}

function stepBoardOffset(side, which, delta) {
    const inp = document.getElementById(`board-${side}-rel-${which}`);
    if (!inp) return;
    inp.value = parseInt(inp.value, 10) + delta;
    applyBoardDateFilter(side);
}

function applyBoardDateFilter(side) {
    const ds = boardDateState[side];
    const win = _getBoardDateWindow(side);
    ds.active = !!(win.from && win.to);
    if (ds.mode === 'rel') {
        ds.relStart = parseInt(document.getElementById(`board-${side}-rel-start`)?.value ?? ds.relStart, 10);
        ds.relEnd   = parseInt(document.getElementById(`board-${side}-rel-end`)?.value   ?? ds.relEnd,   10);
        _updateBoardDateLabels(side);
    } else {
        ds.absDate = document.getElementById(`board-${side}-abs-date`)?.value || '';
        ds.active  = !!ds.absDate;
    }
    const btn = document.getElementById(`btn-board-date-${side}`);
    if (btn) btn.classList.toggle('active-date-filter', ds.active);
    document.getElementById(`board-date-panel-${side}`)?.classList.add('d-none');
    filterBoardTables();
}

function clearBoardDateFilter(side) {
    const ds = boardDateState[side];
    ds.active = false; ds.mode = 'rel'; ds.relStart = -4; ds.relEnd = 0;
    ds.absDate = '';
    const rs = document.getElementById(`board-${side}-rel-start`);
    const re = document.getElementById(`board-${side}-rel-end`);
    const ad = document.getElementById(`board-${side}-abs-date`);
    if (rs) rs.value = '-4'; if (re) re.value = '0';
    if (ad) ad.value = '';
    setBoardDateMode(side, 'rel');
    const btn = document.getElementById(`btn-board-date-${side}`);
    if (btn) btn.classList.remove('active-date-filter');
    _updateBoardDateLabels(side);
    filterBoardTables();
}

function selectBoardFlight(row, type) {
    const reg = row.getAttribute('data-registration');
    const wasSelected = row.classList.contains('board-selected');

    function paintRow(tr, color) {
        tr.style.background = color;
        Array.from(tr.cells).forEach(td => td.style.setProperty('background-color', color, 'important'));
    }
    function clearRow(tr, i) {
        const bg = i % 2 === 0 ? '#ffffff' : '#f0f4f8';
        tr.style.background = bg;
        Array.from(tr.cells).forEach(td => td.style.removeProperty('background-color'));
    }
    function restoreBg(tbody) {
        Array.from(tbody.children).forEach((r, i) => {
            r.classList.remove('board-selected', 'board-linked', 'board-paired');
            clearRow(r, i);
        });
    }

    const tbodyArr = document.getElementById('tbody-board-arrivals');
    const tbodyDep = document.getElementById('tbody-board-departures');
    restoreBg(tbodyArr);
    restoreBg(tbodyDep);

    if (wasSelected) return;

    paintRow(row, '#ffe082');
    row.classList.add('board-selected');

    if (!reg) return;

    const otherTbodyId = type === 'arr' ? 'tbody-board-departures' : 'tbody-board-arrivals';
    const escReg = reg.replace(/"/g, '\\"');
    const linked = document.querySelector(`#${otherTbodyId} tr[data-registration="${escReg}"]`);
    if (linked && linked.style.display !== 'none') {
        paintRow(linked, '#ffe082');
        linked.classList.add('board-linked');
        linked.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}
