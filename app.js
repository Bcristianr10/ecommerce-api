const express = require('express');
const { sequelize } = require('./models');
const bodyParser = require('body-parser');
const cartRouter = require('./routes/cart');
const categoriesRouter = require('./routes/categories');
const productsRouter = require('./routes/products');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use('/cart', cartRouter);
app.use('/categories', categoriesRouter);
app.use('/products', productsRouter);

// Remove the immediate invocation and export both app and sequelize
module.exports = { app, sequelize };