import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Package, Truck, CheckCircle, Clock, XCircle, X } from 'lucide-react';
import api from '@/lib/api';

interface TrackResult {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  trackingNumber?: string;
  itemCount: number;
  shippingCity?: string;
  shippingCountry?: string;
}

const trackStatusSteps = [
  { key: 'pending', label: 'Placed', icon: Clock },
  { key: 'processing', label: 'Processing', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle },
] as const;
const trackStatusOrder = ['pending', 'processing', 'shipped', 'delivered'] as const;

const Topbar: React.FC = () => {
  const [trackModalOpen, setTrackModalOpen] = useState(false);
  const [trackInput, setTrackInput] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackResult, setTrackResult] = useState<TrackResult | null>(null);
  const [trackError, setTrackError] = useState('');
  const trackInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (trackModalOpen) {
      setTimeout(() => trackInputRef.current?.focus(), 50);
    } else {
      setTrackInput('');
      setTrackResult(null);
      setTrackError('');
    }
  }, [trackModalOpen]);

  const handleTrackOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = trackInput.trim();
    if (!num) return;
    setTrackLoading(true);
    setTrackResult(null);
    setTrackError('');
    try {
      const res = await api.get(`/api/orders/track/${encodeURIComponent(num)}`);
      setTrackResult(res.data.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setTrackError(e.response?.data?.message || 'Order not found. Please check the order number.');
    } finally {
      setTrackLoading(false);
    }
  };

  return (
    <>
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-600 text-white text-sm">
        <div className="container mx-auto px-4 py-2 flex justify-between items-center">
          <div className="hidden md:block">
            <span>Free Shipping on Orders Over Rs. 5000</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <button
              onClick={() => setTrackModalOpen(true)}
              className="hover:text-primary-400 transition-colors"
            >
              Track Order
            </button>
            <Link to="/contact" className="hover:text-primary-400 transition-colors">
              Help
            </Link>
          </div>
        </div>
      </div>

      {/* Track Order Modal */}
      {trackModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setTrackModalOpen(false); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">Track Your Order</h2>
              <button
                onClick={() => setTrackModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              <form onSubmit={handleTrackOrder} className="flex gap-2">
                <input
                  ref={trackInputRef}
                  type="text"
                  value={trackInput}
                  onChange={(e) => setTrackInput(e.target.value)}
                  placeholder="Enter order number (e.g. JG2026...)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={trackLoading}
                />
                <button
                  type="submit"
                  disabled={trackLoading || !trackInput.trim()}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {trackLoading ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Track
                </button>
              </form>

              {/* Error */}
              {trackError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  {trackError}
                </div>
              )}

              {/* Result */}
              {trackResult && (
                <div className="mt-5 space-y-4">
                  {/* Status tracker */}
                  {!['cancelled', 'refunded'].includes(trackResult.status) ? (
                    <div className="relative flex items-start justify-between">
                      <div className="absolute top-4 left-4 right-4 h-0.5 bg-gray-200" aria-hidden />
                      <div
                        className="absolute top-4 left-4 h-0.5 bg-primary-600 transition-all duration-500"
                        style={{
                          width: (() => {
                            const idx = trackStatusOrder.indexOf(trackResult.status as typeof trackStatusOrder[number]);
                            return idx <= 0 ? '0%' : `${(idx / (trackStatusSteps.length - 1)) * 100}%`;
                          })(),
                        }}
                        aria-hidden
                      />
                      {trackStatusSteps.map((step, index) => {
                        const Icon = step.icon;
                        const activeIdx = trackStatusOrder.indexOf(trackResult.status as typeof trackStatusOrder[number]);
                        const isDone = index < activeIdx;
                        const isActive = index === activeIdx;
                        return (
                          <div key={step.key} className="relative flex flex-col items-center gap-1.5 z-10">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                              isDone ? 'bg-primary-600 border-primary-600 text-white'
                              : isActive ? 'bg-white border-primary-600 text-primary-600'
                              : 'bg-white border-gray-300 text-gray-400'
                            }`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={`text-[10px] font-medium text-center max-w-[52px] ${
                              isDone || isActive ? 'text-primary-700' : 'text-gray-400'
                            }`}>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <XCircle className="w-4 h-4 shrink-0" />
                      This order has been <span className="font-semibold capitalize">{trackResult.status}</span>.
                    </div>
                  )}

                  {/* Details */}
                  <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Order #</span>
                      <span className="font-semibold">{trackResult.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className="font-medium capitalize">{trackResult.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Payment</span>
                      <span className="font-medium capitalize">{trackResult.paymentStatus}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Items</span>
                      <span className="font-medium">{trackResult.itemCount}</span>
                    </div>
                    {(trackResult.shippingCity || trackResult.shippingCountry) && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Ship to</span>
                        <span className="font-medium">{[trackResult.shippingCity, trackResult.shippingCountry].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    {trackResult.trackingNumber && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tracking #</span>
                        <span className="font-mono font-semibold">{trackResult.trackingNumber}</span>
                      </div>
                    )}
                    {trackResult.shippedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Shipped</span>
                        <span>{new Date(trackResult.shippedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {trackResult.deliveredAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Delivered</span>
                        <span>{new Date(trackResult.deliveredAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Topbar;
