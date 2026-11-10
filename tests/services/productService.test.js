// Mock the models before requiring the service
jest.mock('../../models/product', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    belongsTo: jest.fn()  // Mock the association method
  }));

  jest.mock('../../models/category', () => ({
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn()
  }));

  // Now require the service after the mocks are set up
  const ProductService = require('../../services/productService');
  const Product = require('../../models/product');
  const Category = require('../../models/category');

describe('ProductService', () => {
    // Clear all mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllProducts', () => {
        it('should return all products', async () => {

        });
    });

    describe('getProductById', () => {
        it('should return a product when product exists', async () => {

        });
    });

    describe('createProduct', () => {
        it('should create a product when category exists', async () => {

        });
    });

    describe('getProductsByCategory', () => {
        it('should return products by category', async () => {

        });
    });

    describe('getProductsByCategories', () => {
        it('should return products by categories', async () => {

        });
    });

    describe('updateProduct', () => {
        it('should update a product', async () => {

        });
    });

    describe('deleteProduct', () => {
        it('should delete a product', async () => {

        });
    });


});