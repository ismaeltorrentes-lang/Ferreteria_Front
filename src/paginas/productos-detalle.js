// Diálogo con el detalle de un producto: ver, editar y eliminar.
import { api, esErrorDeCampos, llamada } from '../nucleo/comun.js'
import { cerrarAlClicFuera } from '../componentes/dialogos.js'
import { nodo, pintarDetalleProducto } from '../componentes/vista.js'
import { CAMPOS_PRODUCTO, cuerpoProducto, validarProducto } from '../reglas/producto.js'

// El código de barras se muestra como imagen (data URL), nunca como HTML.
const imagenDeBarras = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

// Crea el diálogo de detalle. `onCambio` se llama cuando el listado debe recargarse.
// `mostrarAccion` muestra mensajes en la pantalla principal.
export function crearDetalleProducto({ onCambio, mostrarAccion }) {
  const $ = (selector) => document.querySelector(selector)

  const dialogo = $('#dialogo-producto')
  const seccionDetalle = $('#detalle')
  const zonaDetalle = $('#detalle-contenido')
  const botonEditar = $('#btn-editar-producto')
  const botonEliminar = $('#btn-eliminar-producto')
  const seccionEditar = $('#editar-producto')
  const formularioEditar = $('#editar-form')
  const estadoEditar = $('#estado-editar')

  let productoActual = null

  cerrarAlClicFuera(dialogo)
  $('#btn-cerrar-detalle').addEventListener('click', () => dialogo.close())
  botonEditar.addEventListener('click', abrirEdicion)
  $('#btn-cancelar-editar').addEventListener('click', volverAlDetalle)
  formularioEditar.addEventListener('submit', guardarEdicion)
  botonEliminar.addEventListener('click', eliminarProducto)

  // ----- Mostrar -----

  function abrirDialogo() {
    if (!dialogo.open) dialogo.showModal()
  }

  function mostrarPanelDetalle() {
    seccionEditar.hidden = true
    seccionDetalle.hidden = false
  }

  // Pinta el detalle de un producto. Pide la imagen del código de barras si tiene uno.
  async function mostrarProducto(producto) {
    productoActual = producto
    mostrarPanelDetalle()
    botonEditar.hidden = !api.puede('update products')
    botonEliminar.hidden = !api.puede('delete products')
    zonaDetalle.replaceChildren(nodo('p', { role: 'status', texto: 'Cargando detalle…' }))
    abrirDialogo()

    let imagen = null
    if (producto.codigo_barras) {
      const codigo = await llamada(() => api.obtenerCodigoBarras(producto.id))
      if (codigo?.svg) imagen = imagenDeBarras(codigo.svg)
    }
    // Si mientras tanto se abrió otro producto, no se pinta este.
    if (productoActual !== producto) return

    const sinImagen = producto.codigo_barras && !imagen
    const avisoSinImagen = sinImagen
      ? nodo('p', { clase: 'ayuda', texto: 'No se pudo generar la imagen del código de barras.' })
      : null
    // filter(Boolean): un null dentro de replaceChildren se escribiría como el texto "null".
    zonaDetalle.replaceChildren(...[...pintarDetalleProducto(producto, imagen), avisoSinImagen].filter(Boolean))
  }

  // Abre el diálogo y carga el producto por su ID.
  async function abrirDetalle(id) {
    mostrarPanelDetalle()
    abrirDialogo()
    zonaDetalle.replaceChildren(nodo('p', { role: 'status', texto: 'Cargando detalle…' }))

    const producto = await llamada(
      () => api.obtenerProducto(id),
      (error) => zonaDetalle.replaceChildren(nodo('p', { clase: 'error', role: 'alert', texto: error.message })),
    )
    if (producto) await mostrarProducto(producto)
  }

  // ----- Editar -----

  const campoEditar = (campo) => formularioEditar.elements.namedItem(campo)

  // Muestra el error de cada campo; el resto queda sin mensaje.
  function marcarErroresEditar(errores = {}) {
    CAMPOS_PRODUCTO.forEach((campo) => {
      const control = campoEditar(campo)
      const zona = formularioEditar.querySelector(`[data-error="${campo}"]`)
      const mensaje = [].concat(errores[campo] ?? [])[0] ?? ''
      control.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
      zona.textContent = mensaje
      zona.className = mensaje ? 'error' : 'ayuda'
    })
  }

  // Llena el formulario de edición con los datos actuales del producto.
  function llenarFormularioEditar(producto) {
    campoEditar('name').value = producto.nombre ?? ''
    campoEditar('description').value = producto.descripcion ?? ''
    campoEditar('price').value = producto.precio ?? ''
    campoEditar('tax_rate').value = producto.tasa_impuesto ?? ''
    campoEditar('stock_quantity').value = producto.cantidad_stock ?? ''
    campoEditar('minimum_stock').value = producto.stock_minimo ?? ''
    campoEditar('maximum_stock').value = producto.stock_maximo ?? ''
    campoEditar('weight').value = producto.peso ?? ''
    campoEditar('is_active').checked = Boolean(producto.esta_activo)
  }

  function abrirEdicion() {
    if (!productoActual) return
    llenarFormularioEditar(productoActual)
    marcarErroresEditar({})
    estadoEditar.textContent = ''
    seccionDetalle.hidden = true
    seccionEditar.hidden = false
    seccionEditar.focus()
  }

  function volverAlDetalle() {
    seccionEditar.hidden = true
    seccionDetalle.hidden = false
  }

  async function guardarEdicion(evento) {
    evento.preventDefault()
    if (!productoActual) return

    const cuerpo = cuerpoProducto(formularioEditar)
    const errores = validarProducto(cuerpo)
    marcarErroresEditar(errores)
    if (Object.keys(errores).length) return

    estadoEditar.style.color = ''
    estadoEditar.textContent = 'Guardando cambios…'
    const actualizado = await llamada(
      () => api.actualizarProducto(productoActual.id, cuerpo),
      (error) => {
        if (esErrorDeCampos(error)) {
          marcarErroresEditar(error.errors)
          estadoEditar.textContent = ''
        } else {
          estadoEditar.style.color = 'var(--c-error)'
          estadoEditar.textContent = error.message
        }
      },
    )
    if (!actualizado) return

    await mostrarProducto(actualizado)
    zonaDetalle.prepend(nodo('p', { role: 'status', clase: 'ayuda', texto: 'Producto actualizado.' }))
    onCambio()
  }

  // ----- Eliminar -----

  async function eliminarProducto() {
    if (!productoActual) return
    if (!window.confirm(`¿Eliminar el producto “${productoActual.nombre}”?`)) return

    let fallo = false
    await llamada(
      () => api.eliminarRecurso('/products', productoActual.id),
      (error) => {
        fallo = true
        zonaDetalle.prepend(nodo('p', { clase: 'error', role: 'alert', texto: error.message }))
      },
    )
    if (fallo) return

    productoActual = null
    dialogo.close()
    mostrarAccion('Producto eliminado.')
    onCambio()
  }

  return { abrirDetalle, mostrarProducto }
}
