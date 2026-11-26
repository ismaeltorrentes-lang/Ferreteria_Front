// Página de ventas (ventas.html).
// Crear una venta: se guardan los datos de la cabecera y después una línea por cada producto.
// Editar una venta: solo se cambian los datos de la cabecera (las líneas no se editan aquí).
import { ErrorApi } from '../nucleo/api.js'
import { api, esErrorDeCampos, iniciarPagina, llamada } from '../nucleo/comun.js'
import { mostrarTexto } from '../componentes/vista.js'
import { crearHistorialVentas } from './ventas-historial.js'
import { crearLineasVenta, subtotalDeLinea } from './ventas-lineas.js'

// Campos del formulario de cabecera que pueden tener error de la API.
const CAMPOS_CABECERA = ['id_customer', 'sale_date', 'status', 'total']

// Fecha de hoy en formato AAAA-MM-DD (hora local).
function hoyISO() {
  const ahora = new Date()
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset())
  return ahora.toISOString().slice(0, 10)
}

// Mensaje claro para los errores que no son de campo.
function mensajeDeError(error) {
  if (error instanceof ErrorApi && error.status === 404) {
    return 'La venta no existe o solo puede editar las ventas que usted registró.'
  }
  if (error instanceof ErrorApi && error.status === 403) {
    return 'Su rol no tiene permiso para realizar esta acción.'
  }
  return error?.message || 'No se pudo guardar la venta.'
}

// Datos de la cabecera tal como se envían a la API.
function leerCabecera(campo) {
  return {
    id_customer: campo('id_customer').value ? String(campo('id_customer').value) : null,
    sale_date: campo('sale_date').value,
    status: campo('status').value,
    tax_amount: Number(campo('tax_amount').value) || 0,
    discount: Number(campo('discount').value) || 0,
  }
}

// Errores de la cabecera que se pueden revisar sin llamar a la API.
function validarCabecera(cabecera) {
  const errores = {}
  if (!cabecera.sale_date) errores.sale_date = ['Seleccione la fecha de la venta.']
  if (cabecera.tax_amount < 0) errores.tax_amount = ['El impuesto no puede ser negativo.']
  if (cabecera.discount < 0) errores.discount = ['El descuento no puede ser negativo.']
  return errores
}

iniciarPagina('view sales', () => {
  const $ = (selector) => document.querySelector(selector)
  const formulario = $('#venta-form')
  const campo = (nombre) => formulario.elements.namedItem(nombre)
  const estadoVenta = $('#estado-venta')
  const botonConfirmar = $('#btn-confirmar')
  const botonCancelarEdicion = $('#btn-cancelar-edicion')
  const bloqueLineas = $('#bloque-lineas')
  const bloqueTotal = $('#campo-total')
  const tituloVenta = $('#t-venta')

  // Ventas: si se está editando una venta, aquí queda su ID. Si no, es null.
  let ventaEditando = null
  const clientes = []

  const lineas = crearLineasVenta()

  // ----- Mensajes y errores por campo -----

  function mostrarEstado(texto, esError = false) {
    mostrarTexto(estadoVenta, texto, esError)
  }

  // Pone los errores junto a cada campo. Devuelve los que no son de ningún campo.
  function marcarErrores(errores = {}) {
    CAMPOS_CABECERA.forEach((nombre) => {
      const control = campo(nombre)
      const zona = formulario.querySelector(`[data-error="${nombre}"]`)
      const mensaje = [].concat(errores[nombre] ?? [])[0] ?? ''
      if (control) control.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
      if (zona) {
        zona.textContent = mensaje
        zona.className = mensaje ? 'error' : 'ayuda'
      }
    })

    return Object.entries(errores)
      .filter(([nombre]) => !CAMPOS_CABECERA.includes(nombre))
      .flatMap(([, mensajes]) => [].concat(mensajes))
  }

  // Muestra errores de la API: por campo si los hay, o un mensaje general.
  function mostrarErrorDeApi(error) {
    if (esErrorDeCampos(error)) {
      const sobrantes = marcarErrores(error.errors)
      mostrarEstado(sobrantes.join(' ') || 'Revise los datos marcados.', true)
    } else {
      mostrarEstado(mensajeDeError(error), true)
    }
  }

  // ----- Clientes -----

  async function cargarClientes() {
    const respuesta = await llamada(() => api.listarClientes())
    if (!respuesta) return

    clientes.splice(0, clientes.length, ...respuesta.data)
    const elegido = campo('id_customer').value
    campo('id_customer').replaceChildren(
      crearOpcion('', 'Mostrador (sin cliente)'),
      ...clientes.map((cliente) => crearOpcion(cliente.id_customer, `${cliente.first_name} ${cliente.last_name1}`.trim() || cliente.email)),
    )
    campo('id_customer').value = elegido
  }

  function crearOpcion(valor, texto) {
    const opcion = document.createElement('option')
    opcion.value = valor
    opcion.textContent = texto
    return opcion
  }

  function nombreDelCliente(venta) {
    if (!venta.id_customer) return 'Mostrador'
    const cliente = clientes.find((registro) => registro.id_customer === venta.id_customer)
    return cliente ? `${cliente.first_name} ${cliente.last_name1}`.trim() : `Cliente #${venta.id_customer}`
  }

  // ----- Modos del formulario: nueva venta o edición -----

  function modoCrear() {
    ventaEditando = null
    tituloVenta.textContent = 'Nueva venta'
    botonConfirmar.textContent = 'Confirmar venta'
    botonCancelarEdicion.hidden = true
    bloqueLineas.hidden = false
    bloqueTotal.hidden = true
    campo('total').removeAttribute('required')
  }

  function limpiarFormulario() {
    formulario.reset()
    campo('sale_date').value = hoyISO()
    campo('tax_amount').value = '0'
    campo('discount').value = '0'
    lineas.vaciar()
    marcarErrores({})
  }

  function modoEditar(venta) {
    ventaEditando = venta.id
    tituloVenta.textContent = `Editar venta #${venta.id}`
    botonConfirmar.textContent = 'Guardar cambios'
    botonCancelarEdicion.hidden = false
    bloqueLineas.hidden = true
    bloqueTotal.hidden = false
    campo('total').setAttribute('required', '')

    campo('id_customer').value = venta.id_customer ?? ''
    campo('sale_date').value = String(venta.sale_date).slice(0, 10)
    campo('status').value = venta.status
    campo('tax_amount').value = venta.tax_amount ?? 0
    campo('discount').value = venta.discount ?? 0
    campo('total').value = venta.total

    marcarErrores({})
    mostrarEstado(`Editando la venta #${venta.id}.`)
    formulario.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ----- Guardar -----

  // Crea la venta y después una línea por cada producto.
  async function crearVentaConLineas() {
    const cabecera = leerCabecera(campo)
    const { total } = lineas.totales()

    const errores = validarCabecera(cabecera)
    if (total < 0) errores.discount = ['El descuento no puede superar el subtotal más el impuesto.']
    const productos = lineas.obtener()
    if (!productos.length) errores.formulario = ['Agregue al menos un producto a la venta.']

    const erroresGenerales = marcarErrores(errores)
    if (erroresGenerales.length) return mostrarEstado(erroresGenerales.join(' '), true)
    if (Object.keys(errores).length) return mostrarEstado('Revise los datos marcados.', true)

    botonConfirmar.disabled = true
    mostrarEstado('Verificando existencias…')
    const inventarios = await Promise.all(
      productos.map((linea) => llamada(
        () => api.obtenerProducto(linea.id),
        (error) => mostrarEstado(
          `No se pudo verificar el stock de ${linea.nombre}: ${error.message}`,
          true,
        ),
      )),
    )
    if (inventarios.some((producto) => !producto)) {
      botonConfirmar.disabled = false
      return
    }

    lineas.actualizarStock(inventarios)
    const insuficiente = productos.find((linea, indice) =>
      linea.cantidad > Number(inventarios[indice].cantidad_stock ?? 0),
    )
    if (insuficiente) {
      const disponible = Number(inventarios.find((producto) => producto.id === insuficiente.id).cantidad_stock ?? 0)
      mostrarEstado(
        `Stock insuficiente para ${insuficiente.nombre}: disponible ${disponible}, solicitado ${insuficiente.cantidad}.`,
        true,
      )
      botonConfirmar.disabled = false
      return
    }

    mostrarEstado('Guardando venta…')
    const venta = await llamada(() => api.crearVenta({ ...cabecera, total }), mostrarErrorDeApi)
    if (!venta) {
      botonConfirmar.disabled = false
      return
    }

    // Cada producto es una línea de la venta recién creada.
    const fallidas = []
    for (const linea of productos) {
      mostrarEstado(`Agregando ${linea.nombre}…`)
      await llamada(
        () => api.crearLineaVenta({
          sale_id: venta.id,
          product_id: linea.id,
          quantity: linea.cantidad,
          unit_price: linea.precio,
          subtotal: subtotalDeLinea(linea),
        }),
        () => fallidas.push(linea.nombre),
      )
    }

    botonConfirmar.disabled = false
    if (fallidas.length) {
      mostrarEstado(`Venta #${venta.id} registrada, pero no se agregaron: ${fallidas.join(', ')}.`, true)
    } else {
      mostrarEstado(`Venta #${venta.id} registrada con ${productos.length} producto(s).`)
      limpiarFormulario()
    }
    historial.recargar()
  }

  // Guarda solo los datos de la cabecera de una venta existente.
  async function guardarCambiosDeVenta() {
    const cabecera = leerCabecera(campo)
    const total = Number(campo('total').value)

    const errores = validarCabecera(cabecera)
    if (!Number.isFinite(total) || total < 0) errores.total = ['Ingrese un total válido.']

    const erroresGenerales = marcarErrores(errores)
    if (erroresGenerales.length) return mostrarEstado(erroresGenerales.join(' '), true)
    if (Object.keys(errores).length) return mostrarEstado('Revise los datos marcados.', true)

    botonConfirmar.disabled = true
    mostrarEstado('Guardando cambios…')
    const actualizada = await llamada(
      () => api.actualizarVenta(ventaEditando, { ...cabecera, total }),
      mostrarErrorDeApi,
    )
    botonConfirmar.disabled = false
    if (!actualizada) return

    const id = ventaEditando
    modoCrear()
    limpiarFormulario()
    mostrarEstado(`Venta #${id} actualizada.`)
    historial.recargar()
  }

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault()
    if (ventaEditando === null) crearVentaConLineas()
    else guardarCambiosDeVenta()
  })

  $('#btn-cancelar-edicion').addEventListener('click', () => {
    modoCrear()
    limpiarFormulario()
    mostrarEstado('Edición cancelada.')
  })

  // ----- Eliminar -----

  async function eliminarVenta(id) {
    if (!window.confirm(`¿Eliminar la venta #${id}? Esta acción no se puede deshacer.`)) return

    let fallo = false
    await llamada(
      () => api.eliminarRecurso('/sales', id),
      (error) => {
        fallo = true
        mostrarEstado(mensajeDeError(error), true)
      },
    )
    if (fallo) return

    if (ventaEditando === id) {
      modoCrear()
      limpiarFormulario()
    }
    mostrarEstado(`Venta #${id} eliminada.`)
    historial.recargar()
  }

  // ----- Historial -----

  const historial = crearHistorialVentas({
    nombreCliente: nombreDelCliente,
    alEditar: modoEditar,
    alEliminar: eliminarVenta,
  })

  // ----- Arranque -----

  limpiarFormulario()
  modoCrear()
  // Si puede crear ventas pero no ver clientes, el selector queda deshabilitado.
  if (api.puede('create sales') && !api.puede('view customers')) {
    campo('id_customer').disabled = true
  }
  cargarClientes()
  historial.recargar()
})
