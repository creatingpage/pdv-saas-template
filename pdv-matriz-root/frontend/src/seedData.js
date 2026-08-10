export const PRODUTOS_SEED = [
  { id: 'p1', name: 'Coca-Cola Lata 350ml', category: 'Bebidas', price: 6.0, precoVenda: 6.0, precoCusto: 2.5, estoque: 48, active: true },
  { id: 'p2', name: 'Suco de Laranja Natural 500ml', category: 'Bebidas', price: 8.0, precoVenda: 8.0, precoCusto: 3.0, estoque: 24, active: true },
  { id: 'p3', name: 'Água Mineral 500ml', category: 'Bebidas', price: 3.0, precoVenda: 3.0, precoCusto: 1.2, estoque: 60, active: true },
  { id: 'p4', name: 'Cerveja Long Neck', category: 'Bebidas', price: 9.0, precoVenda: 9.0, precoCusto: 3.5, estoque: 5, active: true },
  { id: 'p5', name: 'Hambúrguer Artesanal', category: 'Lanches', price: 22.0, precoVenda: 22.0, precoCusto: 8.0, estoque: 12, active: true },
  { id: 'p6', name: 'X-Burger Simples', category: 'Lanches', price: 15.0, precoVenda: 15.0, precoCusto: 5.0, estoque: 8, active: true },
  { id: 'p7', name: 'Sanduíche Natural', category: 'Lanches', price: 16.0, precoVenda: 16.0, precoCusto: 6.0, estoque: 0, active: true },
  { id: 'p8', name: 'Picanha com Fritas', category: 'Pratos', price: 49.0, precoVenda: 49.0, precoCusto: 22.0, estoque: 6, active: true },
  { id: 'p9', name: 'Filé de Frango Grelhado', category: 'Pratos', price: 34.0, precoVenda: 34.0, precoCusto: 14.0, estoque: 10, active: true },
  { id: 'p10', name: 'Macarrão ao Alho e Óleo', category: 'Pratos', price: 24.0, precoVenda: 24.0, precoCusto: 8.5, estoque: 15, active: true },
  { id: 'p11', name: 'Pudim de Leite', category: 'Sobremesas', price: 12.0, precoVenda: 12.0, precoCusto: 4.0, estoque: 9, active: true },
  { id: 'p12', name: 'Brigadeiro Gourmet', category: 'Sobremesas', price: 6.0, precoVenda: 6.0, precoCusto: 2.0, estoque: 20, active: true },
];

export const CATEGORIAS_SISTEMA = ['Bebidas', 'Lanches', 'Pratos', 'Sobremesas'];

function item(produto, quantidade) {
  return {
    id: `seed-${produto.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    productId: produto.id,
    nome: produto.name,
    quantity: quantidade,
    unitPrice: produto.precoVenda,
    unitCost: produto.precoCusto,
    product: { name: produto.name },
  };
}

function fecharComanda(numero, itens, status = 'ABERTA') {
  const total = itens.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  return { number: numero, status, OrderItems: itens, total, itensCount: itens.length };
}

function comandasLivres() {
  return Array.from({ length: 100 }, (_, i) => ({
    number: i + 1,
    status: 'DISPONIVEL',
    OrderItems: [],
    total: 0,
    itensCount: 0,
  }));
}

export function gerarComandasSeed() {
  const mesas = comandasLivres();
  const p = (id) => PRODUTOS_SEED.find(x => x.id === id);

  const ocupadas = [
    fecharComanda(1, [item(p('p5'), 2), item(p('p1'), 2)], 'ABERTA'),
    fecharComanda(2, [item(p('p8'), 1), item(p('p2'), 1)], 'ABERTA'),
    fecharComanda(3, [item(p('p4'), 3), item(p('p6'), 1)], 'AGUARDANDO_PAGAMENTO'),
    fecharComanda(4, [item(p('p9'), 1), item(p('p11'), 1), item(p('p3'), 1)], 'ABERTA'),
  ];

  ocupadas.forEach(m => { mesas[m.number - 1] = m; });
  return mesas;
}

function diasAtras(dias, hora, minuto) {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  d.setHours(hora, minuto, 0, 0);
  return d.toISOString();
}

export function gerarVendasSeed() {
  const p = (id) => PRODUTOS_SEED.find(x => x.id === id);

  function venda(id, orderNumber, dias, hora, minuto, paymentMethod, itensRaw) {
    const itens = itensRaw.map(([pid, qty]) => {
      const prod = p(pid);
      return { productId: pid, nome: prod.name, quantity: qty, unitPrice: prod.precoVenda, unitCost: prod.precoCusto };
    });
    const total = itens.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const totalCost = itens.reduce((s, i) => s + i.quantity * i.unitCost, 0);
    return { id, orderNumber, paymentMethod, closedAt: diasAtras(dias, hora, minuto), items: itens, total, totalCost, lucro: total - totalCost };
  }

  return [
    venda('v1', 15, 5, 20, 10, 'PIX', [['p8', 1], ['p4', 2]]),
    venda('v2', 16, 5, 19, 45, 'CARTAO', [['p5', 2], ['p1', 3]]),
    venda('v3', 17, 4, 21, 5, 'DINHEIRO', [['p9', 1], ['p11', 2], ['p2', 2]]),
    venda('v4', 18, 4, 12, 30, 'PIX', [['p7', 2], ['p3', 2]]),
    venda('v5', 19, 3, 20, 50, 'CARTAO', [['p6', 3], ['p4', 4]]),
    venda('v6', 20, 3, 13, 15, 'PIX', [['p5', 1], ['p1', 1], ['p12', 2]]),
    venda('v7', 21, 2, 19, 20, 'CARTAO', [['p8', 2], ['p10', 1], ['p2', 3]]),
    venda('v8', 22, 2, 22, 0, 'DINHEIRO', [['p4', 3], ['p6', 1]]),
    venda('v9', 23, 1, 20, 35, 'PIX', [['p9', 1], ['p11', 1], ['p1', 2]]),
    venda('v10', 24, 1, 14, 10, 'CARTAO', [['p7', 1], ['p12', 3], ['p2', 1]]),
    venda('v11', 25, 0, 12, 0, 'PIX', [['p5', 2], ['p1', 2]]),
    venda('v12', 26, 0, 9, 30, 'DINHEIRO', [['p10', 1], ['p3', 2]]),
  ];
}
