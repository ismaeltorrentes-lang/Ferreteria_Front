// Página de catálogos (catalogos.html): categorías, marcas y unidades de medida.
import { montarCrud } from '../componentes/crud.js'
import { iniciarPagina } from '../nucleo/comun.js'

// Cada catálogo tiene la misma forma: lista, alta, cambio y baja.
// Los nombres de campo y de columna son los que devuelve y recibe el backend.
iniciarPagina('view categories', () => {
  montarCrud({
    raiz: document.querySelector('#crud-categorias'),
    titulo: 'Categorías',
    etiqueta: 'categorías',
    nuevoTexto: 'Agregar categoría',
    ruta: '/categories',
    permisos: {
      ver: 'view categories',
      crear: 'create categories',
      actualizar: 'update categories',
      eliminar: 'delete categories',
    },
    campos: [
      { nombre: 'category_name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 200 },
      { nombre: 'description', etiqueta: 'Descripción', tipo: 'textarea', requerido: true, max: 200 },
    ],
    columnas: [
      { etiqueta: 'Nombre', valor: (fila) => fila.Nombre },
      { etiqueta: 'Descripción', valor: (fila) => fila.Descripcion },
    ],
    idDe: (fila) => fila['ID Categoria'],
    valoresDe: (fila) => ({ category_name: fila.Nombre, description: fila.Descripcion }),
  })

  montarCrud({
    raiz: document.querySelector('#crud-marcas'),
    titulo: 'Marcas',
    etiqueta: 'marcas',
    nuevoTexto: 'Agregar marca',
    ruta: '/brands',
    permisos: {
      ver: 'view brands',
      crear: 'create brands',
      actualizar: 'update brands',
      eliminar: 'delete brands',
    },
    campos: [{ nombre: 'brand_name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 200 }],
    columnas: [{ etiqueta: 'Nombre', valor: (fila) => fila.Nombre }],
    idDe: (fila) => fila['ID Marca'],
    valoresDe: (fila) => ({ brand_name: fila.Nombre }),
  })

  montarCrud({
    raiz: document.querySelector('#crud-unidades'),
    titulo: 'Unidades de medida',
    etiqueta: 'unidades',
    nuevoTexto: 'Agregar unidad',
    ruta: '/units',
    permisos: {
      ver: 'view units',
      crear: 'create units',
      actualizar: 'update units',
      eliminar: 'delete units',
    },
    campos: [{ nombre: 'unit_name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 200 }],
    columnas: [{ etiqueta: 'Nombre', valor: (fila) => fila.Nombre }],
    idDe: (fila) => fila['ID Unidad de Medida'],
    valoresDe: (fila) => ({ unit_name: fila.Nombre }),
  })
})
