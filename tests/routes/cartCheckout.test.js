// Cobro (checkout): casos acotados que cruzan carrito con productos (inventario, precio).
// Arnés: el router del carrito se monta en /api/carts (el servidor real usa /cart).
//   K1 Cobro sin cupón: montos en unidades y envío 5 si la base es < 50, 0 si es >= 50.
//   K2 Cobro con cupón percent: descuento sobre el subtotal; mínimo exigido.
//   K3 Rechazos: carrito vacío, ya cobrado, inventario insuficiente, precio negativo, cupón no válido.
//   K4 El cobro descuenta inventario, pasa el carrito a checked_out y guarda el pedido; si se rechaza, no modifica nada.
// HALLAZGO: marca una prueba que falla porque el servidor contradice la regla.
// Redactado con asistencia de IA (Claude); ver el registro de IA del informe.
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

describe('Cart Checkout Routes', () => {
  let category;

  const cartWith = async (lines) => {
    const cart = await Cart.create({ userId: 1 });
    const products = [];
    for (const line of lines) {
      const product = await Product.create({
        name: `P${products.length}`,
        price: line.price,
        inventory: line.inventory,
        taxRate: line.taxRate || 0,
        categoryId: category.id
      });
      await CartItem.create({ cartId: cart.id, productId: product.id, quantity: line.quantity });
      products.push(product);
    }
    return { cart, products };
  };

  const checkout = (cartId, body) =>
    request(app).post(`/api/carts/${cartId}/checkout`).send(body || {});

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

  it('K1 Cobro sin cupón | válida: 2 × 100 con taxRate 0.07 da subtotal 200, descuento 0, base 200, impuesto 14, envío 0, total 214; inventario 10 baja a 8 y el carrito queda checked_out', async () => {
    const { cart, products } = await cartWith([{ price: 100, inventory: 10, quantity: 2, taxRate: 0.07 }]);

    const res = await checkout(cart.id);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      cartId: cart.id, subtotal: 200, discount: 0, taxable: 200, tax: 14, shipping: 0, total: 214, coupon: null
    });
    expect((await Product.findByPk(products[0].id)).inventory).toBe(8);
    expect((await Cart.findByPk(cart.id)).status).toBe('checked_out');
    expect(await Order.count({ where: { cartId: cart.id } })).toBe(1);
  });

  it('K3 Cruce con productos | inválida: cantidad 3 en el carrito y el inventario baja a 1 responde 400 "Not enough inventory available" y no descuenta ningún producto', async () => {
    const { cart, products } = await cartWith([
      { price: 10, inventory: 10, quantity: 2 },
      { price: 10, inventory: 10, quantity: 3 }
    ]);
    await products[1].update({ inventory: 1 });

    const res = await checkout(cart.id);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Not enough inventory available' });
    expect((await Product.findByPk(products[0].id)).inventory).toBe(10);
    expect((await Product.findByPk(products[1].id)).inventory).toBe(1);
    expect((await Cart.findByPk(cart.id)).status).toBe('open');
    expect(await Order.count()).toBe(0);
  });

  it('K3 Cruce con productos | inválida: producto con precio -5 en el carrito responde 400 "Price must be zero or greater" y no cobra', async () => {
    const { cart, products } = await cartWith([{ price: -5, inventory: 5, quantity: 1 }]);

    const res = await checkout(cart.id);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Price must be zero or greater' });
    expect((await Product.findByPk(products[0].id)).inventory).toBe(5);
    expect(await Order.count()).toBe(0);
  });

  it('K4 Doble cobro | inválida: el segundo cobro responde 400 "Cart already checked out" y el inventario se descuenta una sola vez (10 → 8)', async () => {
    const { cart, products } = await cartWith([{ price: 100, inventory: 10, quantity: 2 }]);
    await checkout(cart.id);

    const res = await checkout(cart.id);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Cart already checked out' });
    expect((await Product.findByPk(products[0].id)).inventory).toBe(8);
    expect(await Order.count({ where: { cartId: cart.id } })).toBe(1);
  });

});
