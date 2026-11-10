const { DataTypes } = require('sequelize');
const { sequelize } = require('./index');

const Category = sequelize.define('Category', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
});

module.exports = Category;