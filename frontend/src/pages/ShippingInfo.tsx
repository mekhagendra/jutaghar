import React from 'react';
import { Truck, MapPin, Clock, Package } from 'lucide-react';

const ShippingInfo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Shipping Information</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Everything you need to know about how we deliver your orders.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Truck, label: 'Inside Valley', desc: '1–3 business days' },
            { icon: MapPin, label: 'Outside Valley', desc: '3–7 business days' },
            { icon: Package, label: 'Order Tracking', desc: 'Real-time updates' },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl p-5 shadow-sm text-center">
              <item.icon className="w-8 h-8 text-primary-600 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">{item.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Delivery Coverage</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We deliver across Nepal. Delivery times and charges may vary depending on your location. Orders within Kathmandu Valley are typically delivered within 1–3 business days. For locations outside the valley, delivery takes 3–7 business days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Shipping Time</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-700">Location</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Delivery Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 text-gray-600">Kathmandu Valley</td>
                    <td className="px-4 py-3 text-gray-600">1–3 days</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-gray-600">Outside Valley</td>
                    <td className="px-4 py-3 text-gray-600">3–7 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Order Tracking</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              Once your order is shipped, you'll receive a notification with tracking details. You can track your order anytime using the "Track Order" button in the navigation bar, or visit your <a href="/orders" className="text-primary-600 hover:underline">Orders</a> page for full details.
            </p>
          </section>

          <section>
            <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Orders placed before 2:00 PM are typically processed the same day. Orders placed after 2:00 PM or on holidays will be processed the next business day.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ShippingInfo;
