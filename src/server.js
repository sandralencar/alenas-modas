require('dotenv').config();

const port = Number(process.env.PORT || 3000);
const app = require('./app');

const server = app.listen(port, () => {
  console.log(`Alenas Lingerie disponível em http://localhost:${port}`);
});

const shutdown = () => {
  server.close((error) => {
    if (error) {
      console.error('Não foi possível encerrar o servidor corretamente:', error);
      process.exitCode = 1;
    }
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
