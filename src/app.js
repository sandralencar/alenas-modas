const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const storeRoutes = require('./routes/storeRoutes');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", 'https://viacep.com.br'],
      upgradeInsecureRequests: isProduction ? [] : null
    }
  }
}));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: isProduction ? '1d' : 0,
  etag: true
}));

app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/', storeRoutes);
app.use((req, res) => {
  res.status(404).render('errors/error', {
    pageTitle: 'Página não encontrada',
    message: 'Não encontramos essa página.'
  });
});
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  console.error('Erro na aplicação:', error);
  res.status(500).render('errors/error', {
    pageTitle: 'Algo não saiu como esperado',
    message: 'Ocorreu um erro interno. Tente novamente em instantes.'
  });
});

module.exports = app;
