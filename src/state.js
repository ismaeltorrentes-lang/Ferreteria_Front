const CLAVE_FORM_VENTA = 'ferreteria:form-venta'
const CLAVE_RETORNO = 'ferreteria:retorno'

export const ESTADOS_LISTA = ['carga', 'vacio', 'error', 'datos']

export function estadoInicial() {
  return {
    sesion: {
      token: localStorage.getItem('ferreteria:token'),
      habilidades: leerJson('ferreteria:habilidades', []),
    },
    catalogo: {
      estado: 'carga',
      datos: [],
      meta: null,
      error: null,
      q: '',
      pagina: 1,
    },
    historial: {
      estado: 'carga',
      datos: [],
      meta: null,
      error: null,
      pagina: 1,
    },
    clientes: {
      estado: 'carga',
      datos: [],
      error: null,
    },
    venta: {
      valores: valorFormulario(leerJson(CLAVE_FORM_VENTA, {})),
      errores: {},
      enviando: false,
      modo: 'crear',
      edicionId: null,
      mensaje: null,
      restaurada: Boolean(localStorage.getItem('ferreteria:token') && sessionStorage.getItem(CLAVE_FORM_VENTA)),
    },
  }
}

function leerJson(clave, porDefecto) {
  try {
    const crudo = sessionStorage.getItem(clave) ?? localStorage.getItem(clave)
    return crudo ? JSON.parse(crudo) : porDefecto
  } catch {
    return porDefecto
  }
}

export function crearTienda(inicial = estadoInicial()) {
  let estado = inicial
  const oyentes = new Set()

  return {
    obtener() {
      return estado
    },

    actualizar(parche) {
      const cambio = typeof parche === 'function' ? parche(estado) : parche
      estado = { ...estado, ...cambio }
      oyentes.forEach((oyente) => oyente(estado))
    },

    actualizarSeccion(clave, parche) {
      const seccion = estado[clave]
      const cambio = typeof parche === 'function' ? parche(seccion) : parche
      this.actualizar({ [clave]: { ...seccion, ...cambio } })
    },

    suscribir(oyente) {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
  }
}

export function valorFormulario(valores) {
  return {
    id_customer: valores.id_customer ?? '',
    sale_date: valores.sale_date ?? hoyISO(),
    total: valores.total ?? '',
    tax_amount: valores.tax_amount ?? '',
    discount: valores.discount ?? '',
    status: valores.status ?? 'completada',
    producto_sku: valores.producto_sku ?? '',
    cantidad: valores.cantidad ?? '1',
  }
}

export function hoyISO() {
  const fecha = new Date()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export function persistirFormularioVenta(valores) {
  sessionStorage.setItem(CLAVE_FORM_VENTA, JSON.stringify(valores))
}

export function limpiarFormularioVenta() {
  sessionStorage.removeItem(CLAVE_FORM_VENTA)
}

export function guardarRetorno(ruta) {
  sessionStorage.setItem(CLAVE_RETORNO, ruta)
}

export function tomarRetorno() {
  const ruta = sessionStorage.getItem(CLAVE_RETORNO)
  sessionStorage.removeItem(CLAVE_RETORNO)
  return ruta
}

export function recordarRetornoActual() {
  const actual = `${location.pathname.split('/').pop()}${location.search}`
  if (actual && !actual.startsWith('login')) {
    guardarRetorno(actual)
  }
}
