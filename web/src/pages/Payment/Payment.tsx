import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from 'react-query';
import { CreditCard, Wallet, CheckCircle, XCircle, Loader, AlertCircle, IndianRupee } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import styles from './Payment.module.css';

// Declare Razorpay types
declare global {
  interface Window {
    Razorpay: any;
  }
}

const Payment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedGateway, setSelectedGateway] = useState<'razorpay' | 'stripe' | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Get token from URL
  const token = searchParams.get('token');

  // Fetch fee details (public endpoint, no auth required)
  const { data: fee, isLoading, error } = useQuery(
    ['fee', id, token],
    async () => {
      const url = token ? `/api/fees/${id}?token=${encodeURIComponent(token)}` : `/api/fees/${id}`;
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch fee details');
      }
      return await response.json();
    },
    { enabled: !!id }
  );

  // Create Razorpay order (public endpoint, no auth required)
  const createRazorpayOrder = useMutation(
    async () => {
      // Create a separate axios instance without auth for payment endpoints
      const response = await fetch(`/api/fees/${id}/payment/razorpay/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(fee.amount),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment order');
      }
      return await response.json();
    },
    {
      onSuccess: (data) => {
        handleRazorpayPayment(data);
      },
      onError: (error: any) => {
        setErrorMessage(error?.response?.data?.message || 'Failed to create payment order');
        setPaymentStatus('failed');
      },
    }
  );

  // Create Stripe payment intent (public endpoint, no auth required)
  const createStripePayment = useMutation(
    async () => {
      // Create a separate axios instance without auth for payment endpoints
      const response = await fetch(`/api/fees/${id}/payment/stripe/create-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(fee.amount),
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment intent');
      }
      return await response.json();
    },
    {
      onSuccess: async (data) => {
        await handleStripePayment(data);
      },
      onError: (error: any) => {
        setErrorMessage(error?.response?.data?.message || 'Failed to create payment intent');
        setPaymentStatus('failed');
      },
    }
  );

  // Verify payment (public endpoint, no auth required)
  const verifyPayment = useMutation(
    async ({ gateway, paymentId, orderId, signature }: any) => {
      // Create a separate axios instance without auth for payment endpoints
      const response = await fetch(`/api/fees/${id}/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gateway,
          payment_id: paymentId,
          order_id: orderId,
          signature,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Payment verification failed');
      }
      return await response.json();
    },
    {
      onSuccess: () => {
        setPaymentStatus('success');
        setTimeout(() => {
          navigate('/fees');
        }, 3000);
      },
      onError: (error: any) => {
        setErrorMessage(error?.response?.data?.message || 'Payment verification failed');
        setPaymentStatus('failed');
      },
    }
  );

  const handleRazorpayPayment = (orderData: any) => {
    if (!window.Razorpay) {
      setErrorMessage('Razorpay SDK not loaded. Please refresh the page.');
      setPaymentStatus('failed');
      return;
    }

    const options = {
      key: orderData.key_id,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Praxis ERP',
      description: `Fee Payment - ${fee.fee_type}`,
      order_id: orderData.order_id,
      handler: async (response: any) => {
        setPaymentStatus('processing');
        await verifyPayment.mutateAsync({
          gateway: 'razorpay',
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        });
      },
      prefill: {
        name: `${fee.student?.first_name} ${fee.student?.last_name}`,
        email: fee.student?.father_email || fee.student?.mother_email || '',
        contact: fee.student?.father_phone || fee.student?.mother_phone || '',
      },
      theme: {
        color: '#4F46E5',
      },
      modal: {
        ondismiss: () => {
          setPaymentStatus('idle');
          setSelectedGateway(null);
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  };

  const handleStripePayment = async (intentData: any) => {
    // Load Stripe.js dynamically
    const { loadStripe } = await import('@stripe/stripe-js');
    const stripe = await loadStripe(intentData.publishable_key);

    if (!stripe) {
      setErrorMessage('Stripe SDK not loaded. Please refresh the page.');
      setPaymentStatus('failed');
      return;
    }

    // Use Stripe's redirect to checkout for simplicity
    // In production, you might want to use Stripe Elements for inline payment
    try {
      // Note: This is a placeholder - in production, use Stripe Elements to collect card details
      // For now, we'll skip the card payment confirmation
      const { error: stripeError } = await stripe.confirmCardPayment(intentData.client_secret, {
        payment_method: {
          card: {} as any, // Placeholder - should use Stripe Elements in production
        },
      });

      if (stripeError) {
        // If card payment fails, show error
        setErrorMessage(stripeError.message || 'Payment failed');
        setPaymentStatus('failed');
      } else {
        // Payment succeeded
        setPaymentStatus('processing');
        await verifyPayment.mutateAsync({
          gateway: 'stripe',
          paymentId: intentData.payment_intent_id,
          orderId: intentData.payment_intent_id,
        });
      }
    } catch (error: any) {
      // For now, show a message that Stripe requires card collection UI
      setErrorMessage('Stripe payment requires card details. Please use Razorpay for now, or implement Stripe Elements for card collection.');
      setPaymentStatus('failed');
    }
  };

  const handleGatewaySelect = (gateway: 'razorpay' | 'stripe') => {
    setSelectedGateway(gateway);
    setPaymentStatus('processing');
    setErrorMessage('');

    if (gateway === 'razorpay') {
      createRazorpayOrder.mutate();
    } else if (gateway === 'stripe') {
      createStripePayment.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader size={32} className={styles.spinner} />
          <p>Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error || !fee) {
    const errorMessage = (error as any)?.response?.data?.error || 'Payment link invalid or expired';
    return (
      <div className={styles.container}>
        <Card className={styles.errorCard}>
          <XCircle size={48} className={styles.errorIcon} />
          <h2>Payment Link Invalid</h2>
          <p>{errorMessage}</p>
          <p className={styles.helpText}>
            If you received this link via email or WhatsApp, please contact the school for a new payment link.
          </p>
        </Card>
      </div>
    );
  }

  const amount = parseFloat(fee.amount);
  const isPaid = fee.status === 'paid';

  if (isPaid) {
    return (
      <div className={styles.container}>
        <Card className={styles.successCard}>
          <CheckCircle size={48} className={styles.successIcon} />
          <h2>Payment Already Completed</h2>
          <p>This fee has already been paid.</p>
          <div className={styles.paymentDetails}>
            <div className={styles.detailRow}>
              <span>Amount Paid:</span>
              <span className={styles.amount}>₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {fee.paid_date && (
              <div className={styles.detailRow}>
                <span>Paid Date:</span>
                <span>{new Date(fee.paid_date).toLocaleDateString()}</span>
              </div>
            )}
            {fee.payment_method && (
              <div className={styles.detailRow}>
                <span>Payment Method:</span>
                <span style={{ textTransform: 'capitalize' }}>{fee.payment_method}</span>
              </div>
            )}
          </div>
          <Button onClick={() => navigate('/fees')} variant="primary">
            Go to Fees
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Pay Fee</h1>
        <p className={styles.subtitle}>Complete your payment securely</p>
      </div>

      <div className={styles.content}>
        <Card className={styles.feeCard}>
          <h2 className={styles.feeTitle}>Fee Details</h2>
          <div className={styles.feeInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Student:</span>
              <span className={styles.value}>
                {fee.student?.first_name} {fee.student?.last_name}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Admission Number:</span>
              <span className={styles.value}>{fee.student?.admission_number}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Fee Type:</span>
              <span className={styles.value} style={{ textTransform: 'capitalize' }}>
                {fee.fee_type}
              </span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Due Date:</span>
              <span className={styles.value}>{new Date(fee.due_date).toLocaleDateString()}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Academic Year:</span>
              <span className={styles.value}>{fee.academic_year}</span>
            </div>
            <div className={styles.amountRow}>
              <span className={styles.amountLabel}>Amount to Pay:</span>
              <span className={styles.amount}>
                <IndianRupee size={20} />
                {amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </Card>

        {paymentStatus === 'success' ? (
          <Card className={styles.successCard}>
            <CheckCircle size={48} className={styles.successIcon} />
            <h2>Payment Successful! ✅</h2>
            <p className={styles.successMessage}>
              Your payment of <strong>₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong> has been processed successfully.
            </p>
            <p className={styles.receiptNote}>
              A payment receipt has been sent to your registered email/phone number. Please keep this transaction ID for your records.
            </p>
            <div className={styles.successDetails}>
              <div className={styles.detailRow}>
                <span>Transaction ID:</span>
                <span className={styles.transactionId}>{fee.transaction_id || 'Processing...'}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Payment Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className={styles.detailRow}>
                <span>Student:</span>
                <span>{fee.student?.first_name} {fee.student?.last_name}</span>
              </div>
            </div>
          </Card>
        ) : paymentStatus === 'failed' ? (
          <Card className={styles.errorCard}>
            <XCircle size={48} className={styles.errorIcon} />
            <h2>Payment Failed</h2>
            <p>{errorMessage || 'An error occurred during payment. Please try again.'}</p>
            <Button
              onClick={() => {
                setPaymentStatus('idle');
                setSelectedGateway(null);
                setErrorMessage('');
              }}
              variant="primary"
            >
              Try Again
            </Button>
          </Card>
        ) : (
          <Card className={styles.paymentCard}>
            <h2 className={styles.paymentTitle}>Choose Payment Method</h2>
            <p className={styles.paymentSubtitle}>Select your preferred payment gateway to complete the payment</p>
            <div className={styles.gatewayGrid}>
              <button
                className={`${styles.gatewayButton} ${selectedGateway === 'razorpay' ? styles.selected : ''}`}
                onClick={() => handleGatewaySelect('razorpay')}
                disabled={paymentStatus === 'processing'}
              >
                <div className={styles.gatewayIcon}>
                  <Wallet size={32} />
                </div>
                <div className={styles.gatewayInfo}>
                  <h3>Razorpay</h3>
                  <p>Pay via UPI, Cards, Net Banking, Wallets</p>
                </div>
                {createRazorpayOrder.isLoading && (
                  <Loader size={20} className={styles.buttonLoader} />
                )}
              </button>

              <button
                className={`${styles.gatewayButton} ${selectedGateway === 'stripe' ? styles.selected : ''}`}
                onClick={() => handleGatewaySelect('stripe')}
                disabled={paymentStatus === 'processing'}
              >
                <div className={styles.gatewayIcon}>
                  <CreditCard size={32} />
                </div>
                <div className={styles.gatewayInfo}>
                  <h3>Stripe</h3>
                  <p>Pay via Credit/Debit Cards</p>
                </div>
                {createStripePayment.isLoading && (
                  <Loader size={20} className={styles.buttonLoader} />
                )}
              </button>
            </div>

            {paymentStatus === 'processing' && selectedGateway && (
              <div className={styles.processing}>
                <Loader size={24} className={styles.spinner} />
                <p>Processing payment...</p>
              </div>
            )}

            <div className={styles.securityNote}>
              <AlertCircle size={16} />
              <span>Your payment is secured and encrypted. We do not store your card details.</span>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Payment;

