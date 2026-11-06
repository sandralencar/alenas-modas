(function initializeStorePricing(root) {
  const sizeBands = {
    standard: { label: 'P, M e G', single: 4000, pair: 7490, trio: 9990 },
    extended: { label: 'G1 a G4', single: 5000, pair: 9990, trio: 13490 }
  };
  const piecesPerProductType = { unidade: 1, dupla: 2, trio: 3 };

  function getSizeBand(size) {
    if (['P', 'M', 'G'].includes(size)) return 'standard';
    if (['G1', 'G2', 'G3', 'G4'].includes(size)) return 'extended';
    throw new Error(`Faixa de tamanho inválida: ${size}.`);
  }

  function priceForQuantity(quantity, band) {
    if (!Number.isSafeInteger(quantity) || quantity < 0) {
      throw new Error('A quantidade de sutiãs deve ser um inteiro não negativo.');
    }

    const prices = sizeBands[band];
    if (!prices) throw new Error(`Faixa de tamanho inválida: ${band}.`);

    const trios = Math.floor(quantity / 3);
    const remainder = quantity % 3;
    const pairs = remainder === 2 ? 1 : 0;
    const singles = remainder === 1 ? 1 : 0;

    return {
      total: trios * prices.trio + pairs * prices.pair + singles * prices.single,
      band,
      quantity,
      label: prices.label,
      trios,
      pairs,
      singles
    };
  }

  function calculateCart(items) {
    const counts = { standard: 0, extended: 0 };

    for (const item of items) {
      const band = getSizeBand(item.size);
      const piecesPerProduct = piecesPerProductType[item.type];
      if (!piecesPerProduct) throw new Error(`Tipo de produto inválido: ${item.type}.`);
      if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
        throw new Error('A quantidade do produto deve ser um inteiro positivo.');
      }

      counts[band] += item.quantity * piecesPerProduct;
    }

    const groups = Object.entries(counts)
      .filter(([, quantity]) => quantity > 0)
      .map(([band, quantity]) => priceForQuantity(quantity, band));

    return {
      groups,
      total: groups.reduce((sum, group) => sum + group.total, 0)
    };
  }

  const api = { calculateCart, getSizeBand, priceForQuantity };
  root.StorePricing = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
