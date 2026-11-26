// Página de compras (compras.html). Solo lectura: el listado y, al abrir cada compra, sus detalles.
import { colones, nodo, renderizarLista } from '../componentes/vista.js'
import { api, iniciarPagina, llamada } from '../nucleo/comun.js'

// Color de la insignia según el estado de la compra.
function claseEstadoCompra(estado) {
  const valor = String(estado ?? '').toLowerCase()
  if (valor.startsWith('recib') || valor.startsWith('confirm')) return 'badge badge-ok'
  if (valor.startsWith('pendient')) return 'badge badge-bajo'
  if (valor.startsWith('cancel')) return 'badge badge-error'
  return 'badge badge-neutro'
}

// Tabla con los productos de una compra.
function tablaDetalles(items) {
  const encabezados = ['Detalle', 'Producto', 'Cantidad', 'Costo unitario', 'Subtotal']

  return nodo('div', { clase: 'tabla-scroll' }, [
    nodo('table', {}, [
      nodo('caption', { texto: 'Detalles de la compra' }),
      nodo('thead', {}, nodo('tr', {}, encabezados.map((texto) => nodo('th', { scope: 'col', texto })))),
      nodo('tbody', {}, items.map((item) =>
        nodo('tr', {}, [
          nodo('th', { scope: 'row', texto: String(item['ID Detalle']) }),
          nodo('td', { texto: item.Producto ?? `Producto #${item['ID Producto']}` }),
          nodo('td', { texto: String(item.Cantidad) }),
          nodo('td', { texto: colones(item['Costo Unitario']) }),
          nodo('td', { texto: colones(item.SubTotal) }),
        ]),
      )),
    ]),
  ])
}

// Encabezado del diálogo: proveedor, estado y total de la compra.
function resumenCompra(compra) {
  return [
    nodo('p', { texto: `Proveedor: ${compra.id_supplier}` }),
    nodo('p', { clase: 'badges' }, [
      nodo('span', { clase: claseEstadoCompra(compra.purchase_status), texto: compra.purchase_status }),
      nodo('span', { clase: 'price', texto: colones(compra.purchase_total) }),
    ]),
  ]
}

iniciarPagina('view purchases', () => {
  const zonaEstado = document.querySelector('#compras-estado')
  const zonaLista = document.querySelector('#compras-lista')
  const zonaPaginacion = document.querySelector('#compras-paginacion')
  const dialogo = document.querySelector('#dialogo-detalles')
  const contenidoDialogo = document.querySelector('#contenido-dialogo')
  const tituloDialogo = document.querySelector('#t-dialogo')

  let seccion = { estado: 'carga', datos: [], meta: null, error: null }
  let pagina = 1
  let controlador = null
  let comprasPorId = new Map()

  // Tarjetas del listado. El botón abre el diálogo de detalles.
  function pintarCompras(compras) {
    comprasPorId = new Map(compras.map((compra) => [String(compra.id_purchase), compra]))

    return compras.map((compra) => {
      const cantidadItems = (compra.purchaseItems ?? []).length
      return nodo('article', { clase: 'card' }, [
        nodo('h3', { texto: `Compra ${compra.id_purchase}` }),
        nodo('p', { texto: `Proveedor: ${compra.id_supplier}` }),
        nodo('p', { clase: 'price', texto: colones(compra.purchase_total) }),
        nodo('p', { clase: 'badges' }, [
          nodo('span', { clase: claseEstadoCompra(compra.purchase_status), texto: compra.purchase_status }),
        ]),
        nodo('p', { clase: 'card-pie' }, [
          nodo('button', {
            type: 'button',
            texto: `Ver detalles (${cantidadItems})`,
            'data-detalles': String(compra.id_purchase),
          }),
        ]),
      ])
    })
  }

  // Los nombres de producto no vienen en el listado; se piden al endpoint de items de la compra.
  async function abrirDetalles(idCompra) {
    const compra = comprasPorId.get(String(idCompra))
    if (!compra) return

    tituloDialogo.textContent = `Compra ${compra.id_purchase}`
    contenidoDialogo.replaceChildren(
      ...resumenCompra(compra),
      nodo('p', { role: 'status', clase: 'ayuda', texto: 'Cargando productos…' }),
    )
    dialogo.showModal()

    const respuesta = await llamada(
      () => api.listarRecurso(`/purchases/${encodeURIComponent(compra.id_purchase)}/items`, { per_page: 50 }),
      (error) => contenidoDialogo.append(nodo('p', { clase: 'error', role: 'alert', texto: error.message })),
    )
    if (!respuesta) return

    const items = respuesta.data
    contenidoDialogo.replaceChildren(
      ...resumenCompra(compra),
      items.length
        ? tablaDetalles(items)
        : nodo('p', { clase: 'ayuda', texto: 'Esta compra no tiene detalles.' }),
    )
  }

  function pintarListado() {
    renderizarLista({
      zonaEstado,
      zonaContenido: zonaLista,
      zonaPaginacion,
      seccion,
      pintar: pintarCompras,
      etiqueta: 'compras',
      onReintentar: cargar,
      onPagina: (nueva) => {
        pagina = nueva
        cargar()
      },
    })
  }

  async function cargar() {
    controlador?.abort()
    controlador = new AbortController()
    seccion = { ...seccion, estado: 'carga', error: null }
    pintarListado()

    const respuesta = await llamada(
      () => api.listarCompras({ page: pagina }, controlador.signal),
      (error) => {
        seccion = { estado: 'error', datos: [], meta: null, error: error.message }
        pintarListado()
      },
    )
    if (!respuesta) return

    seccion = {
      estado: respuesta.data.length ? 'datos' : 'vacio',
      datos: respuesta.data,
      meta: respuesta.meta,
      error: null,
    }
    pintarListado()
  }

  zonaLista.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-detalles]')
    if (boton) abrirDetalles(boton.dataset.detalles)
  })

  document.querySelector('#btn-cerrar-dialogo').addEventListener('click', () => dialogo.close())

  // Clic en el fondo oscuro (fuera del contenido) también cierra el diálogo.
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) dialogo.close()
  })

  pintarListado()
  cargar()
})
