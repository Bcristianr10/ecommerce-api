const { Sequelize } = require('sequelize');

if(process.env.NODE_ENV === 'test') {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false
  });

  module.exports = { sequelize };
} else {
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './db.sqlite',
  });

  module.exports = { sequelize };
}
