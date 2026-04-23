const salePopulateOptions = [
  { path: 'product', select: 'name category price' },
  { path: 'items.product', select: 'name category price' },
];

function getSaleLineItems(sale) {
  if (Array.isArray(sale?.items) && sale.items.length > 0) {
    return sale.items.map((item) => ({
      product: item.product,
      quantity: Number(item.quantity) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      totalPrice: Number(item.totalPrice) || 0,
    }));
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

function getSaleTotalQuantity(sale) {
  return getSaleLineItems(sale).reduce((sum, item) => sum + item.quantity, 0);
}

function getSaleTargetName(sale) {
  const items = getSaleLineItems(sale);
  if (!items.length) return 'Sale';

  const firstName = items[0]?.product?.name || 'Product';
  if (items.length === 1) return firstName;

  return `${firstName} +${items.length - 1} more`;
}

module.exports = {
  salePopulateOptions,
  getSaleLineItems,
  getSaleTotalQuantity,
  getSaleTargetName,
};
