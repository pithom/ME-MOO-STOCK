export function getSaleItems(sale) {
  if (Array.isArray(sale?.items) && sale.items.length > 0) {
    return sale.items.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;

      return {
        product: item.product || null,
        quantity,
        unitPrice,
        totalPrice: Number.isFinite(Number(item.totalPrice))
          ? Number(item.totalPrice)
          : quantity * unitPrice,
      };
    });
  }

  if (sale?.product) {
    return [{
      product: sale.product,
      quantity: Number(sale.quantity) || 0,
      unitPrice: Number(sale.unitPrice) || 0,
      totalPrice: Number(sale.totalPrice) || 0,
    }];
  }

  return [];
}

export function getSaleQuantity(sale) {
  return getSaleItems(sale).reduce((sum, item) => sum + item.quantity, 0);
}

export function getSaleProductLabel(sale) {
  const items = getSaleItems(sale);
  if (!items.length) return '-';

  const firstName = items[0]?.product?.name || 'Product';
  if (items.length === 1) return firstName;

  return `${firstName} +${items.length - 1} more`;
}

export function getSaleProductDetails(sale) {
  return getSaleItems(sale)
    .map((item) => `${item.product?.name || 'Product'} x${item.quantity}`)
    .join(', ');
}

export function getSaleSearchText(sale) {
  return [
    sale?.customerName || '',
    sale?.customerPhone || '',
    getSaleProductDetails(sale),
  ].join(' ').toLowerCase();
}
