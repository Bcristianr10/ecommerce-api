const express = require('express');
const CartService = require('../services/cartService');
const CheckoutService = require('../services/checkoutService');
const router = express.Router();

// Create a new cart for a user
router.post('/:userId', async (req, res) => {
  try {
    const cart = await CartService.createCart(req.params.userId);
    res.status(201).json(cart);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Add an item to the cart
router.post('/:cartId/items', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const cartItem = await CartService.addItemToCart(req.params.cartId, productId, quantity);
    res.status(201).json(cartItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all items in a cart
router.get('/:cartId/items', async (req, res) => {
  try {
    const items = await CartService.getCartItems(req.params.cartId);
    if (items) {
      res.json(items);
    } else {
      res.status(404).json({ error: "Cart doesn't exist" });
    }
    
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update quantity of a cart item
router.put('/:cartId/items/:itemId', async (req, res) => {
  try {
    const { quantity } = req.body;
    const cartItem = await CartService.updateCartItem(req.params.itemId, quantity);
    res.json(cartItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Remove an item from the cart
router.delete('/:cartId/items/:itemId', async (req, res) => {
  try {
    await CartService.removeCartItem(req.params.itemId);
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Charge the cart once and freeze the total
router.post('/:cartId/checkout', async (req, res) => {
  try {
    const coupon = req.body ? req.body.coupon : undefined;
    const order = await CheckoutService.checkout(req.params.cartId, coupon);
    res.status(201).json(order);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

// Read the frozen order
router.get('/:cartId/order', async (req, res) => {
  try {
    const order = await CheckoutService.getOrder(req.params.cartId);
    res.json(order);
  } catch (error) {
    res.status(error.statusCode || 400).json({ error: error.message });
  }
});

module.exports = router;
