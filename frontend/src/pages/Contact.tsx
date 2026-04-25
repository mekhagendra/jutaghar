import React from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

const Contact: React.FC = () => {
  return (
    <div className="bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Contact Us</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            We're here to help. Reach out to us anytime.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Get in Touch</h2>
            <p className="text-gray-600 text-sm">
              Have a question about your order, a product, or our platform? Our support team is ready to assist you.
            </p>

            <div className="space-y-4">
              {[
                { icon: Mail, label: 'Email', value: 'support@jutaghar.com' },
                { icon: Phone, label: 'Phone', value: '+977-9851095925' },
                { icon: MapPin, label: 'Address', value: 'Mahalaxmi 01 Imadole, Lalitpur' },
                { icon: Clock, label: 'Hours', value: 'Sun–Fri, 10:00 AM – 6:00 PM' },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4 bg-white rounded-lg p-4 shadow-sm">
                  <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 text-sm">{item.label}</h3>
                    <p className="text-gray-600 text-sm">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FAQ-like info */}
          <div className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Common Questions</h2>
            <div className="space-y-5">
              {[
                { q: 'How do I track my order?', a: 'Use the "Track Order" button in the navigation bar and enter your order number.' },
                { q: 'How do I return a product?', a: 'Visit your Orders page, select the order, and click "Request Return". Check our Return Policy for details.' },
                { q: 'What payment methods do you accept?', a: 'We accept eSewa, Khalti, and Cash on Delivery.' },
                { q: 'How long does delivery take?', a: 'Delivery within Kathmandu Valley takes 1–3 days. Outside the valley, it takes 3–7 days.' },
                { q: 'Can I become a vendor?', a: 'Yes! Register an account and submit a vendor request from your Profile page.' },
              ].map((item) => (
                <div key={item.q}>
                  <h3 className="font-medium text-gray-900 text-sm">{item.q}</h3>
                  <p className="text-gray-600 text-sm mt-1">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
