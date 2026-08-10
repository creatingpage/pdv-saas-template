export function recalcular(OrderItems) {
  const itens = OrderItems || [];
  return {
    total: itens.reduce((acc, i) => acc + (i.quantidade ?? i.quantity) * (i.preco ?? i.unitPrice), 0),
    itensCount: itens.length,
  };
}

export function listarComandasMock() {
  return Array.from({ length: 100 }, (_, i) => ({
    number: i + 1,
    status: 'DISPONIVEL',
    OrderItems: [],
    total: 0,
    itensCount: 0,
  }));
}

export function obterComandaMock(number) {
  return { number, status: 'DISPONIVEL', OrderItems: [], total: 0 };
}
