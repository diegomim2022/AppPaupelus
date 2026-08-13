import { APP } from './app.js';
import { esc, hoyISO } from './utils.js';
import { itemsDeVenta } from './ventas.js?v=1';

let _inventarioCache = [];
let _invVerTodos = false;

// Valora el stock que queda con FIFO: arma los lotes de compra de cada
// referencia, los va consumiendo en orden con las ventas ya hechas, y lo
// que sobra es el inventario real con el costo de los lotes que quedaron.
export function calcularInventario() {
    try {
        const lotesPorRef = {};
        APP.datos.compras.slice()
            .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
            .forEach(c => {
                if(!c.ref) return;
                (lotesPorRef[c.ref] = lotesPorRef[c.ref] || []).push({
                    cantidad: c.cantidad || 0,
                    costo_unitario: c.costo_unitario || 0
                });
            });

        const vendidoPorRef = {};
        APP.datos.ventas.forEach(v => {
            itemsDeVenta(v).forEach(it => {
                if(!it.ref) return;
                vendidoPorRef[it.ref] = (vendidoPorRef[it.ref] || 0) + (it.cantidad || 0);
            });
        });

        const refs = new Set([
            ...APP.datos.productos.map(p => p.ref),
            ...Object.keys(lotesPorRef)
        ].filter(Boolean));

        const filas = [];
        refs.forEach(ref => {
            const lotes = (lotesPorRef[ref] || []).map(l => ({...l}));
            let porConsumir = vendidoPorRef[ref] || 0;
            while(porConsumir > 0 && lotes.length) {
                const tomar = Math.min(lotes[0].cantidad, porConsumir);
                lotes[0].cantidad -= tomar;
                porConsumir -= tomar;
                if(lotes[0].cantidad <= 0) lotes.shift();
            }

            const cantidad = lotes.reduce((s, l) => s + l.cantidad, 0);
            const valorTotal = lotes.reduce((s, l) => s + l.cantidad * l.costo_unitario, 0);
            const prod = APP.datos.productos.find(p => p.ref === ref);

            filas.push({
                ref,
                nombre: prod ? prod.nombre : '-',
                cantidad,
                // Si quedó stock, el costo unitario es el promedio de los lotes
                // que siguen en bodega; si no queda nada, se muestra el último
                // costo de compra conocido como referencia.
                costoUnitario: cantidad > 0 ? valorTotal / cantidad
                    : ((lotesPorRef[ref] || []).slice(-1)[0] || {}).costo_unitario || 0,
                valorTotal,
                sobrevendido: porConsumir > 0 ? porConsumir : 0
            });
        });

        filas.sort((a, b) => b.valorTotal - a.valorTotal || a.ref.localeCompare(b.ref));
        return filas;
    } catch (error) {
        console.error("Error en calcularInventario:", error);
        return [];
    }
}

export function actualizarInventario(verTodos) {
    try {
        if(verTodos !== undefined) _invVerTodos = verTodos;
        const mostrarTodos = !!_invVerTodos;

        const btnCon = document.getElementById('inv-btn-con');
        const btnTodos = document.getElementById('inv-btn-todos');
        if(btnCon && btnTodos) {
            btnCon.style.fontWeight = mostrarTodos ? 'normal' : '700';
            btnTodos.style.fontWeight = mostrarTodos ? '700' : 'normal';
        }

        const todas = calcularInventario();
        _inventarioCache = todas;
        const filas = mostrarTodos ? todas : todas.filter(f => f.cantidad > 0);

        const tabla = document.getElementById('tabla-inventario');
        if(!tabla) return;
        tabla.innerHTML = filas.map(f => {
            const alerta = f.sobrevendido > 0
                ? ` <span style="color:#c0575c; font-size:11px;" title="Se vendieron más unidades de las compradas">⚠ ${f.sobrevendido} sin respaldo de compra</span>`
                : '';
            return `<tr><td><strong>${esc(f.ref)}</strong>${alerta}</td><td>${esc(f.nombre)}</td><td>$${Math.round(f.costoUnitario).toLocaleString('es-CO')}</td><td>${f.cantidad}</td><td>$${Math.round(f.valorTotal).toLocaleString('es-CO')}</td></tr>`;
        }).join('');
        if(filas.length === 0) tabla.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#999;">Sin stock disponible</td></tr>';

        const totalCant = filas.reduce((s, f) => s + f.cantidad, 0);
        const totalValor = filas.reduce((s, f) => s + f.valorTotal, 0);
        const conStock = todas.filter(f => f.cantidad > 0).length;

        document.getElementById('inv-foot-cant').textContent = totalCant;
        document.getElementById('inv-foot-valor').textContent = '$' + Math.round(totalValor).toLocaleString('es-CO');
        document.getElementById('inv-valor-total').textContent = '$' + Math.round(todas.reduce((s, f) => s + f.valorTotal, 0)).toLocaleString('es-CO');
        document.getElementById('inv-unidades').textContent = todas.reduce((s, f) => s + f.cantidad, 0);
        document.getElementById('inv-refs').textContent = conStock;
        document.getElementById('inv-refs-label').textContent = 'de ' + todas.length + ' referencias';
    } catch (error) {
        console.error("Error en actualizarInventario:", error);
    }
}

export function exportarInventarioCSV() {
    try {
        const filas = _inventarioCache.length > 0 ? _inventarioCache : calcularInventario();
        if(filas.length === 0) { alert('No hay inventario para exportar'); return; }
        let csv = 'Referencia,Nombre,Costo Unitario,Cantidad,Valor Total\n';
        filas.forEach(f => {
            csv += `${f.ref},"${f.nombre || ''}",${Math.round(f.costoUnitario)},${f.cantidad},${Math.round(f.valorTotal)}\n`;
        });
        const blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8;'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventario_${hoyISO()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Error en exportarInventarioCSV:", error);
    }
}
