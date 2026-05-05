Instrucciones para editar `parte_operaciones.json`

- Ruta: data/parte_operaciones.json
- Estructura principal: contiene `resumen1` y `resumen2`. Cada uno es un objeto con las propiedades:
  - `columns`: array de columnas. Cada columna tiene `key`, `title`, `align` (start/center/end), y opcional `format` (por ejemplo "number") y `decimals`.
  - `rows`: array de objetos. Cada fila debe usar las mismas claves (`key`) definidas en `columns`.
  - `footer`: (opcional) array de celdas que se mostrarán en el tfoot. Cada celda puede contener `text`, `colspan`, y `class`.

Ejemplo sencillo:
{
  "columns": [ { "key": "categoria", "title": "Categoría" }, { "key": "operaciones", "title": "Operaciones", "format": "number" } ],
  "rows": [ { "categoria": "Aviación Comercial", "operaciones": 1200 } ]
}

Después de editar y guardar el archivo JSON, recarga la página en el navegador para ver los cambios.
