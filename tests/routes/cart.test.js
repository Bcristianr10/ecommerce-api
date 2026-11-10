// Rutas con Supertest y SQLite en memoria (NODE_ENV=test).
// Arnés: el router del carrito se monta en /api/carts. El servidor real lo monta en /cart;
// aquí todas las peticiones usan el prefijo /api/carts.
//   R1 Alta de ítem: producto existe, quantity entero > 0 que no supera el inventario.
//   R2 Alta repetida: la cantidad nueva es la suma y tampoco supera el inventario.
//   R3 El ítem de PUT/DELETE pertenece al carrito de la URL.
//   R4 Total al consultar el carrito (subtotal, impuesto, total).
//   R5 Errores de carrito: 404 "Cart doesn't exist".
// HALLAZGO: marca una prueba que falla porque el servidor contradice la regla. No se reescribe el oráculo.
// Redactado con asistencia de IA (Claude); ver el registro de IA del informe. Los it marcados con // IA: son casos propuestos por el modelo.
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { initTestDb, closeTestDb } = require('../setup/testDb');
const cartRouter = require('../../routes/cart');
const Cart = require('../../models/cart');
const CartItem = require('../../models/cartItem');
const Product = require('../../models/product');
const Category = require('../../models/category');
const Order = require('../../models/order');
const OrderLine = require('../../models/orderLine');

const app = express();
app.use(bodyParser.json());
app.use('/api/carts', cartRouter);

describe('Cart Routes', () => {
  let category;

  const newProduct = (overrides = {}) => Product.create({
    name: 'Lapiz',
    price: 100,
    inventory: 10,
    taxRate: 0,
    categoryId: category.id,
    ...overrides
  });

  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await OrderLine.destroy({ where: {} });
    await Order.destroy({ where: {} });
    await CartItem.destroy({ where: {} });
    await Cart.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
    category = await Category.create({ name: 'Papeleria' });
  });

  describe('POST /api/carts/:cartId/items', () => {
    let cart, product;

    beforeEach(async () => {
      product = await newProduct();
      cart = await Cart.create({ userId: 1 });
    });

    const add = (body, cartId = cart.id) =>
      request(app).post(`/api/carts/${cartId}/items`).send(body);

    it('R1 Alta de ítem | válida: producto (inventario 10), cantidad 2 responde 201 y guarda una línea con quantity 2', async () => {
      const res = await add({ productId: product.id, quantity: 2 });

      expect(res.status).toBe(201);
      // El id viene de la URL: el cuerpo lo devuelve como texto; el entero se verifica en la fila.
      expect(Number(res.body.cartId)).toBe(cart.id);
      expect(res.body).toMatchObject({ productId: product.id, quantity: 2 });
      const rows = await CartItem.findAll({ where: { cartId: cart.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].quantity).toBe(2);
    });

    it('R1 Alta de ítem | límite: cantidad 10 = inventario 10 responde 201 y guarda quantity 10', async () => {
      const res = await add({ productId: product.id, quantity: 10 });

      expect(res.status).toBe(201);
      const rows = await CartItem.findAll({ where: { cartId: cart.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].quantity).toBe(10);
    });

    it('R1 Alta de ítem | límite (inválida): cantidad 11 con inventario 10 responde 400 "Not enough inventory available" y no guarda línea', async () => {
      const res = await add({ productId: product.id, quantity: 11 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Not enough inventory available' });
      expect(await CartItem.count({ where: { cartId: cart.id } })).toBe(0);
    });

    // HALLAZGO: no se valida quantity > 0; el servidor responde 201 y guarda una línea con 0.
    it('R1 Alta de ítem | inválida: cantidad 0 responde 400 "Quantity must be a positive integer" y no guarda línea', async () => {
      const res = await add({ productId: product.id, quantity: 0 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Quantity must be a positive integer' });
      expect(await CartItem.count({ where: { cartId: cart.id } })).toBe(0);
    });

    // HALLAZGO: la cantidad negativa pasa el chequeo de inventario y se guarda la línea con -3.
    it('R1 Alta de ítem | inválida: cantidad -3 responde 400 "Quantity must be a positive integer" y no guarda línea', async () => {
      const res = await add({ productId: product.id, quantity: -3 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Quantity must be a positive integer' });
      expect(await CartItem.count({ where: { cartId: cart.id } })).toBe(0);
    });

    // HALLAZGO: no se valida entero; el servidor responde 201 y guarda la línea.
    // IA: caso propuesto por el modelo (no sale del enunciado ni de una regla explícita del README); se conserva.
    it('R1 Alta de ítem | inválida: cantidad 1.5 responde 400 "Quantity must be a positive integer" y no guarda línea', async () => {
      const res = await add({ productId: product.id, quantity: 1.5 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Quantity must be a positive integer' });
      expect(await CartItem.count({ where: { cartId: cart.id } })).toBe(0);
    });

    it('R1 Alta de ítem | inválida (cruce con productos): productId 9999 inexistente, cantidad 1 responde 400 "Product not found" y no guarda línea', async () => {
      const res = await add({ productId: 9999, quantity: 1 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Product not found' });
      expect(await CartItem.count({ where: { cartId: cart.id } })).toBe(0);
    });

    it('R2 Alta repetida | límite: ya hay 6 y se agregan 4 (suma 10 = inventario) deja una sola línea con quantity 10', async () => {
      await add({ productId: product.id, quantity: 6 });

      const res = await add({ productId: product.id, quantity: 4 });

      expect(res.status).toBe(201);
      const rows = await CartItem.findAll({ where: { cartId: cart.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].quantity).toBe(10);
    });

    it('R2 Alta repetida | inválida: ya hay 6 y se agregan 5 (suma 11 > 10) responde 400 "Not enough inventory available" y la línea sigue en 6', async () => {
      await add({ productId: product.id, quantity: 6 });

      const res = await add({ productId: product.id, quantity: 5 });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: 'Not enough inventory available' });
      const rows = await CartItem.findAll({ where: { cartId: cart.id } });
      expect(rows).toHaveLength(1);
      expect(rows[0].quantity).toBe(6);
    });
  });

  describe('PUT y DELETE /api/carts/:cartId/items/:itemId', () => {
    let cartA, cartB, product, itemOfA;

    beforeEach(async () => {
      product = await newProduct();
      cartA = await Cart.create({ userId: 1 });
      cartB = await Cart.create({ userId: 2 });
      itemOfA = await CartItem.create({ cartId: cartA.id, productId: product.id, quantity: 2 });
    });

    // HALLAZGO: updateCartItem ignora cartId de la URL; el ítem del carrito A se modifica desde la URL del carrito B.
    it('R3 Pertenencia | inválida: PUT del ítem del carrito A por la URL del carrito B, cantidad 5, se rechaza y la fila sigue en 2', async () => {
      const res = await request(app)
        .put(`/api/carts/${cartB.id}/items/${itemOfA.id}`)
        .send({ quantity: 5 });

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.body.error).toBeDefined();
      expect((await CartItem.findByPk(itemOfA.id)).quantity).toBe(2);
    });

    // HALLAZGO: removeCartItem ignora cartId de la URL; el ítem del carrito A se elimina desde la URL del carrito B.
    it('R3 Pertenencia | inválida: DELETE del ítem del carrito A por la URL del carrito B se rechaza y la fila sigue existiendo', async () => {
      const res = await request(app).delete(`/api/carts/${cartB.id}/items/${itemOfA.id}`);

      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(await CartItem.findByPk(itemOfA.id)).not.toBeNull();
    });
  });

  describe('GET /api/carts/:cartId/items', () => {
    it('R5 Consulta | inválida: carrito 9999 inexistente responde 404 "Cart doesn\'t exist"', async () => {
      const res = await request(app).get('/api/carts/9999/items');

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "Cart doesn't exist" });
    });

    it('R4 Total | válida: 2 × 100 con taxRate 0.07 y 3 × 10 con taxRate 0 dan subtotal 230, impuesto 14 y total 244', async () => {
      const cart = await Cart.create({ userId: 1 });
      const taxed = await newProduct({ name: 'Cuaderno', price: 100, taxRate: 0.07 });
      const exempt = await newProduct({ name: 'Goma', price: 10, taxRate: 0 });
      await CartItem.create({ cartId: cart.id, productId: taxed.id, quantity: 2 });
      await CartItem.create({ cartId: cart.id, productId: exempt.id, quantity: 3 });

      const res = await request(app).get(`/api/carts/${cart.id}/items`);

      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(2);
      expect(res.body.summary.subtotal).toBe(230);
      // Tolerancia de un centavo: 200 * 0.07 da 14.000000000000002 en FLOAT.
      expect(res.body.summary.totalTax).toBeCloseTo(14, 2);
      expect(res.body.summary.total).toBeCloseTo(244, 2);
    });
  });
});
