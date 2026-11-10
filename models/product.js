const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');
const Category = require('./category');

const Product = sequelize.define('Product', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  inventory: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  taxRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      max: 1  // Represents tax rate as decimal (e.g., 0.1 for 10%)
    }
  }
});

Product.belongsTo(Category, { foreignKey: 'categoryId' });

module.exports = Product;