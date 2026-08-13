import { supabaseClient } from './db.js';
import { esc, formatMiles, leerMiles, ponerMiles, formatearFecha, aISOLocal, hoyISO, parsearFechaLocal, rangoRapido, cerrarModal, inicializarAutocomplete, inicializarAutocompleteCliente, inicializarAutocompleteCiudad, aplicarFiltrosTabla, construirFilaFiltros, inicializarFiltrosTablas } from './utils.js';
import * as Productos from './productos.js';
import * as Compras from './compras.js';
import * as Ventas from './ventas.js';
import { itemsDeVenta, esGuiaValida } from './ventas.js';
import { actualizarEntregas, abrirModalPago, ponerSaldoCompleto, guardarPagoModal, abrirModalGuia, guardarGuiaModal } from './entregas.js';
import * as Inventario from './inventario.js';
import * as Reportes from './reportes.js';
import * as Datos from './datos.js';

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


        const hoy = hoyISO();
        if(document.getElementById('comp-fecha')) document.getElementById('comp-fecha').value = hoy;
        if(document.getElementById('vent-fecha')) document.getElementById('vent-fecha').value = hoy;

        inicializarAutocomplete('item-ref', 'item-ref-list', () => sugerirCostoItem());
        inicializarAutocomplete('comp-ref', 'comp-ref-list');
        inicializarAutocompleteCliente('vent-cliente', 'vent-cliente-list');
        inicializarAutocompleteCiudad('vent-ciudad', 'vent-ciudad-list');
        inicializarFiltrosTablas();
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
        Compras.actualizarListaProveedores();
    },

    actualizarVentas() {
        Ventas.actualizarVentas();
    },



    async eliminarProducto(id) {
        if(!confirm('¿Eliminar producto?')) return;
        const { error } = await supabaseClient.from('productos').delete().eq('id', id);
        if(error) { alert('❌ Error al eliminar: ' + error.message); return; }
        this.datos.productos = this.datos.productos.filter(p => String(p.id) !== String(id));
        this.actualizarProductos();
    },

    async eliminarCompra(id) {
        if(!confirm('¿Eliminar compra?')) return;
        const { error } = await supabaseClient.from('compras').delete().eq('id', id);
        if(error) { alert('❌ Error al eliminar: ' + error.message); return; }
        this.datos.compras = this.datos.compras.filter(c => String(c.id) !== String(id));
        this.actualizarTodo();
    },

    async eliminarVenta(id) {
        if(!confirm('¿Eliminar venta?')) return;
        // Borrar la venta hace cascade en Supabase sobre venta_items y
        // entregas (y esta última sobre pagos) -- ver on delete cascade
        // en supabase_schema.sql.
        const { error } = await supabaseClient.from('ventas').delete().eq('id', id);
        if(error) { alert('❌ Error al eliminar: ' + error.message); return; }
        this.datos.ventas = this.datos.ventas.filter(v => String(v.id) !== String(id));
        this.datos.entregas = this.datos.entregas.filter(e => String(e.venta_id) !== String(id));
        this.actualizarTodo();
    }
};

APP.actualizarEntregas = actualizarEntregas;
APP.cargarDatos = Datos.cargarDatos;
APP.actualizarEstadoDatos = Datos.actualizarEstadoDatos;

window.APP = APP;
window.iniciarSesion = iniciarSesion;
window.cerrarSesion = cerrarSesion;
window.cambiarTab = cambiarTab;
window.exportarJSON = Datos.exportarJSON;
window.limpiarTodo = Datos.limpiarTodo;
window.cerrarModal = cerrarModal;
window.formatMiles = formatMiles;
window.rangoRapido = rangoRapido;
window.abrirModalPago = abrirModalPago;
window.ponerSaldoCompleto = ponerSaldoCompleto;
window.guardarPagoModal = guardarPagoModal;
window.abrirModalGuia = abrirModalGuia;
window.guardarGuiaModal = guardarGuiaModal;
window.actualizarEstadoDatos = Datos.actualizarEstadoDatos;
window.cargarDatos = Datos.cargarDatos;
window.actualizarListaProveedores = Compras.actualizarListaProveedores;
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

// Reportes/Dashboard
APP.actualizarDashboard = Reportes.actualizarDashboard;
APP.actualizarReportes = Reportes.actualizarReportes;
window.dibujarGraficoVentas = Reportes.dibujarGraficoVentas;
window.generarReporteFechas = Reportes.generarReporteFechas;
window.exportarReporteCSV = Reportes.exportarReporteCSV;
