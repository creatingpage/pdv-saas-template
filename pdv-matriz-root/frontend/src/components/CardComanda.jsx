const statusConfig = {
  DISPONIVEL: {
    border: 'border-emerald-200',
    bg: 'bg-emerald-50',
    badge: 'bg-emerald-500 text-white',
    label: 'Livre',
  },
  ABERTA: {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    badge: 'bg-blue-600 text-white',
    label: 'Aberta',
  },
  AGUARDANDO_PAGAMENTO: {
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    badge: 'bg-amber-600 text-white',
    label: 'Em Caixa',
  },
};

export default function CardComanda({ comanda, onClick, destacado = false, compacto = false }) {
  const cfg = statusConfig[comanda.status] || statusConfig.DISPONIVEL;

  return (
    <div
      onClick={() => onClick?.(comanda)}
      className={`
        relative rounded-xl border-2 cursor-pointer select-none
        transition-all duration-200 ease-out clickable
        hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97]
        ${cfg.border} ${cfg.bg}
        ${destacado ? 'ring-2 ring-amber-400 shadow-lg scale-[1.02]' : 'shadow-sm'}
        ${compacto ? 'p-2.5' : 'p-3.5'}
      `}
    >
      {destacado && (
        <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
      )}

      <div className="flex flex-col items-center gap-1">
        <span className={`font-bold tracking-tight text-slate-800 ${compacto ? 'text-lg' : 'text-2xl'}`}>
          #{comanda.number}
        </span>

        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${cfg.badge}`}>
          {cfg.label}
        </span>

        {comanda.status !== 'DISPONIVEL' && comanda.itensCount > 0 && (
          <>
            <span className={`font-bold text-slate-800 ${compacto ? 'text-xs' : 'text-sm'}`}>
              R$ {(comanda.total ?? 0).toFixed(2)}
            </span>
            <span className="text-[10px] text-slate-400">
              {comanda.itensCount} {comanda.itensCount === 1 ? 'item' : 'itens'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
