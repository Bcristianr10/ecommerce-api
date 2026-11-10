const { sequelize } = require('./index');
const { DataTypes } = require('sequelize');
const Cart = require('./cart');
const Product = require('./product');

const CartItem = sequelize.define('CartItem', {
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
});

CartItem.belongsTo(Cart, { foreignKey: 'cartId' });
CartItem.belongsTo(Product, { foreignKey: 'productId' });

module.exports = CartItem;
