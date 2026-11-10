const { sequelize } = require('../models');
const Cart = require('../models/cart');
const CartItem = require('../models/cartItem');
const Product = require('../models/product');
const Order = require('../models/order');
const OrderLine = require('../models/orderLine');
const { priceCheckout } = require('./pricing');

function fail(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function fromCents(cents) {
  return Number((cents / 100).toFixed(2));
}

function serializeLine(line) {
  return {
    productId: line.productId,
    quantity: line.quantity,
    unitPrice: fromCents(line.unitPriceCents),
    taxRate: line.taxRate,
    lineSubtotal: fromCents(line.lineSubtotalCents),
    lineDiscount: fromCents(line.lineDiscountCents),
    lineTax: fromCents(line.lineTaxCents),
  };
}

function serializeOrder(order) {
  const coupon = order.couponType
    ? {
      type: order.couponType,
      value: order.couponValue,
      ...(order.couponMinSubtotalCents == null
        ? {}
        : { minSubtotal: fromCents(order.couponMinSubtotalCents) }),
    }
    : null;

  return {
    id: order.id,
    cartId: order.cartId,
    subtotal: fromCents(order.subtotalCents),
    discount: fromCents(order.discountCents),
    taxable: fromCents(order.taxableCents),
    tax: fromCents(order.taxCents),
    shipping: fromCents(order.shippingCents),
    total: fromCents(order.totalCents),
    coupon,
    lines: (order.lines || []).map(serializeLine),
  };
}

function assertCartId(cartId) {
  if (isNaN(cartId)) {
    throw fail('Cart ID should be a number', 400);
  }
}

class CheckoutService {
  static async checkout(cartId, coupon) {
    assertCartId(cartId);

    const order = await sequelize.transaction(async (transaction) => {
      const cart = await Cart.findByPk(cartId, { transaction });
      if (!cart) {
        throw fail("Cart doesn't exist", 404);
      }
      if (cart.status === 'checked_out') {
        throw fail('Cart already checked out', 400);
      }

      const items = await CartItem.findAll({
        where: { cartId: cart.id },
        include: Product,
        transaction,
      });
      if (items.length === 0) {
        throw fail('Cart is empty', 400);
      }

      const priced = priceCheckout(items.map((item) => {
        if (!item.Product) {
          throw fail('Product not found', 400);
        }
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.Product.price,
          taxRate: item.Product.taxRate,
        };
      }), coupon);

      for (const item of items) {
        const product = await Product.findByPk(item.productId, { transaction });
        if (!product || product.inventory < item.quantity) {
          throw fail('Not enough inventory available', 400);
        }
        product.inventory -= item.quantity;
        await product.save({ transaction });
      }

      const created = await Order.create({
        cartId: cart.id,
        subtotalCents: priced.subtotalCents,
        discountCents: priced.discountCents,
        taxableCents: priced.taxableCents,
        taxCents: priced.taxCents,
        shippingCents: priced.shippingCents,
        totalCents: priced.totalCents,
        couponType: priced.coupon ? priced.coupon.type : null,
        couponValue: priced.coupon ? priced.coupon.value : null,
        couponMinSubtotalCents: priced.coupon && priced.coupon.minSubtotal != null
          ? Math.round(priced.coupon.minSubtotal * 100)
          : null,
      }, { transaction });

      for (const line of priced.lines) {
        await OrderLine.create({
          orderId: created.id,
          productId: line.productId,
          quantity: line.quantity,
          unitPriceCents: Math.round(line.unitPrice * 100),
          taxRate: line.taxRate,
          lineSubtotalCents: line.lineSubtotalCents,
          lineDiscountCents: line.lineDiscountCents,
          lineTaxCents: line.lineTaxCents,
        }, { transaction });
      }

      cart.status = 'checked_out';
      await cart.save({ transaction });

      return Order.findByPk(created.id, {
        include: [{ model: OrderLine, as: 'lines' }],
        order: [[{ model: OrderLine, as: 'lines' }, 'id', 'ASC']],
        transaction,
      });
    });

    return serializeOrder(order);
  }

  static async getOrder(cartId) {
    assertCartId(cartId);

    const cart = await Cart.findByPk(cartId);
    if (!cart) {
      throw fail("Cart doesn't exist", 404);
    }

    const order = await Order.findOne({
      where: { cartId: cart.id },
      include: [{ model: OrderLine, as: 'lines' }],
      order: [[{ model: OrderLine, as: 'lines' }, 'id', 'ASC']],
    });
    if (!order) {
      throw fail('Order not found', 404);
    }

    return serializeOrder(order);
  }
}

module.exports = CheckoutService;
