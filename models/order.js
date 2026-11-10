const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');
const Cart = require('./cart');

const Order = sequelize.define('Order', {
  cartId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  subtotalCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  discountCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  taxableCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  taxCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  shippingCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  totalCents: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  couponType: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  couponValue: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  couponMinSubtotalCents: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

Order.belongsTo(Cart, { foreignKey: 'cartId' });
Cart.hasOne(Order, { foreignKey: 'cartId' });

module.exports = Order;
