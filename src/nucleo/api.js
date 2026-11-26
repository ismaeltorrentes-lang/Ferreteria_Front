// Cliente de la API REST de Laravel.
// Guarda el token de sesión en el navegador y envía cada petición con ese token.

const CLAVE_TOKEN = 'ferreteria:token'
const CLAVE_EXPIRA = 'ferreteria:token-expira'
const CLAVE_HABILIDADES = 'ferreteria:habilidades'

const URL_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

// Error que devuelve la API: incluye el código HTTP y los errores por campo (422).
export class ErrorApi extends Error {
  constructor({ status = 0, message = 'Error de la API', errors = {} } = {}) {
    super(message)
    this.name = 'ErrorApi'
    this.status = status
    this.errors = errors
  }
}

export class ClienteApi {
  #urlBase
  #token

  constructor() {
    this.#urlBase = URL_BASE.replace(/\/$/, '')
    this.#token = localStorage.getItem(CLAVE_TOKEN)
  }

  get token() {
    return this.#token
  }

  // ----- Sesión -----

  guardarSesion({ token, expires_at, abilities = [] }) {
    this.#token = token
    localStorage.setItem(CLAVE_TOKEN, token)
    if (expires_at) {
      localStorage.setItem(CLAVE_EXPIRA, String(expires_at))
    }
    localStorage.setItem(CLAVE_HABILIDADES, JSON.stringify(abilities))
  }

  limpiarSesion() {
    this.#token = null
    localStorage.removeItem(CLAVE_TOKEN)
    localStorage.removeItem(CLAVE_EXPIRA)
    localStorage.removeItem(CLAVE_HABILIDADES)
  }

  sesionExpirada() {
    const expira = localStorage.getItem(CLAVE_EXPIRA)
    if (!this.#token) return true
    if (!expira) return false
    return new Date(expira).getTime() <= Date.now()
  }

  // Permisos del usuario, tal como los envió el backend al iniciar sesión (p. ej. "view sales").
  habilidades() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_HABILIDADES) || '[]')
    } catch {
      return []
    }
  }

  puede(permiso) {
    return this.habilidades().includes(permiso)
  }

  async iniciarSesion(email, password) {
    const datos = await this.#solicitud('/login', {
      metodo: 'POST',
      cuerpo: { email, password },
    })
    this.guardarSesion(datos)
    return datos
  }

  async cerrarSesion() {
    try {
      await this.#solicitud('/logout', { metodo: 'POST', cuerpo: {} })
    } finally {
      this.limpiarSesion()
    }
  }

  // ----- Productos -----

  listarProductos({ q = '', page = 1, perPage = 12 } = {}, signal) {
    return this.#solicitud('/products', {
      query: { q, page, per_page: perPage },
      signal,
    })
  }

  async obtenerProducto(id, signal) {
    return this.#extraerDatos(await this.#solicitud(`/products/${id}`, { signal }))
  }

  async buscarProductoPorCodigoBarras(codigo, signal) {
    return this.#extraerDatos(
      await this.#solicitud('/products/by-barcode', { query: { barcode: codigo }, signal }),
    )
  }

  async obtenerCodigoBarras(id, signal) {
    return this.#extraerDatos(await this.#solicitud(`/products/${id}/barcode`, { signal }))
  }

  resumenInventario(signal) {
    return this.#solicitud('/products/inventory-summary', { signal })
  }

  async actualizarProducto(id, cuerpo) {
    return this.#extraerDatos(await this.#solicitud(`/products/${id}`, { metodo: 'PUT', cuerpo }))
  }

  // ----- Ventas -----

  listarVentas({ page = 1, perPage = 5 } = {}, signal) {
    return this.#solicitud('/sales', {
      query: { page, per_page: perPage, sort: 'id', direction: 'desc' },
      signal,
    })
  }

  listarClientes(signal) {
    return this.#solicitud('/customers', { query: { per_page: 50 }, signal })
  }

  async crearVenta(cuerpo) {
    return this.#extraerDatos(await this.#solicitud('/sales', { metodo: 'POST', cuerpo }))
  }

  async actualizarVenta(id, cuerpo) {
    return this.#extraerDatos(await this.#solicitud(`/sales/${id}`, { metodo: 'PUT', cuerpo }))
  }

  async crearLineaVenta(cuerpo) {
    return this.#extraerDatos(await this.#solicitud('/sale-items', { metodo: 'POST', cuerpo }))
  }

  // ----- Compras y recepción -----

  listarCompras({ page = 1, perPage = 10 } = {}, signal) {
    return this.#solicitud('/purchases', { query: { page, per_page: perPage }, signal })
  }

  listarRecepcionesPendientes(codigo, { perPage = 50 } = {}, signal) {
    return this.#solicitud('/purchase-receipts', {
      query: { barcode: codigo, per_page: perPage },
      signal,
    })
  }

  async recibirDetalle(id, cuerpo) {
    return this.#extraerDatos(
      await this.#solicitud(`/purchase-items/${id}/receive`, { metodo: 'POST', cuerpo }),
    )
  }

  // ----- Operaciones genéricas (catálogos, clientes, proveedores, pagos...) -----

  listarRecurso(ruta, query = {}, signal) {
    return this.#solicitud(ruta, { query, signal })
  }

  async crearRecurso(ruta, cuerpo) {
    return this.#extraerDatos(await this.#solicitud(ruta, { metodo: 'POST', cuerpo }))
  }

  async actualizarRecurso(ruta, id, cuerpo) {
    const url = `${ruta}/${encodeURIComponent(id)}`
    return this.#extraerDatos(await this.#solicitud(url, { metodo: 'PUT', cuerpo }))
  }

  eliminarRecurso(ruta, id) {
    return this.#solicitud(`${ruta}/${encodeURIComponent(id)}`, { metodo: 'DELETE' })
  }

  // ----- Internos -----

  // La API envuelve un solo recurso en { data: ... }; aquí se devuelve el recurso directamente.
  #extraerDatos(respuesta) {
    return respuesta?.data ?? respuesta
  }

  #armarUrl(ruta, query = {}) {
    const url = new URL(`${this.#urlBase}${ruta}`)
    Object.entries(query).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '') {
        url.searchParams.set(clave, String(valor))
      }
    })
    return url.toString()
  }

  async #solicitud(ruta, { metodo = 'GET', cuerpo, query, signal } = {}) {
    const encabezados = { Accept: 'application/json' }
    if (this.#token) {
      encabezados.Authorization = `Bearer ${this.#token}`
    }
    if (cuerpo !== undefined) {
      encabezados['Content-Type'] = 'application/json'
    }

    let respuesta
    try {
      respuesta = await fetch(this.#armarUrl(ruta, query), {
        method: metodo,
        headers: encabezados,
        body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
        signal,
      })
    } catch (error) {
      if (error.name === 'AbortError') throw error
      throw new ErrorApi({
        status: 0,
        message: 'No se pudo conectar con el servidor. Verifique que la API esté en ejecución.',
      })
    }

    const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null)

    if (!respuesta.ok) {
      if (respuesta.status === 401) {
        this.limpiarSesion()
      }
      throw new ErrorApi({
        status: respuesta.status,
        message: datos?.message ?? `El servidor respondió con error ${respuesta.status}.`,
        errors: datos?.errors ?? {},
      })
    }

    return datos
  }
}
