import { APP } from './app.js';
import { cerrarModal, esc, formatMiles, leerMiles, ponerMiles } from './utils.js';
import { supabaseClient } from './db.js';


const VALORES_BASE = {
    color: ['Azul','Banda silicona','Blanco','Café','Caramelo','Castaño medio','Chocolate','Cobrizo','Fantasia','Fucsia','Gris','Lila','Mechon','Morada','Naranja','Negro','Pony Tail','Rojo','Rosada','Rubio','Rubio medio','Soporte peluca','Verde'],
    longitud: ['Corto','Extra largo','Largo','Medio'],
    tipo: ['Crespo','Liso','Ondulado','Semi-Liso','Semi-Ondulado'],
    corte: ['Balaca','Con Fleco','LaceFront','Sin Fleco'],
    detalle: ['Arcoiris','Azul','BabyLight','Balayage','Beige','Blanco','Cafe','Caramelo','Cenizo','Cereza','Chocolate','Claro','Cobrizo','Contornos','Dorado','Fuego','Capas','Mechones','Mechones chunky','Mitad','Morada','Naranja','Negro','Oscuro','Raiz','Rayitos','Roja','Rosada','Rubio medio','Underlights','Uniforme','Vainilla','VinoTinto']
};

export async function agregarProducto(e) {
    try {
        e.preventDefault();
        const ref = document.getElementById('prod-ref').value.trim();
        const nombre = document.getElementById('prod-nombre').value.trim();
        if(!ref || !nombre) { alert('Referencia y nombre obligatorios'); return; }
        const datosProd = {
            ref, nombre,
            color: obtenerValorCampo('color'),
            longitud: obtenerValorCampo('long'),
            tipo: obtenerValorCampo('tipo'),
            corte: obtenerValorCampo('corte'),
            detalle: obtenerValorCampo('detalle'),
            precio: leerMiles('prod-precio')
        };
        const editId = document.getElementById('prod-edit-id').value;
        if(editId) {
            const { error } = await supabaseClient.from('productos').update(datosProd).eq('id', editId);
            if(error) { 
                console.error("Supabase Error (Update):", error);
                alert('❌ Error al actualizar: ' + error.message); 
                return; 
            }
            const p = APP.datos.productos.find(x => x.id === editId);
            if(p) Object.assign(p, datosProd);
            cancelarEdicionProducto();
            alert('✅ Producto actualizado');
        } else {
            const { data, error } = await supabaseClient.from('productos').insert(datosProd).select();
            if(error) { 
                console.error("Supabase Error (Insert):", error);
                alert('❌ Error al agregar: ' + error.message); 
                return; 
            }
            if (!data || data.length === 0) {
                console.error("Supabase devolvió data vacía. Revisa RLS de SELECT para productos.");
                alert('❌ Error interno: El producto se guardó pero no se pudo recuperar.');
                return;
            }
            APP.datos.productos.push(data[0]);
            e.target.reset();
            alert('✅ Producto agregado');
        }
        APP.actualizarProductos();
    } catch (err) {
        console.error("Error silencioso capturado en agregarProducto:", err);
        alert("Ocurrió un error inesperado al procesar el producto. Revisa la consola.");
    }
}

export function editarProducto(id) {
    try {
        const p = APP.datos.productos.find(x => x.id === id);
        if(!p) return;
        document.getElementById('prod-edit-id').value = id;
        document.getElementById('prod-ref').value = p.ref;
        document.getElementById('prod-nombre').value = p.nombre;
        setSelectProducto('color', p.color || '');
        setSelectProducto('long', p.longitud || '');
        setSelectProducto('tipo', p.tipo || '');
        setSelectProducto('corte', p.corte || '');
        setSelectProducto('detalle', p.detalle || '');
        ponerMiles('prod-precio', p.precio);
        document.getElementById('prod-submit-btn').textContent = '💾 Guardar Cambios';
        document.getElementById('prod-cancel-btn').style.display = 'inline-block';
        document.getElementById('prod-ref').scrollIntoView({behavior: 'smooth', block: 'center'});
    } catch (err) {
        console.error("Error capturado en editarProducto:", err);
        alert("Error interno en la aplicación. Revisa la consola.");
    }
}

export function setSelectProducto(campo, valor) {
    try {
        const sel = document.getElementById('prod-' + campo + '-sel');
        const input = document.getElementById('prod-' + campo);
        const existe = [...sel.options].some(o => o.value === valor && o.value !== '__nuevo__' && o.value !== '');
        if(existe) {
            sel.value = valor;
            input.classList.remove('visible');
            input.value = '';
        } else if(valor) {
            sel.value = '__nuevo__';
            input.classList.add('visible');
            input.value = valor;
        } else {
            sel.value = '';
            input.classList.remove('visible');
            input.value = '';
        }
    } catch (err) {
        console.error("Error capturado en setSelectProducto:", err);
        alert("Error interno en la aplicación. Revisa la consola.");
    }
}

export function cancelarEdicionProducto() {
    try {
        document.getElementById('prod-edit-id').value = '';
        document.querySelector('#productos form').reset();
        document.getElementById('prod-submit-btn').textContent = '➕ Agregar Producto';
        document.getElementById('prod-cancel-btn').style.display = 'none';
        document.querySelectorAll('.campo-nuevo').forEach(el => { el.classList.remove('visible'); el.value = ''; });
    } catch (err) {
        console.error("Error capturado en cancelarEdicionProducto:", err);
        alert("Error interno en la aplicación. Revisa la consola.");
    }
}

export function renderSelectsProducto() {
    try {
        const campos = [
            { selId: 'prod-color-sel', campo: 'color' },
            { selId: 'prod-long-sel', campo: 'longitud' },
            { selId: 'prod-tipo-sel', campo: 'tipo' },
            { selId: 'prod-corte-sel', campo: 'corte' },
            { selId: 'prod-detalle-sel', campo: 'detalle' }
        ];
        campos.forEach(({ selId, campo }) => {
            const sel = document.getElementById(selId);
            if(!sel) return;
            const base = VALORES_BASE[campo] || [];
            const valores = [...base].sort((a, b) => a.localeCompare(b, 'es'));
            const actual = sel.value;
            sel.innerHTML = '<option value="">-- Selecciona --</option>'
                + valores.map(v => `<option value="${esc(v)}">${esc(v)}</option>`).join('')
                + '<option value="__nuevo__">+ Crear nuevo...</option>';
            if(actual && actual !== '__nuevo__') sel.value = actual;
        });
    } catch (err) {
        console.error("Error capturado en renderSelectsProducto:", err);
        alert("Error interno en la aplicación. Revisa la consola.");
    }
}

export function toggleNuevo(campo) {
    try {
        const sel = document.getElementById('prod-' + campo + '-sel');
        const input = document.getElementById('prod-' + campo);
        if(sel.value === '__nuevo__') {
            input.classList.add('visible');
            input.focus();
        } else {
            input.classList.remove('visible');
            input.value = '';
        }
    } catch (err) {
        console.error("Error capturado en toggleNuevo:", err);
        alert("Error interno en la aplicación. Revisa la consola.");
    }
}

export function obtenerValorCampo(campo) {
    try {
        const sel = document.getElementById('prod-' + campo + '-sel');
        const input = document.getElementById('prod-' + campo);
        if(sel.value === '__nuevo__') return input.value.trim();
        return sel.value;
    } catch (err) {
        console.error("Error capturado en obtenerValorCampo:", err);
        alert("Error interno en la aplicación. Revisa la consola.");
    }
}
