const prisma = require('../config/database');

module.exports = {
  async inicializarComandas(req, res) {
    try {
      const numbers = Array.from({ length: 100 }, (_, i) => i + 1);
      const existing = await prisma.order.findMany({
        where: { number: { in: numbers } },
        select: { number: true }
      });
      const existingSet = new Set(existing.map(o => o.number));
      const toCreate = numbers.filter(n => !existingSet.has(n)).map(n => ({ number: n }));

      if (toCreate.length > 0) {
        await prisma.order.createMany({ data: toCreate });
      }

      const total = await prisma.order.count();
      return res.json({ message: 'Comandas inicializadas com sucesso', total });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao inicializar comandas' });
    }
  },

  async listarComandas(req, res) {
    try {
      const comandas = await prisma.order.findMany({
        orderBy: { number: 'asc' },
        include: {
          OrderItems: {
            select: { quantity: true, unitPrice: true }
          }
        }
      });

      const resultado = comandas.map(c => ({
        number: c.number,
        status: c.status,
        total: c.OrderItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0),
        itensCount: c.OrderItems.length
      }));

      return res.json(resultado);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao listar comandas' });
    }
  },

  async obterComanda(req, res) {
    try {
      const { number } = req.params;
      const comanda = await prisma.order.findUnique({
        where: { number: parseInt(number) },
        include: {
          OrderItems: {
            include: { product: true }
          }
        }
      });

      if (!comanda) {
        return res.status(404).json({ error: 'Comanda não encontrada' });
      }

      return res.json({
        ...comanda,
        total: comanda.OrderItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0)
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao obter comanda' });
    }
  },

  async atualizarStatus(req, res) {
    try {
      const { number } = req.params;
      const { status } = req.body;

      if (!status || !['ABERTA', 'AGUARDANDO_PAGAMENTO'].includes(status)) {
        return res.status(400).json({ error: 'Status inválido. Use ABERTA ou AGUARDANDO_PAGAMENTO' });
      }

      const comanda = await prisma.order.findUnique({ where: { number: parseInt(number) } });
      if (!comanda) {
        return res.status(404).json({ error: 'Comanda não encontrada' });
      }
      if (comanda.status === 'DISPONIVEL' && status !== 'ABERTA') {
        return res.status(400).json({ error: 'Comanda não está aberta. Use ABERTA para abrir.' });
      }
      if (comanda.status === 'AGUARDANDO_PAGAMENTO') {
        return res.status(400).json({ error: 'Comanda em conferência no caixa' });
      }

      const atualizada = await prisma.order.update({
        where: { number: parseInt(number) },
        data: { status }
      });

      return res.json(atualizada);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao atualizar status da comanda' });
    }
  }
};
