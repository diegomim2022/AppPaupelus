import { esc, formatearFecha, parsearFechaLocal, hoyISO } from './utils.js?v=1';
import { APP } from './app.js?v=1';
import { itemsDeVenta } from './ventas.js?v=1';
import { calcularInventario } from './inventario.js?v=1';

// Estado local protegido para Reportes
let _chartMesesActual = 1;
let _ultimoReporteFechas = [];

// Función utilitaria interna
function enMesActual(fechaStr) {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
    const f = parsearFechaLocal(fechaStr);
    return f >= inicioMes && f <= finMes;
}

export function actualizarDashboard() {
    try {
        const comprasMes = APP.datos.compras.filter(c => enMesActual(c.fecha));
        const ventasMes = APP.datos.ventas.filter(v => enMesActual(v.fecha));
        const entregasMes = APP.datos.entregas.filter(e => enMesActual(e.fecha));

        const compras = comprasMes.reduce((s, c) => s + c.costo_total, 0);
        const ventas = ventasMes.reduce((s, v) => s + v.total, 0);
        const cant_c = comprasMes.reduce((s, c) => s + c.cantidad, 0);
        const cant_v = ventasMes.reduce((s, v) => s + itemsDeVenta(v).reduce((si, it) => si + (it.cantidad || 0), 0), 0);
        const utilidad = ventasMes.reduce((s, v) => s + (v.utilidad !== undefined ? v.utilidad : (v.total - (v.costo_total || 0) - (v.costo_envio || 0))), 0);
        const margen = ventas > 0 ? ((utilidad / ventas) * 100).toFixed(1) : 0;
        const stock = cant_c - cant_v;
        const recibido = entregasMes.reduce((sum, e) => sum + e.abono, 0);
        const total_ent = entregasMes.reduce((sum, e) => sum + e.monto, 0);
        const transito = total_ent - recibido;

        document.getElementById('dash-compras').textContent = '$' + compras.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('dash-cant-compras').textContent = cant_c + ' unidades';
        document.getElementById('dash-ventas').textContent = '$' + ventas.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('dash-cant-ventas').textContent = cant_v + ' unidades';
        document.getElementById('dash-ganancia').textContent = '$' + utilidad.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('dash-margen').textContent = margen + '%';
        document.getElementById('dash-stock').textContent = stock;
        document.getElementById('dash-transito').textContent = '$' + transito.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('dash-productos').textContent = APP.datos.productos.length;

        const ultimas = document.getElementById('dash-ultimas');
        ultimas.innerHTML = '';
        const ops = [
            ...APP.datos.compras.slice(0, 5).map(c => ({tipo: 'Compra', fecha: c.fecha, desc: c.ref, monto: c.costo_total})),
            ...APP.datos.ventas.slice(0, 5).map(v => ({tipo: 'Venta', fecha: v.fecha, desc: itemsDeVenta(v).map(it => it.ref).join(', '), monto: v.total}))
        ].sort((a, b) => parsearFechaLocal(b.fecha) - parsearFechaLocal(a.fecha)).slice(0, 10);

        ops.forEach(op => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td>${esc(op.tipo)}</td><td>${formatearFecha(op.fecha)}</td><td>${esc(op.desc)}</td><td>$${op.monto.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td>`;
            ultimas.appendChild(fila);
        });

        if(document.getElementById('dash-chart')) dibujarGraficoVentas(_chartMesesActual);
    } catch (e) {
        console.error("Error en actualizarDashboard:", e);
    }
}

export function actualizarReportes() {
    try {
        const hoy = new Date();
        const mesActual = String(hoy.getFullYear()) + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
        
        // Se llama a calcularInventario localmente (ahora importado de inventario.js)
        const inventario = calcularInventario();
        const valorInventario = Math.round(inventario.reduce((s, f) => s + f.valorTotal, 0));
        const ventasMes = APP.datos.ventas.filter(v => v.fecha && v.fecha.startsWith(mesActual));
        const ingresosMes = ventasMes.reduce((s, v) => s + v.total, 0);
        const costoMes = ventasMes.reduce((s, v) => s + (v.costo_total || 0), 0);
        const gananciaMes = ingresosMes - costoMes;
        const margen = ingresosMes > 0 ? ((gananciaMes / ingresosMes) * 100).toFixed(1) : 0;

        document.getElementById('rep-compras').textContent = '$' + valorInventario.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-ventas').textContent = '$' + ingresosMes.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-ganancia').textContent = '$' + gananciaMes.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-margen').textContent = margen + '%';

        const top = {};
        APP.datos.ventas.forEach(v => {
            itemsDeVenta(v).forEach(it => {
                if(!top[it.ref]) top[it.ref] = {cant: 0, ingr: 0, costo: 0};
                top[it.ref].cant += it.cantidad || 0;
                top[it.ref].ingr += it.subtotal !== undefined ? it.subtotal : (it.cantidad || 0) * (it.precio || 0);
                top[it.ref].costo += it.costo_total || 0;
            });
        });

        const tabla_top = document.getElementById('tabla-top');
        tabla_top.innerHTML = '';
        Object.entries(top).sort((a, b) => b[1].cant - a[1].cant).slice(0, 10).forEach(([ref, dados]) => {
            const prod = APP.datos.productos.find(p => p.ref === ref);
            const fila = document.createElement('tr');
            fila.innerHTML = `<td><strong>${esc(ref)}</strong></td><td>${esc(prod ? prod.nombre : '-')}</td><td>${dados.cant}</td><td>$${dados.ingr.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${(dados.ingr - dados.costo).toLocaleString('es-CO', {maximumFractionDigits: 0})}</td>`;
            tabla_top.appendChild(fila);
        });

        const empresas = {};
        APP.datos.entregas.forEach(e => {
            if(!empresas[e.empresa]) empresas[e.empresa] = {enviado: 0, recibido: 0};
            empresas[e.empresa].enviado += e.monto;
            empresas[e.empresa].recibido += e.abono;
        });

        const tabla_emp = document.getElementById('tabla-empresas');
        tabla_emp.innerHTML = '';
        Object.entries(empresas).sort((a, b) => b[1].enviado - a[1].enviado).forEach(([emp, dados]) => {
            const pct = dados.enviado > 0 ? ((dados.recibido / dados.enviado) * 100).toFixed(1) : 0;
            const fila = document.createElement('tr');
            fila.innerHTML = `<td><strong>${esc(emp)}</strong></td><td>$${dados.enviado.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${dados.recibido.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${(dados.enviado - dados.recibido).toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>${pct}%</td>`;
            tabla_emp.appendChild(fila);
        });
    } catch (e) {
        console.error("Error en actualizarReportes:", e);
    }
}


export function dibujarGraficoVentas(meses) {
    try {
        _chartMesesActual = meses;
        document.querySelectorAll('.chart-filtro-btn').forEach(b => b.classList.remove('active'));
        const btnActivo = document.getElementById('chart-btn-' + meses);
        if(btnActivo) btnActivo.classList.add('active');

        const canvas = document.getElementById('dash-chart');
        if(!canvas) return;
        const contenedor = canvas.parentElement;
        const ancho = contenedor.clientWidth > 40 ? contenedor.clientWidth - 20 : 700;
        canvas.width = ancho;
        canvas.height = 300;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const hoy = new Date();
        const desde = new Date();
        desde.setMonth(desde.getMonth() - meses);

        const desdeAnt = new Date(desde);
        desdeAnt.setMonth(desdeAnt.getMonth() - meses);
        const hoyAnt = new Date(desde);

        const msPorSemana = 7 * 24 * 60 * 60 * 1000;
        const numSemanas = Math.max(1, Math.ceil((hoy - desde) / msPorSemana));

        const serieActual = new Array(numSemanas).fill(0);
        const serieAnterior = new Array(numSemanas).fill(0);

        APP.datos.ventas.forEach(v => {
            const f = parsearFechaLocal(v.fecha);
            if(f >= desde && f <= hoy) {
                const idx = Math.min(numSemanas - 1, Math.floor((f - desde) / msPorSemana));
                serieActual[idx] += v.total;
            } else if(f >= desdeAnt && f <= hoyAnt) {
                const idx = Math.min(numSemanas - 1, Math.floor((f - desdeAnt) / msPorSemana));
                serieAnterior[idx] += v.total;
            }
        });

        const totalActual = serieActual.reduce((a, b) => a + b, 0);
        const totalAnterior = serieAnterior.reduce((a, b) => a + b, 0);

        const margenIzq = 70, margenInf = 45, margenSup = 36, margenDer = 20;
        const anchoGrafico = canvas.width - margenIzq - margenDer;
        const altoGrafico = canvas.height - margenSup - margenInf;

        if(totalActual === 0 && totalAnterior === 0) {
            ctx.fillStyle = '#999';
            ctx.font = '14px Segoe UI';
            ctx.textAlign = 'center';
            ctx.fillText('Sin ventas en este período', canvas.width / 2, canvas.height / 2);
            return;
        }

        const maxValor = Math.max(...serieActual, ...serieAnterior, 1);
        const espacioGrupo = anchoGrafico / numSemanas;
        const anchoBarra = Math.min(espacioGrupo * 0.38, 22);

        ctx.strokeStyle = '#f5eaef';
        ctx.fillStyle = '#999';
        ctx.font = '11px Segoe UI';
        ctx.textAlign = 'right';
        for(let i = 0; i <= 4; i++) {
            const y = margenSup + altoGrafico - (altoGrafico * i / 4);
            const valor = maxValor * i / 4;
            ctx.beginPath();
            ctx.moveTo(margenIzq, y);
            ctx.lineTo(margenIzq + anchoGrafico, y);
            ctx.stroke();
            ctx.fillText('$' + Math.round(valor / 1000) + 'k', margenIzq - 8, y + 4);
        }

        ctx.strokeStyle = '#e8759f';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(margenIzq, margenSup);
        ctx.lineTo(margenIzq, margenSup + altoGrafico);
        ctx.lineTo(margenIzq + anchoGrafico, margenSup + altoGrafico);
        ctx.stroke();

        const saltoEtiqueta = Math.max(1, Math.ceil(numSemanas / 13));
        for(let idx = 0; idx < numSemanas; idx++) {
            const x0 = margenIzq + idx * espacioGrupo;

            const valAnt = serieAnterior[idx];
            const altoAnt = (valAnt / maxValor) * altoGrafico;
            ctx.fillStyle = '#d8bfc9';
            ctx.fillRect(x0 + espacioGrupo / 2 - anchoBarra - 2, margenSup + altoGrafico - altoAnt, anchoBarra, altoAnt);

            const valAct = serieActual[idx];
            const altoAct = (valAct / maxValor) * altoGrafico;
            const grad = ctx.createLinearGradient(0, margenSup + altoGrafico - altoAct, 0, margenSup + altoGrafico);
            grad.addColorStop(0, '#ef8fb2');
            grad.addColorStop(1, '#f8c2d8');
            ctx.fillStyle = grad;
            ctx.fillRect(x0 + espacioGrupo / 2 + 2, margenSup + altoGrafico - altoAct, anchoBarra, altoAct);

            if(idx % saltoEtiqueta === 0) {
                const fechaBucket = new Date(desde.getTime() + idx * msPorSemana);
                ctx.save();
                ctx.translate(x0 + espacioGrupo / 2, margenSup + altoGrafico + 14);
                ctx.rotate(-Math.PI / 4);
                ctx.fillStyle = '#666';
                ctx.font = '10px Segoe UI';
                ctx.textAlign = 'right';
                ctx.fillText(fechaBucket.toLocaleDateString('es-CO', {day: '2-digit', month: '2-digit'}), 0, 0);
                ctx.restore();
            }
        }

        ctx.font = '12px Segoe UI';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ef8fb2';
        ctx.fillRect(margenIzq, 8, 14, 14);
        ctx.fillStyle = '#333';
        const etiquetaPeriodo = meses === 1 ? 'mes' : meses + ' meses';
        ctx.fillText('Últim' + (meses === 1 ? 'o' : 'os') + ' ' + etiquetaPeriodo + ' ($' + totalActual.toLocaleString('es-CO', {maximumFractionDigits: 0}) + ')', margenIzq + 20, 19);

        const anteriorLabelX = margenIzq + Math.min(260, anchoGrafico * 0.42);
        ctx.fillStyle = '#d8bfc9';
        ctx.fillRect(anteriorLabelX, 8, 14, 14);
        ctx.fillStyle = '#333';
        const variacion = totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior * 100) : null;
        const textoVar = variacion === null ? '' : '  ' + (variacion >= 0 ? '▲ +' : '▼ ') + variacion.toFixed(0) + '%';
        ctx.fillText('Período anterior ($' + totalAnterior.toLocaleString('es-CO', {maximumFractionDigits: 0}) + ')', anteriorLabelX + 20, 19);
        if(variacion !== null) {
            const anchoPrev = ctx.measureText('Período anterior ($' + totalAnterior.toLocaleString('es-CO', {maximumFractionDigits: 0}) + ')').width;
            ctx.fillStyle = variacion >= 0 ? '#2e7d5c' : '#c0575c';
            ctx.font = 'bold 12px Segoe UI';
            ctx.fillText(textoVar, anteriorLabelX + 20 + anchoPrev, 19);
        }
    } catch (e) {
        console.error("Error en dibujarGraficoVentas:", e);
    }
}


export function generarReporteFechas() {
    try {
        const desdeStr = document.getElementById('rep-desde').value;
        const hastaStr = document.getElementById('rep-hasta').value;
        if(!desdeStr || !hastaStr) { alert('Selecciona ambas fechas'); return; }
        const desde = parsearFechaLocal(desdeStr);
        const hasta = parsearFechaLocal(hastaStr);
        hasta.setHours(23, 59, 59, 999);

        const filtradas = APP.datos.ventas.filter(v => {
            const f = parsearFechaLocal(v.fecha);
            return f >= desde && f <= hasta;
        }).sort((a, b) => parsearFechaLocal(a.fecha) - parsearFechaLocal(b.fecha));

        const tbody = document.getElementById('tabla-reporte-fechas');
        tbody.innerHTML = '';

        let totCant = 0, totCosto = 0, totVenta = 0, totEnvio = 0, totUtilidad = 0;
        const filas = [];

        filtradas.forEach(v => {
            const items = itemsDeVenta(v);
            items.forEach((it, idx) => {
                const prod = APP.datos.productos.find(p => p.ref === it.ref);
                const subtotal = it.subtotal !== undefined ? it.subtotal : (it.cantidad || 0) * (it.precio || 0);
                const costoItem = it.costo_total || 0;
                const envioItem = idx === 0 ? (v.costo_envio || 0) : 0;
                const utilidadItem = subtotal - costoItem - envioItem;

                totCant += it.cantidad || 0;
                totCosto += costoItem;
                totVenta += subtotal;
                totEnvio += envioItem;
                totUtilidad += utilidadItem;

                filas.push({
                    numero: v.numero, fecha: v.fecha, ref: it.ref,
                    nombre: it.nombre || (prod ? prod.nombre : ''),
                    cantidad: it.cantidad, costo: costoItem, venta: subtotal, envio: envioItem, utilidad: utilidadItem
                });

                const fila = document.createElement('tr');
                fila.innerHTML = `<td>${v.numero || '-'}</td><td>${formatearFecha(v.fecha)}</td><td><strong>${it.ref}</strong></td><td>${it.nombre || (prod ? prod.nombre : '-')}</td><td>${it.cantidad}</td><td>$${costoItem.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${subtotal.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${envioItem.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td style="color:${utilidadItem>=0?'#2e7d5c':'#c0575c'}; font-weight:600;">$${utilidadItem.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td>`;
                tbody.appendChild(fila);
            });
        });

        if(filas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #999;">No hay ventas en ese rango de fechas</td></tr>';
        }

        document.getElementById('rep-fechas-cant').textContent = totCant;
        document.getElementById('rep-fechas-costo').textContent = '$' + totCosto.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-fechas-venta').textContent = '$' + totVenta.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-fechas-envio').textContent = '$' + totEnvio.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-fechas-utilidad').textContent = '$' + totUtilidad.toLocaleString('es-CO', {maximumFractionDigits: 0});

        _ultimoReporteFechas = filas;

        document.getElementById('rep-ventas').textContent = '$' + totVenta.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-ganancia').textContent = '$' + totUtilidad.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-margen').textContent = (totVenta > 0 ? ((totUtilidad / totVenta) * 100).toFixed(1) : 0) + '%';
        document.getElementById('rep-titulo-resumen').textContent = 'Resumen del ' + formatearFecha(desdeStr) + ' al ' + formatearFecha(hastaStr);
    } catch (e) {
        console.error("Error en generarReporteFechas:", e);
    }
}

export function exportarReporteCSV() {
    try {
        const filas = _ultimoReporteFechas || [];
        if(filas.length === 0) { alert('Genera un reporte primero'); return; }
        let csv = 'N Venta,Fecha,Referencia,Nombre,Cantidad,Costo,Venta,Costo Envio,Utilidad\n';
        filas.forEach(f => {
            csv += `${f.numero || ''},${f.fecha},${f.ref},"${f.nombre || ''}",${f.cantidad},${f.costo},${f.venta},${f.envio},${f.utilidad}\n`;
        });
        const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_ventas_${document.getElementById('rep-desde').value}_a_${document.getElementById('rep-hasta').value}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Error en exportarReporteCSV:", e);
        alert("Ocurrió un error al exportar el CSV.");
    }
}
