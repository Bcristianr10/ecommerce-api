// Rutas con Supertest y SQLite en memoria (NODE_ENV=test).
// Arnés: el router de productos se monta en /api/products. El servidor real lo monta en /products.
//   P1 Un producto solo se crea en una categoría que existe.
//   P2 Consulta por categoría: solo devuelve productos de esa categoría.
//   P3 Consulta por varias categorías: el parámetro categories es obligatorio.
// Redactado con asistencia de IA (Claude); ver el registro de IA del informe. Los it marcados con // IA: son casos propuestos por el modelo.
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { initTestDb, closeTestDb } = require('../setup/testDb');
const productRouter = require('../../routes/products');
const CartItem = require('../../models/cartItem');
const Product = require('../../models/product');
const Category = require('../../models/category');

const app = express();
app.use(bodyParser.json());
app.use('/api/products', productRouter);

describe('Product Routes', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await CartItem.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
  });

  // IA: caso propuesto por el modelo (no sale del enunciado ni de una regla explícita del README); se conserva.
  it('P1 Alta de producto | válida: {Lapiz, price 2.5, inventory 10, categoría existente} responde 201 con esos datos y la fila existe', async () => {
    const category = await Category.create({ name: 'Papeleria' });

    const res = await request(app).post('/api/products').send({
      name: 'Lapiz', price: 2.5, inventory: 10, categoryId: category.id
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Lapiz', price: 2.5, inventory: 10, categoryId: category.id });
    const row = await Product.findByPk(res.body.id);
    expect(row.name).toBe('Lapiz');
    expect(row.inventory).toBe(10);
  });

  // IA: caso propuesto por el modelo (no sale del enunciado ni de una regla explícita del README); se conserva.
  it('P1 Alta de producto | inválida (cruce con categorías): categoryId 9999 inexistente responde 400 "Category with id 9999 does not exist" y no guarda el producto', async () => {
    const res = await request(app).post('/api/products').send({
      name: 'Lapiz', price: 2.5, inventory: 10, categoryId: 9999
    });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Category with id 9999 does not exist' });
    expect(await Product.count()).toBe(0);
  });

  // IA: caso propuesto por el modelo (no sale del enunciado ni de una regla explícita del README); se conserva.
  it('P3 Por varias categorías | inválida: sin el parámetro categories responde 400 "Categories parameter is required"', async () => {
    const res = await request(app).get('/api/products/categories');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Categories parameter is required' });
  });

  // IA: caso propuesto por el modelo (no sale del enunciado ni de una regla explícita del README); se conserva.
  it('P2 Por categoría | válida: Papelería devuelve sus 2 productos y ninguno de Hogar', async () => {
    const papeleria = await Category.create({ name: 'Papeleria' });
    const hogar = await Category.create({ name: 'Hogar' });
    await Product.create({ name: 'Lapiz', price: 2, categoryId: papeleria.id });
    await Product.create({ name: 'Cuaderno', price: 5, categoryId: papeleria.id });
    await Product.create({ name: 'Sarten', price: 30, categoryId: hogar.id });

    const res = await request(app).get(`/api/products/category/${papeleria.id}`);

    expect(res.status).toBe(200);
    expect(res.body.map(p => p.name).sort()).toEqual(['Cuaderno', 'Lapiz']);
  });
});
