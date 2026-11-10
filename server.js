const { app, sequelize } = require('./app');
const PORT = process.env.PORT || 3000;

async function start() {
  // An interrupted sync({ alter: true }) leaves these scratch tables.
  // The next boot then inserts into them and hits a unique constraint on id.
  await sequelize.query('DROP TABLE IF EXISTS `Categories_backup`');
  await sequelize.query('DROP TABLE IF EXISTS `Carts_backup`');
  await sequelize.query('DROP TABLE IF EXISTS `Products_backup`');
  await sequelize.query('DROP TABLE IF EXISTS `CartItems_backup`');
  await sequelize.query('DROP TABLE IF EXISTS `Orders_backup`');
  await sequelize.query('DROP TABLE IF EXISTS `OrderLines_backup`');

  // Create missing tables only. alter rebuilds SQLite tables that have a
  // UNIQUE column, and that rebuild fails on the next start.
  await sequelize.sync();

  const [cartColumns] = await sequelize.query('PRAGMA table_info(`Carts`)');
  const hasStatus = cartColumns.some((column) => column.name === 'status');
  if (!hasStatus) {
    await sequelize.query(
      "ALTER TABLE `Carts` ADD `status` VARCHAR(255) NOT NULL DEFAULT 'open'"
    );
  }

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Database synced successfully');
  });
}

start().catch((error) => {
  console.error('Unable to sync database:', error);
});
