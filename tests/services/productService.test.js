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
});
