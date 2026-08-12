// ===== CONEXIÓN Y LOGIN CON SUPABASE =====
// La "anon/publishable key" es pública por diseño (segura de exponer en el
// navegador) -- la seguridad real la dan las políticas RLS configuradas en
// supabase_schema.sql, no que esta clave sea secreta.
const SUPABASE_URL = 'https://cfukejzjifyfiejfwhsj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_GNh6stUKtkoy9BUa6NAoHg_nFxYcu8J';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let appIniciada = false;

export { supabaseClient };

export function exportarJSON() {
    const datos = {
        productos: APP.datos.productos,
        compras: APP.datos.compras,
        ventas: APP.datos.ventas,
        entregas: APP.datos.entregas,
        fechaExportacion: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paupelus_respaldo_${hoyISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}


export async function limpiarTodo() {
    if(!confirm('⚠️ ¿Estás SEGURA de borrar TODOS los datos? Esta acción no se puede deshacer.')) return;
    if(!confirm('Última confirmación: se perderán productos, clientes, compras, ventas y entregas de Supabase. ¿Continuar?')) return;
    const NIL = '00000000-0000-0000-0000-000000000000';
    // Orden de borrado respetando las relaciones (hijos primero).
    for(const tabla of ['pagos', 'entregas', 'venta_items', 'ventas', 'compras', 'productos', 'clientes']) {
        const { error } = await supabaseClient.from(tabla).delete().neq('id', NIL);
        if(error) { alert(`❌ Error al borrar "${tabla}": ` + error.message); return; }
    }
    APP.datos.productos = [];
    APP.datos.clientes = [];
    APP.datos.compras = [];
    APP.datos.ventas = [];
    APP.datos.entregas = [];
    APP.actualizarTodo();
    actualizarEstadoDatos();
    alert('Datos borrados');
}


export function actualizarEstadoDatos() {
    const el = document.getElementById('datos-estado');
    if(el) {
        el.textContent = `${APP.datos.productos.length} productos, ${APP.datos.compras.length} compras, ${APP.datos.ventas.length} ventas, ${APP.datos.entregas.length} entregas`;
    }
}


    export async function cargarDatos() {
        try {
            const [rProd, rCli, rComp, rVent, rItems, rEnt, rPag] = await Promise.all([
                supabaseClient.from('productos').select('*').order('ref'),
                supabaseClient.from('clientes').select('*').order('nombre'),
                supabaseClient.from('compras').select('*').order('fecha'),
                supabaseClient.from('ventas').select('*').order('numero'),
                supabaseClient.from('venta_items').select('*'),
                supabaseClient.from('entregas').select('*'),
                supabaseClient.from('pagos').select('*'),
            ]);
            const error = rProd.error || rCli.error || rComp.error || rVent.error || rItems.error || rEnt.error || rPag.error;
            if(error) throw error;

            const itemsPorVenta = {};
            (rItems.data || []).forEach(it => {
                (itemsPorVenta[it.venta_id] = itemsPorVenta[it.venta_id] || []).push(it);
            });
            const pagosPorEntrega = {};
            (rPag.data || []).forEach(p => {
                (pagosPorEntrega[p.entrega_id] = pagosPorEntrega[p.entrega_id] || []).push(p);
            });

            this.datos.productos = rProd.data || [];
            this.datos.clientes = rCli.data || [];
            this.datos.compras = rComp.data || [];
            this.datos.ventas = (rVent.data || []).map(v => ({
                ...v, cliente: v.cliente_nombre, items: itemsPorVenta[v.id] || []
            }));
            this.datos.entregas = (rEnt.data || []).map(e => ({
                ...e, cliente: e.cliente_nombre, pagos: pagosPorEntrega[e.id] || []
            }));
            return true;
        } catch(x) {
            console.error(x);
            const msg = x.message || String(x);
            if(msg.includes('JWT') || msg.includes('token') || msg.includes('expired')) {
                alert('⚠️ Tu sesión expiró o el reloj de este computador está desconfigurado.\n\nSolución:\n1. Ve a Configuración > Hora e idioma > Fecha y hora\n2. Activa "Establecer la hora automáticamente"\n3. Haz clic en "Sincronizar ahora"\n4. Recarga esta página');
                await supabaseClient.auth.signOut();
                location.reload();
            } else {
                alert('⚠️ No se pudieron cargar los datos desde Supabase. Revisa tu conexión a internet y vuelve a intentar. (' + msg + ')');
            }
            return false;
        }
    }
