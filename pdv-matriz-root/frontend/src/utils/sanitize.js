function sanitizarString(valor) {
  if (typeof valor !== 'string') return '';
  return valor
    .trim()
    .replace(/<[^>]*>/g, '')
    .replace(/[<>"'`]/g, '')
    .slice(0, 200);
}

function sanitizarEmail(valor) {
  return sanitizarString(valor).toLowerCase();
}

function sanitizarNumero(valor, min = 0, max = Infinity) {
  const num = parseFloat(valor);
  if (isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

function sanitizarInteiro(valor, min = 0, max = 999999) {
  const num = parseInt(valor, 10);
  if (isNaN(num)) return min;
  return Math.min(Math.max(num, min), max);
}

export { sanitizarString, sanitizarEmail, sanitizarNumero, sanitizarInteiro };
