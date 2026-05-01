import nodemailer from 'nodemailer';

let transporter;

function getFromAddress() {
  const configured = process.env.SMTP_FROM?.trim();
  if (!configured) return process.env.SMTP_USER || 'no-reply@jutaghar.local';
  if (configured.includes('<') && !configured.includes('>')) {
    return process.env.SMTP_USER || 'no-reply@jutaghar.local';
  }
  return configured;
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT || 587) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  return transporter;
}

function assertSmtpConfigured() {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP is not configured. Set SMTP_USER and SMTP_PASSWORD.');
  }
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `Rs ${amount.toFixed(2)}`;
}

function renderItemsTable(items = []) {
  const rows = items
    .map((item) => {
      const name = item?.product?.name || 'Product';
      const qty = Number(item?.quantity || 0);
      const price = Number(item?.price || 0);
      const total = qty * price;
      const variant = [item?.variant?.color, item?.variant?.size].filter(Boolean).join(' / ');
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee;">${name}${variant ? `<br/><span style="color:#666;font-size:12px;">${variant}</span>` : ''}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${qty}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(price)}</td>
          <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${formatCurrency(total)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table style="width:100%;border-collapse:collapse;margin-top:16px;">
      <thead>
        <tr>
          <th style="padding:8px;border-bottom:2px solid #ddd;text-align:left;">Item</th>
          <th style="padding:8px;border-bottom:2px solid #ddd;text-align:center;">Qty</th>
          <th style="padding:8px;border-bottom:2px solid #ddd;text-align:right;">Price</th>
          <th style="padding:8px;border-bottom:2px solid #ddd;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAddress(address = {}) {
  return [
    address.fullName,
    address.phone,
    address.streetAddress || address.street || address.address,
    [address.city, address.state].filter(Boolean).join(', '),
    address.zipCode,
    address.country,
  ]
    .filter(Boolean)
    .map((line) => `<div>${line}</div>`)
    .join('');
}

export async function sendOrderPlacedEmail({ to, order }) {
  assertSmtpConfigured();

  const subject = `Order Confirmed - #${order.orderNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
      <h2 style="margin-bottom:8px;">Your order has been placed</h2>
      <p style="margin-top:0;color:#555;">Thank you for shopping with JutaGhar. We received your order and will keep you updated.</p>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Payment Method:</strong> ${(order.paymentMethod || '').replace(/_/g, ' ')}</p>
      ${renderItemsTable(order.items || [])}
      <div style="margin-top:16px;">
        <div><strong>Subtotal:</strong> ${formatCurrency(order.subtotal)}</div>
        <div><strong>Tax:</strong> ${formatCurrency(order.tax)}</div>
        <div><strong>Shipping:</strong> ${formatCurrency(order.shippingCost)}</div>
        <div style="font-size:18px;margin-top:8px;"><strong>Total: ${formatCurrency(order.total)}</strong></div>
      </div>
      <div style="margin-top:16px;">
        <strong>Shipping Address</strong>
        <div style="margin-top:6px;color:#444;">${renderAddress(order.shippingAddress || {})}</div>
      </div>
      <p style="margin-top:20px;color:#777;font-size:12px;">If you did not place this order, contact support immediately.</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
  });
}

export async function sendOrderCancelledEmail({ to, order }) {
  assertSmtpConfigured();

  const subject = `Order Cancelled - #${order.orderNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;">
      <h2 style="margin-bottom:8px;">Your order has been cancelled</h2>
      <p style="margin-top:0;color:#555;">We have cancelled your order as requested.</p>
      <p><strong>Order Number:</strong> ${order.orderNumber}</p>
      <p><strong>Cancelled At:</strong> ${new Date(order.cancelledAt || Date.now()).toLocaleString()}</p>
      ${order.cancelReason ? `<p><strong>Reason:</strong> ${order.cancelReason}</p>` : ''}
      ${renderItemsTable(order.items || [])}
      <div style="margin-top:16px;font-size:18px;"><strong>Order Total: ${formatCurrency(order.total)}</strong></div>
      <p style="margin-top:20px;color:#777;font-size:12px;">If this was not requested by you, contact support immediately.</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: getFromAddress(),
    to,
    subject,
    html,
  });
}
