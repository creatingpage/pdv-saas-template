const { Router } = require('express');
const authController = require('./controllers/authController');
const comandaController = require('./controllers/comandaController');
const pedidoController = require('./controllers/pedidoController');
const produtoController = require('./controllers/produtoController');
const vendaController = require('./controllers/vendaController');
const autenticar = require('./middlewares/autenticar');

const routes = Router();

routes.post('/api/auth/login', authController.login);
routes.get('/api/auth/me', autenticar(['GARCOM', 'CAIXA', 'ADMIN']), authController.me);

routes.get('/api/produtos', autenticar(['GARCOM', 'CAIXA', 'ADMIN']), produtoController.listarProdutos);
routes.post('/api/produtos', autenticar(['ADMIN']), produtoController.criarProduto);
routes.put('/api/produtos/:id', autenticar(['ADMIN']), produtoController.atualizarProduto);

routes.post('/api/comandas/inicializar', autenticar(['ADMIN']), comandaController.inicializarComandas);
routes.get('/api/comandas', autenticar(['GARCOM', 'CAIXA', 'ADMIN']), comandaController.listarComandas);
routes.get('/api/comandas/:number', autenticar(['GARCOM', 'CAIXA', 'ADMIN']), comandaController.obterComanda);
routes.put('/api/comandas/:number/status', autenticar(['CAIXA', 'ADMIN']), comandaController.atualizarStatus);

routes.post('/api/comandas/:number/itens', autenticar(['GARCOM', 'ADMIN']), pedidoController.adicionarItem);

routes.post('/api/vendas/fechar', autenticar(['CAIXA', 'ADMIN']), vendaController.fecharComanda);
routes.get('/api/vendas/relatorio-diario', autenticar(['ADMIN']), vendaController.relatorioDiario);

module.exports = routes;
