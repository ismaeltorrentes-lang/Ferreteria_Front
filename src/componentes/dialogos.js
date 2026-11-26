// Ayudas para ventanas emergentes (<dialog>) y formularios que se despliegan con un botón.

// Botón que despliega u oculta un formulario.
// Si no se indica `abrir`, alterna el estado actual.
export function alternarFormulario(boton, zona, abrir = zona.hidden) {
  boton.dataset.textoAbrir ??= boton.textContent.trim()
  zona.hidden = !abrir
  boton.setAttribute('aria-expanded', String(abrir))
  boton.textContent = abrir ? 'Cerrar formulario' : boton.dataset.textoAbrir
}

// Cierra el diálogo al hacer clic fuera de su caja (sobre el fondo oscuro).
export function cerrarAlClicFuera(dialogo) {
  dialogo.addEventListener('click', (evento) => {
    const caja = dialogo.getBoundingClientRect()
    const fueraDeLaCaja =
      evento.clientX < caja.left ||
      evento.clientX > caja.right ||
      evento.clientY < caja.top ||
      evento.clientY > caja.bottom

    if (fueraDeLaCaja) dialogo.close()
  })
}
