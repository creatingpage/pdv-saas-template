const prisma = require('../config/database');

module.exports = {
  async listarProdutos(req, res) {
    try {
      const produtos = await prisma.product.findMany({
        where: { active: true },
        orderBy: { name: 'asc' }
      });
      return res.json(produtos);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar produtos' });
    }
  },

  async criarProduto(req, res) {
    try {
      const { name, price, category } = req.body;

      if (!name || price === undefined || !category) {
        return res.status(400).json({ error: 'name, price e category são obrigatórios' });
      }

      const produto = await prisma.product.create({
        data: { name, price: parseFloat(price), category }
      });

      return res.status(201).json(produto);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao criar produto' });
    }
  },

  async atualizarProduto(req, res) {
    try {
      const { id } = req.params;
      const { name, price, category, active } = req.body;

      const existing = await prisma.product.findUnique({ where: { id } });
      if (!existing) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      const produto = await prisma.product.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(price !== undefined && { price: parseFloat(price) }),
          ...(category !== undefined && { category }),
          ...(active !== undefined && { active: Boolean(active) })
        }
      });

      return res.json(produto);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar produto' });
    }
  }
};
