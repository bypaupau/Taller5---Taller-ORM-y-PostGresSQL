# Taller 5: ORM y PostgreSQL

API REST de un álbum de fotos construida con **NestJS**, **TypeORM** y **PostgreSQL**. Las fotos, que antes se guardaban en memoria, ahora se guardan en una base de datos PostgreSQL que corre en Docker.

## Tecnologías

- NestJS 12 (proyecto ESM)
- TypeORM 1.1 con `@nestjs/typeorm`
- PostgreSQL 18 (contenedor Docker)
- `@nestjs/config` para las variables de entorno
- Vitest para las pruebas

## Estructura

```
src/
├── app.module.ts            # Conexión a PostgreSQL con TypeORM
├── main.ts                  # Arranque del servidor
├── seed.ts                  # Inserta 10 fotos de prueba
└── fotos/
    ├── entities/
    │   └── foto.entity.ts   # Entidad Foto (tabla "fotos")
    ├── dto/                 # Datos de entrada para crear y actualizar
    ├── fotos.controller.ts  # Rutas /api/fotos
    ├── fotos.service.ts     # Lógica CRUD con el repositorio
    ├── fotos.module.ts
    └── fotos.service.spec.ts
```

## Puesta en marcha

### 1. Levantar PostgreSQL en Docker

```bash
docker run -d --name pg-album \
  -e POSTGRES_PASSWORD=tu_contraseña \
  -e POSTGRES_DB=album \
  -p 5433:5432 \
  postgres:18
```

Se usa el puerto **5433** para no chocar con una instalación local de PostgreSQL en el 5432.

### 2. Configurar las variables de entorno

```bash
cp .env.example .env
```

Luego edita `.env` y pon en `DB_PASSWORD` la misma contraseña del contenedor.

| Variable      | Ejemplo     | Descripción                   |
| ------------- | ----------- | ----------------------------- |
| `PORT`        | `3001`      | Puerto de la API              |
| `DB_HOST`     | `localhost` | Host de PostgreSQL            |
| `DB_PORT`     | `5433`      | Puerto publicado por Docker   |
| `DB_USER`     | `postgres`  | Usuario de la base            |
| `DB_PASSWORD` | —           | Contraseña del contenedor     |
| `DB_NAME`     | `album`     | Nombre de la base de datos    |

### 3. Instalar y ejecutar

```bash
npm install
npm run start:dev
```

Con `synchronize: true`, TypeORM crea la tabla `fotos` automáticamente al arrancar.

### 4. Cargar datos de prueba

```bash
npm run seed
```

Vacía la tabla `fotos` e inserta 10 fotos de ejemplo.

## Entidad `Foto`

| Columna         | Tipo           | Notas                     |
| --------------- | -------------- | ------------------------- |
| `id`            | `integer`      | Clave primaria autogenerada |
| `titulo`        | `varchar(100)` | Obligatorio               |
| `descripcion`   | `text`         | Opcional                  |
| `calificacion`  | `float`        | Opcional                  |
| `ruta`          | `varchar`      | Opcional                  |
| `fotografo`     | `varchar(50)`  | Opcional (antes `autor`)  |
| `creadoEn`      | `timestamp`    | Se llena al crear         |
| `actualizadoEn` | `timestamp`    | Se actualiza al guardar   |

## Endpoints

| Método   | Ruta              | Descripción              | Respuesta     |
| -------- | ----------------- | ------------------------ | ------------- |
| `GET`    | `/api/fotos`      | Lista todas las fotos    | `200`         |
| `GET`    | `/api/fotos/:id`  | Obtiene una foto         | `200` / `404` |
| `POST`   | `/api/fotos`      | Crea una foto            | `201`         |
| `PATCH`  | `/api/fotos/:id`  | Actualiza una foto       | `200` / `404` |
| `DELETE` | `/api/fotos/:id`  | Elimina una foto         | `204` / `404` |

### Ejemplos con curl

```bash
# Obtener la foto 3
curl http://localhost:3001/api/fotos/3

# Crear una foto
curl -X POST http://localhost:3001/api/fotos \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Cerro", "calificacion": 5, "ruta": "x.jpg"}'

# Actualizar la foto 1
curl -X PATCH http://localhost:3001/api/fotos/1 \
  -H "Content-Type: application/json" \
  -d '{"titulo": "Foto editada", "calificacion": 5}'

# Eliminar la foto 2
curl -i -X DELETE http://localhost:3001/api/fotos/2
```

## Reto

### 1. Agregar una columna

Se añadió `autor` (texto, opcional) a la entidad. Al guardar, `synchronize` ejecutó `ALTER TABLE "fotos" ADD "autor" text` y la columna apareció en pgAdmin. Las fotos que ya existían quedaron con `autor = null` y las nuevas se crearon con autor.

### 2. Renombrar la columna

Se cambió `autor` por `fotografo`.

- **Solo renombrando**, los datos **se conservaron**. TypeORM 1.1 detecta cuando cambia el nombre de una sola columna de una tabla y ejecuta `RENAME COLUMN`.
- **Cambiando además el tipo** (`text` → `varchar(50)`), `synchronize` ejecutó `DROP COLUMN` seguido de `ADD`, y **los valores se perdieron**.

**¿Por qué `synchronize` es peligroso en producción?** Porque modifica el esquema de forma automática cada vez que arranca la app. Su detección de renombres es limitada: si se renombran varias columnas a la vez, o si cambia el tipo o la longitud de una columna, la borra y la vuelve a crear vacía. Lo hace sin pedir confirmación, sin dejar historial y sin forma de deshacerlo, así que puede borrar datos reales. En producción se desactiva y se usan **migraciones**, que dejan cada cambio escrito, revisado y versionado, y permiten hacer un `RENAME COLUMN` sin perder datos.

### 3. CRUD con la base

`update` y `remove` usan el repositorio de TypeORM:

- **`update`:** busca la foto con `findOne` (responde 404 si no existe), modifica sus campos y la guarda con `repository.save()`. Como la entidad ya tiene `id`, TypeORM hace un `UPDATE`.
- **`remove`:** busca la foto con `findOne` y la elimina con `repository.remove()`.

## Pruebas

```bash
npm test
```

Las pruebas del servicio usan un repositorio simulado con `vi.fn()`, así que no necesitan la base de datos.
