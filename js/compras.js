import { APP } from './app.js';
import { supabaseClient } from './db.js';
import { leerMiles, esc, hoyISO } from './utils.js';

let carritoCompra = [];


export function actualizarListaProveedores() {
    try {
        const dl = document.getElementById('lista-proveedores');
        if(!dl) return;
        const unicos = [...new Set(APP.datos.compras.map(c => c.proveedor).filter(p => p && p.trim()))].sort();
        dl.innerHTML = unicos.map(p => `<option value="${esc(p)}"></option>`).join('');
    } catch (err) {
        console.error("Error al actualizar la lista de proveedores", err);
    }
}


export function agregarItemCompra() {
    try {
        const refInput = document.getElementById('comp-ref');
        const ref = refInput.value.trim();
        const cant = parseInt(document.getElementById('comp-cant').value) || 0;
        const costo = leerMiles('comp-costo');
        if(!ref || cant <= 0 || costo <= 0) { alert('Completa referencia, cantidad y costo'); return; }

        const prod = APP.datos.productos.find(p => p.ref === ref);
        if(!prod) { alert('❌ Esa referencia no existe en Productos. Créala primero en el módulo Productos.'); return; }

        const nombre = refInput.dataset.nombreSeleccionado || prod.nombre || '';
        carritoCompra.push({ ref, nombre, cantidad: cant, costo_unitario: costo, costo_total: cant * costo });

        refInput.value = '';
        refInput.dataset.nombreSeleccionado = '';
        document.getElementById('comp-cant').value = '1';
        document.getElementById('comp-costo').value = '';
        refInput.focus();
        renderCarritoCompra();
    } catch (err) {
        console.error("Error capturado en agregarItemCompra:", err);
        alert("Ocurrió un error inesperado. Revisa la consola.");
    }
}

export function quitarItemCompra(idx) {
    try {
        carritoCompra.splice(idx, 1);
        renderCarritoCompra();
    } catch (err) {
        console.error("Error capturado en quitarItemCompra:", err);
        alert("Ocurrió un error inesperado. Revisa la consola.");
    }
}

export function renderCarritoCompra() {
    try {
        const tbody = document.getElementById('carrito-compra-body');
        if(!carritoCompra.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#999;">Sin productos agregados aún</td></tr>';
        } else {
            tbody.innerHTML = carritoCompra.map((it, i) =>
                `<tr><td><strong>${esc(it.ref)}</strong></td><td>${esc(it.nombre)}</td><td>${it.cantidad}</td><td>$${it.costo_unitario.toLocaleString('es-CO')}</td><td>$${it.costo_total.toLocaleString('es-CO')}</td><td></td><td><button class="btn" style="background:#c0575c;padding:4px 10px;" onclick="quitarItemCompra(${i})">✕</button></td></tr>`
            ).join('');
        }
        const total = carritoCompra.reduce((s, it) => s + it.costo_total, 0);
        document.getElementById('carrito-compra-total').textContent = '$' + total.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('carrito-compra-costo').textContent = '$' + total.toLocaleString('es-CO', {maximumFractionDigits: 0});
    } catch (err) {
        console.error("Error capturado en renderCarritoCompra:", err);
        alert("Ocurrió un error inesperado. Revisa la consola.");
    }
}

export async function agregarCompra(e) {
    try {
        e.preventDefault();
        const fecha = document.getElementById('comp-fecha').value;
        const prov = document.getElementById('comp-prov').value.trim();
        if(!fecha || !prov) { alert('Completa fecha y proveedor'); return; }

        const editId = document.getElementById('comp-edit-id').value;
        if(editId) {
            if(carritoCompra.length !== 1) { alert('En modo edición solo se permite un producto'); return; }
            const it = carritoCompra[0];
            const cambios = { fecha, proveedor: prov, ref: it.ref, nombre: it.nombre, cantidad: it.cantidad, costo_unitario: it.costo_unitario, costo_total: it.costo_total };
            const { error } = await supabaseClient.from('compras').update(cambios).eq('id', editId);
            if(error) { alert('❌ Error al actualizar: ' + error.message); return; }
            const c = APP.datos.compras.find(x => x.id === editId);
            if(c) Object.assign(c, cambios);
            cancelarEdicionCompra();
            alert('✅ Compra actualizada');
        } else {
            if(carritoCompra.length === 0) { alert('Agrega al menos un producto a la compra'); return; }
            const registros = carritoCompra.map(it => ({
                fecha, proveedor: prov, ref: it.ref, nombre: it.nombre,
                cantidad: it.cantidad, costo_unitario: it.costo_unitario, costo_total: it.costo_total
            }));
            const { data, error } = await supabaseClient.from('compras').insert(registros).select();
            if(error) { alert('❌ Error al registrar: ' + error.message); return; }
            data.forEach(d => APP.datos.compras.push(d));
            carritoCompra = [];
            renderCarritoCompra();
            e.target.reset();
            document.getElementById('comp-fecha').value = hoyISO();
            alert('✅ Compra registrada (' + data.length + ' productos)');
        }
        APP.actualizarTodo();
    } catch (err) {
        console.error("Error capturado en agregarCompra:", err);
        alert("Ocurrió un error inesperado. Revisa la consola.");
    }
}

export function editarCompra(id) {
    try {
        const c = APP.datos.compras.find(x => x.id === id);
        if(!c) return;
        document.getElementById('comp-edit-id').value = id;
        document.getElementById('comp-fecha').value = c.fecha;
        document.getElementById('comp-prov').value = c.proveedor || '';
        carritoCompra = [{ ref: c.ref, nombre: c.nombre || '', cantidad: c.cantidad, costo_unitario: c.costo_unitario, costo_total: c.costo_total }];
        renderCarritoCompra();
        document.getElementById('comp-submit-btn').textContent = '💾 Guardar Cambios';
        document.getElementById('comp-cancel-btn').style.display = 'inline-block';
        document.getElementById('comp-ref').scrollIntoView({behavior: 'smooth', block: 'center'});
    } catch (err) {
        console.error("Error capturado en editarCompra:", err);
        alert("Ocurrió un error inesperado. Revisa la consola.");
    }
}

export function cancelarEdicionCompra() {
    try {
        document.getElementById('comp-edit-id').value = '';
        document.querySelector('#compras form').reset();
        document.getElementById('comp-fecha').value = hoyISO();
        carritoCompra = [];
        renderCarritoCompra();
        document.getElementById('comp-submit-btn').textContent = '✅ Registrar Compra Completa';
        document.getElementById('comp-cancel-btn').style.display = 'none';
    } catch (err) {
        console.error("Error capturado en cancelarEdicionCompra:", err);
        alert("Ocurrió un error inesperado. Revisa la consola.");
    }
}

