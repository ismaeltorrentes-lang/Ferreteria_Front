// Página de clientes (clientes.html). Lectura para el cajero; alta, cambio y baja para el admin.
import { montarCrud } from '../componentes/crud.js'
import { iniciarPagina } from '../nucleo/comun.js'

iniciarPagina('view customers', () => {
  montarCrud({
    raiz: document.querySelector('#crud-clientes'),
    titulo: 'Clientes',
    etiqueta: 'clientes',
    nuevoTexto: 'Agregar cliente',
    ruta: '/customers',
    permisos: {
      ver: 'view customers',
      crear: 'create customers',
      actualizar: 'update customers',
      eliminar: 'delete customers',
    },
    campos: [
      { nombre: 'id_customer', etiqueta: 'Identificación', tipo: 'text', requerido: true, max: 50, soloAlCrear: true },
      { nombre: 'first_name', etiqueta: 'Nombre', tipo: 'text', requerido: true, max: 50 },
      { nombre: 'second_name', etiqueta: 'Segundo nombre', tipo: 'text', max: 50 },
      { nombre: 'last_name1', etiqueta: 'Primer apellido', tipo: 'text', requerido: true, max: 50 },
      { nombre: 'last_name2', etiqueta: 'Segundo apellido', tipo: 'text', max: 50 },
      { nombre: 'email', etiqueta: 'Correo', tipo: 'email', requerido: true, max: 100 },
      { nombre: 'telephone_number', etiqueta: 'Teléfono', tipo: 'text', max: 20 },
    ],
    columnas: [
      { etiqueta: 'Identificación', valor: (cliente) => cliente.id_customer },
      {
        etiqueta: 'Nombre',
        valor: (cliente) => [cliente.first_name, cliente.second_name, cliente.last_name1, cliente.last_name2]
          .filter(Boolean)
          .join(' '),
      },
      { etiqueta: 'Correo', valor: (cliente) => cliente.email },
      { etiqueta: 'Teléfono', valor: (cliente) => cliente.telephone_number },
    ],
    idDe: (cliente) => cliente.id_customer,
    valoresDe: (cliente) => ({
      id_customer: cliente.id_customer,
      first_name: cliente.first_name,
      second_name: cliente.second_name,
      last_name1: cliente.last_name1,
      last_name2: cliente.last_name2,
      email: cliente.email,
      telephone_number: cliente.telephone_number,
    }),
  })
})
