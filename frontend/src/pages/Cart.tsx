import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/stores/cartStore';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { Trash2, Plus, Minus, ShoppingBag, Truck } from 'lucide-react';

const getCartItemKey = (item: { product: { _id: string }; selectedVariant?: { color?: string; size?: string; sku?: string } }) => {
  if (!item.selectedVariant) return item.product._id;
  const { color, size, sku } = item.selectedVariant;
  return `${item.product._id}-${color || ''}-${size || ''}-${sku || ''}`;
};

const Cart: React.FC = () => {
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const { data: deliverySettings } = useQuery({
    queryKey: ['delivery-settings'],
    queryFn: async () => {
      const res = await api.get('/api/delivery-settings');
      return res.data.data as { minDeliveryFee: number; deliveryFeeRate: number; freeDeliveryThreshold: number };
    },
  });

  const subtotal = getTotalPrice();
  const deliveryFee = (() => {
    if (!deliverySettings) return 0;
    const { minDeliveryFee, deliveryFeeRate, freeDeliveryThreshold } = deliverySettings;
    if (freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold) return 0;
    return Math.max(minDeliveryFee, subtotal * deliveryFeeRate / 100);
  })();

  const { data: taxData, isLoading: taxLoading } = useQuery({
    queryKey: ['tax-estimate', items.map((i) => `${i.product._id}-${i.quantity}`).join(',')],
    queryFn: async () => {
      const res = await api.post<{
        success: boolean;
        data: { tax: number; taxDisplay: number; breakdown: { label: string; rate: number; amount: number }[] };
      }>('/api/payment/tax-estimate', {
        items: items.map((i) => ({
          product: i.product._id,
          quantity: i.quantity,
          variant: i.selectedVariant,
        })),
      });
      return res.data.data;
    },
    enabled: items.length > 0 && !!user,
    retry: false,
  });

  const tax = taxData?.tax ?? 0;             // exclusive only – added to total
  const taxDisplay = taxData?.taxDisplay ?? taxData?.tax ?? 0; // fall back to tax if taxDisplay absent
  const taxBreakdown = taxData?.breakdown ?? [];
  const taxLabel =
    taxBreakdown.length === 1
      ? `${taxBreakdown[0].label} (${taxBreakdown[0].rate}%)`
      : taxBreakdown.length > 1
      ? 'Tax'
      : 'Tax';
  const total = subtotal + deliveryFee + tax;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto text-center card">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Start shopping to add items to your cart</p>
          <Link to="/products" className="btn btn-primary inline-block">
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => {
            const itemKey = getCartItemKey(item);
            const itemPrice = item.selectedVariant?.price || item.product.price;
            const variantKey = item.selectedVariant 
              ? `${item.selectedVariant.color || ''}-${item.selectedVariant.size || ''}-${item.selectedVariant.sku || ''}`
              : undefined;
            
            return (
              <div key={itemKey} className="card flex gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {(() => {
                    const src =
                      item.selectedVariant?.image ||
                      item.product.mainImage ||
                      item.product.images?.[0];
                    return src ? (
                      <img
                        src={src}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    );
                  })()}
                </div>

                <div className="flex-1">
                  <Link to={`/products/${item.product._id}`} className="font-semibold hover:text-primary-600">
                    {item.product.name}
                  </Link>
                  {item.selectedVariant && (
                    <div className="text-sm text-gray-600 mt-1">
                      {item.selectedVariant.color && <span>Color: {item.selectedVariant.color}</span>}
                      {item.selectedVariant.color && item.selectedVariant.size && <span> • </span>}
                      {item.selectedVariant.size && <span>Size: {item.selectedVariant.size}</span>}
                    </div>
                  )}
                  <p className="text-sm text-gray-600 mt-1">
                    {item.product.vendor.businessName || item.product.vendor.fullName}
                  </p>
                  <p className="text-lg font-bold text-primary-600 mt-2">
                    {formatCurrency(itemPrice)}
                  </p>
                </div>

                <div className="flex flex-col items-end justify-between">
                  <button
                    onClick={() => removeItem(item.product._id, variantKey)}
                    className="text-red-600 hover:text-red-700"
                    title="Remove"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product._id, item.quantity - 1, variantKey)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product._id, item.quantity + 1, variantKey)}
                      disabled={item.quantity >= item.product.stock}
                      className="p-1 hover:bg-gray-100 rounded disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Clear Cart
          </button>
        </div>

        {/* Summary */}
        <div>
          <div className="card sticky top-20">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>

            {/* Free delivery banner */}
            {deliverySettings && deliverySettings.freeDeliveryThreshold > 0 && (
              <div className={`rounded-lg px-3 py-2 mb-3 text-xs flex items-center gap-2 ${
                deliveryFee === 0
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                <Truck className="w-4 h-4 shrink-0" />
                {deliveryFee === 0 ? (
                  <span>You qualify for <strong>free delivery</strong>!</span>
                ) : (
                  <span>
                    Add {formatCurrency(deliverySettings.freeDeliveryThreshold - subtotal)} more
                    for <strong>free delivery</strong>
                  </span>
                )}
              </div>
            )}
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                {deliveryFee === 0 ? (
                  <span className="font-medium text-green-600">Free</span>
                ) : (
                  <span className="font-medium">{formatCurrency(deliveryFee)}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {taxLoading ? 'Tax' : taxBreakdown.length === 1 ? `${taxBreakdown[0].label} (${taxBreakdown[0].rate}%)` : 'Tax'}
                </span>
                <span className="font-medium">
                  {!user ? (
                    <span className="text-xs text-gray-400">at checkout</span>
                  ) : taxLoading ? (
                    <span className="inline-block w-16 h-4 bg-gray-200 rounded animate-pulse" />
                  ) : taxDisplay > 0 ? (
                    formatCurrency(taxDisplay)
                  ) : (
                    <span className="text-gray-400 text-sm">None</span>
                  )}
                </span>
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="btn btn-primary w-full"
            >
              Proceed to Checkout
            </button>

            <Link
              to="/products"
              className="btn btn-secondary w-full mt-2"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
