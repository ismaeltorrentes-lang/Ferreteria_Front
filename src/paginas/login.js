// Página de inicio de sesión (login.html).
import { ErrorApi } from '../nucleo/api.js'
import { api } from '../nucleo/comun.js'
import { iniciarTema } from '../nucleo/tema.js'

function esAborto(error) {
  return error?.name === 'AbortError'
}

function iniciar() {
  iniciarTema()

  const formulario = document.querySelector('#login-form')
  const zonaError = document.querySelector('#login-error')

  function mostrarError(texto, color = 'var(--c-error)') {
    zonaError.textContent = texto
    zonaError.className = texto ? 'error' : 'ayuda'
    zonaError.style.color = color
  }

  // Si llegó aquí porque el token venció, se explica por qué.
  const motivo = new URLSearchParams(location.search).get('motivo')
  if (motivo === 'expirada') {
    mostrarError(
      'Su sesión expiró (el token vence a las 2 horas). Inicie sesión de nuevo: los datos del formulario se conservaron.',
      'var(--c-tinta-suave)',
    )
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    mostrarError('')

    const datos = new FormData(formulario)
    try {
      await api.iniciarSesion(datos.get('email'), datos.get('password'))
    } catch (error) {
      if (esAborto(error)) return
      if (error instanceof ErrorApi) {
        const mensaje = error.status === 422 ? Object.values(error.errors).flat().join(' ') : error.message
        mostrarError(mensaje)
        return
      }
      mostrarError('Error inesperado. Intente de nuevo.')
      return
    }

    location.replace('index.html')
  })
}

iniciar()
