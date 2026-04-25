import React from 'react';
import { RotateCcw, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const ReturnPolicy: React.FC = () => {
  return (
    <div className="bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Return Policy</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            We want you to be completely satisfied with your purchase.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {[
            { icon: Clock, label: '7-Day Returns', desc: 'Return within 7 days of delivery' },
            { icon: RotateCcw, label: 'Easy Process', desc: 'Simple return & refund steps' },
            { icon: CheckCircle, label: 'Quality Check', desc: 'Items must be unused & in original packaging' },
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
            <h2 className="text-xl font-bold text-gray-900 mb-3">Return Eligibility</h2>
            <ul className="text-gray-600 space-y-2 text-sm list-disc pl-5">
              <li>Items must be returned within 7 days of delivery.</li>
              <li>Products must be unused, unworn, and in their original packaging.</li>
              <li>All tags and labels must be attached.</li>
              <li>Items purchased on sale or marked as final sale are not eligible for return.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">How to Return</h2>
            <ol className="text-gray-600 space-y-2 text-sm list-decimal pl-5">
              <li>Go to your <a href="/orders" className="text-primary-600 hover:underline">Orders</a> page and select the order you want to return.</li>
              <li>Click "Request Return" and select the items and reason.</li>
              <li>Pack the item securely in its original packaging.</li>
              <li>Our delivery partner will pick up the item from your address.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Refund Process</h2>
            <p className="text-gray-600 text-sm">
              Once we receive and inspect your returned item, your refund will be processed within 5–7 business days. Refunds will be credited back to your original payment method (eSewa, Khalti, or bank transfer).
            </p>
          </section>

          <section className="flex items-start gap-3 bg-amber-50 p-4 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Items that are damaged due to customer misuse, washed, or altered will not be eligible for return. For defective products, please <a href="/contact" className="text-primary-600 hover:underline">contact us</a> within 24 hours of delivery.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ReturnPolicy;
