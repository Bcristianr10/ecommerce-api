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
});
