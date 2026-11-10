const express = require('express');
const router = express.Router();
const ProductService = require('../services/productService');

// Create a product
router.post('/', async (req, res) => {
  try {
    const product = await ProductService.createProduct(req.body);
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await ProductService.getAllProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const options = {
      sort: req.query.sort,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    const products = await ProductService.getProductsByCategory(
      req.params.categoryId, 
      options
    );
    
    res.json(products);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get products by multiple categories
router.get('/categories', async (req, res) => {
  try {
    const options = {
      sort: req.query.sort,
      limit: req.query.limit,
      offset: req.query.offset
    };
    
    const products = await ProductService.getProductsByCategories(
      req.query.categories,
      options
    );
    
    res.json(products);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
