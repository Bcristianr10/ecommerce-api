## Instalación

Deben tener `npm` instalado en su máquina. Para eso, sigan las indicaciones en la siguiente página: [Downloading and installing Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

Una vez instalado `npm`, deben ejecutar los siguientes comandos en la consola:

1. Instalar las dependencias:

```bash
npm install
```

2. Levantar el servidor:

```bash
npm start
```

Este comando creará la base de datos en SQLite (archivo `db.sqlite`) y todas las tablas necesarias.

## Levantar el servidor

Para levantar el servidor, deben ejecutar el siguiente comando:

```bash
npm start
```

Esto levantará el servidor en el puerto 3000. Para probar las rutas, pueden usar el siguiente comando:

```bash
curl http://localhost:3000/products
```

Si no tienen `curl` instalado, pueden utilizar otras herramientas como [Postman](https://www.postman.com/) o [Insomnia](https://insomnia.rest/).

## Rutas canónicas

El servidor monta los routers sin el prefijo `/api/v1`:

| Recurso | Rutas principales |
| --- | --- |
| Productos | `GET /products`, `POST /products`, `GET /products/category/:categoryId` |
| Categorías | `GET /categories`, `POST /categories` |
| Carrito | `POST /cart/:userId`, `POST /cart/:cartId/items`, `GET /cart/:cartId/items`, `POST /cart/:cartId/checkout`, `GET /cart/:cartId/order` |

Algunas pruebas construyen una aplicación Express aislada y montan el mismo router bajo `/api/products` o `/api/carts`. Ese prefijo pertenece al arnés de la prueba; no es la URL del servidor levantado con `npm start`.

## Reglas

Estas reglas son la especificación del carrito y del cobro. Si una respuesta del servidor no las cumple, esa diferencia es un hallazgo: no se reescribe la regla para que coincida con el código.

### Alta de un ítem

`CartService.addItemToCart(cartId, productId, quantity)` agrega la cantidad solo cuando el producto existe y `quantity` es un entero mayor que cero que no supera el inventario. Si el producto ya está en el carrito, la cantidad nueva es la suma, y esa suma tampoco puede superar el inventario.

### Ítem y carrito de la URL

El ítem que se actualiza con `PUT /cart/:cartId/items/:itemId`, o se elimina con `DELETE /cart/:cartId/items/:itemId`, pertenece al carrito indicado en la URL.

### Total al consultar el carrito

`GET /cart/:cartId/items` usa el precio y el `taxRate` vigentes del producto:

- subtotal de línea = cantidad × precio
- impuesto de línea = subtotal de línea × `taxRate`
- `summary.subtotal` = suma de los subtotales de línea
- `summary.totalTax` = suma de los impuestos de línea
- `summary.total` = `summary.subtotal` + `summary.totalTax`

Esa consulta no aplica cupón ni envío. No es el total cobrado.

### Cobro

`POST /cart/:cartId/checkout`. El cupón es opcional:

```json
{ "coupon": { "type": "percent", "value": 0.1, "minSubtotal": 50 } }
```

`type` es `percent` o `fixed`. Solo se acepta un cupón: si `coupon` es un arreglo, el cobro se rechaza. El umbral de envío es 50 y la tarifa es 5. Esos valores no viajan en el cuerpo; si el cliente los envía, no se usan. Están en `services/pricing.js` (`SHIPPING_THRESHOLD` y `SHIPPING_FEE`). `priceCheckout(items, coupon)` es pura: no toca la base de datos. Cada ítem es `{ quantity, unitPrice, taxRate }`.

El cobro se rechaza, sin modificar el inventario, cuando ocurre cualquiera de estas condiciones:

- el carrito no existe
- el id de carrito no es numérico
- el carrito no tiene ítems
- el carrito ya fue cobrado
- alguna cantidad no es un entero mayor que cero
- el inventario de algún producto es menor que la cantidad de esa línea
- el precio es negativo, o `taxRate` no está entre 0 y 1
- el cupón no cumple lo de abajo

Cupón:

- `percent`: `value` es una fracción mayor que 0 y a lo sumo 1 (`0.1` es 10 %). Exige `minSubtotal` mayor o igual que 0. Si el subtotal es menor que ese mínimo, el cobro se rechaza. Si es igual, el cupón aplica.
- `fixed`: `value` es un monto mayor que 0. Se redondea al centavo y después se compara con el subtotal. Si lo supera, el cobro se rechaza. Si es igual, la base queda en 0.
- No se acumulan. Un cupón `fixed` no consulta `minSubtotal`.

El cálculo, en este orden:

1. El precio unitario se redondea al centavo más cercano. Si el centavo cae exactamente a la mitad, se redondea alejándose de cero. `price` y `taxRate` se guardan como FLOAT: un decimal que el binario no representa puede entrar al cálculo ya distinto del valor escrito.
2. El subtotal de línea es ese precio por la cantidad. El subtotal del pedido es la suma de las líneas.
3. El descuento se calcula sobre ese subtotal.
4. El descuento se reparte en el orden de las líneas, en proporción al subtotal de cada una, redondeado al centavo y sin pasar del descuento que todavía no se ha repartido. La última línea recibe el resto. Cada descuento de línea queda entre 0 y el subtotal de esa línea, y la suma es el descuento del pedido.
5. El impuesto de cada línea es (subtotal de línea − descuento de línea) × `taxRate`, redondeado al centavo. El impuesto del pedido es la suma. El impuesto va después del descuento.
6. La base es subtotal − descuento. Si la base es mayor o igual que 50, el envío es 0. Si es menor, el envío es 5.
7. El total es base + impuesto + envío.

La respuesta y `GET /cart/:cartId/order` expresan los montos en unidades, no en centavos. `priceCheckout` devuelve esos mismos montos y también los enteros en centavos (`subtotalCents`, `discountCents`, `taxableCents`, `taxCents`, `shippingCents`, `totalCents`, y los equivalentes en cada línea).

El pedido guarda el resultado. Un cambio posterior del precio no lo modifica. El carrito pasa a `checked_out` y un segundo cobro se rechaza. El inventario de cada producto baja en la cantidad de su línea. Si una línea no alcanza, no se descuenta ninguna. Dos cobros simultáneos pueden leer el mismo inventario antes de grabar y descontar de menos.

`POST`, `PUT` y `DELETE` de ítems no consultan `checked_out`. `addItemToCart` tampoco. Un ítem agregado después del cobro no entra en el pedido. `GET /cart/:cartId/items` sigue calculando con el precio vigente.

`GET /cart/:cartId/order` devuelve el pedido. Si el carrito no existe, o todavía no hay pedido, responde 404.

El cuerpo de un cobro sin cupón, de dos unidades a 100 con `taxRate` 0.07, tiene `subtotal` 200, `discount` 0, `taxable` 200, `tax` 14, `shipping` 0 y `total` 214. Con una unidad a 40 y `taxRate` 0, el envío es 5 y el total es 45. Con una unidad a 50 y `taxRate` 0, el envío es 0 y el total es 50.

### Texto de los errores

El JSON es `{ "error": "<texto>" }`.

| Situación | Estado | Texto |
| --- | --- | --- |
| Carrito inexistente | 404 | `Cart doesn't exist` |
| Id de carrito no numérico | 400 | `Cart ID should be a number` |
| Carrito sin ítems | 400 | `Cart is empty` |
| Carrito ya cobrado | 400 | `Cart already checked out` |
| Cantidad que no es un entero mayor que cero | 400 | `Quantity must be a positive integer` |
| Inventario insuficiente | 400 | `Not enough inventory available` |
| Producto de la línea inexistente | 400 | `Product not found` |
| Precio negativo | 400 | `Price must be zero or greater` |
| `taxRate` fuera de 0 a 1 | 400 | `Tax rate must be between 0 and 1` |
| `coupon` es un arreglo u otro valor que no es objeto | 400 | `Only one coupon is allowed` |
| `type` distinto de `percent` y de `fixed` | 400 | `Coupon type must be percent or fixed` |
| `value` que no es un número mayor que cero | 400 | `Coupon value must be greater than zero` |
| Porcentaje mayor que 1 | 400 | `Percent coupon cannot exceed 1` |
| Porcentaje sin mínimo válido | 400 | `Percent coupon requires a minimum subtotal` |
| Subtotal por debajo del mínimo | 400 | `Coupon minimum not met` |
| Monto fijo mayor que el subtotal | 400 | `Coupon exceeds subtotal` |
| Pedido todavía no creado | 404 | `Order not found` |

## Pruebas

Para ejecutar las pruebas, deben ejecutar el siguiente comando:

```bash
npm test
```

Si quieren ver el coverage de las pruebas, pueden ejecutar el siguiente comando:

```bash
npm run test:coverage
```

## Ejecutar mutation testing con stryker

Para ejecutar mutation testing con stryker, deben ejecutar el siguiente comando:

```bash
npx stryker run
```

Eso generará un reporte en el archivo `reports/mutation.html` que pueden abrir con cualquier navegador.
