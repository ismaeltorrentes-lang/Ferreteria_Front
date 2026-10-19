const formatoColones = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  maximumFractionDigits: 0,
})

export function colones(valor) {
  return formatoColones.format(Number(valor) || 0)
}

function nodo(tag, opciones = {}, ...hijos) {
  const elemento = document.createElement(tag)
  Object.entries(opciones).forEach(([clave, valor]) => {
    if (clave === 'texto') elemento.textContent = valor
    else if (clave === 'clase') elemento.className = valor
    else if (clave.startsWith('on') && typeof valor === 'function') {
      elemento.addEventListener(clave.slice(2).toLowerCase(), valor)
    } else if (valor !== undefined && valor !== null && valor !== false) {
      elemento.setAttribute(clave, valor === true ? '' : valor)
    }
  })
  hijos.flat().forEach((hijo) => {
    if (hijo) elemento.append(hijo)
  })
  return elemento
}

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
    zonaEstado.append(
      nodo('p', { clase: '', role: 'status', texto: `Cargando ${etiqueta}…` }),
    )
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

  zonaEstado.append(
    nodo('p', { role: 'status', texto: `${seccion.datos.length} ${etiqueta} en esta página.` }),
  )
  zonaContenido.append(...pintar(seccion.datos))

  if (zonaPaginacion && seccion.meta && onPagina) {
    zonaPaginacion.append(paginacion(seccion.meta, onPagina))
  }
}

function paginacion(meta, onPagina) {
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

function badgeStock(producto) {
  const stock = Number(producto.cantidad_stock ?? 0)
  const minimo = Number(producto.stock_minimo ?? 0)

  if (!producto.esta_activo) return nodo('span', { clase: 'badge', texto: 'Inactivo' })
  if (stock === 0) return nodo('span', { clase: 'badge', texto: 'Agotado' })
  if (minimo > 0 && stock <= minimo) {
    return nodo('span', { clase: 'badge badge-bajo', texto: `Solo ${stock}` })
  }
  return nodo('span', { clase: 'badge badge-ok', texto: '✓ En stock' })
}

export function pintarProductos(datos) {
  return datos.map((producto) =>
    nodo('article', { clase: 'card' }, [
      nodo('h3', { texto: producto.nombre }),
      nodo('p', { texto: `${producto.sku} · ${colones(producto.precio)}` }),
      producto.descripcion
        ? nodo('p', { clase: 'ayuda', texto: producto.descripcion })
        : null,
      nodo('p', { clase: 'badges' }, [badgeStock(producto)]),
    ]),
  )
}

export function pintarVentas(datos, nombreCliente) {
  return datos.map((venta) =>
    nodo('article', { clase: 'card' }, [
      nodo('h3', { texto: `Venta #${venta.id}` }),
      nodo('p', { texto: `${nombreCliente(venta)} · ${colones(venta.total)}` }),
      nodo('p', { clase: 'badges' }, [
        nodo('span', { clase: 'badge', texto: venta.status }),
        nodo('span', { clase: 'ayuda', texto: `Fecha: ${String(venta.sale_date).slice(0, 10)}` }),
      ]),
      nodo('p', { clase: 'acciones' }, [
        nodo('button', {
          type: 'button',
          clase: 'btn-primario',
          texto: 'Editar',
          'data-editar': venta.id,
        }),
      ]),
    ]),
  )
}

export function renderFormularioVenta(venta, form) {
  if (!form) return

  Object.entries(venta.valores).forEach(([campo, valor]) => {
    const control = form.elements.namedItem(campo)
    if (!control || control === document.activeElement) return
    control.value = valor ?? ''
  })

  const nombres = ['id_customer', 'sale_date', 'total', 'tax_amount', 'discount', 'status']
  nombres.forEach((campo) => {
    const control = form.elements.namedItem(campo)
    const zonaError = form.querySelector(`[data-error="${campo}"]`)
    if (!control) return

    const mensaje = venta.errores[campo]?.[0] ?? ''
    control.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
    if (zonaError) {
      zonaError.textContent = mensaje
      zonaError.className = mensaje ? 'error' : 'ayuda'
    }
  })

  const generales = Object.entries(venta.errores)
    .filter(([campo]) => !nombres.includes(campo))
    .filter(([, mensajes]) => Array.isArray(mensajes))
    .flatMap(([, mensajes]) => mensajes)

  const estado = form.querySelector('#estado-venta')
  if (estado) {
    if (generales.length) {
      estado.textContent = generales.join(' ')
      estado.style.color = 'var(--danger)'
    } else if (venta.mensaje) {
      estado.textContent = venta.mensaje
      estado.style.color = 'var(--success)'
    } else if (venta.enviando) {
      estado.textContent = 'Guardando venta…'
      estado.style.color = ''
    } else {
      estado.textContent = ''
    }
  }

  const boton = form.querySelector('[type="submit"]')
  if (boton) boton.disabled = venta.enviando

  const titulo = document.querySelector('#t-venta')
  if (titulo) {
    titulo.textContent = venta.modo === 'editar' ? `Editar venta #${venta.edicionId}` : 'Nueva venta'
  }

  const cancelar = form.querySelector('#btn-cancelar-edicion')
  if (cancelar) cancelar.hidden = venta.modo !== 'editar'
}

export function renderClientes(select, clientes) {
  if (!select) return

  const firma = clientes.datos.map((c) => c.id_customer).join(',')
  if (select.dataset.firma === firma) return
  select.dataset.firma = firma

  const seleccionado = select.value
  select.replaceChildren(
    nodo('option', { value: '', texto: 'Seleccione…' }),
    ...clientes.datos.map((cliente) =>
      nodo('option', {
        value: cliente.id_customer,
        texto: `${cliente.first_name} ${cliente.last_name1}`.trim() || cliente.email,
      }),
    ),
  )

  if (clientes.estado === 'error') {
    select.append(nodo('option', { value: '', texto: 'No se pudieron cargar los clientes' }))
  }
  select.value = seleccionado || ''
}
