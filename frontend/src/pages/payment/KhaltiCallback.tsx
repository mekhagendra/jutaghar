import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import api from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';

const KhaltiCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCartStore();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your payment...');
  const [orderDetails, setOrderDetails] = useState<{ orderId: string; orderNumber: string } | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const pidx = searchParams.get('pidx');
        const purchase_order_id = searchParams.get('purchase_order_id');
        const transaction_id = searchParams.get('transaction_id');
        const amount = searchParams.get('amount');
        const status = searchParams.get('status');

        if (!pidx || !purchase_order_id || status !== 'Completed') {
          setStatus('error');
          setMessage('Invalid payment response or payment not completed');
          return;
        }

        const response = await api.post('/api/payment/khalti/verify', {
          pidx,
          purchase_order_id,
          transaction_id,
          amount: parseInt(amount || '0')
        });
        
        if (response.data.success) {
          setStatus('success');
          setMessage('Payment successful! Your order has been confirmed.');
          setOrderDetails(response.data.data);
          clearCart();
          
          // Redirect to orders page after 3 seconds
          setTimeout(() => {
            navigate('/user/dashboard');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Payment verification failed');
        }
      } catch (error: unknown) {
        const err = error as { response?: { data?: { message?: string } } };
        setStatus('error');
        setMessage(err.response?.data?.message || 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [searchParams, navigate, clearCart]);

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="card text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-16 h-16 mx-auto mb-4 text-primary-600 animate-spin" />
              <h1 className="text-2xl font-bold mb-2">Verifying Payment</h1>
              <p className="text-gray-600">{message}</p>
            </>
          )}
          
          {status === 'success' && (
            <>
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-600" />
              <h1 className="text-2xl font-bold mb-2 text-green-600">Payment Successful!</h1>
              <p className="text-gray-600 mb-4">{message}</p>
              {orderDetails && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Order Number:</strong> {orderDetails.orderNumber}
                  </p>
                </div>
              )}
              <p className="text-sm text-gray-500">Redirecting to your orders...</p>
            </>
          )}
          
          {status === 'error' && (
            <>
              <XCircle className="w-16 h-16 mx-auto mb-4 text-red-600" />
              <h1 className="text-2xl font-bold mb-2 text-red-600">Payment Failed</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <button
                onClick={() => navigate('/checkout')}
                className="btn btn-primary"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default KhaltiCallback;
