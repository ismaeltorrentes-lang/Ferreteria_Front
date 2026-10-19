import { ClienteApi, ErrorApi } from './api.js'
import {
  crearTienda,
  estadoInicial,
  hoyISO,
  limpiarFormularioVenta,
  persistirFormularioVenta,
  recordarRetornoActual,
  tomarRetorno,
  valorFormulario,
} from './state.js'
import {
  colones,
  pintarProductos,
  pintarVentas,
  renderClientes,
  renderFormularioVenta,
  renderizarLista,
} from './views.js'

const api = new ClienteApi()
const tienda = crearTienda(estadoInicial())
const vista = document.body.dataset.vista

function esAborto(error) {
  return error?.name === 'AbortError'
}

function expirarSesion() {
  const { venta } = tienda.obtener()
  if (venta) persistirFormularioVenta(venta.valores)
  recordarRetornoActual()
  location.replace('login.html?motivo=expirada')
}

async function llamada(operacion, alFallar) {
  try {
    return await operacion()
  } catch (error) {
    if (esAborto(error)) return undefined
    if (error instanceof ErrorApi && error.status === 401) {
      expirarSesion()
      return undefined
    }
    if (alFallar) alFallar(error)
    return undefined
  }
}

function exigirSesion() {
  if (!api.token || api.sesionExpirada()) {
    const expirada = Boolean(api.token)
    const { venta } = tienda.obtener()
    if (venta) persistirFormularioVenta(venta.valores)
    api.limpiarSesion()
    recordarRetornoActual()
    location.replace(expirada ? 'login.html?motivo=expirada' : 'login.html')
    return false
  }
  return true
}

function iniciarCatalogo() {
  if (!exigirSesion()) return

  const zonaEstado = document.querySelector('#lista-estado')
  const zonaContenido = document.querySelector('#productos')
  const zonaPaginacion = document.querySelector('#paginacion')
  const campoBusqueda = document.querySelector('#q')

  let controlador = null

  function pintar() {
    const { catalogo } = tienda.obtener()
    renderizarLista({
      zonaEstado,
      zonaContenido,
      zonaPaginacion,
      seccion: catalogo,
      pintar: pintarProductos,
      etiqueta: 'productos',
      onReintentar: () => cargarProductos(),
      onPagina: (pagina) => {
        tienda.actualizarSeccion('catalogo', { pagina })
        cargarProductos()
      },
    })
  }

  async function cargarProductos() {
    controlador?.abort()
    controlador = new AbortController()

    tienda.actualizarSeccion('catalogo', { estado: 'carga', error: null })

    const { q, pagina } = tienda.obtener().catalogo
    const respuesta = await llamada(
      () => api.listarProductos({ q, page: pagina }, controlador.signal),
      (error) =>
        tienda.actualizarSeccion('catalogo', {
          estado: 'error',
          error: error.message,
        }),
    )
    if (!respuesta) return

    tienda.actualizarSeccion('catalogo', {
      estado: respuesta.data.length ? 'datos' : 'vacio',
      datos: respuesta.data,
      meta: respuesta.meta,
      error: null,
    })
  }

 
  let temporizador = null
  const buscar = () => {
    const valor = campoBusqueda.value.trim()
    if (valor === tienda.obtener().catalogo.q) return
    tienda.actualizarSeccion('catalogo', { q: valor, pagina: 1 })
    cargarProductos()
  }

  campoBusqueda.value = tienda.obtener().catalogo.q
  campoBusqueda.addEventListener('input', () => {
    clearTimeout(temporizador)
    temporizador = setTimeout(buscar, 300)
  })

 
  document.querySelector('#filtros-form')?.addEventListener('submit', (evento) => {
    evento.preventDefault()
    clearTimeout(temporizador)
    buscar()
  })

  document.querySelector('#btn-salir')?.addEventListener('click', async () => {
    await llamada(() => api.cerrarSesion())
    location.replace('login.html')
  })

  document.querySelector('#btn-expirar')?.addEventListener('click', () => {
    api.limpiarSesion()
    expirarSesion()
  })

  tienda.suscribir(pintar)
  pintar()
  cargarProductos()
}

function iniciarVentas() {
  if (!exigirSesion()) return

  const form = document.querySelector('#venta-form')
  const selectClientes = document.querySelector('#cliente')
  const zonaEstado = document.querySelector('#historial-estado')
  const zonaContenido = document.querySelector('#historial')
  const zonaPaginacion = document.querySelector('#historial-paginacion')

  let controladorVentas = null
  let controladorClientes = null

  const cuerpoDesdeFormulario = (valores) => ({
    id_customer: valores.id_customer ? String(valores.id_customer) : null,
    sale_date: valores.sale_date || hoyISO(),
    total: valores.total === '' ? '' : Number(valores.total),
    tax_amount: valores.tax_amount === '' ? 0 : Number(valores.tax_amount),
    discount: valores.discount === '' ? 0 : Number(valores.discount),
    status: valores.status || 'completada',
  })

  function pintar() {
    const { historial, clientes, venta } = tienda.obtener()

    renderClientes(selectClientes, clientes)

    renderizarLista({
      zonaEstado,
      zonaContenido,
      zonaPaginacion,
      seccion: historial,
      etiqueta: 'ventas',
      pintar: (datos) =>
        pintarVentas(datos, (v) => nombreCliente(clientes.datos, v.id_customer)),
      onReintentar: () => cargarHistorial(),
      onPagina: (pagina) => {
        tienda.actualizarSeccion('historial', { pagina })
        cargarHistorial()
      },
    })

    renderFormularioVenta(venta, form)
  }

  function nombreCliente(clientes, id) {
    if (!id) return 'Mostrador'
    const cliente = clientes.find((c) => c.id_customer === id)
    return cliente ? `${cliente.first_name} ${cliente.last_name1}`.trim() : `Cliente #${id}`
  }

  async function cargarHistorial() {
    controladorVentas?.abort()
    controladorVentas = new AbortController()

    tienda.actualizarSeccion('historial', { estado: 'carga', error: null })
    const { pagina } = tienda.obtener().historial

    const respuesta = await llamada(
      () => api.listarVentas({ page: pagina }, controladorVentas.signal),
      (error) =>
        tienda.actualizarSeccion('historial', { estado: 'error', error: error.message }),
    )
    if (!respuesta) return

    tienda.actualizarSeccion('historial', {
      estado: respuesta.data.length ? 'datos' : 'vacio',
      datos: respuesta.data,
      meta: respuesta.meta,
      error: null,
    })
  }

  async function cargarClientes() {
    controladorClientes?.abort()
    controladorClientes = new AbortController()

    tienda.actualizarSeccion('clientes', { estado: 'carga', error: null })
    const respuesta = await llamada(
      () => api.listarClientes(controladorClientes.signal),
      (error) =>
        tienda.actualizarSeccion('clientes', { estado: 'error', datos: [], error: error.message }),
    )
    if (!respuesta) return

    tienda.actualizarSeccion('clientes', {
      estado: 'datos',
      datos: respuesta.data,
      error: null,
    })
  }

  form.addEventListener('input', (evento) => {
    const campo = evento.target.name
    if (!campo) return
    tienda.actualizarSeccion('venta', (venta) => ({
      valores: { ...venta.valores, [campo]: evento.target.value },
      errores: { ...venta.errores, [campo]: undefined },
      mensaje: null,
    }))
    persistirFormularioVenta(tienda.obtener().venta.valores)
  })

  const campoProducto = form.elements.namedItem('producto_sku')
  campoProducto?.addEventListener('change', async () => {
    const sku = campoProducto.value.trim()
    if (!sku) return

    const respuesta = await llamada(() => api.listarProductos({ q: sku, perPage: 1 }))
    const producto = respuesta?.data?.[0]

    if (!producto) {
      tienda.actualizarSeccion('venta', {
        mensaje: `No se encontró un producto con SKU “${sku}”.`,
      })
      return
    }

    const cantidad = Number(form.elements.namedItem('cantidad').value) || 1
    const total = Math.round(producto.precio * cantidad)

    tienda.actualizarSeccion('venta', (venta) => ({
      valores: { ...venta.valores, total: String(total) },
      mensaje: `${producto.nombre}: ${colones(producto.precio)} × ${cantidad} = ${colones(total)}`,
    }))
    persistirFormularioVenta(tienda.obtener().venta.valores)
  })

  form.addEventListener('reset', () => {
    setTimeout(() => {
      tienda.actualizarSeccion('venta', {
        valores: valorFormulario({}),
        errores: {},
        modo: 'crear',
        edicionId: null,
        mensaje: 'Formulario limpiado.',
      })
      limpiarFormularioVenta()
    }, 0)
  })

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()

    const { venta } = tienda.obtener()
    tienda.actualizarSeccion('venta', { enviando: true, errores: {}, mensaje: null })

    const cuerpo = cuerpoDesdeFormulario(venta.valores)
    const esEdicion = venta.modo === 'editar' && venta.edicionId

    try {
      const respuesta = esEdicion
        ? await api.actualizarVenta(venta.edicionId, cuerpo)
        : await api.crearVenta(cuerpo)

      tienda.actualizarSeccion('venta', {
        enviando: false,
        errores: {},
        modo: 'crear',
        edicionId: null,
        mensaje: esEdicion
          ? `Venta #${venta.edicionId} actualizada.`
          : `Venta #${respuesta.id} registrada.`,
        valores: esEdicion ? venta.valores : valorFormulario({}),
      })
      if (!esEdicion) limpiarFormularioVenta()
      await cargarHistorial()
    } catch (error) {
      if (esAborto(error)) return
      if (error instanceof ErrorApi && error.status === 401) {
        expirarSesion()
        return
      }
      tienda.actualizarSeccion('venta', {
        enviando: false,
        errores:
          error instanceof ErrorApi && error.status === 422
            ? error.errors
            : { formulario: [error?.message || 'No se pudo guardar la venta.'] },
      })
    }
  })

  zonaContenido.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-editar]')
    if (!boton) return

    const id = Number(boton.dataset.editar)
    const { historial } = tienda.obtener()
    const venta = historial.datos.find((v) => v.id === id)
    if (!venta) return

    tienda.actualizarSeccion('venta', {
      modo: 'editar',
      edicionId: id,
      errores: {},
      mensaje: `Editando la venta #${id}.`,
      valores: valorFormulario({
        id_customer: venta.id_customer ?? '',
        sale_date: String(venta.sale_date).slice(0, 10),
        total: String(venta.total),
        tax_amount: venta.tax_amount == null ? '' : String(venta.tax_amount),
        discount: venta.discount == null ? '' : String(venta.discount),
        status: venta.status,
        producto_sku: tienda.obtener().venta.valores.producto_sku ?? '',
        cantidad: tienda.obtener().venta.valores.cantidad ?? '1',
      }),
    })
    form.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  document.querySelector('#btn-cancelar-edicion')?.addEventListener('click', () => {
    tienda.actualizarSeccion('venta', {
      modo: 'crear',
      edicionId: null,
      errores: {},
      mensaje: 'Edición cancelada.',
      valores: valorFormulario({}),
    })
    limpiarFormularioVenta()
  })

  document.querySelector('#btn-salir')?.addEventListener('click', async () => {
    await llamada(() => api.cerrarSesion())
    location.replace('login.html')
  })

  document.querySelector('#btn-expirar')?.addEventListener('click', () => {
    api.limpiarSesion()
    expirarSesion()
  })

  const { venta } = tienda.obtener()
  if (venta.valores.total || venta.valores.id_customer) {
    tienda.actualizarSeccion('venta', {
      mensaje: 'Sesión restaurada: no se perdieron los datos del formulario.',
    })
  }

  tienda.suscribir(pintar)
  pintar()
  cargarClientes()
  cargarHistorial()
}

function iniciarLogin() {
  const form = document.querySelector('#login-form')
  const zonaError = document.querySelector('#login-error')

  const mostrarError = (texto, color = 'var(--danger)') => {
    zonaError.textContent = texto
    zonaError.className = texto ? 'error' : 'ayuda'
    zonaError.style.color = color
  }

  const motivo = new URLSearchParams(location.search).get('motivo')
  if (motivo === 'expirada') {
    mostrarError(
      'Su sesión expiró (el token vence a las 2 horas). Inicie sesión de nuevo: los datos del formulario se conservaron.',
      'var(--bruma-texto)',
    )
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    mostrarError('')

    const datos = new FormData(form)
    try {
      await api.iniciarSesion(datos.get('email'), datos.get('password'))
    } catch (error) {
      if (esAborto(error)) return
      if (error instanceof ErrorApi) {
        mostrarError(
          error.status === 422
            ? Object.values(error.errors).flat().join(' ')
            : error.message,
        )
        return
      }
      mostrarError('Error inesperado. Intente de nuevo.')
      return
    }

    const retorno = tomarRetorno()
    location.replace(retorno || 'index.html')
  })
}

if (vista === 'catalogo') iniciarCatalogo()
else if (vista === 'ventas') iniciarVentas()
else if (vista === 'login') iniciarLogin()
