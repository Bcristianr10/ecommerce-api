// Servicios con modelos mockeados (Jest). Reglas: sección "Reglas" del README.
//   R1 Alta de ítem: quantity es un entero > 0 que no supera el inventario.
//   R6 Actualización: la cantidad nueva no supera el inventario.
// HALLAZGO: marca una prueba que falla porque el código contradice la regla. No se reescribe el oráculo.
// Redactado con asistencia de IA (Claude); ver el registro de IA del informe.

jest.mock('../../models/cart', () => ({
  create: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock('../../models/cartItem', () => ({
  findOne: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  findByPk: jest.fn()
}));

jest.mock('../../models/product', () => ({
  findByPk: jest.fn()
}));

const CartService = require('../../services/cartService');
const Cart = require('../../models/cart');
const CartItem = require('../../models/cartItem');
const Product = require('../../models/product');

describe('CartService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // HALLAZGO: addItemToCart no valida que quantity sea > 0; 0 pasa y crea una línea.
  it('R1 Alta de ítem | inválida: cantidad 0 con producto 1 (inventario 10) lanza "Quantity must be a positive integer" y no crea la línea', async () => {
    Product.findByPk.mockResolvedValue({ id: 1, inventory: 10, price: 100 });
    CartItem.findOne.mockResolvedValue(null);

    await expect(CartService.addItemToCart(1, 1, 0)).rejects.toThrow('Quantity must be a positive integer');

    expect(CartItem.create).not.toHaveBeenCalled();
  });

  it('R6 Actualización | límite (inválida): nueva cantidad 11 con inventario 10 lanza "Not enough inventory available" y la cantidad sigue en 1', async () => {
    const item = { quantity: 1, Product: { inventory: 10 }, save: jest.fn() };
    CartItem.findByPk.mockResolvedValue(item);

    await expect(CartService.updateCartItem(1, 11)).rejects.toThrow('Not enough inventory available');

    expect(item.quantity).toBe(1);
    expect(item.save).not.toHaveBeenCalled();
  });

  describe('createCart', () => {
    it('crea un carrito y lo devuelve', async () => {
      const mockCart = { id: 1, userId: 1 };
      Cart.create.mockResolvedValue(mockCart);

      const result = await CartService.createCart(1);

      expect(Cart.create).toHaveBeenCalledWith({ userId: 1 });
      expect(result).toEqual(mockCart);
    });
  });

  describe('addItemToCart (ramas restantes)', () => {
    const mockProduct = { id: 1, inventory: 10, price: 100 };

    it('agrega un item nuevo cuando el producto existe y hay inventario', async () => {
      Product.findByPk.mockResolvedValue(mockProduct);
      CartItem.findOne.mockResolvedValue(null);
      const mockItem = { cartId: 1, productId: 1, quantity: 2 };
      CartItem.create.mockResolvedValue(mockItem);

      const result = await CartService.addItemToCart(1, 1, 2);

      expect(Product.findByPk).toHaveBeenCalledWith(1);
      expect(CartItem.create).toHaveBeenCalledWith({ cartId: 1, productId: 1, quantity: 2 });
      expect(result).toEqual(mockItem);
    });

    it('suma cantidad cuando el item ya existe en el carrito', async () => {
      Product.findByPk.mockResolvedValue(mockProduct);
      const existingItem = { cartId: 1, productId: 1, quantity: 3, save: jest.fn() };
      CartItem.findOne.mockResolvedValue(existingItem);

      const result = await CartService.addItemToCart(1, 1, 2);

      expect(existingItem.quantity).toBe(5);
      expect(existingItem.save).toHaveBeenCalled();
      expect(result).toBe(existingItem);
    });

    it('lanza error si el producto no existe', async () => {
      Product.findByPk.mockResolvedValue(null);
      await expect(CartService.addItemToCart(1, 9999, 1)).rejects.toThrow('Product not found');
    });

    it('lanza error si el inventario es insuficiente', async () => {
      Product.findByPk.mockResolvedValue(mockProduct);
      await expect(CartService.addItemToCart(1, 1, 9999)).rejects.toThrow('Not enough inventory available');
    });

    it('lanza error si la suma con item existente supera el inventario', async () => {
      Product.findByPk.mockResolvedValue(mockProduct);
      const existingItem = { quantity: 8, save: jest.fn() };
      CartItem.findOne.mockResolvedValue(existingItem);
      await expect(CartService.addItemToCart(1, 1, 5)).rejects.toThrow('Not enough inventory available');
    });
  });

  describe('getCartItems', () => {
    it('lanza error si cartId no es numérico', async () => {
      await expect(CartService.getCartItems('abc')).rejects.toThrow('Cart ID should be a number');
    });

    it('devuelve null si el carrito no existe', async () => {
      Cart.findByPk.mockResolvedValue(null);
      const result = await CartService.getCartItems(9999);
      expect(result).toBeNull();
    });

    it('devuelve items con subtotal, impuesto y total calculados', async () => {
      Cart.findByPk.mockResolvedValue({ id: 1 });
      const items = [
        { quantity: 2, Product: { price: 100, taxRate: 0.1 }, toJSON: () => ({ quantity: 2 }) }
      ];
      CartItem.findAll.mockResolvedValue(items);

      const result = await CartService.getCartItems(1);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].itemSubtotal).toBe(200);
      expect(result.items[0].itemTax).toBeCloseTo(20);
      expect(result.summary.subtotal).toBe(200);
      expect(result.summary.totalTax).toBeCloseTo(20);
      expect(result.summary.total).toBeCloseTo(220);
    });
  });

  describe('updateCartItem (ramas restantes)', () => {
    it('actualiza la cantidad cuando hay inventario', async () => {
      const item = { quantity: 2, Product: { inventory: 10 }, save: jest.fn() };
      CartItem.findByPk.mockResolvedValue(item);

      const result = await CartService.updateCartItem(1, 5);

      expect(item.quantity).toBe(5);
      expect(item.save).toHaveBeenCalled();
      expect(result).toBe(item);
    });

    it('lanza error si el item no existe', async () => {
      CartItem.findByPk.mockResolvedValue(null);
      await expect(CartService.updateCartItem(9999, 1)).rejects.toThrow('Item not found');
    });
  });

  describe('removeCartItem', () => {
    it('elimina el item cuando existe', async () => {
      const item = { destroy: jest.fn() };
      CartItem.findByPk.mockResolvedValue(item);

      await CartService.removeCartItem(1);

      expect(item.destroy).toHaveBeenCalled();
    });

    it('lanza error si el item no existe', async () => {
      CartItem.findByPk.mockResolvedValue(null);
      await expect(CartService.removeCartItem(9999)).rejects.toThrow('Item not found');
    });
  });
});