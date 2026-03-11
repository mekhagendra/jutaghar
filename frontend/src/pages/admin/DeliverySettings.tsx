import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, Save } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DeliverySettingsData {
  minDeliveryFee: number;
  deliveryFeeRate: number;
  freeDeliveryThreshold: number;
}

const PREVIEW_AMOUNTS = [500, 1000, 2500, 5000, 10000];

const computeFee = (subtotal: number, settings: DeliverySettingsData): number => {
  const { minDeliveryFee, deliveryFeeRate, freeDeliveryThreshold } = settings;
  if (freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold) return 0;
  return Math.max(minDeliveryFee, subtotal * deliveryFeeRate / 100);
};

const AdminDeliverySettings: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<DeliverySettingsData>({
    queryKey: ['delivery-settings-admin'],
    queryFn: async () => {
      const res = await api.get('/api/delivery-settings');
      return res.data.data;
    },
  });

  const [form, setForm] = useState<DeliverySettingsData>({
    minDeliveryFee: 50,
    deliveryFeeRate: 5,
    freeDeliveryThreshold: 5000,
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: async (values: DeliverySettingsData) => {
      const res = await api.put('/api/delivery-settings', values);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-settings-admin'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-settings'] });
      toast.success('Delivery settings saved');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const handleChange = (field: keyof DeliverySettingsData, value: string) => {
    const num = parseFloat(value) || 0;
    setForm((prev) => ({ ...prev, [field]: num }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-8">
        <Truck className="w-8 h-8 text-primary-600" />
        <div>
          <h1 className="text-3xl font-bold">Delivery Settings</h1>
          <p className="text-gray-600 mt-1">Configure how delivery fees are calculated</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Settings Card */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-6">Fee Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Minimum Delivery Fee (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="input"
                value={form.minDeliveryFee}
                onChange={(e) => handleChange('minDeliveryFee', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Lowest possible delivery charge
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Delivery Fee Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                className="input"
                value={form.deliveryFeeRate}
                onChange={(e) => handleChange('deliveryFeeRate', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Percentage of order subtotal
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Free Delivery Threshold (Rs.)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="input"
                value={form.freeDeliveryThreshold}
                onChange={(e) => handleChange('freeDeliveryThreshold', e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                0 to disable free delivery
              </p>
            </div>
          </div>
        </div>

        {/* Formula explanation */}
        <div className="card bg-blue-50 border-blue-200">
          <h3 className="text-sm font-semibold text-blue-800 mb-2">How it works</h3>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>
              Fee = <strong>max(Min Fee, Subtotal × Rate%)</strong>
            </li>
            {form.freeDeliveryThreshold > 0 && (
              <li>
                Orders of{' '}
                <strong>{formatCurrency(form.freeDeliveryThreshold)} or more</strong> get
                free delivery
              </li>
            )}
          </ul>
        </div>

        {/* Live preview */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Live Preview</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-gray-500 font-medium">Order Subtotal</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Calculated Rate</th>
                  <th className="text-right py-2 text-gray-500 font-medium">Delivery Fee</th>
                </tr>
              </thead>
              <tbody>
                {PREVIEW_AMOUNTS.map((amount) => {
                  const fee = computeFee(amount, form);
                  const isFree = fee === 0;
                  return (
                    <tr key={amount} className="border-b last:border-0">
                      <td className="py-2 font-medium">{formatCurrency(amount)}</td>
                      <td className="py-2 text-right text-gray-500">
                        {isFree ? '—' : formatCurrency(amount * form.deliveryFeeRate / 100)}
                      </td>
                      <td className="py-2 text-right">
                        {isFree ? (
                          <span className="text-green-600 font-semibold">Free</span>
                        ) : (
                          <span className="font-semibold">{formatCurrency(fee)}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <button
          type="submit"
          disabled={mutation.isPending}
          className="btn btn-primary flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {mutation.isPending ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
};

export default AdminDeliverySettings;
