import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useCartStore } from '@/stores/cartStore';
import { formatCurrency } from '@/lib/utils';
import api from '@/lib/api';
import { initiateEsewaPayment, initiateKhaltiPayment } from '@/lib/paymentGateway';
import { CheckCircle, Truck } from 'lucide-react';

const checkoutSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  zipCode: z.string().min(5),
  country: z.string().min(2),
  paymentMethod: z.enum(['esewa', 'khalti', 'cash_on_delivery']),
  notes: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

const Checkout: React.FC = () => {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      paymentMethod: 'cash_on_delivery',
    },
  });

  const { data: deliverySettings } = useQuery({
    queryKey: ['delivery-settings'],
    queryFn: async () => {
      const res = await api.get('/api/delivery-settings');
      return res.data.data as { minDeliveryFee: number; deliveryFeeRate: number; freeDeliveryThreshold: number };
    },
  });

  // Dynamic tax from vendor settings
  const { data: taxData } = useQuery({
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
    enabled: items.length > 0,
  });

  const subtotal = getTotalPrice();
  const shipping = (() => {
    if (!deliverySettings) return 0;
    const { minDeliveryFee, deliveryFeeRate, freeDeliveryThreshold } = deliverySettings;
    if (freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold) return 0;
    return Math.max(minDeliveryFee, subtotal * deliveryFeeRate / 100);
  })();
  const tax = taxData?.tax ?? 0;             // exclusive add-on – added to total
  const taxDisplay = taxData?.taxDisplay ?? taxData?.tax ?? 0; // fall back to tax if taxDisplay absent
  const taxBreakdown = taxData?.breakdown ?? [];
  const taxLabel =
    taxBreakdown.length === 1
      ? `${taxBreakdown[0].label} (${taxBreakdown[0].rate}%)`
      : taxBreakdown.length > 1
      ? 'Tax'
      : 'Tax';
  const total = subtotal + shipping + tax;

  const onSubmit = async (data: CheckoutForm) => {
    try {
      setLoading(true);
      setError('');

      const orderData = {
        items: items.map((item) => ({
          product: item.product._id,
          quantity: item.quantity,
          variant: item.selectedVariant ? {
            color: item.selectedVariant.color,
            size: item.selectedVariant.size,
            sku: item.selectedVariant.sku
          } : undefined
        })),
        paymentMethod: data.paymentMethod,
        shippingAddress: {
          fullName: data.fullName,
          phone: data.phone,
          address: data.address,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country,
        },
        notes: data.notes,
      };

      // Initiate order (creates pending order)
      const response = await api.post('/api/payment/initiate', orderData);
      const { paymentData } = response.data.data;
      
      // Handle payment based on method
      if (data.paymentMethod === 'esewa') {
        // Redirect to eSewa
        await initiateEsewaPayment({
          amount: paymentData.amount,
          orderId: paymentData.orderId,
          taxAmount: paymentData.taxAmount,
          serviceCharge: 0,
          deliveryCharge: paymentData.shippingCost
        });
      } else if (data.paymentMethod === 'khalti') {
        // Redirect to Khalti
        await initiateKhaltiPayment({
          amount: paymentData.total,
          orderId: paymentData.orderId,
          orderName: `Order ${paymentData.orderNumber}`
        });
      } else {
        // Cash on delivery - order already created, just redirect
        clearCart();
        navigate('/user/dashboard');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to place order');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Shipping Address */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name</label>
                  <input {...register('fullName')} className="input" />
                  {errors.fullName && (
                    <p className="text-red-600 text-sm mt-1">{errors.fullName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <input {...register('phone')} className="input" />
                  {errors.phone && (
                    <p className="text-red-600 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-2">Address</label>
                  <input {...register('address')} className="input" />
                  {errors.address && (
                    <p className="text-red-600 text-sm mt-1">{errors.address.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">City</label>
                  <input {...register('city')} className="input" />
                  {errors.city && (
                    <p className="text-red-600 text-sm mt-1">{errors.city.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">State</label>
                  <input {...register('state')} className="input" />
                  {errors.state && (
                    <p className="text-red-600 text-sm mt-1">{errors.state.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">ZIP Code</label>
                  <input {...register('zipCode')} className="input" />
                  {errors.zipCode && (
                    <p className="text-red-600 text-sm mt-1">{errors.zipCode.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Country</label>
                  <input {...register('country')} className="input" defaultValue="Nepal" />
                  {errors.country && (
                    <p className="text-red-600 text-sm mt-1">{errors.country.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="card">
              <h2 className="text-xl font-bold mb-4">Payment Method</h2>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input {...register('paymentMethod')} type="radio" value="cash_on_delivery" className="mr-3" />
                  <span>Cash on Delivery</span>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input {...register('paymentMethod')} type="radio" value="esewa" className="mr-3" />
                  <span>eSewa</span>
                </label>
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input {...register('paymentMethod')} type="radio" value="khalti" className="mr-3" />
                  <span>Khalti</span>
                </label>
              </div>
            </div>

            {/* Order Notes */}
            <div className="card">
              <label className="block text-sm font-medium mb-2">Order Notes (Optional)</label>
              <textarea {...register('notes')} className="input" rows={3} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full flex items-center justify-center"
            >
              {loading ? 'Placing Order...' : 'Place Order'}
              {!loading && <CheckCircle className="ml-2 w-5 h-5" />}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div>
          <div className="card sticky top-20">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-4">
              {items.map((item) => (
                <div key={item.product._id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product.name} × {item.quantity}
                  </span>
                  <span className="font-medium">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Free delivery progress banner */}
            {deliverySettings && deliverySettings.freeDeliveryThreshold > 0 && (
              <div className={`rounded-lg px-3 py-2 mb-3 text-xs flex items-center gap-2 ${
                shipping === 0
                  ? 'bg-green-50 text-green-700'
                  : 'bg-amber-50 text-amber-700'
              }`}>
                <Truck className="w-4 h-4 shrink-0" />
                {shipping === 0 ? (
                  <span>You qualify for <strong>free delivery</strong>!</span>
                ) : (
                  <span>
                    Add {formatCurrency(deliverySettings.freeDeliveryThreshold - subtotal)} more
                    for <strong>free delivery</strong>
                  </span>
                )}
              </div>
            )}

            <div className="border-t pt-4 space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                {shipping === 0 ? (
                  <span className="font-medium text-green-600">Free</span>
                ) : (
                  <span className="font-medium">{formatCurrency(shipping)}</span>
                )}
              </div>
              {taxDisplay > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{taxLabel}</span>
                  <span className="font-medium">{formatCurrency(taxDisplay)}</span>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary-600">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
