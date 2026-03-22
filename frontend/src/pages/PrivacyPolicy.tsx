import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Privacy Policy</h1>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Your privacy is important to us. Here's how we handle your data.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-3xl">
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Information We Collect</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We collect personal information you voluntarily provide when you register, place an order, or contact us. This includes your name, email address, phone number, delivery address, and payment details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">How We Use Your Information</h2>
            <ul className="text-gray-600 space-y-2 text-sm list-disc pl-5">
              <li>To process and deliver your orders.</li>
              <li>To communicate with you about your account and orders.</li>
              <li>To improve our platform and customer experience.</li>
              <li>To send promotional offers (you can opt out anytime).</li>
              <li>To prevent fraud and ensure platform security.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Data Protection</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We implement industry-standard security measures to protect your personal information. Payment processing is handled by trusted third-party providers (eSewa, Khalti), and we do not store your payment credentials on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Cookies</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We use cookies to enhance your browsing experience, remember your preferences, and analyze site traffic. You can manage cookie preferences through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Third-Party Sharing</h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              We do not sell your personal information. We share data only with delivery partners, payment processors, and vendors as necessary to fulfill your orders. All third parties are bound by data protection agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Your Rights</h2>
            <ul className="text-gray-600 space-y-2 text-sm list-disc pl-5">
              <li>Access, update, or delete your personal data from your profile.</li>
              <li>Opt out of marketing communications at any time.</li>
              <li>Request a copy of the data we hold about you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">Contact Us</h2>
            <p className="text-gray-600 text-sm">
              If you have questions about this Privacy Policy, please visit our <a href="/contact" className="text-primary-600 hover:underline">Contact</a> page.
            </p>
          </section>

          <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
            Last updated: March 2026
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
