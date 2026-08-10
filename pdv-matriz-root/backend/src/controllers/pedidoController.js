const prisma = require('../config/database');

module.exports = {
  async adicionarItem(req, res) {
    try {
      const { number } = req.params;
      const { productId, quantity } = req.body;

      if (!productId || !quantity) {
        return res.status(400).json({ error: 'productId e quantity são obrigatórios' });
      }

      const orderNumber = parseInt(number);

      const comanda = await prisma.order.findUnique({ where: { number: orderNumber } });
      if (!comanda) {
        return res.status(404).json({ error: 'Comanda não encontrada' });
      }

      if (comanda.status === 'AGUARDANDO_PAGAMENTO') {
        return res.status(400).json({ error: 'Comanda em conferência no caixa. Bloqueada para novos pedidos' });
      }

      const product = await prisma.product.findUnique({ where: { id: productId } });
      if (!product) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }
      if (!product.active) {
        return res.status(400).json({ error: 'Produto inativo não pode ser vendido' });
      }

      await prisma.orderItem.create({
        data: {
          orderNumber,
          productId: product.id,
          quantity: parseInt(quantity),
          unitPrice: product.price
        }
      });

      if (comanda.status === 'DISPONIVEL') {
        await prisma.order.update({
          where: { number: orderNumber },
          data: { status: 'ABERTA' }
        });
      }

      return res.json({ message: 'Item adicionado com sucesso' });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao adicionar item' });
    }
  }
};
