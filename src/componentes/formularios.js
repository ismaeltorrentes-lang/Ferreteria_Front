// Genera formularios a partir de una lista de campos, con validación y mensajes por campo.
// Cada campo describe cómo se ve y qué reglas tiene:
//   nombre, etiqueta, tipo ('text' | 'email' | 'number' | 'textarea' | 'select' | 'checkbox'),
//   requerido, max (caracteres), min, max_valor, entero, numerico (select con IDs numéricos),
//   opciones ([{ valor, texto }]), soloAlCrear (el campo no se edita después de crear).
import { nodo } from './vista.js'

let contadorFormularios = 0

// Devuelve el mensaje de error del valor, o null si es válido.
function errorDelCampo(campo, valor) {
  if (campo.tipo === 'checkbox') return null

  const estaVacio = valor === null || valor === '' || (typeof valor === 'number' && Number.isNaN(valor))
  if (estaVacio) return campo.requerido ? 'Este campo es obligatorio.' : null

  if (campo.tipo === 'number') return errorDeNumero(campo, valor)
  if (campo.tipo === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(valor))) {
    return 'Ingrese un correo válido.'
  }
  if (campo.max && String(valor).length > campo.max) {
    return `No puede superar ${campo.max} caracteres.`
  }
  return null
}

function errorDeNumero(campo, valor) {
  if (!Number.isFinite(valor)) return 'Ingrese un número válido.'
  if (campo.entero && !Number.isInteger(valor)) return 'Ingrese un número entero.'
  if (campo.min !== undefined && valor < campo.min) return `El valor mínimo es ${campo.min}.`
  if (campo.max_valor !== undefined && valor > campo.max_valor) return `El valor máximo es ${campo.max_valor}.`
  return null
}

// Convierte el texto del control en el valor que se envía a la API.
function valorDelControl(campo, control) {
  if (campo.tipo === 'checkbox') return control.checked

  const texto = String(control.value ?? '').trim()
  if (campo.tipo === 'number') {
    if (texto !== '') return Number(texto)
    return campo.requerido ? Number.NaN : null
  }
  if (campo.tipo === 'select' && campo.numerico) {
    return texto === '' ? null : Number(texto)
  }
  if (texto !== '') return texto
  return campo.requerido ? '' : null
}

function crearControl(campo, id) {
  const atributos = { id, name: campo.nombre }

  if (campo.tipo === 'textarea') {
    return nodo('textarea', { ...atributos, maxlength: campo.max })
  }
  if (campo.tipo === 'select') {
    return nodo('select', atributos, [
      nodo('option', { value: '', texto: 'Seleccione…' }),
      ...(campo.opciones ?? []).map((opcion) => nodo('option', { value: opcion.valor, texto: opcion.texto })),
    ])
  }
  if (campo.tipo === 'checkbox') {
    return nodo('input', { ...atributos, type: 'checkbox' })
  }
  if (campo.tipo === 'number') {
    return nodo('input', {
      ...atributos,
      type: 'number',
      min: campo.min,
      max: campo.max_valor,
      step: campo.entero ? '1' : 'any',
      autocomplete: 'off',
    })
  }
  return nodo('input', {
    ...atributos,
    type: campo.tipo === 'email' ? 'email' : 'text',
    maxlength: campo.max,
    autocomplete: 'off',
  })
}

// Crea los elementos de un campo: etiqueta, control y zona de error.
function crearFilaCampo(campo, idBase) {
  const id = `${idBase}-${campo.nombre}`
  const zonaError = nodo('p', {
    clase: 'ayuda',
    'data-error': campo.nombre,
    id: `err-${id}`,
    'aria-live': 'polite',
  })
  const control = crearControl(campo, id)
  control.setAttribute('aria-describedby', `err-${id}`)
  if (campo.requerido) control.setAttribute('required', '')

  if (campo.tipo === 'checkbox') {
    return [nodo('label', {}, [control, ` ${campo.etiqueta}`]), zonaError]
  }
  return [nodo('label', { for: id, texto: campo.etiqueta }), control, zonaError]
}

// Construye el formulario y devuelve funciones para usarlo.
export function construirFormulario(campos) {
  contadorFormularios += 1
  const idBase = `f${contadorFormularios}`

  const form = nodo('form', { novalidate: true })
  const fieldset = nodo('fieldset')
  fieldset.append(...campos.flatMap((campo) => crearFilaCampo(campo, idBase)))
  form.append(fieldset)

  const controlDe = (nombre) => form.elements.namedItem(nombre)

  // Lee todos los campos. Devuelve los valores y los errores de validación.
  function leer() {
    const valores = {}
    const errores = {}
    campos.forEach((campo) => {
      const valor = valorDelControl(campo, controlDe(campo.nombre))
      valores[campo.nombre] = valor
      const mensaje = errorDelCampo(campo, valor)
      if (mensaje) errores[campo.nombre] = [mensaje]
    })
    return { valores, errores }
  }

  // Muestra los errores junto a cada campo. Devuelve los errores que no son de ningún campo.
  function marcarErrores(errores = {}) {
    campos.forEach((campo) => {
      const mensaje = [].concat(errores[campo.nombre] ?? [])[0] ?? ''
      const control = controlDe(campo.nombre)
      const zona = form.querySelector(`[data-error="${campo.nombre}"]`)
      if (control) control.setAttribute('aria-invalid', mensaje ? 'true' : 'false')
      if (zona) {
        zona.textContent = mensaje
        zona.className = mensaje ? 'error' : 'ayuda'
      }
    })

    const nombresDeCampos = campos.map((campo) => campo.nombre)
    return Object.entries(errores)
      .filter(([nombre]) => !nombresDeCampos.includes(nombre))
      .flatMap(([, mensajes]) => [].concat(mensajes))
  }

  // Llena los campos con valores (por ejemplo, al editar un registro).
  function cargar(valores = {}) {
    campos.forEach((campo) => {
      const control = controlDe(campo.nombre)
      const valor = valores[campo.nombre]
      if (campo.tipo === 'checkbox') control.checked = Boolean(valor)
      else control.value = valor ?? ''
    })
  }

  function desactivar(nombre, bloqueado) {
    const control = controlDe(nombre)
    if (control) control.disabled = bloqueado
  }

  function limpiar() {
    form.reset()
    marcarErrores({})
  }

  // Reemplaza las opciones de una lista desplegable y conserva la opción elegida.
  function setOpciones(nombre, opciones) {
    const control = controlDe(nombre)
    if (!control) return
    const elegida = control.value
    control.replaceChildren(
      nodo('option', { value: '', texto: 'Seleccione…' }),
      ...opciones.map((opcion) => nodo('option', { value: opcion.valor, texto: opcion.texto })),
    )
    control.value = elegida
  }

  return { form, leer, cargar, marcarErrores, desactivar, limpiar, setOpciones }
}
