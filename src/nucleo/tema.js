// Modo oscuro. El script del <head> de cada página ya aplica el tema guardado antes de pintar;
// este archivo solo controla el botón del encabezado y guarda la preferencia.
const CLAVE_TEMA = 'ferreteria:tema'

function temaActual() {
  return document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro'
}

function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema
  try {
    localStorage.setItem(CLAVE_TEMA, tema)
  } catch {
    // Sin almacenamiento disponible, el tema dura solo mientras la página esté abierta.
  }

  const boton = document.querySelector('#btn-tema')
  if (!boton) return
  const oscuro = tema === 'oscuro'
  boton.setAttribute('aria-pressed', String(oscuro))
  boton.textContent = oscuro ? '☀' : '☾'
  boton.setAttribute('aria-label', oscuro ? 'Modo claro' : 'Modo oscuro')
}

function alternarTema() {
  aplicarTema(temaActual() === 'oscuro' ? 'claro' : 'oscuro')
}

export function iniciarTema() {
  aplicarTema(temaActual())
  document.querySelector('#btn-tema')?.addEventListener('click', alternarTema)
}
