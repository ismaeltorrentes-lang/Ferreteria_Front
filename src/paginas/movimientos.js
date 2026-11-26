// Página de movimientos de inventario (movimientos.html). Solo lectura.
import { montarCrud } from '../componentes/crud.js'
import { iniciarPagina } from '../nucleo/comun.js'

// Nombre legible del origen del movimiento (el backend envía "Compra" o "Venta").
const NOMBRE_ORIGEN = { Compra: 'Item compra', Venta: 'Item venta' }

// La fecha solo llega si el backend la incluye; si no, se muestra un guion.
function formatearFecha(valor) {
  if (!valor) return '—'
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return '—'
  return fecha.toLocaleString('es-CR', { dateStyle: 'medium', timeStyle: 'short' })
}

function nombreDelOrigen(movimiento) {
  const tipo = movimiento['Tipo de Origen']
  return `${NOMBRE_ORIGEN[tipo] ?? tipo} #${movimiento['ID de Origen']}`
}

iniciarPagina('view inventory-movements', () => {
  // Sin permisos de alta, cambio o baja, montarCrud no muestra formulario ni acciones.
  montarCrud({
    raiz: document.querySelector('#crud-movimientos'),
    titulo: 'Movimientos de inventario',
    etiqueta: 'movimientos',
    ruta: '/inventory-movements',
    permisos: { ver: 'view inventory-movements' },
    campos: [],
    columnas: [
      { etiqueta: 'Movimiento', valor: (fila) => fila['ID Movimiento'] },
      { etiqueta: 'Producto', valor: (fila) => fila['ID Producto'] },
      { etiqueta: 'Tipo', valor: (fila) => fila.Tipo },
      { etiqueta: 'Cantidad', valor: (fila) => fila.Cantidad },
      { etiqueta: 'Stock después', valor: (fila) => fila['Stock Despues'] },
      { etiqueta: 'Origen', valor: nombreDelOrigen },
      { etiqueta: 'Fecha', valor: (fila) => formatearFecha(fila.Fecha ?? fila.created_at) },
    ],
    idDe: (fila) => fila['ID Movimiento'],
    valoresDe: () => ({}),
  })
})
