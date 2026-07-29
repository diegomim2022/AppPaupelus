# 💖 Pau Pelus Beauty - Sistema de Gestión de Inventario

Aplicación web local para gestionar inventario, compras y ventas de pelucas. **Funciona completamente offline** y almacena todos los datos en tu navegador.

## ✨ Características

- **📊 Dashboard Ejecutivo** - Visualiza ventas, compras, utilidades y stock en tiempo real
- **📦 Codificación de Productos** - Registra todas tus pelucas con referencias y propiedades
- **🛒 Gestión de Compras** - Controla tus pedidos desde China con costos en RMB y conversión automática
- **💰 Registro de Ventas** - Documenta cada venta con cliente, precio y información de envío
- **📈 Reportes Detallados** - Análisis de inventario, proveedores y productos más vendidos
- **💾 Backup & Exportación** - Descarga tus datos en JSON o CSV
- **🌐 Completamente Offline** - Funciona sin internet, sin servidores, sin dependencias externas

## 🚀 Cómo Usar

### Opción 1: Abrir directamente en el navegador (Recomendado)
1. Abre `index.html` en tu navegador web favorito (Chrome, Firefox, Safari, Edge)
2. ¡La aplicación cargará inmediatamente!

### Opción 2: Usar un servidor local (Avanzado)
```bash
# Con Python 3
python -m http.server 8000

# Con Node.js (si tienes http-server instalado)
npx http-server
```

## 📋 Guía de Uso Rápida

### 1. **Codificación de Productos** 📦
Registra tus pelucas antes de hacer compras o ventas:
- **Referencia**: Código único (Ej: 1363-J5P)
- **Nombre**: Descripción del producto (Ej: Goma Carbono J5Prime)
- **Categoría**: Tipo de producto (Ej: Gomas, Vidrios, Accesorios)
- **Proveedor**: Tu proveedor principal (Ej: Jack, Seven, Aurora)
- **Costo RMB**: Precio en China (Ej: 3.50)
- **Precio de Venta**: Precio local en pesos (Ej: 4900)

### 2. **Registro de Compras** 🛒
Documenta tus pedidos desde China:
- **Fecha**: Cuándo llegó la compra
- **Proveedor**: De quién compraste
- **Producto**: Referencia de tu catálogo
- **Cantidad**: Unidades recibidas
- **Costo RMB**: Precio unitario en China
- **Tasa de Cambio**: Usa 430 por defecto (puedes cambiar)
- **Transporte**: Costo de envío desde China
- El sistema **calcula automáticamente** el costo total

### 3. **Registro de Ventas** 💰
Registra cada venta realizada:
- **Fecha**: Cuándo se vendió
- **Producto**: Referencia de tu catálogo
- **Cantidad**: Cuántas unidades
- **Precio**: Precio unitario de venta
- **Cliente**: Nombre del comprador
- **Envío**: Si fue enviado o recogida local
- **Empresa**: DHL, FedEx, Correos, etc.
- **Guía**: Número de seguimiento
- El sistema **calcula automáticamente** el total de venta

### 4. **Dashboard** 📊
Visualiza tu negocio de un vistazo:
- **Total Productos**: Cuántos productos tienes en catálogo
- **Total Compras**: Dinero invertido en inventario
- **Total Ventas**: Dinero generado en ventas
- **Utilidad Total**: Ganancia o pérdida (Ventas - Compras)
- **Stock Actual**: Unidades disponibles en inventario
- **Margen Promedio**: Porcentaje de ganancia

Gráficos automáticos:
- 📈 Ventas por mes
- 🏆 Top 5 productos más vendidos
- 🥧 Distribución de compras por proveedor

### 5. **Reportes Detallados** 📊
Análisis completos de tu negocio:
- **Inventario Actual**: Stock y valor de cada producto
- **Resumen por Proveedor**: Cuánto has comprado a cada uno
- **Productos Más Vendidos**: Ranking de tu bestsellers

### 6. **Gestión de Datos** 💾
Respalda y migra tus datos:
- **Exportar JSON**: Descarga completo de tus datos (mejor para respaldos)
- **Exportar CSV**: Compatible con Excel
- **Importar**: Carga datos guardados previamente
- **Limpiar**: Elimina todos los datos (cuidado, no se puede deshacer)

## 💾 Almacenamiento de Datos

Todos tus datos se guardan automáticamente en el **LocalStorage de tu navegador**:
- No se envían a ningún servidor
- No necesitas internet
- Los datos persisten entre sesiones
- Tienes 5 MB disponibles (más que suficiente para miles de registros)

## 🔒 Seguridad

- ✅ Sin conexión a internet
- ✅ Los datos nunca salen de tu computadora
- ✅ No requiere usuario ni contraseña
- ✅ Puedes ver y auditar todo el código (está en el HTML)

## 📱 Portabilidad

La aplicación es **completamente portable**:
1. Copia el archivo `index.html` a cualquier otro computador
2. Abre en cualquier navegador web
3. ¡Listo! Funciona en cualquier lugar

## 🎓 Consejos de Uso

1. **Respaldos regulares**: Exporta tus datos una vez a la semana
2. **Referencias consistentes**: Usa siempre las mismas referencias de productos
3. **Tasa de cambio**: Actualiza la tasa de RMB a Pesos según sea necesario
4. **Stock negativo**: Cuidado: si vendes más de lo que compras, el stock será negativo
5. **Búsqueda**: Usa la barra de búsqueda para encontrar rápidamente productos

## 🛠️ Resolución de Problemas

**¿Los datos desaparecieron?**
- Los datos se guardan en LocalStorage. Si limpias el caché del navegador, se perderán.
- Solución: Exporta tus datos regularmente

**¿Por qué no carga la aplicación?**
- Abre el archivo `index.html` directamente en el navegador
- Si ves un error, intenta otro navegador (Chrome recomendado)

**¿Cómo migro desde Excel?**
- Exporta tus datos de Excel a CSV
- Adapta el formato al esperado por la aplicación
- Usa la función de importar para cargar los datos

## 📊 Estructura de Datos

### Productos
```
{
  id: "identificador_único",
  referencia: "1363-J5P",
  nombre: "Goma Carbono J5Prime",
  categoria: "Gomas",
  proveedor: "Jack",
  costoRmb: 3.5,
  precioVenta: 4900,
  descripcion: "Goma protectora para pantalla",
  fechaCreacion: "2026-07-28T..."
}
```

### Compras
```
{
  id: "identificador_único",
  fecha: "2026-07-28",
  proveedor: "Jack",
  producto: "1363-J5P",
  cantidad: 400,
  costoRmb: 3.5,
  tasa: 430,
  transporte: 500,
  costoTotal: 602500,
  notas: "Via aérea"
}
```

### Ventas
```
{
  id: "identificador_único",
  fecha: "2026-07-28",
  producto: "1363-J5P",
  cantidad: 100,
  precio: 4900,
  totalVenta: 490000,
  cliente: "Juan García",
  enviado: "si",
  empresa: "DHL",
  guia: "1234567890DHL",
  notas: "Entrega confirmada"
}
```

## 🔄 Flujo del Negocio

```
CHINA SUPPLIER
    ↓
COMPRAR (Ingresa compra)
    ↓
INVENTARIO (Stock disponible)
    ↓
VENDER (Registra venta)
    ↓
ENVIAR (DHL, FedEx, etc)
    ↓
CLIENTE RECIBE
```

## 📞 Soporte

Si encuentras algún error o tienes sugerencias, puedes:
1. Verificar que los datos están siendo ingresados correctamente
2. Intentar en otro navegador
3. Exportar tus datos y intentar importarlos nuevamente

## 📝 Changelog

### Versión 1.0.0 (2026-07-28)
- ✅ Codificación de productos
- ✅ Registro de compras
- ✅ Registro de ventas
- ✅ Dashboard con gráficos
- ✅ Reportes detallados
- ✅ Exportación de datos (JSON/CSV)
- ✅ Búsqueda en tablas
- ✅ Almacenamiento local offline

## 🎨 Diseño

La aplicación usa un esquema de colores moderno con:
- Fondo gradiente (púrpura a rosa)
- Interfaz intuitiva y responsive
- Gráficos automáticos (Chart.js)
- Optimizado para desktop (también funciona en tablet)

## 📄 Licencia

Aplicación de uso personal para Pau Pelus Beauty. Libre de usar, modificar y distribuir.

---

**Pau Pelus Beauty © 2026** | Aplicación de Gestión de Inventario | Funciona Completamente Offline
