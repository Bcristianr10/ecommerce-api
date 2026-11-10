const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const { initTestDb, closeTestDb } = require('../setup/testDb');
const productRouter = require('../../routes/products');
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
    await Product.destroy({ where: {} });
    await Category.destroy({ where: {} });
  });

  describe('POST /api/products', () => {
    // let category;

    // beforeEach(async () => {
    //   category = await Category.create({ name: 'Test Category' });
    // });

    it('should create a new product', async () => {

    });

    it('should return error when category does not exist', async () => {

    });
  });

  describe('GET /api/products/category/:categoryId', () => {
    it('should return products for category', async () => {

    });
  });
});