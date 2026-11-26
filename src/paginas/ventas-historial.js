// Historial de ventas: lista paginada de tarjetas con los botones Editar y Eliminar.
import { api, llamada } from '../nucleo/comun.js'
import { pintarVentas, renderizarLista } from '../componentes/vista.js'

// `alEditar(venta)` y `alEliminar(id)` las resuelve la página de ventas.
// `nombreCliente(venta)` devuelve el texto del cliente de una venta.
export function crearHistorialVentas({ nombreCliente, alEditar, alEliminar }) {
  const zonaEstado = document.querySelector('#historial-estado')
  const zonaLista = document.querySelector('#historial')
  const zonaPaginacion = document.querySelector('#historial-paginacion')

  const seccion = { estado: 'carga', datos: [], meta: null, error: null }
  let pagina = 1
  let controlador = null

  function pintar() {
    renderizarLista({
      zonaEstado,
      zonaContenido: zonaLista,
      zonaPaginacion,
      seccion,
      etiqueta: 'ventas',
      pintar: (ventas) =>
        pintarVentas(ventas, nombreCliente, {
          editable: api.puede('update sales'),
          eliminable: api.puede('delete sales'),
        }),
      onReintentar: recargar,
      onPagina: (nueva) => {
        pagina = nueva
        recargar()
      },
    })
  }

  // Pide la página actual del historial a la API.
  async function recargar() {
    controlador?.abort()
    controlador = new AbortController()
    Object.assign(seccion, { estado: 'carga', error: null })
    pintar()

    const respuesta = await llamada(
      () => api.listarVentas({ page: pagina }, controlador.signal),
      (error) => {
        Object.assign(seccion, { estado: 'error', datos: [], meta: null, error: error.message })
        pintar()
      },
    )
    if (!respuesta) return

    Object.assign(seccion, {
      estado: respuesta.data.length ? 'datos' : 'vacio',
      datos: respuesta.data,
      meta: respuesta.meta,
      error: null,
    })
    pintar()
  }

  // Botones de cada tarjeta.
  zonaLista.addEventListener('click', (evento) => {
    const botonEditar = evento.target.closest('[data-editar]')
    const botonEliminar = evento.target.closest('[data-eliminar]')

    if (botonEditar) {
      const venta = seccion.datos.find((registro) => registro.id === Number(botonEditar.dataset.editar))
      if (venta) alEditar(venta)
    }
    if (botonEliminar) alEliminar(Number(botonEliminar.dataset.eliminar))
  })

  return { recargar }
}
