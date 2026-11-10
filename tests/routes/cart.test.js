const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { initTestDb, closeTestDb } = require('../setup/testDb');
const cartRouter = require('../../routes/cart');
const Cart = require('../../models/cart');
const Product = require('../../models/product');
const Category = require('../../models/category');

const app = express();
app.use(bodyParser.json());
app.use('/api/carts', cartRouter);

describe('Cart Routes', () => {
  beforeAll(async () => {
    await initTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await Cart.destroy({ where: {} });
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
  });

  describe('POST /api/carts/:userId', () => {
    it('should create a new cart', async () => {

    });
  });

  describe('POST /api/carts/:cartId/items', () => {
    //let cart, product;

    // beforeEach(async () => {
    //   const category = await Category.create({ name: 'Test Category' });
    //   product = await Product.create({
    //     name: 'Test Product',
    //     price: 100,
    //     inventory: 10,
    //     categoryId: category.id
    //   });
    //   cart = await Cart.create({ userId: '1' });
    // });

    it('should add item to cart', async () => {

    });

  });

  describe('GET /api/carts/:cartId/items', () => {
    it('should return 404 when cart does not exist', async () => {
      const response = await request(app)
      .get('/api/carts/1/items')
      .expect(404);
    });

    it('should return 400 when cart id wrong format', async () => {
      const response = await request(app)
      .get('/api/carts/nonidad123/items')
      .expect(400);
    });
  });
});