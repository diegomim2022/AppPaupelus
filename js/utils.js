export function esc(s) {
    if(s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}


export function formatMiles(input) {
    let pos = input.selectionStart;
    let antes = input.value;
    let solo = antes.replace(/[^\d]/g, '');
    if(!solo) { input.value = ''; return; }
    let fmt = Number(solo).toLocaleString('es-CO');
    input.value = fmt;
    let diff = fmt.length - antes.length;
    input.selectionStart = input.selectionEnd = Math.max(0, pos + diff);
}


export function leerMiles(id) {
    let v = document.getElementById(id).value;
    return parseFloat(v.replace(/\./g, '').replace(/,/g, '.')) || 0;
}


export function ponerMiles(id, num) {
    let el = document.getElementById(id);
    if(!el) return;
    if(!num && num !== 0) { el.value = ''; return; }
    el.value = Math.round(Number(num)).toLocaleString('es-CO');
}


export function formatearFecha(fechaStr) {
    if(!fechaStr) return '-';
    return parsearFechaLocal(fechaStr).toLocaleDateString('es-CO');
}


export function aISOLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
}


export function hoyISO() {
    // "new Date().toISOString()" siempre da la fecha en UTC: de noche en
    // Colombia (UTC-5) eso puede mostrar el día de MAÑANA como "hoy". Esta
    // función arma la fecha de hoy con los componentes de la hora local.
    return aISOLocal(new Date());
}


export function parsearFechaLocal(fechaStr) {
    // "new Date('YYYY-MM-DD')" interpreta la fecha en UTC en vez de en hora
    // local. Comparado contra límites construidos en hora local (como "hoy"
    // o el primer/último día del mes), esto puede incluir o excluir
    // transacciones equivocadamente cerca de los bordes, y desfasa en 1 día
    // los conteos de "días transcurridos". Esta función arma la fecha con
    // sus componentes locales para evitar ese problema.
    if(!fechaStr) return new Date(NaN);
    const partes = String(fechaStr).split('-');
    if(partes.length !== 3) return new Date(fechaStr);
    const [y, m, d] = partes.map(Number);
    if(!y || !m || !d) return new Date(fechaStr);
    return new Date(y, m - 1, d);
}


export function rangoRapido(dias) {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - dias + 1);
    document.getElementById('rep-desde').value = aISOLocal(desde);
    document.getElementById('rep-hasta').value = aISOLocal(hasta);
    generarReporteFechas();
}


export function cerrarModal(id) {
    document.getElementById(id).style.display = 'none';
}


export function inicializarAutocomplete(inputId, listaId, onSelect) {
    const input = document.getElementById(inputId);
    const lista = document.getElementById(listaId);
    if(!input || !lista) return;

    const ocultar = () => { lista.style.display = 'none'; lista.innerHTML = ''; };

    const elegir = (ref, nombre) => {
        input.value = ref;
        input.dataset.nombreSeleccionado = nombre || '';
        ocultar();
        if(onSelect) onSelect(ref, nombre);
    };

    const filtrar = () => {
        input.dataset.nombreSeleccionado = '';
        const q = input.value.trim().toLowerCase();
        if(!q) { ocultar(); return; }
        const coincidencias = APP.datos.productos.filter(p =>
            p.ref.toLowerCase().includes(q) || (p.nombre && p.nombre.toLowerCase().includes(q))
        ).slice(0, 8);
        if(coincidencias.length === 0) { ocultar(); return; }
        lista.innerHTML = coincidencias.map(p =>
            `<div class="autocomplete-item" data-ref="${p.ref}" data-nombre="${(p.nombre || '').replace(/"/g, '&quot;')}"><strong>${p.ref}</strong><span class="ac-nombre">${p.nombre || ''}</span></div>`
        ).join('');
        lista.style.display = 'block';
    };

    input.addEventListener('input', filtrar);
    input.addEventListener('focus', () => { if(input.value.trim()) filtrar(); });
    input.addEventListener('blur', () => setTimeout(ocultar, 150));
    input.addEventListener('keydown', e => {
        if(e.key === 'Enter' && lista.style.display === 'block' && lista.firstChild) {
            e.preventDefault();
            elegir(lista.firstChild.getAttribute('data-ref'), lista.firstChild.getAttribute('data-nombre'));
        } else if(e.key === 'Escape') {
            ocultar();
        }
    });
    lista.addEventListener('mousedown', e => {
        const item = e.target.closest('.autocomplete-item');
        if(item) elegir(item.getAttribute('data-ref'), item.getAttribute('data-nombre'));
    });
}


export function inicializarAutocompleteCliente(inputId, listaId) {
    const input = document.getElementById(inputId);
    const lista = document.getElementById(listaId);
    if(!input || !lista) return;

    const ocultar = () => { lista.style.display = 'none'; lista.innerHTML = ''; };

    const elegir = (nombre, id) => {
        input.value = nombre;
        input.dataset.clienteId = id || '';
        ocultar();
    };

    const filtrar = () => {
        input.dataset.clienteId = '';
        const q = input.value.trim().toLowerCase();
        if(!q) { ocultar(); return; }
        const coincidencias = (APP.datos.clientes || []).filter(c =>
            c.nombre.toLowerCase().includes(q)
        ).slice(0, 8);
        if(coincidencias.length === 0) { ocultar(); return; }
        lista.innerHTML = coincidencias.map(c =>
            `<div class="autocomplete-item" data-id="${c.id}" data-nombre="${c.nombre.replace(/"/g, '&quot;')}"><strong>${c.nombre}</strong>${c.ciudad ? `<span class="ac-nombre">${c.ciudad}</span>` : ''}</div>`
        ).join('');
        lista.style.display = 'block';
    };

    input.addEventListener('input', filtrar);
    input.addEventListener('focus', () => { if(input.value.trim()) filtrar(); });
    input.addEventListener('blur', () => setTimeout(ocultar, 150));
    input.addEventListener('keydown', e => {
        if(e.key === 'Enter' && lista.style.display === 'block' && lista.firstChild) {
            e.preventDefault();
            elegir(lista.firstChild.getAttribute('data-nombre'), lista.firstChild.getAttribute('data-id'));
        } else if(e.key === 'Escape') {
            ocultar();
        }
    });
    lista.addEventListener('mousedown', e => {
        const item = e.target.closest('.autocomplete-item');
        if(item) elegir(item.getAttribute('data-nombre'), item.getAttribute('data-id'));
    });
}


export function inicializarAutocompleteCiudad(inputId, listaId) {
    const input = document.getElementById(inputId);
    const lista = document.getElementById(listaId);
    if(!input || !lista) return;

    const ocultar = () => { lista.style.display = 'none'; lista.innerHTML = ''; };

    const elegir = (ciudad) => {
        input.value = ciudad;
        ocultar();
        sugerirEnvio();
    };

    const filtrar = () => {
        const q = input.value.trim().toLowerCase();
        const ciudades = obtenerCiudadesUnicas();
        if(!q) {
            lista.innerHTML = ciudades.map(c =>
                `<div class="autocomplete-item" data-ciudad="${c.replace(/"/g, '&quot;')}">${c}</div>`
            ).join('');
            lista.style.display = ciudades.length ? 'block' : 'none';
            return;
        }
        const coincidencias = ciudades.filter(c => c.toLowerCase().includes(q)).slice(0, 10);
        if(coincidencias.length === 0) { ocultar(); return; }
        lista.innerHTML = coincidencias.map(c =>
            `<div class="autocomplete-item" data-ciudad="${c.replace(/"/g, '&quot;')}">${c}</div>`
        ).join('');
        lista.style.display = 'block';
    };

    input.addEventListener('input', filtrar);
    input.addEventListener('focus', filtrar);
    input.addEventListener('blur', () => setTimeout(ocultar, 150));
    input.addEventListener('keydown', e => {
        if(e.key === 'Enter' && lista.style.display === 'block' && lista.firstChild) {
            e.preventDefault();
            elegir(lista.firstChild.getAttribute('data-ciudad'));
        } else if(e.key === 'Escape') {
            ocultar();
        }
    });
    lista.addEventListener('mousedown', e => {
        const item = e.target.closest('.autocomplete-item');
        if(item) elegir(item.getAttribute('data-ciudad'));
    });
}


export function aplicarFiltrosTabla(tbody) {
    const tabla = tbody.closest('table');
    const filaFiltros = tabla.querySelector('tr.fila-filtros');
    if(!filaFiltros) return;
    const filtros = Array.from(filaFiltros.querySelectorAll('input')).map(i => i.value.trim().toLowerCase());

    let visibles = 0;
    Array.from(tbody.rows).forEach(fila => {
        if(fila.classList.contains('sin-resultados-filtro')) return;
        // Filas de mensaje ("Sin productos...") tienen un colspan: no se filtran.
        if(fila.cells.length < filtros.length) { fila.style.display = ''; visibles++; return; }
        const coincide = filtros.every((f, idx) => {
            if(!f) return true;
            const celda = fila.cells[idx];
            return celda && celda.textContent.toLowerCase().includes(f);
        });
        fila.style.display = coincide ? '' : 'none';
        if(coincide) visibles++;
    });

    let avisoVacio = tbody.querySelector('tr.sin-resultados-filtro');
    const hayFiltroActivo = filtros.some(f => f);
    if(visibles === 0 && hayFiltroActivo) {
        if(!avisoVacio) {
            avisoVacio = document.createElement('tr');
            avisoVacio.className = 'sin-resultados-filtro';
            avisoVacio.innerHTML = `<td colspan="${filtros.length + 1}">Ningún registro coincide con el filtro</td>`;
            tbody.appendChild(avisoVacio);
        }
        avisoVacio.style.display = '';
    } else if(avisoVacio) {
        avisoVacio.style.display = 'none';
    }
}


export function construirFilaFiltros(config) {
    const tbody = document.getElementById(config.tbody);
    if(!tbody) return;
    const tabla = tbody.closest('table');
    const thead = tabla.querySelector('thead');
    if(!thead || thead.querySelector('tr.fila-filtros')) return;

    const encabezados = Array.from(thead.rows[0].cells);
    const fila = document.createElement('tr');
    fila.className = 'fila-filtros';
    encabezados.forEach(th => {
        const celda = document.createElement('th');
        const titulo = th.textContent.trim();
        if(titulo && !config.omitir.includes(titulo)) {
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'filtro-col';
            input.placeholder = 'Filtrar…';
            input.addEventListener('input', () => aplicarFiltrosTabla(tbody));
            celda.appendChild(input);
        }
        fila.appendChild(celda);
    });
    thead.appendChild(fila);

    // Cada vez que la app repinta la tabla se pierden los display:none, así
    // que se vuelve a aplicar el filtro vigente sobre las filas nuevas.
    new MutationObserver(() => aplicarFiltrosTabla(tbody))
        .observe(tbody, { childList: true });
}


export function inicializarFiltrosTablas() {
    TABLAS_CON_FILTRO.forEach(construirFilaFiltros);
}
