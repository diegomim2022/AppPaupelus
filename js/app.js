import { supabaseClient, cargarDatos, exportarJSON, limpiarTodo, actualizarEstadoDatos } from './db.js';
import { esc, formatMiles, leerMiles, ponerMiles, formatearFecha, aISOLocal, hoyISO, parsearFechaLocal, rangoRapido, cerrarModal, inicializarAutocomplete, inicializarAutocompleteCliente, inicializarAutocompleteCiudad, aplicarFiltrosTabla, construirFilaFiltros, inicializarFiltrosTablas } from './utils.js';
import * as Productos from './productos.js?v=1';
import * as Compras from './compras.js?v=1';
import * as Ventas from './ventas.js?v=1';
import { itemsDeVenta, esGuiaValida } from './ventas.js?v=1';
import { actualizarEntregas, abrirModalPago, ponerSaldoCompleto, guardarPagoModal, abrirModalGuia, guardarGuiaModal } from './entregas.js?v=1';
import * as Inventario from './inventario.js?v=1';

let appIniciada = false;
async function mostrarApp() {
    document.getElementById('pantalla-login').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';
    if(!appIniciada) {
        appIniciada = true;
        await APP.init();
    }
}


async function iniciarSesion(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-submit-btn');
    errorEl.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Entrando...';
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    btn.disabled = false;
    btn.textContent = 'Entrar';
    if(error) {
        const emsg = error.message || '';
        if(emsg.includes('JWT') || emsg.includes('token') || emsg.includes('clock')) {
            errorEl.textContent = 'El reloj de este computador está desconfigurado. Ve a Configuración > Hora e idioma y activa "Establecer la hora automáticamente", luego recarga la página.';
        } else {
            errorEl.textContent = 'Correo o contraseña incorrectos.';
        }
        errorEl.style.display = 'block';
        return false;
    }
    mostrarApp();
    return false;
}


async function cerrarSesion() {
    if(!confirm('¿Cerrar sesión?')) return;
    await supabaseClient.auth.signOut();
    location.reload();
}


async function verificarSesionInicial() {
    const { data } = await supabaseClient.auth.getSession();
    if(data && data.session) mostrarApp();
}


function cambiarTab(e, tabId) {
    e.preventDefault();
    const contenedor = e.target.closest('.section') || document;
    contenedor.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    contenedor.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    e.target.classList.add('active');
}


document.addEventListener('DOMContentLoaded', verificarSesionInicial);


export const APP = {
    datos: {
        productos: [],
        clientes: [],
        compras: [],
        ventas: [],
        entregas: []
    },

    async init() {
        const ok = await this.cargarDatos();
        if(!ok) return;
        this.conectarEventos();
        this.actualizarProductos();
        this.actualizarCompras();
        this.actualizarVentas();
        this.actualizarEntregas();
        this.actualizarDashboard();
        this.actualizarInventario();
        this.actualizarReportes();
        if(typeof actualizarEstadoDatos === 'function') actualizarEstadoDatos();
    },

    // Trae las 6 tablas de Supabase y las arma en la misma forma en memoria
    // que usa el resto de la app (items[] agrupados por venta, pagos[]
    // agrupados por entrega, "cliente_nombre" -> "cliente" para no tener
    // que tocar cada función de renderizado existente).



    conectarEventos() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
                document.querySelectorAll('.nav-btn').forEach(x => x.classList.remove('active'));
                const id = e.target.getAttribute('data-section');
                document.getElementById(id).classList.add('active');
                e.target.classList.add('active');
                this.actualizarSeccion(id);
            });
        });

        ['prod', 'comp', 'vent', 'ent'].forEach(tipo => {
            const search = document.getElementById('search-' + tipo);
            if(search) search.addEventListener('keyup', () => this.buscar(tipo));
        });

        const searchInv = document.getElementById('search-inv');
        if(searchInv) searchInv.addEventListener('keyup', () => {
            const q = searchInv.value.toLowerCase();
            Array.from(document.getElementById('tabla-inventario').querySelectorAll('tr')).forEach(fila => {
                fila.style.display = fila.textContent.toLowerCase().includes(q) ? '' : 'none';
            });
        });

        const hoy = hoyISO();
        if(document.getElementById('comp-fecha')) document.getElementById('comp-fecha').value = hoy;
        if(document.getElementById('vent-fecha')) document.getElementById('vent-fecha').value = hoy;

        inicializarAutocomplete('item-ref', 'item-ref-list', () => sugerirCostoItem());
        inicializarAutocomplete('comp-ref', 'comp-ref-list');
        inicializarAutocompleteCliente('vent-cliente', 'vent-cliente-list');
        inicializarAutocompleteCiudad('vent-ciudad', 'vent-ciudad-list');
        inicializarFiltrosTablas();
    },

    buscar(tipo) {
        const input = document.getElementById('search-' + tipo).value.toLowerCase();
        const tabla = document.getElementById('tabla-' + (tipo === 'prod' ? 'productos' : tipo === 'comp' ? 'compras' : tipo === 'vent' ? 'ventas' : 'entregas'));
        Array.from(tabla.querySelectorAll('tr')).forEach(fila => {
            fila.style.display = fila.textContent.toLowerCase().includes(input) ? '' : 'none';
        });
    },

    seccionActiva() {
        const el = document.querySelector('.section.active');
        return el ? el.id : 'dashboard';
    },

    actualizarSeccion(id) {
        const mapa = {
            'dashboard': () => this.actualizarDashboard(),
            'productos': () => this.actualizarProductos(),
            'compras': () => this.actualizarCompras(),
            'ventas': () => this.actualizarVentas(),
            'entregas': () => this.actualizarEntregas(),
            'inventario': () => this.actualizarInventario(),
            'reportes': () => this.actualizarReportes()
        };
        if(mapa[id]) mapa[id]();
    },

    actualizarTodo() {
        this.actualizarSeccion(this.seccionActiva());
    },



    actualizarProductos() {
        const tabla = document.getElementById('tabla-productos');
        tabla.innerHTML = '';
        const ordenados = [...this.datos.productos].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
        ordenados.forEach(p => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td><strong>${esc(p.ref)}</strong></td><td>${esc(p.nombre)}</td><td>${esc(p.color) || '-'}</td><td>${esc(p.longitud) || '-'}</td><td>${esc(p.tipo) || '-'}</td><td>${esc(p.corte) || '-'}</td><td>${esc(p.detalle) || '-'}</td><td>$${p.precio.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td><button class="btn-small" onclick="editarProducto('${esc(p.id)}')">✏️</button><button class="btn-small btn-delete" onclick="APP.eliminarProducto('${esc(p.id)}')">🗑️</button></td>`;
            tabla.appendChild(fila);
        });
        if(this.datos.productos.length === 0) tabla.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #999;">Sin productos. ¡Agrega uno!</td></tr>';
        Productos.renderSelectsProducto();
    },

    actualizarCompras() {
        const tabla = document.getElementById('tabla-compras');
        tabla.innerHTML = '';
        const ordenadas = [...this.datos.compras].sort((a, b) => b.fecha.localeCompare(a.fecha));
        ordenadas.forEach(c => {
            const prod = this.datos.productos.find(p => p.ref === c.ref);
            const nombreMostrar = c.nombre || (prod ? prod.nombre : '-');
            const fila = document.createElement('tr');
            fila.innerHTML = `<td>${formatearFecha(c.fecha)}</td><td>${esc(c.proveedor) || '-'}</td><td>${esc(nombreMostrar)}</td><td><strong>${esc(c.ref)}</strong></td><td>${c.cantidad}</td><td>$${c.costo_total.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td><button class="btn-small" onclick="editarCompra('${esc(c.id)}')">✏️</button><button class="btn-small btn-delete" onclick="APP.eliminarCompra('${esc(c.id)}')">🗑️</button></td>`;
            tabla.appendChild(fila);
        });
        if(this.datos.compras.length === 0) tabla.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #999;">Sin compras registradas</td></tr>';
        actualizarListaProveedores();
    },

    actualizarVentas() {
        Ventas.actualizarVentas();
    },



    actualizarDashboard() {
        const hoy = new Date();
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59, 999);
        const enMesActual = (fechaStr) => {
            const f = parsearFechaLocal(fechaStr);
            return f >= inicioMes && f <= finMes;
        };

        const comprasMes = this.datos.compras.filter(c => enMesActual(c.fecha));
        const ventasMes = this.datos.ventas.filter(v => enMesActual(v.fecha));
        const entregasMes = this.datos.entregas.filter(e => enMesActual(e.fecha));

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
        document.getElementById('dash-productos').textContent = this.datos.productos.length;

        const ultimas = document.getElementById('dash-ultimas');
        ultimas.innerHTML = '';
        const ops = [
            ...this.datos.compras.slice(0, 5).map(c => ({tipo: 'Compra', fecha: c.fecha, desc: c.ref, monto: c.costo_total})),
            ...this.datos.ventas.slice(0, 5).map(v => ({tipo: 'Venta', fecha: v.fecha, desc: itemsDeVenta(v).map(it => it.ref).join(', '), monto: v.total}))
        ].sort((a, b) => parsearFechaLocal(b.fecha) - parsearFechaLocal(a.fecha)).slice(0, 10);

        ops.forEach(op => {
            const fila = document.createElement('tr');
            fila.innerHTML = `<td>${esc(op.tipo)}</td><td>${formatearFecha(op.fecha)}</td><td>${esc(op.desc)}</td><td>$${op.monto.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td>`;
            ultimas.appendChild(fila);
        });

        if(document.getElementById('dash-chart')) dibujarGraficoVentas(chartMesesActual);
    },

    actualizarReportes() {
        const hoy = new Date();
        const mesActual = String(hoy.getFullYear()) + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
        const inventario = this.calcularInventario();
        const valorInventario = Math.round(inventario.reduce((s, f) => s + f.valorTotal, 0));
        const ventasMes = this.datos.ventas.filter(v => v.fecha && v.fecha.startsWith(mesActual));
        const ingresosMes = ventasMes.reduce((s, v) => s + v.total, 0);
        const costoMes = ventasMes.reduce((s, v) => s + (v.costo_total || 0), 0);
        const gananciaMes = ingresosMes - costoMes;
        const margen = ingresosMes > 0 ? ((gananciaMes / ingresosMes) * 100).toFixed(1) : 0;

        document.getElementById('rep-compras').textContent = '$' + valorInventario.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-ventas').textContent = '$' + ingresosMes.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-ganancia').textContent = '$' + gananciaMes.toLocaleString('es-CO', {maximumFractionDigits: 0});
        document.getElementById('rep-margen').textContent = margen + '%';

        // El costo por producto se toma del costo FIFO ya calculado en cada
        // línea de venta (item.costo_total), no del total histórico de
        // compras -- así no se le carga a un producto el costo de unidades
        // que todavía están en inventario sin vender.
        const top = {};
        this.datos.ventas.forEach(v => {
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
            const prod = this.datos.productos.find(p => p.ref === ref);
            const fila = document.createElement('tr');
            fila.innerHTML = `<td><strong>${esc(ref)}</strong></td><td>${esc(prod ? prod.nombre : '-')}</td><td>${dados.cant}</td><td>$${dados.ingr.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${(dados.ingr - dados.costo).toLocaleString('es-CO', {maximumFractionDigits: 0})}</td>`;
            tabla_top.appendChild(fila);
        });

        const empresas = {};
        this.datos.entregas.forEach(e => {
            if(!empresas[e.empresa]) empresas[e.empresa] = {enviado: 0, recibido: 0};
            empresas[e.empresa].enviado += e.monto;
            empresas[e.empresa].recibido += e.abono;
        });

        const tabla_emp = document.getElementById('tabla-empresas');
        tabla_emp.innerHTML = '';
        Object.entries(empresas).sort((a, b) => b[1].enviado - a[1].enviado).forEach(([emp, dados]) => {
            const pct = ((dados.recibido / dados.enviado) * 100).toFixed(1);
            const fila = document.createElement('tr');
            fila.innerHTML = `<td><strong>${esc(emp)}</strong></td><td>$${dados.enviado.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${dados.recibido.toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>$${(dados.enviado - dados.recibido).toLocaleString('es-CO', {maximumFractionDigits: 0})}</td><td>${pct}%</td>`;
            tabla_emp.appendChild(fila);
        });
    },

    async eliminarProducto(id) {
        if(!confirm('¿Eliminar producto?')) return;
        const { error } = await supabaseClient.from('productos').delete().eq('id', id);
        if(error) { alert('❌ Error al eliminar: ' + error.message); return; }
        this.datos.productos = this.datos.productos.filter(p => p.id !== id);
        this.actualizarProductos();
    },

    async eliminarCompra(id) {
        if(!confirm('¿Eliminar compra?')) return;
        const { error } = await supabaseClient.from('compras').delete().eq('id', id);
        if(error) { alert('❌ Error al eliminar: ' + error.message); return; }
        this.datos.compras = this.datos.compras.filter(c => c.id !== id);
        this.actualizarTodo();
    },

    async eliminarVenta(id) {
        if(!confirm('¿Eliminar venta?')) return;
        // Borrar la venta hace cascade en Supabase sobre venta_items y
        // entregas (y esta última sobre pagos) -- ver on delete cascade
        // en supabase_schema.sql.
        const { error } = await supabaseClient.from('ventas').delete().eq('id', id);
        if(error) { alert('❌ Error al eliminar: ' + error.message); return; }
        this.datos.ventas = this.datos.ventas.filter(v => v.id !== id);
        this.datos.entregas = this.datos.entregas.filter(e => e.venta_id !== id);
        this.actualizarTodo();
    }
};

APP.actualizarEntregas = actualizarEntregas;
APP.cargarDatos = cargarDatos;


window.APP = APP;
window.iniciarSesion = iniciarSesion;
window.cerrarSesion = cerrarSesion;
window.cambiarTab = cambiarTab;
window.exportarJSON = exportarJSON;
window.limpiarTodo = limpiarTodo;
window.cerrarModal = cerrarModal;
window.formatMiles = formatMiles;
window.rangoRapido = rangoRapido;
window.abrirModalPago = abrirModalPago;
window.ponerSaldoCompleto = ponerSaldoCompleto;
window.guardarPagoModal = guardarPagoModal;
window.abrirModalGuia = abrirModalGuia;
window.guardarGuiaModal = guardarGuiaModal;
window.actualizarEstadoDatos = actualizarEstadoDatos;
window.cargarDatos = cargarDatos;
window.esc = esc;
window.leerMiles = leerMiles;
window.ponerMiles = ponerMiles;
window.formatearFecha = formatearFecha;
window.aISOLocal = aISOLocal;
window.hoyISO = hoyISO;
window.parsearFechaLocal = parsearFechaLocal;
window.inicializarAutocomplete = inicializarAutocomplete;
window.inicializarAutocompleteCliente = inicializarAutocompleteCliente;
window.inicializarAutocompleteCiudad = inicializarAutocompleteCiudad;
window.aplicarFiltrosTabla = aplicarFiltrosTabla;
window.construirFilaFiltros = construirFilaFiltros;
window.inicializarFiltrosTablas = inicializarFiltrosTablas;
window.supabaseClient = supabaseClient;
window.agregarProducto = Productos.agregarProducto;
window.editarProducto = Productos.editarProducto;
window.setSelectProducto = Productos.setSelectProducto;
window.cancelarEdicionProducto = Productos.cancelarEdicionProducto;
window.renderSelectsProducto = Productos.renderSelectsProducto;
window.toggleNuevo = Productos.toggleNuevo;
window.obtenerValorCampo = Productos.obtenerValorCampo;

window.agregarItemCompra = Compras.agregarItemCompra;
window.quitarItemCompra = Compras.quitarItemCompra;
window.agregarCompra = Compras.agregarCompra;
window.editarCompra = Compras.editarCompra;
window.cancelarEdicionCompra = Compras.cancelarEdicionCompra;

window.agregarVenta = Ventas.agregarVenta;
window.editarVenta = Ventas.editarVenta;
window.cancelarEdicionVenta = Ventas.cancelarEdicionVenta;
window.agregarItemCarrito = Ventas.agregarItemCarrito;
window.quitarItemCarrito = Ventas.quitarItemCarrito;
window.sugerirCostoItem = Ventas.sugerirCostoItem;
window.actualizarSaldoVenta = Ventas.actualizarSaldoVenta;

window.sugerirEnvio = Ventas.sugerirEnvio;
window.obtenerCiudadesUnicas = Ventas.obtenerCiudadesUnicas;
window.esGuiaValida = esGuiaValida;

APP.calcularInventario = Inventario.calcularInventario;
APP.actualizarInventario = Inventario.actualizarInventario;
window.exportarInventarioCSV = Inventario.exportarInventarioCSV;
