const crypto = require('crypto');

class PayHereService {
    /**
     * Read env lazily so the service always uses the latest values
     * (guards against the module being require()'d before dotenv runs).
     */
    get merchantId() {
        return (process.env.PAYHERE_MERCHANT_ID || '').trim();
    }

    get merchantSecret() {
        let secret = (process.env.PAYHERE_SECRET || '').trim();
        // Check if it's base64 encoded (common if copied from certain dashboards)
        if (secret.length > 20 && secret.endsWith('==')) {
            try {
                return Buffer.from(secret, 'base64').toString('utf-8');
            } catch (e) {
                return secret;
            }
        }
        return secret;
    }


    get isSandbox() {
        return process.env.PAYHERE_SANDBOX === 'true';
    }

    /**
     * Generate MD5 hash for PayHere checkout
     * Formula: strtoupper(md5(merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))))
     */
    generateHash(orderId, amount, currency = 'LKR') {
        const merchantId = this.merchantId;
        const merchantSecret = this.merchantSecret;

        // Step 1 – MD5 of the raw merchant secret, uppercased
        const secretHash = crypto
            .createHash('md5')
            .update(merchantSecret)
            .digest('hex')
            .toUpperCase();

        // Step 2 – format amount to exactly 2 decimals
        const amountFormatted = parseFloat(amount).toFixed(2);

        // Step 3 – concatenate and hash again
        const hashStr = merchantId + orderId + amountFormatted + currency + secretHash;
        const finalHash = crypto
            .createHash('md5')
            .update(hashStr)
            .digest('hex')
            .toUpperCase();

        console.log('--- [PayHere] Hash Generation ---');
        console.log('  Merchant ID :', merchantId);
        console.log('  Order ID    :', orderId);
        console.log('  Amount      :', amountFormatted);
        console.log('  Currency    :', currency);
        console.log('  Hash        :', finalHash);
        console.log('---------------------------------');

        return finalHash;
    }

    /**
     * Verify PayHere IPN notification
     * Formula: md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + strtoupper(md5(merchant_secret)))
     */
    verifyIpnHash(data) {
        const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = data;

        const secretHash = crypto
            .createHash('md5')
            .update(this.merchantSecret)
            .digest('hex')
            .toUpperCase();

        const hashStr = merchant_id + order_id + payhere_amount + payhere_currency + status_code + secretHash;
        const expectedHash = crypto
            .createHash('md5')
            .update(hashStr)
            .digest('hex')
            .toUpperCase();

        return expectedHash === md5sig;
    }

    /**
     * Prepare data for PayHere Checkout.
     * IMPORTANT: the returned object must contain ONLY the fields that
     * payhere.startPayment() expects. Extra keys (like "sandbox") cause
     * PayHere to return "Unauthorized".
     */
    prepareCheckoutData(order, user) {
        const orderId = order.orderNumber;
        const amount = parseFloat(order.total).toFixed(2);
        const currency = 'LKR';

        return {
            // ── PayHere required fields ──
            merchant_id: this.merchantId,
            return_url: process.env.PAYHERE_RETURN_URL || '',
            cancel_url: process.env.PAYHERE_CANCEL_URL || '',
            notify_url: process.env.PAYHERE_NOTIFY_URL || '',
            order_id: orderId,
            items: `Order ${orderId}`,
            amount: amount,
            currency: currency,
            hash: this.generateHash(orderId, order.total, currency),
            first_name: user?.firstName || 'Customer',
            last_name: user?.lastName || '',
            email: user?.email || 'noreply@medipharmb2b.com', // PayHere requires a non-empty email
            phone: user?.phone || '0000000000',
            address: order.shippingAddress?.addressLine1 || 'N/A',
            city: order.shippingAddress?.city || 'N/A',
            country: 'Sri Lanka',
            // ── This flag is consumed by the frontend only (stripped before payhere.startPayment) ──
            sandbox: this.isSandbox,
        };
    }
}

module.exports = new PayHereService();
