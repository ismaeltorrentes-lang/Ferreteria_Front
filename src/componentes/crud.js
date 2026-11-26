// Tabla con alta, edición y baja. Lo que se muestra depende de los permisos del backend:
// si el rol no tiene un permiso, la acción no aparece (la API la rechazaría igual).
import { api, esErrorDeCampos, llamada } from '../nucleo/comun.js'
import { alternarFormulario } from './dialogos.js'
import { construirFormulario } from './formularios.js'
import { nodo } from './vista.js'

export function montarCrud({
  raiz,
  titulo,
  ruta,
  permisos,
  campos = [],
  columnas,
  idDe,
  valoresDe,
  etiqueta,
  nuevoTexto = 'Agregar registro',
}) {
  const puedeCrear = Boolean(permisos.crear && api.puede(permisos.crear))
  const puedeEditar = Boolean(permisos.actualizar && api.puede(permisos.actualizar))
  const puedeEliminar = Boolean(permisos.eliminar && api.puede(permisos.eliminar))
  const mostrarFormulario = (puedeCrear || puedeEditar) && campos.length > 0
  const mostrarAcciones = puedeEditar || puedeEliminar

  // Estructura de la pantalla
  const barra = nodo('div', { clase: 'seccion-cabecera' })
  const zonaFormulario = nodo('div', { clase: 'panel-formulario', hidden: true })
  const estado = nodo('p', { role: 'status', 'aria-live': 'polite' })
  const zonaTabla = nodo('div', { clase: 'tabla-scroll' })
  const zonaPaginacion = nodo('p', { clase: 'fila' })
  raiz.replaceChildren(barra, zonaFormulario, estado, zonaTabla, zonaPaginacion)

  // Estado de la pantalla
  let filas = []
  let pagina = 1
  let idEditando = null
  let formulario = null
  let encabezadoFormulario = null
  let botonCancelar = null
  let botonNuevo = null
  let mensajeFormulario = null

  function mostrarEstado(texto, esError = false) {
    estado.className = esError ? 'error' : ''
    estado.textContent = texto
  }

  // ----- Tabla y paginación -----

  function pintarTabla() {
    const cabecera = nodo('thead', {}, nodo('tr', {}, [
      ...columnas.map((columna) => nodo('th', { scope: 'col', texto: columna.etiqueta })),
      mostrarAcciones ? nodo('th', { scope: 'col', texto: 'Acciones' }) : null,
    ]))

    const cuerpo = nodo('tbody', {}, filas.map((fila) => {
      const id = idDe(fila)
      return nodo('tr', {}, [
        ...columnas.map((columna) => nodo('td', { texto: String(columna.valor(fila) ?? '') })),
        mostrarAcciones
          ? nodo('td', {}, [
              puedeEditar ? nodo('button', { type: 'button', texto: 'Editar', 'data-editar': id }) : null,
              puedeEliminar ? nodo('button', { type: 'button', texto: 'Eliminar', 'data-eliminar': id }) : null,
            ])
          : null,
      ])
    }))

    zonaTabla.replaceChildren(nodo('table', {}, [nodo('caption', { texto: titulo }), cabecera, cuerpo]))
  }

  function pintarPaginacion(meta) {
    if (!meta || meta.last_page <= 1) {
      zonaPaginacion.replaceChildren()
      return
    }
    zonaPaginacion.replaceChildren(
      nodo('button', {
        type: 'button',
        texto: '← Anterior',
        disabled: meta.current_page <= 1,
        'data-pagina': meta.current_page - 1,
      }),
      nodo('span', { role: 'status', texto: `Página ${meta.current_page} de ${meta.last_page}` }),
      nodo('button', {
        type: 'button',
        texto: 'Siguiente →',
        disabled: meta.current_page >= meta.last_page,
        'data-pagina': meta.current_page + 1,
      }),
    )
  }

  async function cargar() {
    mostrarEstado('Cargando…')
    zonaTabla.replaceChildren()

    const respuesta = await llamada(
      () => api.listarRecurso(ruta, { page: pagina, per_page: 20 }),
      (error) => mostrarEstado(error.message, true),
    )
    if (!respuesta) return

    filas = respuesta.data
    if (!filas.length) {
      mostrarEstado(`No hay ${etiqueta} por mostrar todavía.`)
      zonaPaginacion.replaceChildren()
      return
    }
    mostrarEstado(`${respuesta.meta?.total ?? filas.length} ${etiqueta} en total.`)
    pintarTabla()
    pintarPaginacion(respuesta.meta)
  }

  // ----- Formulario: alta y edición -----

  function camposSoloAlCrear() {
    return campos.filter((campo) => campo.soloAlCrear)
  }

  // Vuelve el formulario a modo "nuevo registro".
  function limpiarEdicion() {
    idEditando = null
    if (botonNuevo) alternarFormulario(botonNuevo, zonaFormulario, false)
    if (!formulario) return

    formulario.limpiar()
    camposSoloAlCrear().forEach((campo) => formulario.desactivar(campo.nombre, false))
    encabezadoFormulario.textContent = 'Nuevo registro'
    botonCancelar.hidden = true
    mensajeFormulario.textContent = ''
  }

  function editar(id) {
    const fila = filas.find((registro) => String(idDe(registro)) === String(id))
    if (!fila || !formulario) return

    idEditando = id
    alternarFormulario(botonNuevo, zonaFormulario, true)
    formulario.cargar(valoresDe(fila))
    camposSoloAlCrear().forEach((campo) => formulario.desactivar(campo.nombre, true))
    formulario.marcarErrores({})
    encabezadoFormulario.textContent = 'Editar registro'
    botonCancelar.hidden = false
    mensajeFormulario.textContent = ''
    formulario.form.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function guardar(evento) {
    evento.preventDefault()
    const { valores, errores } = formulario.leer()
    const erroresSinCampo = formulario.marcarErrores(errores)
    if (Object.keys(errores).length) return

    mensajeFormulario.className = 'ayuda'
    mensajeFormulario.textContent = 'Guardando…'
    const respuesta = await llamada(
      () => (idEditando === null
        ? api.crearRecurso(ruta, valores)
        : api.actualizarRecurso(ruta, idEditando, valores)),
      (error) => {
        mensajeFormulario.className = 'error'
        if (esErrorDeCampos(error)) {
          const sobrantes = formulario.marcarErrores(error.errors)
          mensajeFormulario.textContent = sobrantes.join(' ') || 'Revise los datos marcados.'
        } else {
          mensajeFormulario.textContent = error.message
        }
      },
    )
    if (!respuesta) return

    const texto = idEditando === null ? 'Registro creado.' : 'Registro actualizado.'
    limpiarEdicion()
    await cargar()
    mostrarEstado(erroresSinCampo.length ? `${texto} ${erroresSinCampo.join(' ')}` : texto)
  }

  function construirFormularioAlta() {
    formulario = construirFormulario(campos)
    encabezadoFormulario = nodo('h3', { texto: 'Nuevo registro' })
    mensajeFormulario = nodo('p', { role: 'status', 'aria-live': 'polite', clase: 'ayuda' })
    botonCancelar = nodo('button', { type: 'button', texto: 'Cancelar edición', hidden: true })

    formulario.form.append(
      nodo('p', { clase: 'acciones' }, [
        nodo('button', { clase: 'btn-primario', type: 'submit', texto: 'Guardar' }),
        botonCancelar,
      ]),
      mensajeFormulario,
    )
    zonaFormulario.append(encabezadoFormulario, formulario.form)

    botonNuevo = nodo('button', { type: 'button', clase: 'btn-primario', texto: nuevoTexto, 'aria-expanded': 'false' })
    botonNuevo.addEventListener('click', () => alternarFormulario(botonNuevo, zonaFormulario))
    barra.append(botonNuevo)

    botonCancelar.addEventListener('click', limpiarEdicion)
    formulario.form.addEventListener('submit', guardar)
  }

  // ----- Baja -----

  async function eliminar(id) {
    if (!window.confirm(`¿Eliminar este registro (${id})? Esta acción no se puede deshacer.`)) return

    let fallo = false
    await llamada(
      () => api.eliminarRecurso(ruta, id),
      (error) => {
        fallo = true
        mostrarEstado(error.message, true)
      },
    )
    if (fallo) return

    if (idEditando !== null && String(idEditando) === String(id)) limpiarEdicion()
    await cargar()
    mostrarEstado('Registro eliminado.')
  }

  // ----- Eventos -----

  zonaTabla.addEventListener('click', (evento) => {
    const botonEditar = evento.target.closest('[data-editar]')
    const botonEliminar = evento.target.closest('[data-eliminar]')
    if (botonEditar) editar(botonEditar.dataset.editar)
    if (botonEliminar) eliminar(botonEliminar.dataset.eliminar)
  })

  zonaPaginacion.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-pagina]')
    if (!boton) return
    pagina = Number(boton.dataset.pagina)
    cargar()
  })

  if (mostrarFormulario) construirFormularioAlta()

  cargar()
  return { recargar: cargar }
}
