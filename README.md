# FerreteriaFront

Frontend de la Ferretería Pescado Volador (Desarrollo de Software 4).



La maqueta visual corresponde al Laboratorio 8 (`FerreteriaPescadoFeliz/Maqueta`).

 Módulo | Responsabilidad 

`src/api.js` | Cliente de la API: clase `ClienteApi` con URL base, token de autenticación, parámetros de consulta y manejo uniforme de errores (`ErrorApi`). |
 `src/state.js` | Estado de la aplicación: tienda con pub/sub, persistencia del formulario y retorno de sesión. |
 `src/views.js` | Vista: render del DOM a partir del estado (4 estados de lista, paginación, errores 422 por campo). |
 `src/main.js` | Orquestación: carga de datos, debounce + cancelación, envío de formularios y manejo de expiración de token. |

### Pantallas

- `index.html` — Catálogo: listado paginado con estados de carga, vacío, error (con reintento) y datos; búsqueda con debounce de 300 ms y cancelación de solicitudes en vuelo.
- `ventas.html` — Formulario de venta con errores de validación 422 por campo (creación y edición) e historial paginado.
- `login.html` — Inicio de sesión (token Sanctum de 2 horas). Ante un 401 la aplicación regresa aquí sin perder los datos del formulario.

### Uso


npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción (3 páginas)





cd ../FerreteriaPescadoFeliz/FerreteriaPescadoVolador
php artisan serve   # http://127.0.0.1:8000
```

Usuarios de prueba: `admin@example.com`, `cajero@example.com`, `bodeguero@example.com` — contraseña `password`.
La URL de la API se puede cambiar con la variable de entorno `VITE_API_URL`.
