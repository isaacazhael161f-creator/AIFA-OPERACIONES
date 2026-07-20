/**
 * conci-manifiestos-table.js
 * Tabla editable de Conciliación Manifiestos
 * Carga datos de Supabase "Conciliación Manifiestos" y permite edición inline
 * para roles: admin, superadmin, editor, capturista.
 */
(function () {
    'use strict';

    const TABLE = 'Conciliación Manifiestos';
    const EDIT_ROLES = new Set(['admin', 'superadmin', 'editor', 'capturista']);

    /* ── Editable columns (column key → label) ── */
    const EDITABLE_COLS = [
        'CIERRE SUBSECRETARIA',
        'ESTATUS MATRÍCULA',
        'SLOT ASIGNADO',
        'SLOT COORDINADO',
        'HR. DE INICIO O TERMINO DE PERNOCTA',
        'HR. DE EMBARQUE O DESEMBARQUE',
        'HR. DE OPERACIÓN',
        'HR. MÁXIMA DE ENTREGA',
        'HR. DE RECEPCIÓN',
        'HRS. CUMPLIDAS',
        'PUNTUALIDAD / CANCELACIÓN',
        'TOTAL PAX',
        'DIPLOMATICOS',
        'EN COMISION',
        'INFANTES',
        'TRANSITOS',
        'CONEXIONES',
        'OTROS EXENTOS',
        'TOTAL EXENTOS',
        'PAX QUE PAGAN TUA',
        'KGS. DE EQUIPAJE',
    ];
    const EDITABLE_SET = new Set(EDITABLE_COLS);

    /* ── state ── */
    let _data = [];
    let _editMode = false;
    let _pendingChanges = {}; // { rowId: { col: newVal } }
    let _userRole = '';

    /* ── DOM helpers ── */
    const $ = id => document.getElementById(id);
    const show = id => { const e = $(id); if (e) e.classList.remove('d-none'); };
    const hide = id => { const e = $(id); if (e) e.classList.add('d-none'); };
    const esc = t => String(t ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

    /* ── Role gate ── */
    function canEdit() {
        const role = (sessionStorage.getItem('user_role') || '').toLowerCase();
        return EDIT_ROLES.has(role);
    }

    function updateEditButton() {
        const btn = $('btn-conci-edit-mode');
        if (!btn) return;
        if (canEdit()) {
            btn.classList.remove('d-none');
        } else {
            btn.classList.add('d-none');
        }
    }

    /* ── Filters ── */
    function getFilters() {
        const year = ($('filter-conci-manifiestos-year') || {}).value || '';
        const month = ($('filter-conci-manifiestos-month') || {}).value || '';
        const day = ($('filter-conci-manifiestos-day') || {}).value || '';
        return { year, month, day };
    }

    /* ── Load data from Supabase ── */
    async function loadData() {
        const sb = window.supabaseClient;
        if (!sb) return;

        const tbl = $('table-conci-manifiestos');
        const loadDiv = $('conci-manifiestos-loading');
        const errDiv = $('conci-manifiestos-error');
        if (loadDiv) loadDiv.classList.remove('d-none');
        if (errDiv) errDiv.classList.add('d-none');
        if (tbl) { tbl.querySelector('thead').innerHTML = ''; tbl.querySelector('tbody').innerHTML = ''; }

        try {
            const f = getFilters();
            let q = sb.from(TABLE).select('*').order('FECHA', { ascending: true }).limit(5000);

            if (f.year && f.month && f.day) {
                const pad = v => String(v).padStart(2, '0');
                const dateStr = `${f.year}-${pad(f.month)}-${pad(f.day)}`;
                q = q.eq('FECHA', dateStr);
            } else if (f.year && f.month) {
                const pad = v => String(v).padStart(2, '0');
                const from = `${f.year}-${pad(f.month)}-01`;
                const to   = `${f.year}-${pad(f.month)}-31`;
                q = q.gte('FECHA', from).lte('FECHA', to);
            } else if (f.year) {
                q = q.gte('FECHA', `${f.year}-01-01`).lte('FECHA', `${f.year}-12-31`);
            }

            const { data, error } = await q;
            if (error) throw error;
            _data = data || [];
            renderTable();
            updateBadge();
        } catch (err) {
            if (errDiv) {
                errDiv.textContent = 'Error al cargar: ' + (err.message || String(err));
                errDiv.classList.remove('d-none');
            }
        } finally {
            if (loadDiv) loadDiv.classList.add('d-none');
        }
    }

    /* ── Update count badge ── */
    function updateBadge() {
        const badge = $('badge-conci-manifiestos-count');
        if (!badge) return;
        if (_data.length > 0) {
            badge.textContent = _data.length + ' registros';
            badge.style.display = '';
        } else {
            badge.style.display = 'none';
        }
    }

    /* ── Render table ── */
    function renderTable() {
        const tbl = $('table-conci-manifiestos');
        if (!tbl || !_data.length) {
            if (tbl) {
                tbl.querySelector('thead').innerHTML = '';
                tbl.querySelector('tbody').innerHTML =
                    '<tr><td class="text-center text-muted py-4" colspan="30">Sin registros para los filtros seleccionados.</td></tr>';
            }
            return;
        }

        const cols = Object.keys(_data[0]).filter(k => k !== 'id' && k !== 'created_at');

        // Header
        const thead = tbl.querySelector('thead');
        thead.innerHTML = '<tr>' + cols.map(c =>
            `<th class="text-nowrap small px-2 py-1" style="background:#e0e0e0;font-weight:bold;white-space:nowrap;position:sticky;top:0;z-index:1;">${esc(c)}</th>`
        ).join('') + '</tr>';

        // Body
        const tbody = tbl.querySelector('tbody');
        tbody.innerHTML = _data.map((row, rIdx) => {
            const cells = cols.map(col => {
                const val = row[col] ?? '';
                const editable = _editMode && EDITABLE_SET.has(col);
                if (editable) {
                    return `<td class="p-0" style="min-width:80px;">
                        <input type="text" class="form-control form-control-sm border-0 rounded-0 conci-edit-cell"
                            style="font-size:11px;height:26px;background:#fffde7;padding:2px 4px;"
                            data-row-id="${esc(String(row.id))}" data-col="${esc(col)}"
                            value="${esc(String(val))}"
                            placeholder="${esc(col)}">
                    </td>`;
                }
                return `<td class="small px-2 py-1 text-nowrap">${esc(String(val))}</td>`;
            }).join('');
            const tone = rIdx % 2 === 0 ? 'conci-row-tone-0' : 'conci-row-tone-1';
            return `<tr class="${tone}">${cells}</tr>`;
        }).join('');

        // Wire cell change listeners
        if (_editMode) {
            tbody.querySelectorAll('.conci-edit-cell').forEach(input => {
                input.addEventListener('change', function () {
                    const rowId = this.dataset.rowId;
                    const col = this.dataset.col;
                    if (!_pendingChanges[rowId]) _pendingChanges[rowId] = {};
                    _pendingChanges[rowId][col] = this.value;
                });
            });
        }
    }

    /* ── Toggle edit mode ── */
    function toggleEditMode() {
        if (!canEdit()) return;
        _editMode = !_editMode;
        _pendingChanges = {};

        const btnEdit   = $('btn-conci-edit-mode');
        const btnSave   = $('btn-conci-save-mode');
        const btnCancel = $('btn-conci-cancel-mode');

        if (_editMode) {
            if (btnEdit)   btnEdit.classList.add('d-none');
            if (btnSave)   btnSave.classList.remove('d-none');
            if (btnCancel) btnCancel.classList.remove('d-none');
        } else {
            if (btnEdit)   btnEdit.classList.remove('d-none');
            if (btnSave)   btnSave.classList.add('d-none');
            if (btnCancel) btnCancel.classList.add('d-none');
        }
        renderTable();
    }

    /* ── Save changes ── */
    async function saveChanges() {
        const sb = window.supabaseClient;
        if (!sb) return;

        const entries = Object.entries(_pendingChanges);
        if (!entries.length) {
            toggleEditMode();
            return;
        }

        const btnSave = $('btn-conci-save-mode');
        if (btnSave) { btnSave.disabled = true; btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Guardando...'; }

        let errorCount = 0;
        for (const [rowId, changes] of entries) {
            const { error } = await sb.from(TABLE).update(changes).eq('id', rowId);
            if (error) { console.error('[conci-manifiestos] error saving row', rowId, error); errorCount++; }
        }

        if (btnSave) { btnSave.disabled = false; btnSave.innerHTML = '<i class="fas fa-save me-1"></i>Guardar'; }

        if (errorCount > 0) {
            alert(`Se guardaron con errores (${errorCount} fila(s) fallaron). Revisa la consola.`);
        }

        // Refresh local data
        _pendingChanges = {};
        _editMode = false;
        $('btn-conci-edit-mode')?.classList.remove('d-none');
        $('btn-conci-save-mode')?.classList.add('d-none');
        $('btn-conci-cancel-mode')?.classList.add('d-none');
        await loadData();
    }

    /* ── Cancel ── */
    function cancelChanges() {
        _pendingChanges = {};
        _editMode = false;
        $('btn-conci-edit-mode')?.classList.remove('d-none');
        $('btn-conci-save-mode')?.classList.add('d-none');
        $('btn-conci-cancel-mode')?.classList.add('d-none');
        renderTable();
    }

    /* ── Init ── */
    function init() {
        // Wire buttons
        $('btn-conci-refresh')?.addEventListener('click', loadData);
        $('btn-conci-edit-mode')?.addEventListener('click', toggleEditMode);
        $('btn-conci-save-mode')?.addEventListener('click', saveChanges);
        $('btn-conci-cancel-mode')?.addEventListener('click', cancelChanges);

        // Wire filters — reload on change
        ['filter-conci-manifiestos-year', 'filter-conci-manifiestos-month', 'filter-conci-manifiestos-day'].forEach(id => {
            $(id)?.addEventListener('change', loadData);
        });

        // Show edit button based on role once auth resolves
        window.addEventListener('admin-mode-changed', () => updateEditButton());
        // Also check immediately after a short delay (role already in sessionStorage)
        setTimeout(updateEditButton, 500);

        // Load when tab shown
        const tabBtn = document.querySelector('button[data-bs-target="#pane-conci-comercial"]');
        if (tabBtn) {
            tabBtn.addEventListener('shown.bs.tab', () => { if (!_data.length) loadData(); });
        }
        // Also try loading if already visible
        setTimeout(() => {
            const pane = $('pane-conci-comercial');
            if (pane && pane.classList.contains('active') && !_data.length) loadData();
        }, 800);
    }

    document.addEventListener('DOMContentLoaded', init);

    // Expose for external use if needed
    window.conciManifTable = { loadData, toggleEditMode, saveChanges };
})();
