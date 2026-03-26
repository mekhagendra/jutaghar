import React from 'react';
import { ShoppingBag, Users, Truck, Shield } from 'lucide-react';

const AboutUs: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">About JutaGhar</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Nepal's leading e-commerce platform for footwear — connecting outlets and customers.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 space-y-16">
        {/* Mission */}
        <section className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
          <p className="text-gray-600 leading-relaxed">
            JutaGhar aims to revolutionize the footwear industry in Nepal by providing a seamless platform where outlets can connect directly with customers. We believe everyone deserves access to quality footwear at fair prices.
          </p>
        </section>

        {/* Values */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">Why Choose Us</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: ShoppingBag, title: 'Wide Selection', desc: 'Thousands of shoes from trusted brands and local outlets.' },
              { icon: Users, title: 'Multi-Vendor', desc: 'Shop from multiple outlets all in one place.' },
              { icon: Truck, title: 'Fast Delivery', desc: 'Reliable shipping across Nepal with real-time order tracking.' },
              { icon: Shield, title: 'Secure Shopping', desc: 'Safe payments through eSewa, Khalti, and cash on delivery.' },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-xl p-6 shadow-sm text-center">
                <div className="w-14 h-14 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-primary-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="bg-white rounded-xl p-8 shadow-sm text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Get in Touch</h2>
          <p className="text-gray-600 mb-6">Have questions or want to partner with us? We'd love to hear from you.</p>
          <a
            href="/contact"
            className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-700 transition"
          >
            Contact Us
          </a>
        </section>
      </div>
    </div>
  );
};

export default AboutUs;
