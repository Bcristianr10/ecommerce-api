const Cart = require('../models/cart');
const CartItem = require('../models/cartItem');
const Product = require('../models/product');

class CartService {
  static async createCart(userId) {
    return await Cart.create({ userId });
  }

  static async addItemToCart(cartId, productId, quantity) {
    const product = await Product.findByPk(productId);
    if (!product) {
      throw new Error('Product not found');
    }
    
    if (product.inventory < quantity) {
      throw new Error('Not enough inventory available');
    }

    // Check if item already exists in cart
    const existingItem = await CartItem.findOne({
      where: { cartId, productId }
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (product.inventory < newQuantity) {
        throw new Error('Not enough inventory available');
      }
      existingItem.quantity = newQuantity;
      await existingItem.save();
      return existingItem;
    }

    return await CartItem.create({ cartId, productId, quantity });
  }

  static async getCartItems(cartId) {
    if (isNaN(cartId)) {
      throw new Error('Cart ID should be a number');
    }

    const cart = await Cart.findByPk(cartId)
    if (!cart) {
      return null;
    }

    const items = await CartItem.findAll({
      where: { cartId },
      include: Product,
    });

    let subtotal = 0;
    let totalTax = 0;

    const itemsWithTotals = items.map(item => {
      const itemSubtotal = item.quantity * item.Product.price;
      const itemTax = itemSubtotal * item.Product.taxRate;
      
      subtotal += itemSubtotal;
      totalTax += itemTax;

      return {
        ...item.toJSON(),
        itemSubtotal,
        itemTax
      };
    });

    return {
      items: itemsWithTotals,
      summary: {
        subtotal,
        totalTax,
        total: subtotal + totalTax
      }
    };
  }

  static async updateCartItem(itemId, quantity) {
    const cartItem = await CartItem.findByPk(itemId, {
      include: Product
    });
    
    if (!cartItem) {
      throw new Error('Item not found');
    }

    if (cartItem.Product.inventory < quantity) {
      throw new Error('Not enough inventory available');
    }

    cartItem.quantity = quantity;
    await cartItem.save();
    return cartItem;
  }

  static async removeCartItem(itemId) {
    const cartItem = await CartItem.findByPk(itemId);
    if (!cartItem) {
      throw new Error('Item not found');
    }
    await cartItem.destroy();
  }
}

module.exports = CartService;
