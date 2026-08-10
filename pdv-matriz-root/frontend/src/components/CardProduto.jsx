export default function CardProduto({ produto, onAdd }) {
  const estoque = produto.estoque ?? 0;
  const esgotado = estoque <= 0;
  return (
    <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 truncate">{produto.name}</h3>
        <p className="text-xs text-slate-500">{produto.category}</p>
        <p className="text-sm font-bold text-green-700 mt-0.5">
          R$ {Number(produto.price ?? produto.precoVenda).toFixed(2)}
        </p>
        <p className={`text-[10px] font-bold mt-0.5 ${esgotado ? 'text-red-600' : estoque <= 5 ? 'text-amber-600' : 'text-slate-400'}`}>
          {esgotado ? 'Esgotado' : `${estoque} em estoque`}
        </p>
      </div>
      <button
        onClick={() => onAdd?.(produto)}
        disabled={esgotado}
        className="ml-2 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed select-none"
      >
        {esgotado ? 'Esgotado' : 'Adicionar'}
      </button>
    </div>
  );
}
