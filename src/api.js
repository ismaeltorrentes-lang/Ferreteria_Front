const CLAVE_TOKEN = 'ferreteria:token'
const CLAVE_EXPIRA = 'ferreteria:token-expira'

const URL_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'

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

  constructor({ urlBase = URL_BASE, token = null } = {}) {
    this.#urlBase = urlBase.replace(/\/$/, '')
    this.#token = token ?? localStorage.getItem(CLAVE_TOKEN)
  }

  get urlBase() {
    return this.#urlBase
  }

  get token() {
    return this.#token
  }

  guardarSesion({ token, expires_at, abilities = [] }) {
    this.#token = token
    localStorage.setItem(CLAVE_TOKEN, token)
    if (expires_at) {
      localStorage.setItem(CLAVE_EXPIRA, String(expires_at))
    }
    localStorage.setItem('ferreteria:habilidades', JSON.stringify(abilities))
  }

  limpiarSesion() {
    this.#token = null
    localStorage.removeItem(CLAVE_TOKEN)
    localStorage.removeItem(CLAVE_EXPIRA)
    localStorage.removeItem('ferreteria:habilidades')
  }

  sesionExpirada() {
    const expira = localStorage.getItem(CLAVE_EXPIRA)
    if (!this.#token) return true
    if (!expira) return false
    return new Date(expira).getTime() <= Date.now()
  }

  habilidades() {
    try {
      return JSON.parse(localStorage.getItem('ferreteria:habilidades') || '[]')
    } catch {
      return []
    }
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

  async listarProductos({ q = '', page = 1, perPage = 12 } = {}, signal) {
    return this.#solicitud('/products', {
      query: { q, page, per_page: perPage },
      signal,
    })
  }

  async listarClientes(signal) {
    return this.#solicitud('/customers', { query: { per_page: 50 }, signal })
  }

  async listarVentas({ page = 1, perPage = 5 } = {}, signal) {
    return this.#solicitud('/sales', {
      query: { page, per_page: perPage, sort: 'id', direction: 'desc' },
      signal,
    })
  }

  async crearVenta(cuerpo) {
    const datos = await this.#solicitud('/sales', { metodo: 'POST', cuerpo })
    return datos?.data ?? datos
  }

  async actualizarVenta(id, cuerpo) {
    const datos = await this.#solicitud(`/sales/${id}`, { metodo: 'PUT', cuerpo })
    return datos?.data ?? datos
  }
}
