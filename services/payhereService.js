const crypto = require('crypto');

class PayHereService {
    constructor() {
        this.merchantId = (process.env.PAYHERE_MERCHANT_ID || '').trim();
        this.merchantSecret = (process.env.PAYHERE_SECRET || '').trim();
        this.isSandbox = process.env.PAYHERE_SANDBOX === 'true';
        this.checkoutUrl = process.env.PAYHERE_BASE_URL || 'https://sandbox.payhere.lk/pay/checkout';
    }

    /**
     * Generate MD5 hash for PayHere checkout
     * Formula: strtoupper(md5(merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))))
     */
    generateHash(orderId, amount, currency = 'LKR') {
        const secretHash = crypto.createHash('md5').update(this.merchantSecret).digest('hex').toUpperCase();
        // PayHere requires amount to be formatted to 2 decimal places with no commas
        const amountFormatted = parseFloat(amount).toFixed(2);

        const hashStr = this.merchantId + orderId + amountFormatted + currency + secretHash;
        const finalHash = crypto.createHash('md5').update(hashStr).digest('hex').toUpperCase();

        if (this.isSandbox) {
            console.log('--- [DEBUG] PayHere Hash Generation ---');
            console.log('Merchant ID:', this.merchantId);
            console.log('Order ID:', orderId);
            console.log('Amount:', amountFormatted);
            console.log('Currency:', currency);
            console.log('Hash String (partial):', this.merchantId + orderId + amountFormatted + currency + '...');
            console.log('Generated Hash:', finalHash);
            console.log('---------------------------------------');
        }

        return finalHash;
    }

    /**
     * Verify PayHere IPN notification
     * Formula: md5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + strtoupper(md5(merchant_secret)))
     */
    verifyIpnHash(data) {
        const { merchant_id, order_id, payhere_amount, payhere_currency, status_code, md5sig } = data;

        const secretHash = crypto.createHash('md5').update(this.merchantSecret).digest('hex').toUpperCase();
        const hashStr = merchant_id + order_id + payhere_amount + payhere_currency + status_code + secretHash;
        const expectedHash = crypto.createHash('md5').update(hashStr).digest('hex').toUpperCase();

        return expectedHash === md5sig;
    }

    /**
     * Prepare data for PayHere Checkout
     */
    prepareCheckoutData(order, user) {
        const orderId = order.orderNumber;
        const amount = parseFloat(order.total).toFixed(2);
        const currency = 'LKR';

        return {
            sandbox: this.isSandbox,
            merchant_id: this.merchantId,
            return_url: process.env.PAYHERE_RETURN_URL,
            cancel_url: process.env.PAYHERE_CANCEL_URL,
            notify_url: process.env.PAYHERE_NOTIFY_URL,
            order_id: orderId,
            items: `Order ${orderId}`,
            amount: amount,
            currency: currency,
            hash: this.generateHash(orderId, order.total, currency),
            first_name: user?.firstName || 'Customer',
            last_name: user?.lastName || '',
            email: user?.email || '',
            phone: user?.phone || '',
            address: order.shippingAddress?.addressLine1 || 'N/A',
            city: order.shippingAddress?.city || 'N/A',
            country: 'Sri Lanka'
        };
    }
}

module.exports = new PayHereService();
