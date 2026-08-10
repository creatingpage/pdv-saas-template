const prisma = require('../config/database');

module.exports = {
  async fecharComanda(req, res) {
    try {
      const { orderNumber, paymentMethod } = req.body;

      if (!orderNumber || !paymentMethod) {
        return res.status(400).json({ error: 'orderNumber e paymentMethod são obrigatórios' });
      }

      if (!['DINHEIRO', 'PIX', 'CARTAO'].includes(paymentMethod)) {
        return res.status(400).json({ error: 'paymentMethod deve ser DINHEIRO, PIX ou CARTAO' });
      }

      await prisma.$transaction(async (tx) => {
        const comanda = await tx.order.findUnique({
          where: { number: orderNumber },
          include: {
            OrderItems: {
              include: { product: { select: { name: true } } }
            }
          }
        });

        if (!comanda) {
          throw new Error('Comanda não encontrada');
        }

        if (comanda.OrderItems.length === 0) {
          throw new Error('Comanda vazia');
        }

        if (comanda.status !== 'AGUARDANDO_PAGAMENTO' && comanda.status !== 'ABERTA') {
          throw new Error('Comanda não está em status de fechamento');
        }

        const totalAmount = comanda.OrderItems.reduce(
          (acc, item) => acc + (item.quantity * item.unitPrice), 0
        );

        await tx.sale.create({
          data: {
            orderNumber: comanda.number,
            totalAmount,
            paymentMethod,
            SaleItems: {
              create: comanda.OrderItems.map(item => ({
                productName: item.product.name,
                quantity: item.quantity,
                unitPrice: item.unitPrice
              }))
            }
          }
        });

        await tx.orderItem.deleteMany({ where: { orderNumber: comanda.number } });
        await tx.order.update({
          where: { number: comanda.number },
          data: { status: 'DISPONIVEL' }
        });
      });

      return res.json({ message: 'Conta fechada com sucesso' });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  },

  async relatorioDiario(req, res) {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      const amanha = new Date(hoje);
      amanha.setDate(amanha.getDate() + 1);

      const vendas = await prisma.sale.findMany({
        where: {
          closedAt: { gte: hoje, lt: amanha }
        }
      });

      const agrupado = vendas.reduce((acc, venda) => {
        const metodo = venda.paymentMethod.toLowerCase();
        acc[`total${metodo.charAt(0).toUpperCase() + metodo.slice(1)}`] =
          (acc[`total${metodo.charAt(0).toUpperCase() + metodo.slice(1)}`] || 0) + venda.totalAmount;
        return acc;
      }, { totalPix: 0, totalCartao: 0, totalDinheiro: 0 });

      const faturamentoTotal = Object.values(agrupado).reduce((acc, val) => acc + val, 0);

      return res.json({
        data: hoje.toISOString().split('T')[0],
        ...agrupado,
        faturamentoTotal,
        totalVendas: vendas.length
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao gerar relatório diário' });
    }
  }
};
