const SHIPPING_THRESHOLD_CENTS = 5000;
const SHIPPING_FEE_CENTS = 500;

const SHIPPING_THRESHOLD = SHIPPING_THRESHOLD_CENTS / 100;
const SHIPPING_FEE = SHIPPING_FEE_CENTS / 100;

function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

function roundToInteger(value) {
  return Math.round(Number(value.toFixed(8)));
}

function toCents(amount) {
  return roundToInteger(amount * 100);
}

function assertCoupon(coupon) {
  if (coupon == null) {
    return;
  }
  if (typeof coupon !== 'object' || Array.isArray(coupon)) {
    throw new Error('Only one coupon is allowed');
  }
  if (coupon.type !== 'percent' && coupon.type !== 'fixed') {
    throw new Error('Coupon type must be percent or fixed');
  }
  if (typeof coupon.value !== 'number' || !Number.isFinite(coupon.value) || coupon.value <= 0) {
    throw new Error('Coupon value must be greater than zero');
  }
  if (coupon.type === 'percent') {
    if (coupon.value > 1) {
      throw new Error('Percent coupon cannot exceed 1');
    }
    if (typeof coupon.minSubtotal !== 'number' || !Number.isFinite(coupon.minSubtotal) || coupon.minSubtotal < 0) {
      throw new Error('Percent coupon requires a minimum subtotal');
    }
  }
}

function discountCentsFor(subtotalCents, coupon) {
  assertCoupon(coupon);
  if (coupon == null) {
    return 0;
  }
  if (coupon.type === 'percent') {
    const minCents = toCents(coupon.minSubtotal);
    if (subtotalCents < minCents) {
      throw new Error('Coupon minimum not met');
    }
    return roundToInteger(subtotalCents * coupon.value);
  }

  const discountCents = toCents(coupon.value);
  if (discountCents > subtotalCents) {
    throw new Error('Coupon exceeds subtotal');
  }
  return discountCents;
}

function allocateDiscount(lineSubtotals, discountCents) {
  const shares = new Array(lineSubtotals.length).fill(0);
  if (discountCents === 0) {
    return shares;
  }

  const subtotalCents = lineSubtotals.reduce((sum, cents) => sum + cents, 0);
  let allocated = 0;
  for (let i = 0; i < lineSubtotals.length; i += 1) {
    if (i === lineSubtotals.length - 1) {
      shares[i] = discountCents - allocated;
    } else {
      const proportional = roundToInteger(discountCents * (lineSubtotals[i] / subtotalCents));
      const share = Math.min(proportional, discountCents - allocated);
      shares[i] = share;
      allocated += share;
    }
  }
  return shares;
}

function priceCheckout(items, coupon) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Cart is empty');
  }
  assertCoupon(coupon);

  const lines = items.map((item) => {
    if (!item || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error('Quantity must be a positive integer');
    }
    if (typeof item.unitPrice !== 'number' || !Number.isFinite(item.unitPrice) || item.unitPrice < 0) {
      throw new Error('Price must be zero or greater');
    }
    if (typeof item.taxRate !== 'number' || !Number.isFinite(item.taxRate) || item.taxRate < 0 || item.taxRate > 1) {
      throw new Error('Tax rate must be between 0 and 1');
    }

    const unitPriceCents = toCents(item.unitPrice);
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPriceCents,
      taxRate: item.taxRate,
      lineSubtotalCents: unitPriceCents * item.quantity,
    };
  });

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineSubtotalCents, 0);
  const discountCents = discountCentsFor(subtotalCents, coupon);
  const shares = allocateDiscount(lines.map((line) => line.lineSubtotalCents), discountCents);

  const pricedLines = lines.map((line, index) => {
    const lineDiscountCents = shares[index];
    const taxableCents = line.lineSubtotalCents - lineDiscountCents;
    const lineTaxCents = roundToInteger(taxableCents * line.taxRate);
    return {
      productId: line.productId,
      quantity: line.quantity,
      unitPrice: fromCents(line.unitPriceCents),
      taxRate: line.taxRate,
      lineSubtotal: fromCents(line.lineSubtotalCents),
      lineDiscount: fromCents(lineDiscountCents),
      lineTax: fromCents(lineTaxCents),
      lineSubtotalCents: line.lineSubtotalCents,
      lineDiscountCents,
      lineTaxCents,
    };
  });

  const taxCents = pricedLines.reduce((sum, line) => sum + line.lineTaxCents, 0);
  const taxableCents = subtotalCents - discountCents;
  const shippingCents = taxableCents >= SHIPPING_THRESHOLD_CENTS ? 0 : SHIPPING_FEE_CENTS;
  const totalCents = taxableCents + taxCents + shippingCents;

  return {
    subtotal: fromCents(subtotalCents),
    discount: fromCents(discountCents),
    taxable: fromCents(taxableCents),
    tax: fromCents(taxCents),
    shipping: fromCents(shippingCents),
    total: fromCents(totalCents),
    subtotalCents,
    discountCents,
    taxableCents,
    taxCents,
    shippingCents,
    totalCents,
    lines: pricedLines,
    coupon: interpretedCoupon(coupon, discountCents),
  };
}

function interpretedCoupon(coupon, discountCents) {
  if (coupon == null) {
    return null;
  }
  if (coupon.type === 'percent') {
    return {
      type: 'percent',
      value: coupon.value,
      minSubtotal: fromCents(toCents(coupon.minSubtotal)),
    };
  }
  return {
    type: 'fixed',
    value: fromCents(discountCents),
  };
}

module.exports = {
  SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  priceCheckout,
};
