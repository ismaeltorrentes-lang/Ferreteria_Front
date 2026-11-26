// Página de recepción de compras (recepcion.html).
// Flujo: 1) escanear el código del producto, 2) elegir el detalle pendiente, 3) confirmar la cantidad.
import { api, esErrorDeCampos, iniciarPagina, llamada } from '../nucleo/comun.js'
import { nodo } from '../componentes/vista.js'

function avisoDeError(texto) {
  return nodo('p', { clase: 'error', role: 'alert', texto })
}

iniciarPagina('receive purchases', () => {
  const formularioBuscar = document.querySelector('#buscar-form')
  const campoCodigo = document.querySelector('#codigo')
  const zonaBuscar = document.querySelector('#buscar-estado')
  const zonaPendientes = document.querySelector('#pendientes')
  const seccionConfirmar = document.querySelector('#confirmar')
  const zonaDetalle = document.querySelector('#confirmar-detalle')
  const formularioRecibir = document.querySelector('#recibir-form')
  const estado = document.querySelector('#estado-recepcion')
  const botonRecibir = formularioRecibir.querySelector('[type="submit"]')

  let codigoBuscado = ''
  let pendientes = []
  let seleccionado = null

  // Muestra u oculta el error de cada campo del formulario de recepción.
  function marcarErrores(errores = {}) {
    ;['barcode', 'quantity'].forEach((campo) => {
      const control = formularioRecibir.elements.namedItem(campo)
      const zona = formularioRecibir.querySelector(`[data-error="${campo}"]`)
      const mensaje = errores[campo]?.[0] ?? ''
      control.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
      zona.textContent = mensaje
      zona.className = mensaje ? 'error' : 'ayuda'
    })
  }

  function pintarPendientes(detalles) {
    zonaPendientes.replaceChildren(
      ...detalles.map((detalle) =>
        nodo('article', { clase: 'card' }, [
          nodo('h3', { texto: detalle.nombre }),
          nodo('p', { texto: `Compra ${detalle.id_purchase} · Detalle #${detalle.id}` }),
          nodo('p', { texto: `Cantidad a recibir: ${detalle.quantity}` }),
          nodo('p', { clase: 'card-pie' }, [
            nodo('button', {
              type: 'button',
              clase: 'btn-primario',
              texto: 'Recibir este detalle',
              'data-recibir': detalle.id,
            }),
          ]),
        ]),
      ),
    )
  }

  // Paso 1: busca los detalles pendientes del producto con ese código.
  async function buscar(codigo) {
    codigoBuscado = codigo
    seleccionado = null
    seccionConfirmar.hidden = true
    zonaPendientes.replaceChildren()
    zonaBuscar.replaceChildren(nodo('p', { role: 'status', texto: 'Buscando detalles pendientes…' }))

    const respuesta = await llamada(
      () => api.listarRecepcionesPendientes(codigo),
      (error) =>
        zonaBuscar.replaceChildren(
          avisoDeError(error.status === 404 ? `No existe un producto con el código “${codigo}”.` : error.message),
        ),
    )
    if (!respuesta) return

    pendientes = respuesta.data
    if (!pendientes.length) {
      zonaBuscar.replaceChildren(
        nodo('p', {
          role: 'status',
          texto: `No hay detalles pendientes de recepción para el código “${codigo}”.`,
        }),
      )
      return
    }

    zonaBuscar.replaceChildren(
      nodo('p', { role: 'status', texto: `${pendientes.length} detalle(s) pendiente(s) para este código.` }),
    )
    pintarPendientes(pendientes)
  }

  // Paso 2: el usuario elige un detalle y el formulario se llena con sus datos.
  function seleccionar(id) {
    seleccionado = pendientes.find((detalle) => detalle.id === id) ?? null
    if (!seleccionado) return

    zonaDetalle.replaceChildren(
      nodo('p', { texto: `Producto: ${seleccionado.nombre}` }),
      nodo('p', { texto: `Compra ${seleccionado.id_purchase} · Detalle #${seleccionado.id}` }),
      nodo('p', { texto: `Cantidad esperada: ${seleccionado.quantity}` }),
    )
    formularioRecibir.elements.namedItem('barcode').value = codigoBuscado
    formularioRecibir.elements.namedItem('quantity').value = String(seleccionado.quantity)
    marcarErrores({})
    estado.textContent = ''
    estado.style.color = ''
    seccionConfirmar.hidden = false
    seccionConfirmar.focus()
  }

  // Revisa los datos antes de enviarlos. Devuelve los errores encontrados.
  function validarRecepcion(barcode, quantity, detalle) {
    const errores = {}
    if (!barcode) errores.barcode = ['Escriba el código de barras del producto.']

    if (!Number.isInteger(quantity) || quantity < 1) {
      errores.quantity = ['Ingrese una cantidad entera mayor que cero.']
    } else if (quantity !== Number(detalle.quantity)) {
      errores.quantity = [`Debe coincidir exactamente con la cantidad del detalle (${detalle.quantity}).`]
    }
    return errores
  }

  // Paso 3: confirma la recepción en la API.
  async function confirmarRecepcion(evento) {
    evento.preventDefault()
    if (!seleccionado) return

    const detalle = seleccionado
    const barcode = formularioRecibir.elements.namedItem('barcode').value.trim()
    const quantity = Number(formularioRecibir.elements.namedItem('quantity').value)

    const errores = validarRecepcion(barcode, quantity, detalle)
    marcarErrores(errores)
    if (Object.keys(errores).length) return

    botonRecibir.disabled = true
    estado.style.color = ''
    estado.textContent = 'Registrando recepción…'

    const respuesta = await llamada(
      () => api.recibirDetalle(detalle.id, { barcode, quantity }),
      (error) => {
        if (esErrorDeCampos(error)) {
          marcarErrores(error.errors)
          estado.textContent = ''
        } else {
          estado.style.color = 'var(--c-error)'
          estado.textContent = error.message
        }
      },
    )
    botonRecibir.disabled = false
    if (!respuesta) return

    seccionConfirmar.hidden = true
    seleccionado = null
    await buscar(codigoBuscado)
    zonaBuscar.prepend(
      nodo('p', {
        role: 'status',
        texto: `Recibidos ${quantity} × ${detalle.nombre} (compra ${detalle.id_purchase}).`,
      }),
    )
  }

  formularioBuscar.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const codigo = campoCodigo.value.trim()
    if (!codigo) {
      zonaBuscar.replaceChildren(avisoDeError('Escriba o escanee un código de barras.'))
      return
    }
    buscar(codigo)
  })

  zonaPendientes.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-recibir]')
    if (boton) seleccionar(Number(boton.dataset.recibir))
  })

  document.querySelector('#btn-cancelar-recepcion').addEventListener('click', () => {
    seccionConfirmar.hidden = true
    seleccionado = null
  })

  formularioRecibir.addEventListener('submit', confirmarRecepcion)
})
