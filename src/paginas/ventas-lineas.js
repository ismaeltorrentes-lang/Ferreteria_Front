// Líneas de producto de una venta: agregar por nombre o SKU, cambiar cantidades, quitar y calcular totales.
import { api, llamada } from '../nucleo/comun.js'
import { colones, nodo } from '../componentes/vista.js'

// Subtotal de una línea, redondeado a centavos.
export function subtotalDeLinea(linea) {
  return Math.round(linea.precio * linea.cantidad * 100) / 100
}

// Busca un producto por SKU exacto (sin distinguir mayúsculas).
async function buscarProductoPorSku(sku) {
  const respuesta = await llamada(() => api.listarProductos({ q: sku, perPage: 10 }))
  const buscado = sku.toUpperCase()
  return respuesta?.data?.find((producto) => String(producto.sku).toUpperCase() === buscado) ?? null
}

// Maneja la tabla de productos de la venta.
// Lee el impuesto y el descuento de los campos del formulario para calcular el total.
export function crearLineasVenta() {
  const $ = (selector) => document.querySelector(selector)
  const cuerpoTabla = $('#lineas-cuerpo')
  const campoProducto = $('#linea-producto')
  const listaSugerencias = $('#linea-sugerencias')
  const campoCantidad = $('#linea-cantidad')
  const mensaje = $('#lineas-estado')

  let lineas = []
  let sugerencias = []
  let productoPendiente = null
  let indiceActivo = -1
  let controlador = null
  let temporizador = null

  // ----- Mensajes -----

  function mostrarMensaje(texto, esError = false) {
    mensaje.className = esError ? 'error' : 'ayuda'
    mensaje.textContent = texto
  }

  // ----- Totales -----

  function totales() {
    const subtotal = lineas.reduce((suma, linea) => suma + subtotalDeLinea(linea), 0)
    const impuesto = Number($('#tax_amount').value) || 0
    const descuento = Number($('#discount').value) || 0
    return { subtotal, impuesto, descuento, total: subtotal + impuesto - descuento }
  }

  function pintarTotales() {
    const { subtotal, impuesto, descuento, total } = totales()
    $('#resumen-subtotal').textContent = colones(subtotal)
    $('#resumen-impuesto').textContent = colones(impuesto)
    $('#resumen-descuento').textContent = colones(descuento)
    $('#resumen-total').textContent = colones(total)
  }

  // ----- Tabla -----

  function filaVacia() {
    return nodo('tr', {}, [nodo('td', { colspan: 5, clase: 'ayuda', texto: 'Aún no hay productos en la venta.' })])
  }

  function filaDeLinea(linea, indice) {
    return nodo('tr', {}, [
      nodo('td', {}, [
        nodo('strong', { texto: linea.nombre }),
        nodo('br'),
        nodo('span', { clase: 'ayuda', texto: `SKU ${linea.sku}` }),
      ]),
      nodo('td', {}, [
        nodo('input', {
          type: 'number',
          min: 1,
          max: linea.cantidad_stock,
          step: 1,
          value: linea.cantidad,
          'aria-label': `Cantidad de ${linea.nombre}`,
          'data-cantidad': indice,
        }),
      ]),
      nodo('td', { texto: colones(linea.precio) }),
      nodo('td', { texto: colones(subtotalDeLinea(linea)) }),
      nodo('td', {}, [
        nodo('button', { type: 'button', clase: 'btn-quitar', texto: 'Quitar', 'data-quitar': indice }),
      ]),
    ])
  }

  function pintarTabla() {
    cuerpoTabla.replaceChildren(...(lineas.length ? lineas.map(filaDeLinea) : [filaVacia()]))
    pintarTotales()
  }

  // ----- Sugerencias (combobox) -----

  function cerrarSugerencias() {
    sugerencias = []
    indiceActivo = -1
    listaSugerencias.replaceChildren()
    listaSugerencias.hidden = true
    campoProducto.setAttribute('aria-expanded', 'false')
    campoProducto.removeAttribute('aria-activedescendant')
  }

  function pintarSugerencias(productos) {
    sugerencias = productos
    indiceActivo = -1
    listaSugerencias.replaceChildren(
      ...productos.map((producto, indice) =>
        nodo(
          'li',
          {
            role: 'option',
            id: `sugerencia-${producto.id}`,
            clase: 'sugerencia',
            'data-indice': indice,
            'aria-selected': 'false',
          },
          [
            nodo('span', { clase: 'sugerencia-nombre', texto: producto.nombre }),
            nodo('span', {
              clase: 'sugerencia-meta',
              texto: `SKU ${producto.sku} · ${colones(producto.precio)} · Stock ${producto.cantidad_stock ?? 0}`,
            }),
          ],
        ),
      ),
    )
    listaSugerencias.hidden = productos.length === 0
    campoProducto.setAttribute('aria-expanded', String(productos.length > 0))
  }

  function activarSugerencia(indice) {
    if (!sugerencias.length) return
    indiceActivo = (indice + sugerencias.length) % sugerencias.length
    ;[...listaSugerencias.children].forEach((opcion, i) => {
      const activa = i === indiceActivo
      opcion.setAttribute('aria-selected', String(activa))
      opcion.classList.toggle('activa', activa)
    })
    campoProducto.setAttribute('aria-activedescendant', `sugerencia-${sugerencias[indiceActivo].id}`)
  }

  // Busca mientras se escribe, con una pausa corta y cancelando la petición anterior.
  function programarBusqueda() {
    clearTimeout(temporizador)
    controlador?.abort()

    const texto = campoProducto.value.trim()
    if (texto.length < 2) {
      cerrarSugerencias()
      return
    }

    temporizador = setTimeout(async () => {
      controlador = new AbortController()
      const respuesta = await llamada(
        () => api.listarProductos({ q: texto, perPage: 8 }, controlador.signal),
        () => cerrarSugerencias(),
      )
      // Si el texto cambió mientras llegaba la respuesta, se descarta.
      if (!respuesta || campoProducto.value.trim() !== texto) return
      pintarSugerencias(respuesta.data)
    }, 250)
  }

  // ----- Acciones -----

  // Producto que corresponde a lo escrito: primero la sugerencia activa,
  // luego el SKU exacto (lector de códigos) y por último la primera sugerencia.
  function productoElegido() {
    if (indiceActivo >= 0) return sugerencias[indiceActivo]
    const texto = campoProducto.value.trim().toUpperCase()
    const exacto = sugerencias.find((producto) => String(producto.sku).toUpperCase() === texto)
    return exacto ?? sugerencias[0] ?? null
  }

  function seleccionarProducto(producto) {
    clearTimeout(temporizador)
    controlador?.abort()
    productoPendiente = producto
    campoProducto.value = producto.nombre
    cerrarSugerencias()
    mostrarMensaje(`Seleccionado: ${producto.nombre}. Ingrese la cantidad y presione Agregar producto.`)
    campoCantidad.focus()
  }

  // Agrega un producto. Si ya está en la venta, suma la cantidad.
  async function agregar(producto = null) {
    const cantidad = Number(campoCantidad.value)
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return mostrarMensaje('La cantidad debe ser un número entero mayor que cero.', true)
    }

    let elegido = producto ?? productoPendiente ?? productoElegido()

    if (!elegido) {
      const texto = campoProducto.value.trim()
      if (!texto) return mostrarMensaje('Escriba el nombre o el SKU del producto.', true)
      mostrarMensaje('Buscando producto…')
      elegido = await buscarProductoPorSku(texto)
      if (!elegido) {
        return mostrarMensaje(`No se encontró un producto para “${texto}”. Seleccione una sugerencia.`, true)
      }
    }

    clearTimeout(temporizador)
    controlador?.abort()

    const existente = lineas.find((linea) => linea.id === elegido.id)
    const stockDisponible = Number(elegido.cantidad_stock ?? 0)
    const cantidadSolicitada = (existente?.cantidad ?? 0) + cantidad
    if (cantidadSolicitada > stockDisponible) {
      return mostrarMensaje(
        `Stock insuficiente para ${elegido.nombre}: disponible ${stockDisponible}, solicitado ${cantidadSolicitada}.`,
        true,
      )
    }

    if (existente) {
      existente.cantidad = cantidadSolicitada
      existente.cantidad_stock = stockDisponible
    } else {
      lineas.push({
        id: elegido.id,
        sku: elegido.sku,
        nombre: elegido.nombre,
        precio: elegido.precio,
        cantidad,
        cantidad_stock: stockDisponible,
      })
    }

    campoProducto.value = ''
    campoCantidad.value = '1'
    productoPendiente = null
    cerrarSugerencias()
    mostrarMensaje(`Agregado: ${cantidad} × ${elegido.nombre}.`)
    pintarTabla()
    campoProducto.focus()
  }

  function quitar(indice) {
    lineas.splice(indice, 1)
    mostrarMensaje('')
    pintarTabla()
  }

  function cambiarCantidad(indice, valor) {
    const cantidad = Number(valor)
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      mostrarMensaje('La cantidad debe ser un número entero mayor que cero.', true)
      pintarTabla()
      return
    }
    if (cantidad > lineas[indice].cantidad_stock) {
      mostrarMensaje(
        `Stock insuficiente para ${lineas[indice].nombre}: disponible ${lineas[indice].cantidad_stock}, solicitado ${cantidad}.`,
        true,
      )
      pintarTabla()
      return
    }
    lineas[indice].cantidad = cantidad
    mostrarMensaje('')
    pintarTabla()
  }

  // ----- Eventos -----

  $('#btn-agregar-linea').addEventListener('click', () => agregar())

  campoProducto.addEventListener('input', () => {
    productoPendiente = null
    programarBusqueda()
  })

  campoProducto.addEventListener('keydown', (evento) => {
    if (evento.key === 'ArrowDown') {
      evento.preventDefault()
      activarSugerencia(indiceActivo + 1)
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault()
      activarSugerencia(indiceActivo <= 0 ? sugerencias.length - 1 : indiceActivo - 1)
    } else if (evento.key === 'Enter') {
      evento.preventDefault()
      if (sugerencias.length) {
        const elegido = productoElegido()
        if (elegido) seleccionarProducto(elegido)
      } else {
        agregar()
      }
    } else if (evento.key === 'Escape') {
      cerrarSugerencias()
    }
  })

  // pointerdown evita que el campo pierda el foco antes de elegir la sugerencia.
  listaSugerencias.addEventListener('pointerdown', (evento) => {
    const opcion = evento.target.closest('[data-indice]')
    if (!opcion) return
    evento.preventDefault()
    seleccionarProducto(sugerencias[Number(opcion.dataset.indice)])
  })

  campoProducto.addEventListener('focusout', () => {
    setTimeout(cerrarSugerencias, 150)
  })

  cuerpoTabla.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-quitar]')
    if (boton) quitar(Number(boton.dataset.quitar))
  })

  cuerpoTabla.addEventListener('change', (evento) => {
    const entrada = evento.target.closest('[data-cantidad]')
    if (entrada) cambiarCantidad(Number(entrada.dataset.cantidad), entrada.value)
  })

  // ----- Interfaz pública -----

  return {
    // Copia de las líneas actuales.
    obtener: () => [...lineas],
    totales,
    pintarTotales,
    actualizarStock(productos) {
      productos.forEach((producto) => {
        const linea = lineas.find((actual) => actual.id === producto.id)
        if (linea) linea.cantidad_stock = Number(producto.cantidad_stock ?? 0)
      })
      pintarTabla()
    },
    // Vacía la lista (después de guardar o cancelar).
    vaciar() {
      lineas = []
      productoPendiente = null
      cerrarSugerencias()
      mostrarMensaje('')
      pintarTabla()
    },
    mostrarMensaje,
  }
}
