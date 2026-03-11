import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';

const EsewaFailure: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="card text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
          <h1 className="text-2xl font-bold mb-2 text-red-600">Payment Cancelled</h1>
          <p className="text-gray-600 mb-6">
            Your payment was cancelled or failed. No charges were made to your account.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/checkout')}
              className="btn btn-primary w-full"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/cart')}
              className="btn btn-secondary w-full"
            >
              Back to Cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EsewaFailure;
