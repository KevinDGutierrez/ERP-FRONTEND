/**
 * Normaliza un texto: minúsculas, sin acentos y sin espacios extra.
 */
export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

const STOP_WORDS = new Set(['y', 'de', 'del', 'la', 'el', 'los', 'las', 'en', 'por', 'para', 'con']);

/**
 * Filtra y ordena un arreglo de cuentas basado en una búsqueda inteligente.
 * @param {Array} accounts - Lista de cuentas a filtrar.
 * @param {string} searchTerm - Texto de búsqueda.
 * @returns {Array} Cuentas filtradas y ordenadas por relevancia.
 */
export const smartSearchAccounts = (accounts, searchTerm) => {
  if (!searchTerm || !searchTerm.trim()) {
    return accounts;
  }

  // Preparar término de búsqueda
  const cleanTerm = normalizeText(searchTerm).replace(/,/g, ' '); // Permitir comas como espacios
  const tokens = cleanTerm.split(/\s+/).filter(token => token.length > 0 && !STOP_WORDS.has(token));

  if (tokens.length === 0) return accounts;

  const scoredAccounts = [];

  for (const acc of accounts) {
    const accName = normalizeText(acc.name || '');
    const accCode = (acc.code || '').toLowerCase();
    
    let matchCount = 0;
    let exactMatch = false;

    // Verificar si CADA token está en el nombre o en el código
    let allTokensMatch = true;
    for (const token of tokens) {
      if (accName.includes(token) || accCode.includes(token)) {
        matchCount++;
      } else {
        allTokensMatch = false;
        break; // Si un token falla, esta cuenta no sirve
      }
    }

    if (allTokensMatch) {
      // Calcular relevancia
      let score = matchCount;

      // Bonus si el nombre exacto incluye el término completo continuo
      if (accName.includes(cleanTerm)) {
        score += 10;
        // Bonus extra si empieza exactamente con el término (ej. "Caja" sobre "Caja Chica")
        if (accName.startsWith(cleanTerm)) {
          score += 5;
        }
        // Super bonus si el término es EXACTAMENTE igual al nombre (ej "caja" -> "Caja")
        if (accName === cleanTerm) {
          score += 20;
        }
      }

      // Bonus si el código coincide exactamente o empieza con
      if (accCode === cleanTerm) {
        score += 15;
      } else if (accCode.startsWith(cleanTerm)) {
        score += 5;
      }

      scoredAccounts.push({ account: acc, score });
    }
  }

  // Ordenar por score (mayor a menor) y luego por código
  scoredAccounts.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.account.code || '').localeCompare(b.account.code || '');
  });

  return scoredAccounts.map(item => item.account);
};
