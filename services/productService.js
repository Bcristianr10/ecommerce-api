const Product = require('../models/product');
const Category = require('../models/category');
const { Op } = require('sequelize');

class ProductService {
    static async getAllProducts() {
        return await Product.findAll();
    }

    static async getProductById(id) {
        return await Product.findByPk(id);
    }

    static async createProduct(product) {
        // Check if category exists
        const category = await Category.findByPk(product.categoryId);
        if (!category) {
            throw new Error(`Category with id ${product.categoryId} does not exist`);
        }
        
        return await Product.create(product);
    }

    static async updateProduct(id, product) {
        // If categoryId is being updated, check if new category exists
        if (product.categoryId) {
            const category = await Category.findByPk(product.categoryId);
            if (!category) {
                throw new Error(`Category with id ${product.categoryId} does not exist`);
            }
        }

        return await Product.update(product, { where: { id } });
    }

    static async deleteProduct(id) {
        return await Product.destroy({ where: { id } });
    }

    static async getProductsByCategory(categoryId, options = {}) {
        const { sort, limit, offset } = options;
        
        const queryOptions = {
            where: { categoryId },
            include: Category,
        };

        // Add sorting if specified
        if (sort) {
            queryOptions.order = [sort.split(',')];  // e.g. "price,DESC"
        }

        // Add pagination if specified
        if (limit) {
            queryOptions.limit = parseInt(limit);
        }
        if (offset) {
            queryOptions.offset = parseInt(offset);
        }

        return await Product.findAll(queryOptions);
    }

    static async getProductsByCategories(categoryIdsStr, options = {}) {
        // Get categories from query parameter: ?categories=1,2,3
        const categoryIds = categoryIdsStr
        ? categoryIdsStr.split(',').map(id => parseInt(id))
        : [];

        if (!categoryIds.length) {
            throw new Error('Categories parameter is required');
        }

        const { sort, limit, offset } = options;
        
        const queryOptions = {
            where: {
                categoryId: {
                    [Op.in]: Array.isArray(categoryIds) ? categoryIds : [categoryIds]
                }
            },
            include: Category,
        };

        // Add sorting if specified
        if (sort) {
            queryOptions.order = [sort.split(',')];
        }

        // Add pagination if specified
        if (limit) {
            queryOptions.limit = parseInt(limit);
        }
        if (offset) {
            queryOptions.offset = parseInt(offset);
        }

        return await Product.findAll(queryOptions);
    }
}

module.exports = ProductService;