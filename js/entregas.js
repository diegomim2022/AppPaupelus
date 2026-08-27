import { APP } from './app.js';
import { supabaseClient } from './db.js';
import { cerrarModal, esc, formatearFecha, parsearFechaLocal, leerMiles, ponerMiles, hoyISO } from './utils.js';
import { esGuiaValida } from './ventas.js';

export function actualizarEntregas() {
    try {
        console.log("-> Ejecutando actualizarEntregas(). Entregas en memoria:", APP.datos.entregas.length);
        const tabla = document.getElementById('tabla-entregas');
        if(!tabla) return;
        tabla.innerHTML = '';
        const ordenadas = [...APP.datos.entregas].sort((a, b) => {
            const diff = b.fecha.localeCompare(a.fecha);
            if (diff !== 0) return diff;
            const vA = APP.datos.ventas.find(v => v.id === a.venta_id);
            const vB = APP.datos.ventas.find(v => v.id === b.venta_id);
            return (Number(vB?.numero) || 0) - (Number(vA?.numero) || 0);
        });
        ordenadas.forEach(e => {
            const dias = Math.floor((new Date() - parsearFechaLocal(e.fecha)) / (1000 * 60 * 60 * 24));
            const guiaAsignada = esGuiaValida(e.guia) ? e.guia : 'Sin asignar';
            const estadoClass = e.saldo === 0 ? 'color:#2e7d5c;font-weight:bold;' : 'color:#c0575c;';
            const fila = document.createElement('tr');
            
            const venta = APP.datos.ventas.find(v => v.id === e.venta_id);
            const numVenta = venta ? venta.numero : '-';
            
            fila.innerHTML = `<td><strong>${esc(guiaAsignada)}</strong></td><td>#${numVenta}</td><td>${esc(e.cliente)}</td><td>${formatearFecha(e.fecha)}</td><td>$${e.monto.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${e.abono.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td style="${estadoClass}">$${e.saldo.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>${esc(e.empresa) || 'Por definir'}</td><td>${e.saldo === 0 ? '✅ Pagado' : '⏳ Pendiente'}</td><td>${dias}d</td><td><button class="btn-small" onclick="abrirModalPago('${esc(e.id)}')" title="Registrar pago" ${e.saldo === 0 ? 'disabled style="opacity:0.4"' : ''}>💵</button> <button class="btn-small" onclick="abrirModalGuia('${esc(e.id)}')" title="Asignar guía">🏷️</button></td>`;
            tabla.appendChild(fila);
        });
        if(APP.datos.entregas.length === 0) tabla.innerHTML = '<tr><td colspan="11" style="text-align: center; color: #999;">Sin entregas registradas</td></tr>';

        const recibido = APP.datos.entregas.reduce((sum, e) => sum + e.abono, 0);
        const total = APP.datos.entregas.reduce((sum, e) => sum + e.monto, 0);
        const transito = total - recibido;
        const hoy = new Date();
        const vencido = APP.datos.entregas.filter(e => e.saldo > 0 && (hoy - parsearFechaLocal(e.fecha)) > 30 * 24 * 60 * 60 * 1000).reduce((sum, e) => sum + e.saldo, 0);

        const elRecibido = document.getElementById('ent-recibido');
        if(elRecibido) elRecibido.textContent = '$' + recibido.toLocaleString('es-CO', {maximumFractionDigits: 0});
        const elTransito = document.getElementById('ent-transito');
        if(elTransito) elTransito.textContent = '$' + transito.toLocaleString('es-CO', {maximumFractionDigits: 0});
        const elVencido = document.getElementById('ent-vencido');
        if(elVencido) elVencido.textContent = '$' + vencido.toLocaleString('es-CO', {maximumFractionDigits: 0});

        actualizarListaEmpresas();
    } catch (err) {
        console.error("Error en actualizarEntregas:", err);
    }
}

export function actualizarListaEmpresas() {
    try {
        const dl = document.getElementById('lista-empresas');
        if(!dl) return;
        const unicos = [...new Set(APP.datos.entregas.map(e => e.empresa).filter(emp => emp && emp.trim() && emp !== 'Por definir'))].sort();
        dl.innerHTML = unicos.map(emp => `<option value="${esc(emp)}"></option>`).join('');
    } catch (err) {
        console.error("Error en actualizarListaEmpresas:", err);
    }
}

export function abrirModalPago(entregaId) {
    try {
        const entrega = APP.datos.entregas.find(x => x.id === entregaId);
        if(!entrega) return;
        document.getElementById('modal-pago-entrega-id').value = entregaId;
        document.getElementById('modal-pago-monto').value = '';
        document.getElementById('modal-pago-quien').value = 'Cliente';
        document.getElementById('modal-pago-fecha').value = hoyISO();
        const guiaTxt = esGuiaValida(entrega.guia) ? entrega.guia : 'Sin guía';
        document.getElementById('modal-pago-resumen').innerHTML =
            `<strong>${esc(entrega.cliente)}</strong> — ${formatearFecha(entrega.fecha)}<br>` +
            `Guía: ${esc(guiaTxt)} | Empresa: ${esc(entrega.empresa || 'Por definir')}<br>` +
            `Total: $${entrega.monto.toLocaleString('es-CO', {maximumFractionDigits: 0})} | ` +
            `Abonado: $${entrega.abono.toLocaleString('es-CO', {maximumFractionDigits: 0})} | ` +
            `<strong style="color:#c0575c;">Saldo: $${entrega.saldo.toLocaleString('es-CO', {maximumFractionDigits: 0})}</strong>`;
        document.getElementById('modal-pago').style.display = 'flex';
    } catch (err) {
        console.error("Error en abrirModalPago:", err);
        alert("Error al abrir modal de pago.");
    }
}

export function ponerSaldoCompleto() {
    try {
        const id = document.getElementById('modal-pago-entrega-id').value;
        const entrega = APP.datos.entregas.find(x => x.id === id);
        if(entrega) ponerMiles('modal-pago-monto', entrega.saldo);
    } catch (err) {
        console.error("Error en ponerSaldoCompleto:", err);
    }
}

export async function guardarPagoModal(e) {
    try {
        e.preventDefault();
        const entregaId = document.getElementById('modal-pago-entrega-id').value;
        const monto = leerMiles('modal-pago-monto');
        const quien = document.getElementById('modal-pago-quien').value;
        const fecha = document.getElementById('modal-pago-fecha').value;
        if(monto <= 0) { alert('El monto debe ser mayor a 0'); return; }
        const entrega = APP.datos.entregas.find(x => x.id === entregaId);
        if(!entrega) { alert('No se encontró el envío'); return; }

        const nuevoAbono = entrega.abono + monto;
        const nuevoSaldo = Math.max(0, entrega.monto - nuevoAbono);

        const { data: pagoCreado, error: errPago } = await supabaseClient.from('pagos')
            .insert({ entrega_id: entregaId, fecha, monto, quien_paga: quien }).select();
        if(errPago) { alert('❌ Error al registrar el pago: ' + errPago.message); return; }

        const { error: errEnt } = await supabaseClient.from('entregas')
            .update({ abono: nuevoAbono, saldo: nuevoSaldo }).eq('id', entregaId);
        if(errEnt) { alert('❌ Error al actualizar el envío: ' + errEnt.message); return; }

        const venta = APP.datos.ventas.find(v => v.id === entrega.venta_id);
        if(venta) { venta.abono = nuevoAbono; venta.saldo = nuevoSaldo; }

        entrega.pagos.push(pagoCreado[0]);
        entrega.abono = nuevoAbono;
        entrega.saldo = nuevoSaldo;
        cerrarModal('modal-pago');
        APP.actualizarTodo();
        alert('✅ Pago registrado');
    } catch (err) {
        console.error("Error capturado en guardarPagoModal:", err);
        alert("Ocurrió un error inesperado al guardar el pago. Revisa la consola.");
    }
}

export function abrirModalGuia(entregaId) {
    try {
        const entrega = APP.datos.entregas.find(x => x.id === entregaId);
        if(!entrega) return;
        document.getElementById('modal-guia-entrega-id').value = entregaId;
        document.getElementById('modal-guia-numero').value = esGuiaValida(entrega.guia) ? entrega.guia : '';
        document.getElementById('modal-guia-empresa').value = (entrega.empresa && entrega.empresa !== 'Por definir') ? entrega.empresa : '';
        document.getElementById('modal-guia-resumen').innerHTML =
            `<strong>${esc(entrega.cliente)}</strong> — ${formatearFecha(entrega.fecha)}<br>` +
            `Total: $${entrega.monto.toLocaleString('es-CO', {maximumFractionDigits: 0})} | Estado: ${entrega.saldo === 0 ? '✅ Pagado' : '⏳ Pendiente'}`;
        document.getElementById('modal-guia').style.display = 'flex';
    } catch (err) {
        console.error("Error en abrirModalGuia:", err);
        alert("Error al abrir modal de guía.");
    }
}

export async function guardarGuiaModal(e) {
    try {
        e.preventDefault();
        const entregaId = document.getElementById('modal-guia-entrega-id').value;
        const numero = document.getElementById('modal-guia-numero').value.trim();
        const empresa = document.getElementById('modal-guia-empresa').value.trim();
        if(!numero && !empresa) { alert('Ingresa al menos el número de guía o la empresa'); return; }
        const entrega = APP.datos.entregas.find(x => x.id === entregaId);
        if(!entrega) { alert('No se encontró el envío'); return; }
        const cambios = {};
        if(numero) cambios.guia = numero;
        if(empresa) cambios.empresa = empresa;
        const { error } = await supabaseClient.from('entregas').update(cambios).eq('id', entregaId);
        if(error) { alert('❌ Error al actualizar: ' + error.message); return; }
        Object.assign(entrega, cambios);
        cerrarModal('modal-guia');
        APP.actualizarTodo();
        alert('✅ Guía actualizada');
    } catch (err) {
        console.error("Error capturado en guardarGuiaModal:", err);
        alert("Ocurrió un error inesperado al guardar la guía. Revisa la consola.");
    }
}
