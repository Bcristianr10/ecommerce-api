// Servicios con modelos mockeados (Jest).
//   P1 Un producto solo se crea en una categoría que existe.
//   P2 Consulta por categoría: aplica sort ("campo,DIR"), limit y offset si vienen.
//   P3 Consulta por varias categorías: el parámetro "1,2,3" es obligatorio.
// Redactado con asistencia de IA (Claude); ver el registro de IA del informe. Los it marcados con // IA: son casos propuestos por el modelo.
const { Op } = require('sequelize');

jest.mock('../../models/product', () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  destroy: jest.fn(),
  belongsTo: jest.fn()
}));

jest.mock('../../models/category', () => ({
  findAll: jest.fn(),
  findByPk: jest.fn(),
  create: jest.fn()
}));

const ProductService = require('../../services/productService');
const Product = require('../../models/product');
const Category = require('../../models/category');

describe('ProductService', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  // IA: caso propuesto por el modelo (no sale del enunciado ni de una regla explícita del README); se conserva.
  it('P1 Actualización | inválida: mover a la categoría 9999 inexistente lanza "Category with id 9999 does not exist" y no actualiza', async () => {
    Category.findByPk.mockResolvedValue(null);

    await expect(ProductService.updateProduct(1, { categoryId: 9999 }))
      .rejects.toThrow('Category with id 9999 does not exist');

    expect(Product.update).not.toHaveBeenCalled();
  });

  // IA: caso propuesto por el modelo (no sale del enunciado ni de una regla explícita del README); se conserva.
  it('P1 Actualización | válida: mover a la categoría 3 existente actualiza el producto 1 con {categoryId: 3}', async () => {
    Category.findByPk.mockResolvedValue({ id: 3 });
    Product.update.mockResolvedValue([1]);

    await ProductService.updateProduct(1, { categoryId: 3 });

    expect(Category.findByPk).toHaveBeenCalledWith(3);
    expect(Product.update).toHaveBeenCalledWith({ categoryId: 3 }, { where: { id: 1 } });
  });

  // IA: caso propuesto por el modelo (no sale del enunciado ni de una regla explícita del README); se conserva.
  it('P2 Por categoría | válida: sort "price,DESC", limit "5" y offset "10" se traducen a order [["price","DESC"]], limit 5 y offset 10', async () => {
    Product.findAll.mockResolvedValue([]);

    await ProductService.getProductsByCategory(3, { sort: 'price,DESC', limit: '5', offset: '10' });

    const query = Product.findAll.mock.calls[0][0];
    expect(query.where).toEqual({ categoryId: 3 });
    expect(query.order).toEqual([['price', 'DESC']]);
    expect(query.limit).toBe(5);
    expect(query.offset).toBe(10);
  });

  // IA: caso propuesto por el modelo (no sale del enunciado ni de una regla explícita del README); se conserva.
  it('P3 Por varias categorías | válida: "1,2,3" filtra con IN [1,2,3] y respeta sort, limit y offset', async () => {
    Product.findAll.mockResolvedValue([]);

    await ProductService.getProductsByCategories('1,2,3', { sort: 'name,ASC', limit: '2', offset: '1' });

    const query = Product.findAll.mock.calls[0][0];
    expect(query.where.categoryId[Op.in]).toEqual([1, 2, 3]);
    expect(query.order).toEqual([['name', 'ASC']]);
    expect(query.limit).toBe(2);
    expect(query.offset).toBe(1);
  });


  describe('getAllProducts', () => {
    it('devuelve todos los productos', async () => {
      const mockProducts = [{ id: 1 }, { id: 2 }];
      Product.findAll.mockResolvedValue(mockProducts);
      const result = await ProductService.getAllProducts();
      expect(Product.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
    });
  });

  describe('getProductById', () => {
    it('devuelve el producto si existe', async () => {
      const mockProduct = { id: 1, name: 'A' };
      Product.findByPk.mockResolvedValue(mockProduct);
      const result = await ProductService.getProductById(1);
      expect(Product.findByPk).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockProduct);
    });

    it('devuelve null si no existe', async () => {
      Product.findByPk.mockResolvedValue(null);
      const result = await ProductService.getProductById(9999);
      expect(result).toBeNull();
    });
  });

  describe('createProduct', () => {
    it('crea el producto cuando la categoría existe', async () => {
      Category.findByPk.mockResolvedValue({ id: 1 });
      const mockProduct = { id: 1, name: 'A', categoryId: 1 };
      Product.create.mockResolvedValue(mockProduct);

      const result = await ProductService.createProduct({ name: 'A', categoryId: 1 });

      expect(Category.findByPk).toHaveBeenCalledWith(1);
      expect(Product.create).toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('lanza error si la categoría no existe', async () => {
      Category.findByPk.mockResolvedValue(null);
      await expect(ProductService.createProduct({ name: 'A', categoryId: 9999 }))
        .rejects.toThrow('Category with id 9999 does not exist');
    });
  });

  describe('getProductsByCategory (sin opciones)', () => {
    it('devuelve productos de la categoría sin opciones', async () => {
      const mockProducts = [{ id: 1 }];
      Product.findAll.mockResolvedValue(mockProducts);

      const result = await ProductService.getProductsByCategory(1);

      expect(Product.findAll).toHaveBeenCalledWith({
        where: { categoryId: 1 },
        include: Category
      });
      expect(result).toEqual(mockProducts);
    });
  });

  describe('getProductsByCategories (errores)', () => {
    it('lanza error si no se pasan categorías', async () => {
      await expect(ProductService.getProductsByCategories(''))
        .rejects.toThrow('Categories parameter is required');
    });

    it('lanza error si categories es undefined', async () => {
      await expect(ProductService.getProductsByCategories(undefined))
        .rejects.toThrow('Categories parameter is required');
    });
  });

  describe('updateProduct (sin cambiar categoría)', () => {
    it('actualiza sin verificar categoría si no se cambia', async () => {
      Product.update.mockResolvedValue([1]);

      const result = await ProductService.updateProduct(1, { name: 'B' });

      expect(Category.findByPk).not.toHaveBeenCalled();
      expect(Product.update).toHaveBeenCalledWith({ name: 'B' }, { where: { id: 1 } });
      expect(result).toEqual([1]);
    });
  });

  describe('deleteProduct', () => {
    it('elimina el producto', async () => {
      Product.destroy.mockResolvedValue(1);

      const result = await ProductService.deleteProduct(1);

      expect(Product.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(1);
    });
  });

});
