// Payment Gateway Integration utilities

export interface EsewaPaymentData {
  amount: string;
  tax_amount: string;
  total_amount: string;
  transaction_uuid: string;
  product_code: string;
  product_service_charge: string;
  product_delivery_charge: string;
  success_url: string;
  failure_url: string;
  signed_field_names: string;
  signature: string;
}

export interface KhaltiPaymentData {
  return_url: string;
  website_url: string;
  amount: number;
  purchase_order_id: string;
  purchase_order_name: string;
}

export const initiateEsewaPayment = async (orderData: {
  amount: number;
  orderId: string;
  taxAmount: number;
  serviceCharge: number;
  deliveryCharge: number;
}): Promise<void> => {
  const { amount, orderId, taxAmount, serviceCharge, deliveryCharge } = orderData;
  const totalAmount = amount + taxAmount + serviceCharge + deliveryCharge;
  const productCode = import.meta.env.VITE_ESEWA_MERCHANT_CODE || 'EPAYTEST';

  try {
    // Get signature from backend
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const signatureResponse = await fetch(`${apiUrl}/api/payment/esewa/signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify({
        transaction_uuid: orderId,
        total_amount: totalAmount.toFixed(2),
        product_code: productCode,
      }),
    });

    if (!signatureResponse.ok) {
      throw new Error('Failed to generate payment signature');
    }

    const signatureData = await signatureResponse.json();

    const paymentData = {
      amount: amount.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      total_amount: totalAmount.toFixed(2),
      transaction_uuid: orderId,
      product_code: productCode,
      product_service_charge: serviceCharge.toFixed(2),
      product_delivery_charge: deliveryCharge.toFixed(2),
      success_url: `${window.location.origin}/payment/esewa/success`,
      failure_url: `${window.location.origin}/payment/esewa/failure`,
      signed_field_names: signatureData.data.signed_field_names,
      signature: signatureData.data.signature,
    };

    // Create form and submit
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://rc-epay.esewa.com.np/api/epay/main/v2/form';

    Object.entries(paymentData).forEach(([key, value]) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  } catch (error) {
    console.error('eSewa payment error:', error);
    throw error;
  }
};

export const initiateKhaltiPayment = async (orderData: {
  amount: number;
  orderId: string;
  orderName: string;
}): Promise<void> => {
  const { amount, orderId, orderName } = orderData;

  const paymentData = {
    return_url: `${window.location.origin}/payment/khalti/callback`,
    website_url: window.location.origin,
    amount: Math.round(amount * 100), // Khalti accepts amount in paisa (1 rupee = 100 paisa)
    purchase_order_id: orderId,
    purchase_order_name: orderName,
  };

  try {
    // Route through backend to avoid CORS and keep keys secure
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/payment/khalti/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
      body: JSON.stringify(paymentData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to initiate Khalti payment');
    }

    const data = await response.json();
    
    if (data.payment_url) {
      // Redirect to Khalti payment page
      window.location.href = data.payment_url;
    } else {
      throw new Error('Failed to initiate Khalti payment');
    }
  } catch (error) {
    console.error('Khalti payment error:', error);
    throw error;
  }
};
