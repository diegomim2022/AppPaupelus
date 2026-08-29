import { supabaseClient } from './db.js';
import { APP } from './app.js';
import { esc, formatearFecha, parsearFechaLocal, hoyISO } from './utils.js';

// Compara dos montos con tolerancia de medio peso (evita falsos errores por float/redondeo)
const casi = (a, b) => Math.abs(a - b) < 0.5;

function aISOLocal(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
}

function ventasEnRango(desde, hasta) {
    const d = parsearFechaLocal(desde);
    const h = parsearFechaLocal(hasta);
    h.setHours(23, 59, 59, 999);
    return APP.datos.ventas.filter(v => {
        const f = parsearFechaLocal(v.fecha);
        return f >= d && f <= h;
    });
}

// Calcula el desglose y las validaciones para un rango (devengo: total de cada venta)
function calcular(desde, hasta) {
    const ventas = ventasEnRango(desde, hasta);
    const noLiquidadas = ventas.filter(v => !v.liquidacion_id);

    const V = noLiquidadas.reduce((s, v) => s + (Number(v.total) || 0), 0);
    const C = noLiquidadas.reduce((s, v) => s + (Number(v.costo_total) || 0), 0);
    const E = noLiquidadas.reduce((s, v) => s + (Number(v.costo_envio) || 0), 0);
    const U = V - C - E;

    // NO redondear los intermedios: así capital y utilidad suman exacto
    const capitalPaula = C / 2;
    const capitalDiego = C / 2;
    const utilidadPaula = U * 0.7;
    const utilidadDiego = U * 0.3;
    const totalPaula = capitalPaula + utilidadPaula;
    const totalDiego = capitalDiego + utilidadDiego;

    const errores = [];
    if (noLiquidadas.length === 0) errores.push('No hay ventas sin liquidar en este rango.');
    if (!casi(U, V - C - E)) errores.push('La utilidad no cuadra (U ≠ V − C − E).');
    if (!casi(capitalPaula + capitalDiego, C)) errores.push('El capital repartido no coincide con C.');
    if (!casi(utilidadPaula + utilidadDiego, U)) errores.push('La utilidad repartida no coincide con U.');
    if (!casi(totalPaula + totalDiego, V - E)) errores.push('El total repartido no coincide con V − E.');
    if (U < 0) errores.push('Utilidad negativa: esta semana no se puede liquidar.');

    const superpuestas = (APP.datos.liquidaciones || []).filter(l => {
        return desde <= l.fecha_hasta && hasta >= l.fecha_desde;
    });
    if (superpuestas.length > 0) errores.push('El rango se superpone con una liquidación ya guardada.');

    return { desde, hasta, ventas: noLiquidadas, V, C, E, U, capitalPaula, capitalDiego, utilidadPaula, utilidadDiego, totalPaula, totalDiego, errores };
}

export function calcularLiquidacion() {
    const errorEl = document.getElementById('liq-mensaje-error');
    const panel = document.getElementById('liq-desglose-panel');
    if (errorEl) errorEl.style.display = 'none';
    if (panel) panel.style.display = 'none';

    const desde = document.getElementById('liq-desde').value;
    const hasta = document.getElementById('liq-hasta').value;
    if (!desde || !hasta) { alert('Selecciona ambas fechas.'); return; }
    if (desde > hasta) { alert('La fecha "Desde" no puede ser mayor que "Hasta".'); return; }

    const r = calcular(desde, hasta);

    if (r.errores.length > 0) {
        if (errorEl) {
            errorEl.innerHTML = r.errores.map(e => `• ${esc(e)}`).join('<br>');
            errorEl.style.display = 'block';
        }
        return;
    }

    const f = (n) => '$' + Math.round(n).toLocaleString('es-CO');
    document.getElementById('liq-v').textContent = f(r.V);
    document.getElementById('liq-cant-ventas').textContent = r.ventas.length + ' ventas encontradas';
    document.getElementById('liq-c').textContent = f(r.C);
    document.getElementById('liq-e').textContent = f(r.E);
    document.getElementById('liq-u').textContent = f(r.U);
    document.getElementById('liq-paula-total').textContent = f(r.totalPaula);
    document.getElementById('liq-paula-formula').textContent = 'Capital: ' + f(r.capitalPaula) + ' + Utilidad: ' + f(r.utilidadPaula);
    document.getElementById('liq-diego-total').textContent = f(r.totalDiego);
    document.getElementById('liq-diego-formula').textContent = 'Capital: ' + f(r.capitalDiego) + ' + Utilidad: ' + f(r.utilidadDiego);

    pintarListaVentas(r.ventas);
    if (panel) panel.style.display = 'block';
}

export async function guardarLiquidacion() {
    const desde = document.getElementById('liq-desde').value;
    const hasta = document.getElementById('liq-hasta').value;
    if (!desde || !hasta) { alert('Selecciona ambas fechas.'); return; }

    // Recalcular desde cero (sin depender de un "calcular" previo)
    const r = calcular(desde, hasta);

    if (r.errores.length > 0) {
        alert('No se puede guardar:\n• ' + r.errores.join('\n• '));
        return;
    }

    if (!confirm('¿Guardar esta liquidación? Las ventas incluidas quedarán marcadas como liquidadas.')) return;

    const btn = document.getElementById('liq-guardar-btn');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const payload = {
            fecha_desde: r.desde,
            fecha_hasta: r.hasta,
            total_ventas: Math.round(r.V),
            total_costo: Math.round(r.C),
            total_envios: Math.round(r.E),
            utilidad: Math.round(r.U),
            capital_paula: Math.round(r.capitalPaula),
            capital_diego: Math.round(r.capitalDiego),
            utilidad_paula: Math.round(r.utilidadPaula),
            utilidad_diego: Math.round(r.utilidadDiego),
            total_paula: Math.round(r.totalPaula),
            total_diego: Math.round(r.totalDiego),
            total_liquidado: Math.round(r.totalPaula + r.totalDiego)
        };

        const { data: liqData, error: liqError } = await supabaseClient
            .from('liquidaciones').insert([payload]).select().single();

        if (liqError) throw liqError;

        const liquidacion_id = liqData.id;
        const ventaIds = r.ventas.map(v => v.id);

        const { error: updError } = await supabaseClient
            .from('ventas')
            .update({ liquidacion_id })
            .in('id', ventaIds);

        if (updError) throw updError;

        alert('✅ Liquidación guardada correctamente.');
        await APP.cargarDatos();
        APP.actualizarTodo();
        document.getElementById('liq-desglose-panel').style.display = 'none';
    } catch (e) {
        alert('Error al guardar la liquidación: ' + (e.message || e));
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Guardar y Liquidar Ventas';
    }
}

// Lista los productos (ítems) de las ventas a liquidar, para verificar antes de guardar
function pintarListaVentas(ventas) {
    const cont = document.getElementById('liq-lista-ventas');
    if (!cont) return;
    if (ventas.length === 0) { cont.innerHTML = ''; return; }
    let filas = '';
    ventas.forEach(v => {
        const items = (v.items && v.items.length) ? v.items : [{
            ref: v.ref, nombre: v.nombre || '', cantidad: v.cantidad || 1, subtotal: v.total
        }];
        items.forEach(it => {
            const prod = APP.datos.productos.find(p => p.ref === it.ref);
            const nombre = it.nombre || (prod ? prod.nombre : '');
            const subtotal = it.subtotal !== undefined ? it.subtotal : ((it.cantidad || 0) * (it.precio || 0));
            filas += `<tr><td>#${esc(v.numero) || '-'}</td><td>${formatearFecha(v.fecha)}</td><td><strong>${esc(it.ref)}</strong></td><td>${esc(nombre)}</td><td>${it.cantidad}</td><td>$${Math.round(subtotal).toLocaleString('es-CO')}</td></tr>`;
        });
    });
    cont.innerHTML = `<h3 style="color:#d6598c;">📦 Productos incluidos en esta liquidación (${ventas.length} ventas)</h3>
        <table><thead><tr><th>N°</th><th>Fecha</th><th>Ref</th><th>Nombre</th><th>Cant</th><th>Subtotal</th></tr></thead><tbody>${filas}</tbody></table>`;
}

// Muestra en un modal los productos que se liquidaron en una liquidación guardada
export function verDetalleLiquidacion(id) {
    try {
        const cont = document.getElementById('modal-liq-detalle-contenido');
        if (!cont) return;
        const ventas = APP.datos.ventas.filter(v => String(v.liquidacion_id) === String(id));
        if (ventas.length === 0) {
            cont.innerHTML = '<p style="color:#999;">No se encontraron ventas para esta liquidación.</p>';
        } else {
            let filas = '';
            ventas.forEach(v => {
                const items = (v.items && v.items.length) ? v.items : [{
                    ref: v.ref, nombre: v.nombre || '', cantidad: v.cantidad || 1, subtotal: v.total
                }];
                items.forEach(it => {
                    const prod = APP.datos.productos.find(p => p.ref === it.ref);
                    const nombre = it.nombre || (prod ? prod.nombre : '');
                    const subtotal = it.subtotal !== undefined ? it.subtotal : ((it.cantidad || 0) * (it.precio || 0));
                    filas += `<tr><td>#${esc(v.numero) || '-'}</td><td>${formatearFecha(v.fecha)}</td><td><strong>${esc(it.ref)}</strong></td><td>${esc(nombre)}</td><td>${it.cantidad}</td><td>$${Math.round(subtotal).toLocaleString('es-CO')}</td></tr>`;
                });
            });
            cont.innerHTML = `<table><thead><tr><th>N°</th><th>Fecha</th><th>Ref</th><th>Nombre</th><th>Cant</th><th>Subtotal</th></tr></thead><tbody>${filas}</tbody></table>`;
        }
        document.getElementById('modal-liq-detalle').style.display = 'flex';
    } catch (e) {
        console.error('Error en verDetalleLiquidacion:', e);
        alert('Error al mostrar el detalle de la liquidación.');
    }
}

export function actualizarLiquidaciones() {
    // Fechas por defecto: lunes de la semana actual → hoy
    const hoy = new Date();
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
    const desdeEl = document.getElementById('liq-desde');
    const hastaEl = document.getElementById('liq-hasta');
    if (desdeEl && !desdeEl.value) desdeEl.value = aISOLocal(lunes);
    if (hastaEl) hastaEl.value = hoyISO();
    renderHistorialLiquidaciones();
}

export async function renderHistorialLiquidaciones() {
    try {
        const tabla = document.getElementById('tabla-liquidaciones');
        if (!tabla) return;
        tabla.innerHTML = '';

        // Cargar desde la BD para tener siempre el historial real
        const { data, error } = await supabaseClient
            .from('liquidaciones').select('*').order('fecha_hasta', { ascending: false });

        if (error) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#c0575c;">Error al cargar el historial</td></tr>';
            return;
        }
        if (!data || data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#999;">Sin liquidaciones guardadas</td></tr>';
            return;
        }

        const f = (n) => '$' + Math.round(Number(n)).toLocaleString('es-CO');
        data.forEach(l => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${formatearFecha(l.created_at ? String(l.created_at).split('T')[0] : '')}</td>
                <td>${formatearFecha(l.fecha_desde)} a ${formatearFecha(l.fecha_hasta)}</td>
                <td>${f(l.total_ventas)}</td>
                <td><strong style="color:green;">${f(l.utilidad)}</strong></td>
                <td>${f(l.total_paula)}</td>
                <td>${f(l.total_diego)}</td>
                <td><button type="button" class="btn-small" onclick="APP.verDetalleLiquidacion('${esc(l.id)}')">📋 Ver</button></td>
            `;
            tabla.appendChild(fila);
        });
    } catch (e) {
        console.error('Error en renderHistorialLiquidaciones:', e);
    }
}
