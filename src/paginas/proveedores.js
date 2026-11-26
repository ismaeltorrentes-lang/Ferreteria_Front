// Página de proveedores (proveedores.html).
// Los permisos de alta, cambio y baja vienen del backend: si el rol no los tiene, la tabla queda en solo lectura.
import { montarCrud } from '../componentes/crud.js'
import { iniciarPagina } from '../nucleo/comun.js'

iniciarPagina('view suppliers', () => {
  montarCrud({
    raiz: document.querySelector('#crud-proveedores'),
    titulo: 'Proveedores',
    etiqueta: 'proveedores',
    nuevoTexto: 'Agregar proveedor',
    ruta: '/suppliers',
    permisos: {
      ver: 'view suppliers',
      crear: 'create suppliers',
      actualizar: 'update suppliers',
      eliminar: 'delete suppliers',
    },
    campos: [
      { nombre: 'id_supplier', etiqueta: 'Identificación', tipo: 'text', requerido: true, max: 50, soloAlCrear: true },
      { nombre: 'supplier_first_name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 50 },
      { nombre: 'supplier_last_name', etiqueta: 'Apellidos', tipo: 'text', requerido: true, max: 50 },
      { nombre: 'supplier_phone', etiqueta: 'Teléfono', tipo: 'text', requerido: true, max: 20 },
      { nombre: 'supplier_address', etiqueta: 'Dirección', tipo: 'text', requerido: true, max: 100 },
      { nombre: 'supplier_type', etiqueta: 'Tipo', tipo: 'text', max: 50 },
      { nombre: 'supplier_email', etiqueta: 'Correo', tipo: 'email', requerido: true, max: 100 },
    ],
    columnas: [
      { etiqueta: 'Identificación', valor: (proveedor) => proveedor.id },
      { etiqueta: 'Nombre', valor: (proveedor) => `${proveedor.supplier_first_name} ${proveedor.supplier_last_name}` },
      { etiqueta: 'Tipo', valor: (proveedor) => proveedor.supplier_type },
      { etiqueta: 'Teléfono', valor: (proveedor) => proveedor.supplier_phone },
      { etiqueta: 'Correo', valor: (proveedor) => proveedor.supplier_email },
      { etiqueta: 'Dirección', valor: (proveedor) => proveedor.supplier_address },
    ],
    idDe: (proveedor) => proveedor.id,
    valoresDe: (proveedor) => ({
      id_supplier: proveedor.id,
      supplier_first_name: proveedor.supplier_first_name,
      supplier_last_name: proveedor.supplier_last_name,
      supplier_phone: proveedor.supplier_phone,
      supplier_address: proveedor.supplier_address,
      supplier_type: proveedor.supplier_type,
      supplier_email: proveedor.supplier_email,
    }),
  })
})
