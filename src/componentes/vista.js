// Funciones que dibujan la interfaz: crean elementos HTML a partir de los datos de la API.

const formatoColones = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
})

const formatoFecha = new Intl.DateTimeFormat('es-CR', { dateStyle: 'medium', timeZone: 'UTC' })

export function colones(valor) {
  return formatoColones.format(Number(valor) || 0)
}

// Crea un elemento. Atributos especiales: `texto` (contenido), `clase` (className),
// y `onClick`/`onChange`/... (escuchadores). Los hijos null o false se ignoran.
export function nodo(tag, atributos = {}, ...hijos) {
  const elemento = document.createElement(tag)

  Object.entries(atributos).forEach(([nombre, valor]) => {
    if (nombre === 'texto') {
      elemento.textContent = valor
    } else if (nombre === 'clase') {
      elemento.className = valor
    } else if (nombre.startsWith('on') && typeof valor === 'function') {
      elemento.addEventListener(nombre.slice(2).toLowerCase(), valor)
    } else if (valor !== undefined && valor !== null && valor !== false) {
      elemento.setAttribute(nombre, valor === true ? '' : valor)
    }
  })

  hijos.flat().forEach((hijo) => {
    if (hijo) elemento.append(hijo)
  })
  return elemento
}

// Muestra un mensaje de estado en un elemento: en rojo si es error, en gris si es informativo.
export function mostrarTexto(elemento, texto, esError = false) {
  elemento.className = esError ? 'error' : 'ayuda'
  elemento.textContent = texto
}

// ----- Listas con estados: carga, vacío, error, datos y paginación -----

export function renderizarLista({
  zonaEstado,
  zonaContenido,
  zonaPaginacion = null,
  seccion,
  pintar,
  onReintentar = null,
  onPagina = null,
  etiqueta = 'elementos',
}) {
  zonaEstado.replaceChildren()
  zonaContenido.replaceChildren()
  if (zonaPaginacion) zonaPaginacion.replaceChildren()
  zonaContenido.hidden = seccion.estado !== 'datos'
  if (zonaPaginacion) zonaPaginacion.hidden = seccion.estado !== 'datos'

  if (seccion.estado === 'carga') {
    zonaEstado.append(nodo('p', { role: 'status', texto: `Cargando ${etiqueta}…` }))
    return
  }

  if (seccion.estado === 'vacio') {
    zonaEstado.append(
      nodo('p', {
        role: 'status',
        texto: seccion.q
          ? `No se encontraron ${etiqueta} para “${seccion.q}”.`
          : `No hay ${etiqueta} por mostrar todavía.`,
      }),
    )
    return
  }

  if (seccion.estado === 'error') {
    const acciones = nodo('p', { clase: 'acciones' })
    if (onReintentar) {
      acciones.append(
        nodo('button', { type: 'button', clase: 'btn-primario', texto: 'Reintentar', onClick: onReintentar }),
      )
    }
    zonaEstado.append(
      nodo('div', { clase: 'error', role: 'alert' }, [
        nodo('p', { texto: seccion.error || 'Ocurrió un error inesperado.' }),
        acciones,
      ]),
    )
    return
  }

  zonaEstado.append(nodo('p', { role: 'status', texto: `${seccion.datos.length} ${etiqueta} en esta página.` }))
  zonaContenido.append(...pintar(seccion.datos))

  if (zonaPaginacion && seccion.meta && onPagina) {
    zonaPaginacion.append(crearPaginacion(seccion.meta, onPagina))
  }
}

function crearPaginacion(meta, onPagina) {
  const pagina = meta.current_page
  const ultima = meta.last_page

  return nodo('p', { clase: 'fila' }, [
    nodo('button', {
      type: 'button',
      texto: '← Anterior',
      disabled: pagina <= 1,
      onClick: () => onPagina(pagina - 1),
    }),
    nodo('span', { role: 'status', texto: `Página ${pagina} de ${ultima} · ${meta.total} en total` }),
    nodo('button', {
      type: 'button',
      texto: 'Siguiente →',
      disabled: pagina >= ultima,
      onClick: () => onPagina(pagina + 1),
    }),
  ])
}

// ----- Productos -----

function insigniaStock(producto) {
  const stock = Number(producto.cantidad_stock ?? 0)
  const minimo = Number(producto.stock_minimo ?? 0)

  if (!producto.esta_activo) return nodo('span', { clase: 'badge', texto: 'Inactivo' })
  if (stock === 0) return nodo('span', { clase: 'badge', texto: 'Agotado' })
  if (minimo > 0 && stock <= minimo) {
    return nodo('span', { clase: 'badge badge-bajo', texto: `Solo ${stock}` })
  }
  return nodo('span', { clase: 'badge badge-ok', texto: '✓ En stock' })
}

// Tarjetas del listado de productos.
export function pintarProductos(productos) {
  return productos.map((producto) =>
    nodo('article', { clase: 'card' }, [
      nodo('h3', { texto: producto.nombre }),
      nodo('p', { texto: `${producto.sku} · ${colones(producto.precio)}` }),
      producto.descripcion ? nodo('p', { clase: 'ayuda', texto: producto.descripcion }) : null,
      nodo('p', { clase: 'badges' }, [insigniaStock(producto)]),
      nodo('p', { clase: 'card-pie' }, [
        nodo('button', { type: 'button', texto: 'Ver detalle', 'data-detalle': producto.id }),
        producto.codigo_barras
          ? nodo('button', { type: 'button', texto: 'Imprimir etiqueta', 'data-imprimir': producto.id })
          : null,
      ]),
      producto.codigo_barras ? nodo('div', { clase: 'etiqueta-impresion', hidden: true }) : null,
      producto.codigo_barras
        ? nodo('p', { clase: 'error error-impresion', role: 'alert', hidden: true })
        : null,
    ]),
  )
}

// Contenido del diálogo de detalle: datos, descripción y, si existe, la imagen del código de barras.
export function pintarDetalleProducto(producto, imagenBarras = null) {
  const filas = [
    ['SKU', producto.sku],
    ['Precio', colones(producto.precio)],
    ['Stock', String(producto.cantidad_stock ?? 0)],
    ['Stock mínimo', producto.stock_minimo == null ? 'No definido' : String(producto.stock_minimo)],
    ['Stock máximo', producto.stock_maximo == null ? 'No definido' : String(producto.stock_maximo)],
    ['Impuesto', `${Number(producto.tasa_impuesto ?? 0)} %`],
    ['Peso', producto.peso == null ? 'No definido' : String(producto.peso)],
    ['Código de barras', producto.codigo_barras || 'Sin código asignado'],
    ['Estado', producto.esta_activo ? 'Activo' : 'Inactivo'],
  ]

  // filter(Boolean): replaceChildren y append convierten null en el texto "null".
  return [
    nodo('h3', { texto: producto.nombre }),
    producto.descripcion ? nodo('p', { clase: 'ayuda', texto: producto.descripcion }) : null,
    nodo(
      'dl',
      { clase: 'detalle-producto' },
      filas.flatMap(([etiqueta, valor]) => [nodo('dt', { texto: etiqueta }), nodo('dd', { texto: valor })]),
    ),
    imagenBarras
      ? nodo('img', {
          clase: 'codigo-barras',
          src: imagenBarras,
          alt: `Código de barras ${producto.codigo_barras}`,
        })
      : null,
  ].filter(Boolean)
}

// Tabla del resumen de inventario por categoría.
export function pintarResumenInventario(filas) {
  return [
    nodo('table', {}, [
      nodo('caption', { texto: 'Totales por categoría' }),
      nodo(
        'thead',
        {},
        nodo(
          'tr',
          {},
          ['Categoría', 'Productos', 'Stock total', 'Precio promedio'].map((texto) =>
            nodo('th', { scope: 'col', texto }),
          ),
        ),
      ),
      nodo(
        'tbody',
        {},
        filas.map((fila) =>
          nodo('tr', {}, [
            nodo('th', { scope: 'row', texto: fila.category_name }),
            nodo('td', { texto: String(fila.total_products) }),
            nodo('td', { texto: String(fila.total_stock) }),
            nodo('td', { texto: colones(fila.average_price) }),
          ]),
        ),
      ),
    ]),
  ]
}

// ----- Ventas -----

function fechaVenta(valor) {
  const iso = String(valor ?? '').slice(0, 10)
  const fecha = new Date(`${iso}T00:00:00Z`)
  return Number.isNaN(fecha.getTime()) ? 'Sin fecha' : formatoFecha.format(fecha)
}

function insigniaEstadoVenta(estado) {
  const texto = String(estado ?? '').trim() || 'sin estado'
  const valor = texto.toLowerCase()
  let clase = 'badge badge-neutro'
  if (valor.startsWith('complet')) clase = 'badge badge-ok'
  else if (valor.startsWith('pendient')) clase = 'badge badge-bajo'
  else if (valor.startsWith('cancel')) clase = 'badge badge-error'
  return nodo('span', { clase, texto })
}

// Tarjetas del historial de ventas. Los botones dependen de los permisos que recibe.
export function pintarVentas(ventas, nombreCliente, { editable = true, eliminable = false } = {}) {
  return ventas.map((venta) =>
    nodo('article', { clase: 'card' }, [
      nodo('h3', { texto: `Venta #${venta.id}` }),
      nodo('p', { texto: nombreCliente(venta) }),
      nodo('p', { clase: 'price', texto: colones(venta.total) }),
      nodo('p', { clase: 'badges' }, [insigniaEstadoVenta(venta.status)]),
      nodo('p', { clase: 'ayuda', texto: `Fecha: ${fechaVenta(venta.sale_date)}` }),
      nodo('p', { clase: 'card-pie' }, [
        editable
          ? nodo('button', { type: 'button', clase: 'btn-primario', texto: 'Editar', 'data-editar': venta.id })
          : nodo('span', { clase: 'ayuda', texto: 'Solo lectura' }),
        eliminable
          ? nodo('button', { type: 'button', texto: 'Eliminar', 'data-eliminar': venta.id })
          : null,
      ]),
    ]),
  )
}
