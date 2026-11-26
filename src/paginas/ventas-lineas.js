// Líneas de producto de una venta: agregar por SKU, cambiar cantidades, quitar y calcular totales.
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
  const campoSku = $('#linea-sku')
  const campoCantidad = $('#linea-cantidad')
  const mensaje = $('#lineas-estado')

  let lineas = []

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

  // ----- Acciones -----

  // Agrega un producto por SKU. Si ya está en la venta, suma la cantidad.
  async function agregar() {
    const sku = campoSku.value.trim()
    const cantidad = Number(campoCantidad.value)
    if (!sku) return mostrarMensaje('Escriba el SKU del producto.', true)
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return mostrarMensaje('La cantidad debe ser un número entero mayor que cero.', true)
    }

    mostrarMensaje('Buscando producto…')
    const producto = await buscarProductoPorSku(sku)
    if (!producto) return mostrarMensaje(`No se encontró un producto con SKU “${sku}”.`, true)

    const existente = lineas.find((linea) => linea.id === producto.id)
    if (existente) {
      existente.cantidad += cantidad
    } else {
      lineas.push({ id: producto.id, sku: producto.sku, nombre: producto.nombre, precio: producto.precio, cantidad })
    }

    campoSku.value = ''
    campoCantidad.value = '1'
    mostrarMensaje(`Agregado: ${cantidad} × ${producto.nombre}.`)
    pintarTabla()
    campoSku.focus()
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
    lineas[indice].cantidad = cantidad
    mostrarMensaje('')
    pintarTabla()
  }

  // ----- Eventos -----

  $('#btn-agregar-linea').addEventListener('click', agregar)

  campoSku.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter') {
      evento.preventDefault()
      agregar()
    }
  })

  cuerpoTabla.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-quitar]')
    if (boton) quitar(Number(boton.dataset.quitar))
  })

  cuerpoTabla.addEventListener('change', (evento) => {
    const entrada = evento.target.closest('[data-cantidad]')
    if (entrada) cambiarCantidad(Number(entrada.dataset.cantidad), entrada.value)
  })

  $('#tax_amount').addEventListener('input', pintarTotales)
  $('#discount').addEventListener('input', pintarTotales)

  // ----- Interfaz pública -----

  return {
    // Copia de las líneas actuales.
    obtener: () => [...lineas],
    totales,
    pintarTotales,
    // Vacía la lista (después de guardar o cancelar).
    vaciar() {
      lineas = []
      mostrarMensaje('')
      pintarTabla()
    },
    mostrarMensaje,
  }
}
