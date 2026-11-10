const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');
const Order = require('./order');
const Product = require('./product');

const OrderLine = sequelize.define('OrderLine', {
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  unitPriceCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  taxRate: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  lineSubtotalCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  lineDiscountCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  lineTaxCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

Order.hasMany(OrderLine, { foreignKey: 'orderId', as: 'lines' });
OrderLine.belongsTo(Order, { foreignKey: 'orderId' });
OrderLine.belongsTo(Product, { foreignKey: 'productId' });

module.exports = OrderLine;
