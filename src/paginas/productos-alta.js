// Diálogo para crear un producto nuevo. Solo existe si el rol tiene el permiso `create products`.
import { api, esErrorDeCampos, llamada } from '../nucleo/comun.js'
import { cerrarAlClicFuera } from '../componentes/dialogos.js'
import { construirFormulario } from '../componentes/formularios.js'
import { nodo } from '../componentes/vista.js'
import { CAMPOS_NUEVO_PRODUCTO, validarProducto } from '../reglas/producto.js'

// Pide a la API las listas de categoría, marca y unidad para los desplegables.
async function listaDe(ruta, claveId, claveTexto) {
  const respuesta = await llamada(() => api.listarRecurso(ruta, { per_page: 50 }))
  return (respuesta?.data ?? []).map((fila) => ({ valor: fila[claveId], texto: fila[claveTexto] }))
}

// `onCreado(nombre)` se llama cuando el producto se guardó, para recargar el listado.
export function montarAltaProducto({ onCreado }) {
  if (!api.puede('create products')) return

  const dialogo = document.querySelector('#dialogo-nuevo')
  cerrarAlClicFuera(dialogo)
  document.querySelector('#btn-cerrar-nuevo').addEventListener('click', () => dialogo.close())

  const formulario = construirFormulario(CAMPOS_NUEVO_PRODUCTO)
  const mensaje = nodo('p', { role: 'status', 'aria-live': 'polite', clase: 'ayuda' })
  formulario.form.append(
    nodo('p', { clase: 'acciones' }, [
      nodo('button', { clase: 'btn-primario', type: 'submit', texto: 'Crear producto' }),
      nodo('button', { type: 'button', texto: 'Cancelar', onClick: () => dialogo.close() }),
    ]),
    mensaje,
  )
  document.querySelector('#form-nuevo-producto').replaceChildren(formulario.form)
  formulario.cargar({ is_active: true })

  document.querySelector('#btn-nuevo-producto').addEventListener('click', () => {
    mensaje.textContent = ''
    dialogo.showModal()
  })

  // Llena los desplegables cuando lleguen las listas (sin esperar para mostrar el formulario).
  Promise.all([
    listaDe('/categories', 'ID Categoria', 'Nombre'),
    listaDe('/brands', 'ID Marca', 'Nombre'),
    listaDe('/units', 'ID Unidad de Medida', 'Nombre'),
  ]).then(([categorias, marcas, unidades]) => {
    formulario.setOpciones('category_id', categorias)
    formulario.setOpciones('brand_id', marcas)
    formulario.setOpciones('unit_id', unidades)
  })

  formulario.form.addEventListener('submit', async (evento) => {
    evento.preventDefault()
    const { valores, errores } = formulario.leer()
    const todosLosErrores = { ...validarProducto(valores), ...errores }
    formulario.marcarErrores(todosLosErrores)
    if (Object.keys(todosLosErrores).length) return

    mensaje.className = 'ayuda'
    mensaje.textContent = 'Creando producto…'
    const creado = await llamada(
      () => api.crearRecurso('/products', valores),
      (error) => {
        mensaje.className = 'error'
        if (esErrorDeCampos(error)) {
          const sobrantes = formulario.marcarErrores(error.errors)
          mensaje.textContent = sobrantes.join(' ') || 'Revise los datos marcados.'
        } else {
          mensaje.textContent = error.message
        }
      },
    )
    if (!creado) return

    formulario.limpiar()
    formulario.cargar({ is_active: true })
    dialogo.close()
    onCreado(creado.nombre ?? creado.name ?? '')
  })
}
