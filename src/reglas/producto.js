// Reglas de producto. Espejo de UpdateProductRequest y de ProductService::validateStockCoherence
// (backend). Si el backend cambia un límite, hay que cambiarlo aquí también.

// Límites de los campos (mismos valores que el backend)
const MAX_NOMBRE = 150
const MAX_DESCRIPCION = 1000
const MAX_PRECIO = 99999999.99
const MAX_IMPUESTO = 100
const MAX_STOCK = 1000000
const MAX_PESO = 100000

// Campos que se editan en el formulario de edición (los nombres son los del backend).
export const CAMPOS_PRODUCTO = [
  'name',
  'description',
  'price',
  'tax_rate',
  'stock_quantity',
  'minimum_stock',
  'maximum_stock',
  'weight',
]

// Campos del formulario de alta (se dibujan con componentes/formularios.js).
// Las listas de categoría, marca y unidad se llenan al abrir el formulario.
export const CAMPOS_NUEVO_PRODUCTO = [
  { nombre: 'name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: MAX_NOMBRE },
  { nombre: 'sku', etiqueta: 'SKU', tipo: 'text', requerido: true, max: 50 },
  { nombre: 'barcode', etiqueta: 'Código de barras', tipo: 'text', max: 50 },
  { nombre: 'description', etiqueta: 'Descripción', tipo: 'textarea', max: MAX_DESCRIPCION },
  { nombre: 'category_id', etiqueta: 'Categoría', tipo: 'select', requerido: true, numerico: true, opciones: [] },
  { nombre: 'brand_id', etiqueta: 'Marca', tipo: 'select', requerido: true, numerico: true, opciones: [] },
  { nombre: 'unit_id', etiqueta: 'Unidad de medida', tipo: 'select', requerido: true, numerico: true, opciones: [] },
  { nombre: 'price', etiqueta: 'Precio (₡)', tipo: 'number', requerido: true, min: 0, max_valor: MAX_PRECIO },
  { nombre: 'tax_rate', etiqueta: 'Impuesto (%)', tipo: 'number', min: 0, max_valor: MAX_IMPUESTO },
  { nombre: 'stock_quantity', etiqueta: 'Stock actual', tipo: 'number', requerido: true, entero: true, min: 0, max_valor: MAX_STOCK },
  { nombre: 'minimum_stock', etiqueta: 'Stock mínimo', tipo: 'number', entero: true, min: 0, max_valor: MAX_STOCK },
  { nombre: 'maximum_stock', etiqueta: 'Stock máximo', tipo: 'number', entero: true, min: 0, max_valor: MAX_STOCK },
  { nombre: 'weight', etiqueta: 'Peso', tipo: 'number', min: 0, max_valor: MAX_PESO },
  { nombre: 'image_url', etiqueta: 'Imagen (URL)', tipo: 'text', max: 255 },
  { nombre: 'is_active', etiqueta: 'Producto activo', tipo: 'checkbox' },
]

// Lee un campo de texto del formulario sin espacios alrededor.
const textoDe = (form, campo) => form.elements.namedItem(campo).value.trim()

// Campo obligatorio: si está vacío, se devuelve NaN para que la validación lo marque.
const numeroObligatorio = (texto) => (texto === '' ? Number.NaN : Number(texto))

// Campo opcional: si está vacío, se envía null.
const numeroOpcional = (texto) => (texto === '' ? null : Number(texto))

// Arma el cuerpo que se envía a la API desde el formulario de edición.
export function cuerpoProducto(form) {
  return {
    name: textoDe(form, 'name'),
    description: textoDe(form, 'description') || null,
    price: numeroObligatorio(textoDe(form, 'price')),
    tax_rate: numeroOpcional(textoDe(form, 'tax_rate')),
    stock_quantity: numeroObligatorio(textoDe(form, 'stock_quantity')),
    minimum_stock: numeroOpcional(textoDe(form, 'minimum_stock')),
    maximum_stock: numeroOpcional(textoDe(form, 'maximum_stock')),
    weight: numeroOpcional(textoDe(form, 'weight')),
    is_active: form.elements.namedItem('is_active').checked,
  }
}

const estaEnRango = (numero, min, max) =>
  typeof numero === 'number' && Number.isFinite(numero) && numero >= min && numero <= max

const esEnteroEnRango = (numero, min, max) => Number.isInteger(numero) && numero >= min && numero <= max

// Devuelve los errores de validación, por campo. Un objeto vacío significa que todo está bien.
export function validarProducto(cuerpo) {
  const errores = {}

  if (!cuerpo.name) {
    errores.name = ['El nombre es obligatorio.']
  } else if (cuerpo.name.length > MAX_NOMBRE) {
    errores.name = [`El nombre no puede superar ${MAX_NOMBRE} caracteres.`]
  }

  if (cuerpo.description && cuerpo.description.length > MAX_DESCRIPCION) {
    errores.description = [`La descripción no puede superar ${MAX_DESCRIPCION} caracteres.`]
  }

  if (!estaEnRango(cuerpo.price, 0, MAX_PRECIO)) {
    errores.price = ['Ingrese un precio entre 0 y 99 999 999,99.']
  }

  if (cuerpo.tax_rate !== null && !estaEnRango(cuerpo.tax_rate, 0, MAX_IMPUESTO)) {
    errores.tax_rate = [`El impuesto debe estar entre 0 y ${MAX_IMPUESTO}.`]
  }

  if (!esEnteroEnRango(cuerpo.stock_quantity, 0, MAX_STOCK)) {
    errores.stock_quantity = ['Ingrese una cantidad entera entre 0 y 1 000 000.']
  }

  if (cuerpo.minimum_stock !== null && !esEnteroEnRango(cuerpo.minimum_stock, 0, MAX_STOCK)) {
    errores.minimum_stock = ['El stock mínimo debe ser un entero entre 0 y 1 000 000.']
  }

  if (cuerpo.maximum_stock !== null && !esEnteroEnRango(cuerpo.maximum_stock, 0, MAX_STOCK)) {
    errores.maximum_stock = ['El stock máximo debe ser un entero entre 0 y 1 000 000.']
  }

  if (cuerpo.weight !== null && !estaEnRango(cuerpo.weight, 0, MAX_PESO)) {
    errores.weight = ['El peso debe estar entre 0 y 100 000.']
  }

  // Reglas entre campos: mínimo ≤ stock ≤ máximo.
  const { minimum_stock: minimo, maximum_stock: maximo, stock_quantity: stock } = cuerpo

  if (minimo !== null && maximo !== null && minimo > maximo && !errores.maximum_stock) {
    errores.maximum_stock = ['El stock máximo no puede ser menor que el stock mínimo.']
  }
  if (!errores.stock_quantity && minimo !== null && stock < minimo) {
    errores.stock_quantity = ['La cantidad en stock no puede ser menor que el stock mínimo.']
  }
  if (!errores.stock_quantity && maximo !== null && stock > maximo) {
    errores.stock_quantity = ['La cantidad en stock no puede superar el stock máximo.']
  }

  return errores
}
