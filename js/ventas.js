import { APP } from './app.js';
import { supabaseClient } from './db.js';
import { esc, formatearFecha, leerMiles, ponerMiles, hoyISO, cerrarModal, formatMiles, parsearFechaLocal } from './utils.js';

export let carritoActual = [];

export const CIUDADES_CORREGIDAS = {
    'bogota': 'Bogotá', 'bogotá': 'Bogotá',
    'medellin': 'Medellín', 'cali': 'Cali', 'barranquilla': 'Barranquilla',
    'bucaramanga': 'Bucaramanga', 'cartagena': 'Cartagena', 'cucuta': 'Cúcuta',
    'ibague': 'Ibagué', 'pereira': 'Pereira', 'manizales': 'Manizales',
    'santa marta': 'Santa Marta', 'villavicencio': 'Villavicencio',
    'pasto': 'Pasto', 'monteria': 'Montería', 'neiva': 'Neiva',
    'valledupar': 'Valledupar', 'popayan': 'Popayán', 'sincelejo': 'Sincelejo',
    'armenia': 'Armenia', 'tunja': 'Tunja', 'quibdo': 'Quibdó',
    'fusagasuga': 'Fusagasugá', 'tulua': 'Tuluá', 'duitama': 'Duitama',
    'palmira': 'Palmira', 'soacha': 'Soacha', 'soledad': 'Soledad',
    'bello': 'Bello', 'dosquebradas': 'Dosquebradas', 'cartago': 'Cartago',
    'girardot': 'Girardot', 'rionegro': 'Rionegro', 'barrancabermeja': 'Barrancabermeja',
    'maicao': 'Maicao', 'lorica': 'Lorica', 'magangue': 'Magangué',
    'tumaco': 'Tumaco', 'ipiales': 'Ipiales', 'pitalito': 'Pitalito',
    'buenaventura': 'Buenaventura', 'buga': 'Buga', 'mocoa': 'Mocoa',
    'leticia': 'Leticia', 'yopal': 'Yopal', 'inirida': 'Inírida',
    'saravena': 'Saravena', 'ocaña': 'Ocaña', 'pamplona': 'Pamplona',
    'aguachica': 'Aguachica', 'zipaquira': 'Zipaquirá', 'chia': 'Chía',
    'cajica': 'Cajicá', 'funza': 'Funza', 'mosquera': 'Mosquera',
    'facatativa': 'Facatativá', 'tocancipa': 'Tocancipá', 'ubate': 'Ubaté',
    'calarca': 'Calarcá', 'jamundi': 'Jamundí', 'yumbo': 'Yumbo',
    'sabaneta': 'Sabaneta', 'barbosa': 'Barbosa', 'segovia': 'Segovia',
    'flandes': 'Flandes', 'fresno': 'Fresno', 'mariquita': 'Mariquita',
    'cienaga': 'Ciénaga', 'fundacion': 'Fundación', 'rioacha': 'Riohacha',
    'riohacha': 'Riohacha', 'tame': 'Tame', 'fortul': 'Fortul',
    'tierralta': 'Tierralta', 'sampues': 'Sampués', 'coveñas': 'Coveñas',
    'agustin codazi': 'Agustín Codazí', 'amalfi': 'Amalfi', 'arjona': 'Arjona',
    'ayapel': 'Ayapel', 'bahia solano': 'Bahía Solano', 'barbacoas': 'Barbacoas',
    'boca de satinga': 'Boca de Satinga', 'bolivar': 'Bolívar',
    'carmen de atrato': 'Carmen de Atrato', 'carmen de viboral': 'Carmen de Viboral',
    'cartajena del chaira': 'Cartagena del Chairá', 'cerrito valle': 'Cerrito Valle',
    'chaparrera': 'Chaparrera', 'chimichagua': 'Chimichagua', 'chinacota': 'Chinácota',
    'chiquinquira': 'Chiquinquirá', 'cimitarra': 'Cimitarra', 'colon': 'Colón',
    'consaca': 'Consacá', 'corinto': 'Corinto', 'darien': 'Darién',
    'don matias': 'Don Matías', 'el copey': 'El Copey', 'engativa': 'Engativá',
    'fomeque': 'Fómeque', 'fonseca': 'Fonseca', 'frontino': 'Frontino',
    'guaranda': 'Guaranda', 'huila': 'Huila', 'isnos': 'Isnos',
    'itsmina': 'Istmina', 'la ceja': 'La Ceja', 'la dorada': 'La Dorada',
    'la plata': 'La Plata', 'llorente': 'Llorente', 'loma de arena': 'Loma de Arena',
    'los patios': 'Los Patios', 'madrid': 'Madrid', 'maria la baja': 'María La Baja',
    'nepomuceno': 'San Juan Nepomuceno', 'oporapa': 'Oporapa',
    'pie de cuesta': 'Piedecuesta', 'puerto boyaca': 'Puerto Boyacá',
    'puerto asis': 'Puerto Asís', 'puerto parra': 'Puerto Parra',
    'putumayo': 'Putumayo', 'risaralda': 'Risaralda',
    'saladoblanco': 'Saladoblanco', 'saldaña': 'Saldaña',
    'san alberto': 'San Alberto', 'san anonio': 'San Antonio', 'san antonio': 'San Antonio',
    'san francisco': 'San Francisco', 'san gil': 'San Gil',
    'san jacinto': 'San Jacinto', 'san onofre': 'San Onofre',
    'san pelayo': 'San Pelayo', 'san juan de uraba': 'San Juan de Urabá',
    'san martin': 'San Martín', 'santa rosa de cabal': 'Santa Rosa de Cabal',
    'santa rosa de osos': 'Santa Rosa de Osos', 'santander': 'Santander',
    'santuario': 'Santuario', 'sesquile': 'Sesquilé', 'silvania': 'Silvania',
    'suarez': 'Suárez', 'taraza': 'Tarazá', 'teruel': 'Teruel',
    'toledo': 'Toledo', 'urumita': 'Urumita', 'vegachi': 'Vegachí',
    'villa de leiva': 'Villa de Leyva', 'villa del rasario': 'Villa del Rosario',
    'villa del rosario': 'Villa del Rosario', 'villa gorgona': 'Villa Gorgona',
    'yarumal': 'Yarumal', 'yondo': 'Yondó', 'zaragoza': 'Zaragoza',
    'aguadedios': 'Agua de Dios',
};

export function normalizarCiudad(ciudad) {
    if(!ciudad) return '';
    const clave = ciudad.trim().toLowerCase();
    return CIUDADES_CORREGIDAS[clave] || ciudad.trim();
}

export function obtenerCiudadesUnicas() {
    const todas = APP.datos.ventas.map(v => normalizarCiudad(v.ciudad)).filter(c => c && c !== '-');
    return [...new Set(todas)].sort((a, b) => a.localeCompare(b, 'es'));
}

export function esGuiaValida(guia) {
    return !!(guia && !guia.startsWith('ENVIO') && !guia.startsWith('AUTO'));
}

export function itemsDeVenta(v) {
    if(v.items && v.items.length) return v.items;
    return [{
        ref: v.ref, nombre: '', cantidad: v.cantidad || 0, precio: v.precio || 0,
        subtotal: v.total !== undefined ? v.total : (v.cantidad || 0) * (v.precio || 0),
        costo_unitario: v.costo_unitario || 0, costo_total: v.costo_total || 0
    }];
}

export function filaVentaHTML(v) {
    const costo = v.costo_total || 0;
    const envio = v.costo_envio || 0;
    const utilidad = v.utilidad !== undefined ? v.utilidad : (v.total - costo - envio);
    const items = itemsDeVenta(v);
    const resumen = items.map(it => {
        const prod = APP.datos.productos.find(p => p.ref === it.ref);
        const nombre = it.nombre || (prod ? prod.nombre : '');
        return `<strong>${esc(it.ref)}</strong>${nombre ? ' ' + esc(nombre) : ''} x${it.cantidad}`;
    }).join(', ');
    const clienteReal = v.cliente_id ? (v.cliente || v.cliente_nombre || '') : '';
    return `<td>${v.numero || '-'}</td><td>${formatearFecha(v.fecha)}</td><td>${resumen}</td><td>$${v.total.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${costo.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${envio.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td style="color:${utilidad>=0?'#2e7d5c':'#c0575c'}; font-weight:600;">$${utilidad.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>${esc(clienteReal)}</td><td>${esc(normalizarCiudad(v.ciudad)) || '-'}</td><td>$${v.abono.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${v.saldo.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td><button class="btn-small" onclick="editarVenta('${esc(v.id)}')">✏️</button><button class="btn-small btn-delete" onclick="APP.eliminarVenta('${esc(v.id)}')">🗑️</button></td>`;
}

export function calcularCostoFIFO(ref, cantidadNueva, fechaVenta) {
    const lotes = APP.datos.compras
        .filter(c => c.ref === ref && c.fecha <= fechaVenta)
        .sort((a, b) => a.fecha.localeCompare(b.fecha))
        .map(c => ({cantidad: c.cantidad, costo_unitario: c.costo_unitario}));

    const ventasPrevias = [];
    APP.datos.ventas.forEach(v => {
        if(v.fecha > fechaVenta) return;
        itemsDeVenta(v).forEach(it => {
            if(it.ref === ref) ventasPrevias.push({fecha: v.fecha, cantidad: it.cantidad || 0});
        });
    });
    ventasPrevias.sort((a, b) => a.fecha.localeCompare(b.fecha));
    ventasPrevias.forEach(vp => {
        let pendiente = vp.cantidad;
        while(pendiente > 0 && lotes.length) {
            const tomar = Math.min(lotes[0].cantidad, pendiente);
            lotes[0].cantidad -= tomar;
            pendiente -= tomar;
            if(lotes[0].cantidad <= 0) lotes.shift();
        }
    });

    let pendiente = cantidadNueva;
    let costoTotal = 0;
    for(const lote of lotes) {
        if(pendiente <= 0) break;
        const tomar = Math.min(lote.cantidad, pendiente);
        costoTotal += tomar * lote.costo_unitario;
        pendiente -= tomar;
    }

    if(pendiente > 0) {
        const todasCompras = APP.datos.compras.filter(c => c.ref === ref);
        const totalCosto = todasCompras.reduce((s, c) => s + c.costo_total, 0);
        const totalCant = todasCompras.reduce((s, c) => s + c.cantidad, 0);
        const promedio = totalCant > 0 ? totalCosto / totalCant : 0;
        costoTotal += pendiente * promedio;
    }

    return cantidadNueva > 0 ? costoTotal / cantidadNueva : 0;
}

export function sugerirCostoItem() {
    try {
        const ref = document.getElementById('item-ref').value.trim();
        if(!ref) return;
        const costoField = document.getElementById('item-costo');
        if(!costoField.value) {
            const fecha = document.getElementById('vent-fecha').value || hoyISO();
            const cant = parseInt(document.getElementById('item-cant').value) || 1;
            const costoUnitario = calcularCostoFIFO(ref, cant, fecha);
            if(costoUnitario > 0) { costoField.value = Math.round(costoUnitario).toLocaleString('es-CO'); }
        }
        const precioField = document.getElementById('item-precio');
        if(!precioField.value) {
            const prod = APP.datos.productos.find(p => p.ref === ref);
            if(prod && prod.precio) precioField.value = Math.round(prod.precio).toLocaleString('es-CO');
        }
        actualizarSaldoVenta();
    } catch (err) {
        console.error("Error en sugerirCostoItem:", err);
        alert("Error al sugerir costo.");
    }
}

export function agregarItemCarrito() {
    try {
        const refInput = document.getElementById('item-ref');
        const ref = refInput.value.trim();
        const cant = parseInt(document.getElementById('item-cant').value) || 1;
        const precio = leerMiles('item-precio');
        const costo = leerMiles('item-costo');
        if(!ref || cant <= 0 || precio <= 0) { alert('Completa referencia, cantidad y precio del producto'); return; }
        const nombreSeleccionado = refInput.dataset.nombreSeleccionado;
        const prod = APP.datos.productos.find(p => p.ref === ref);
        const nombre = nombreSeleccionado || (prod ? prod.nombre : '');
        carritoActual.push({
            ref, nombre, cantidad: cant, precio,
            costo_unitario: costo, subtotal: cant * precio, costo_total: cant * costo
        });
        refInput.value = '';
        refInput.dataset.nombreSeleccionado = '';
        document.getElementById('item-cant').value = '';
        document.getElementById('item-precio').value = '';
        document.getElementById('item-costo').value = '';
        refInput.focus();
        renderCarrito();
    } catch (err) {
        console.error("Error en agregarItemCarrito:", err);
        alert("Error al agregar ítem.");
    }
}

export function quitarItemCarrito(idx) {
    try {
        carritoActual.splice(idx, 1);
        renderCarrito();
    } catch (err) {
        console.error("Error en quitarItemCarrito:", err);
        alert("Error al quitar ítem.");
    }
}

export function renderCarrito() {
    try {
        const tbody = document.getElementById('tabla-carrito');
        tbody.innerHTML = '';
        if(carritoActual.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">Sin productos agregados aún</td></tr>';
        } else {
            carritoActual.forEach((it, idx) => {
                const fila = document.createElement('tr');
                fila.innerHTML = `<td><strong>${esc(it.ref)}</strong></td><td>${esc(it.nombre) || '-'}</td><td>${it.cantidad}</td><td>$${it.precio.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${it.subtotal.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${it.costo_total.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td><button type="button" class="btn-small btn-delete" onclick="quitarItemCarrito(${idx})">🗑️</button></td>`;
                tbody.appendChild(fila);
            });
        }
        const totalVenta = carritoActual.reduce((s, i) => s + i.subtotal, 0);
        const totalCosto = carritoActual.reduce((s, i) => s + i.costo_total, 0);
        document.getElementById('carrito-total').textContent = '$' + totalVenta.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('carrito-costo').textContent = '$' + totalCosto.toLocaleString('es-CO', {maximumFractionDigits: 0});
        actualizarSaldoVenta();
    } catch (err) {
        console.error("Error en renderCarrito:", err);
        alert("Error al renderizar carrito.");
    }
}

export function totalConPendiente() {
    let total = carritoActual.reduce((s, it) => s + it.subtotal, 0);
    const ref = document.getElementById('item-ref').value.trim();
    const cant = parseInt(document.getElementById('item-cant').value) || 1;
    const precio = leerMiles('item-precio');
    if(ref && precio > 0) total += cant * precio;
    return total;
}

export function actualizarSaldoVenta() {
    try {
        const el = document.getElementById('vent-saldo-display');
        if(!el) return;
        const total = totalConPendiente();
        const abono = leerMiles('vent-abono');
        const saldo = total - abono;
        el.textContent = '$' + saldo.toLocaleString('es-CO', {maximumFractionDigits: 0});
        el.style.color = saldo > 0 ? '#c0575c' : '#2e7d5c';
    } catch (err) {
        console.error("Error en actualizarSaldoVenta:", err);
    }
}

export function sugerirEnvio() {
    try {
        const envioField = document.getElementById('vent-envio');
        if(envioField.value) return;
        const ciudad = document.getElementById('vent-ciudad').value.trim().toLowerCase();
        if(!ciudad) return;
        const esBogota = ciudad === 'bogota' || ciudad === 'bogotá';
        envioField.value = esBogota ? '10.000' : '25.000';
    } catch (err) {
        console.error("Error en sugerirEnvio:", err);
    }
}

export async function agregarVenta(e) {
    try {
        e.preventDefault();
        const refPendiente = document.getElementById('item-ref').value.trim();
        const cantPendiente = parseInt(document.getElementById('item-cant').value) || 1;
        const precioPendiente = leerMiles('item-precio');
        if(refPendiente && cantPendiente > 0 && precioPendiente > 0) agregarItemCarrito();

        if(carritoActual.length === 0) { alert('Agrega al menos un producto a la venta'); return; }
        const fecha = document.getElementById('vent-fecha').value;
        const clienteInput = document.getElementById('vent-cliente');
        const cliente = clienteInput.value.trim();
        const ciudad = document.getElementById('vent-ciudad').value.trim();
        const costoEnvio = leerMiles('vent-envio');
        const abono = leerMiles('vent-abono');
        if(!fecha) { alert('La fecha es obligatoria'); return; }

        const items = carritoActual.map(it => ({...it}));
        const total = items.reduce((s, it) => s + it.subtotal, 0);
        const costoTotal = items.reduce((s, it) => s + it.costo_total, 0);
        const utilidad = total - costoTotal - costoEnvio;

        let clienteId = clienteInput.dataset.clienteId || null;
        const clienteNombre = cliente || 'Cliente';
        if(cliente && !clienteId) {
            const existente = APP.datos.clientes.find(c => c.nombre.trim().toLowerCase() === cliente.toLowerCase());
            if(existente) {
                clienteId = existente.id;
            } else {
                const { data, error } = await supabaseClient.from('clientes').insert({ nombre: cliente, ciudad }).select();
                if(error) { alert('❌ Error al crear el cliente: ' + error.message); return; }
                APP.datos.clientes.push(data[0]);
                clienteId = data[0].id;
            }
        }

        const itemsPayload = items.map(it => ({
            ref: it.ref, nombre: it.nombre, cantidad: it.cantidad, precio: it.precio,
            subtotal: it.subtotal, costo_unitario: it.costo_unitario, costo_total: it.costo_total
        }));

        const editId = document.getElementById('vent-edit-id').value;
        if(editId) {
            const v = APP.datos.ventas.find(x => x.id === editId);
            if(!v) { alert('No se encontró la venta a editar'); return; }
            const cambiosVenta = {
                fecha, cliente_id: clienteId, cliente_nombre: clienteNombre, ciudad: ciudad || 'Bogotá',
                total, costo_total: costoTotal, costo_envio: costoEnvio, abono, saldo: total - abono, utilidad
            };
            const { error: errVenta } = await supabaseClient.from('ventas').update(cambiosVenta).eq('id', editId);
            if(errVenta) { alert('❌ Error al actualizar la venta: ' + errVenta.message); return; }

            const { error: errDel } = await supabaseClient.from('venta_items').delete().eq('venta_id', editId);
            if(errDel) { alert('❌ Error al actualizar los productos de la venta: ' + errDel.message); return; }
            const { data: nuevosItems, error: errIns } = await supabaseClient.from('venta_items')
                .insert(itemsPayload.map(it => ({...it, venta_id: editId}))).select();
            if(errIns) { alert('❌ Error al guardar los productos de la venta: ' + errIns.message); return; }

            const entrega = APP.datos.entregas.find(x => x.venta_id === v.id);
            if(entrega) {
                const cambiosEntrega = { cliente_nombre: clienteNombre, fecha, monto: total, abono, saldo: Math.max(0, total - abono) };
                const { error: errEnt } = await supabaseClient.from('entregas').update(cambiosEntrega).eq('id', entrega.id);
                if(errEnt) { alert('❌ Error al actualizar el envío: ' + errEnt.message); return; }
            }
            cancelarEdicionVenta();
            alert('✅ Venta actualizada');
        } else {
            const nuevaVenta = {
                fecha, cliente_id: clienteId, cliente_nombre: clienteNombre, ciudad: ciudad || 'Bogotá',
                total, costo_total: costoTotal, costo_envio: costoEnvio, abono, saldo: total - abono, utilidad
            };
            const { data: ventaCreada, error: errVenta } = await supabaseClient.from('ventas').insert(nuevaVenta).select();
            if(errVenta) { alert('❌ Error al registrar la venta: ' + errVenta.message); return; }
            const vent = ventaCreada[0];

            const { data: itemsCreados, error: errItems } = await supabaseClient.from('venta_items')
                .insert(itemsPayload.map(it => ({...it, venta_id: vent.id}))).select();
            if(errItems) { alert('❌ Error al guardar los productos de la venta: ' + errItems.message); return; }

            const nuevaEntrega = {
                venta_id: vent.id, guia: '', cliente_nombre: clienteNombre, fecha,
                monto: total, abono, saldo: total - abono, empresa: 'Por definir'
            };
            const { data: entregaCreada, error: errEnt } = await supabaseClient.from('entregas').insert(nuevaEntrega).select();
            if(errEnt) { alert('❌ Error al crear el envío: ' + errEnt.message); return; }

            const { data: pagoCreado, error: errPago } = await supabaseClient.from('pagos').insert({
                entrega_id: entregaCreada[0].id, fecha, monto: abono, quien_paga: 'Cliente'
            }).select();
            if(errPago) console.error(errPago);

            await APP.cargarDatos();

            carritoActual.length = 0;
            renderCarrito();
            document.getElementById('vent-fecha').value = hoyISO();
            clienteInput.value = '';
            clienteInput.dataset.clienteId = '';
            document.getElementById('vent-ciudad').value = '';
            document.getElementById('vent-envio').value = '';
            document.getElementById('vent-abono').value = '';
            actualizarSaldoVenta();
            alert(`✅ Venta registrada con ${items.length} producto(s)`);
        }
        
        console.log("1. Antes de await APP.cargarDatos()");
        await APP.cargarDatos();
        console.log("2. Después de await APP.cargarDatos(), datos recargados.");
        APP.actualizarTodo();
        APP.actualizarEntregas(); 
        console.log("3. Fin de agregarVenta() - vistas actualizadas.");
    } catch (err) {
        console.error("Error capturado en agregarVenta:", err);
        alert("Ocurrió un error inesperado al guardar la venta. Revisa la consola.");
    }
}

export function editarVenta(id) {
    try {
        const v = APP.datos.ventas.find(x => x.id === id);
        if(!v) return;
        document.getElementById('vent-edit-id').value = id;
        document.getElementById('vent-fecha').value = v.fecha;
        const clienteInput = document.getElementById('vent-cliente');
        clienteInput.value = v.cliente || '';
        clienteInput.dataset.clienteId = v.cliente_id || '';
        document.getElementById('vent-ciudad').value = v.ciudad || '';
        ponerMiles('vent-envio', v.costo_envio);
        ponerMiles('vent-abono', v.abono);
        
        carritoActual.length = 0;
        itemsDeVenta(v).map(it => ({...it})).forEach(it => carritoActual.push(it));
        
        renderCarrito();
        document.getElementById('vent-submit-btn').textContent = '💾 Guardar Cambios';
        document.getElementById('vent-cancel-btn').style.display = 'inline-block';
        document.getElementById('item-ref').scrollIntoView({behavior: 'smooth', block: 'center'});
    } catch (err) {
        console.error("Error en editarVenta:", err);
        alert("Ocurrió un error inesperado al editar la venta. Revisa la consola.");
    }
}

export function cancelarEdicionVenta() {
    try {
        document.getElementById('vent-edit-id').value = '';
        carritoActual.length = 0;
        renderCarrito();
        document.getElementById('vent-fecha').value = hoyISO();
        const clienteInput = document.getElementById('vent-cliente');
        clienteInput.value = '';
        clienteInput.dataset.clienteId = '';
        document.getElementById('vent-ciudad').value = '';
        document.getElementById('vent-envio').value = '';
        document.getElementById('vent-abono').value = '';
        actualizarSaldoVenta();
        document.getElementById('vent-submit-btn').textContent = '✅ Registrar Venta Completa';
        document.getElementById('vent-cancel-btn').style.display = 'none';
    } catch (err) {
        console.error("Error en cancelarEdicionVenta:", err);
        alert("Error al cancelar edición.");
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

export function actualizarVentas() {
    const pintarTabla = (tbodyId, ventas, mensajeVacio) => {
        const tbody = document.getElementById(tbodyId);
        if(!tbody) return;
        tbody.innerHTML = ventas.map(v => `<tr>${filaVentaHTML(v)}</tr>`).join('');
        if(ventas.length === 0) tbody.innerHTML = `<tr><td colspan="12" style="text-align: center; color: #999;">${mensajeVacio}</td></tr>`;
    };

    const ordenadas = [...APP.datos.ventas].sort((a, b) => b.fecha.localeCompare(a.fecha));
    pintarTabla('tabla-ventas', ordenadas, 'Sin ventas registradas');

    const envioPendiente = ordenadas.filter(v => {
        const entrega = APP.datos.entregas.find(e => e.venta_id === v.id);
        return entrega && !esGuiaValida(entrega.guia);
    });
    pintarTabla('tabla-ventas-envios', envioPendiente, 'No hay envíos pendientes de asignar guía 🎉');

    const cobroPendiente = ordenadas.filter(v => v.saldo > 0);
    pintarTabla('tabla-ventas-cobro', cobroPendiente, 'No hay saldos pendientes por cobrar 🎉');
}
