export function esc(s) {
    if(s == null) return '';
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

const TABLAS_CON_FILTRO = [
    { tbody: 'tabla-productos', omitir: ['Acciones'] },
    { tbody: 'tabla-compras', omitir: ['Acciones'] },
    { tbody: 'tabla-ventas', omitir: ['Acciones'] },
    { tbody: 'tabla-ventas-envios', omitir: ['Acciones'] },
    { tbody: 'tabla-ventas-cobro', omitir: ['Acciones'] },
    { tbody: 'tabla-entregas', omitir: ['Acciones'] },
    { tbody: 'tabla-inventario', omitir: [] },
    { tbody: 'tabla-reporte-fechas', omitir: [] },
    { tbody: 'tabla-top', omitir: [] },
    { tbody: 'tabla-empresas', omitir: [] },
];


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


export function aplicarFiltrosTabla(tbody, input) {
    try {
        if (!input) return;
        const query = input.value.trim();
        const normalizeStr = str => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const queryNorm = normalizeStr(query);

        let visibles = 0;
        Array.from(tbody.rows).forEach(fila => {
            if (fila.classList.contains('sin-resultados-filtro')) return;

            // Mostrar todo si no hay filtro
            if (!queryNorm) {
                fila.style.display = '';
                visibles++;
                return;
            }

            // Ignorar la fila de "Sin productos..." o similares con colspan grande
            // (A menos que queramos buscar en ella, pero normalmente no)
            const numCols = fila.cells.length;
            if (numCols === 1 && fila.cells[0].colSpan > 1) {
                fila.style.display = '';
                visibles++;
                return;
            }

            // Buscar en todo el texto de la fila junta (incluye todas las celdas visibles)
            const textoFila = normalizeStr(fila.textContent);
            const coincide = textoFila.includes(queryNorm);

            fila.style.display = coincide ? '' : 'none';
            if (coincide) visibles++;
        });

        let avisoVacio = tbody.querySelector('tr.sin-resultados-filtro');
        if (visibles === 0 && queryNorm) {
            if (!avisoVacio) {
                avisoVacio = document.createElement('tr');
                avisoVacio.className = 'sin-resultados-filtro';
                const numCols = tbody.rows.length > 0 ? tbody.rows[0].cells.length : 1;
                avisoVacio.innerHTML = `<td colspan="${numCols}" style="text-align: center; color: #999;">Ningún registro coincide con la búsqueda</td>`;
                tbody.appendChild(avisoVacio);
            }
            avisoVacio.style.display = '';
        } else if (avisoVacio) {
            avisoVacio.style.display = 'none';
        }
    } catch (err) {
        console.error("Error aplicando filtro a tabla:", err);
    }
}


export function construirFilaFiltros(config) {
    try {
        const tbody = document.getElementById(config.tbody);
        if (!tbody) return;
        const tabla = tbody.closest('table');
        if (!tabla) return;

        // Evitar duplicar el buscador si ya existe
        if (tabla.previousElementSibling && tabla.previousElementSibling.classList.contains('buscador-global-tabla')) return;

        const buscadorContenedor = document.createElement('div');
        buscadorContenedor.className = 'buscador-global-tabla';
        buscadorContenedor.style.marginBottom = '15px';
        buscadorContenedor.style.position = 'relative';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '🔍 Buscar en esta tabla...';
        input.style.width = '100%';
        input.style.padding = '8px 30px 8px 10px';
        input.style.boxSizing = 'border-box';
        input.style.borderRadius = '5px';
        input.style.border = '1px solid #ccc';
        input.style.fontSize = '14px';

        const btnLimpiar = document.createElement('button');
        btnLimpiar.innerHTML = '✕';
        btnLimpiar.style.position = 'absolute';
        btnLimpiar.style.right = '5px';
        btnLimpiar.style.top = '50%';
        btnLimpiar.style.transform = 'translateY(-50%)';
        btnLimpiar.style.background = 'none';
        btnLimpiar.style.border = 'none';
        btnLimpiar.style.cursor = 'pointer';
        btnLimpiar.style.fontSize = '14px';
        btnLimpiar.style.color = '#888';
        btnLimpiar.style.display = 'none';

        input.addEventListener('input', () => {
            btnLimpiar.style.display = input.value ? 'block' : 'none';
            aplicarFiltrosTabla(tbody, input);
        });

        btnLimpiar.addEventListener('click', () => {
            input.value = '';
            btnLimpiar.style.display = 'none';
            aplicarFiltrosTabla(tbody, input);
        });

        buscadorContenedor.appendChild(input);
        buscadorContenedor.appendChild(btnLimpiar);

        tabla.parentNode.insertBefore(buscadorContenedor, tabla);

        // Cada vez que la app repinta la tabla se pierden los display:none, así
        // que se vuelve a aplicar el filtro vigente sobre las filas nuevas.
        new MutationObserver(() => aplicarFiltrosTabla(tbody, input))
            .observe(tbody, { childList: true });
            
    } catch (err) {
        console.error("Error construyendo buscador global:", err);
    }
}


export function inicializarFiltrosTablas() {
    TABLAS_CON_FILTRO.forEach(construirFilaFiltros);
}
