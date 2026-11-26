// Sesión, permisos y llamadas a la API que comparten todas las páginas.
import { ClienteApi, ErrorApi } from './api.js'
import { iniciarTema } from './tema.js'

export const api = new ClienteApi()

// Páginas del sistema y el permiso mínimo para verlas, en el orden del menú.
const PAGINAS = [
  { href: 'index.html', permiso: 'view products' },
  { href: 'ventas.html', permiso: 'view sales' },
  { href: 'recepcion.html', permiso: 'receive purchases' },
  { href: 'compras.html', permiso: 'view purchases' },
  { href: 'proveedores.html', permiso: 'view suppliers' },
  { href: 'clientes.html', permiso: 'view customers' },
  { href: 'movimientos.html', permiso: 'view inventory-movements' },
  { href: 'catalogos.html', permiso: 'view categories' },
]

function esAborto(error) {
  return error?.name === 'AbortError'
}

// Devuelve true si la API rechazó los datos y dice qué campo falló (código 422).
export function esErrorDeCampos(error) {
  return error instanceof ErrorApi && error.status === 422 && Object.keys(error.errors).length > 0
}

// Manda al login si no hay sesión o si el token venció.
function exigirSesion() {
  if (!api.token || api.sesionExpirada()) {
    const expirada = Boolean(api.token)
    api.limpiarSesion()
    location.replace(expirada ? 'login.html?motivo=expirada' : 'login.html')
    return false
  }
  return true
}

// Si el rol no puede ver la página, lo lleva a la primera a la que sí tiene acceso.
function exigirPagina(permiso) {
  if (api.puede(permiso)) return true
  const destino = PAGINAS.find((pagina) => api.puede(pagina.permiso))
  location.replace(destino ? destino.href : 'login.html')
  return false
}

// Oculta lo que el rol no puede usar. Solo refleja el backend: la seguridad real está en la API.
function aplicarPermisos() {
  document.querySelectorAll('[data-permiso]').forEach((elemento) => {
    if (!api.puede(elemento.dataset.permiso)) elemento.hidden = true
  })
}

// Arranque de cada página protegida, en el mismo orden de siempre:
// 1) sesión válida, 2) permiso de la página, 3) tema, 4) secciones según el rol, 5) botón de salir.
// `preparar` es la función propia de la página; solo se ejecuta si el usuario puede entrar.
export function iniciarPagina(permisoRequerido, preparar) {
  if (!exigirSesion()) return
  if (!exigirPagina(permisoRequerido)) return
  iniciarTema()
  aplicarPermisos()
  configurarSalir()
  preparar()
}

// Ejecuta una llamada a la API y maneja los errores comunes.
// - Si el token venció (401), manda al login.
// - Si la petición se cancela, no hace nada.
// - Cualquier otro error se entrega a `alFallar`.
// Devuelve undefined cuando falla, para que quien llama pueda detenerse.
export async function llamada(operacion, alFallar) {
  try {
    return await operacion()
  } catch (error) {
    if (esAborto(error)) return undefined
    if (error instanceof ErrorApi && error.status === 401) {
      api.limpiarSesion()
      location.replace('login.html?motivo=expirada')
      return undefined
    }
    if (alFallar) alFallar(error)
    return undefined
  }
}

// Botón "Cerrar sesión" del encabezado.
function configurarSalir() {
  document.querySelector('#btn-salir')?.addEventListener('click', async () => {
    await llamada(() => api.cerrarSesion())
    location.replace('login.html')
  })
}
