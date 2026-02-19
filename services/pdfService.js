const PDFDocument = require('pdfkit');
const { SystemSetting } = require('../models');

class PdfService {
    /**
     * Get system settings for PDF branding
     */
    async getPdfSettings() {
        try {
            const settings = await SystemSetting.findAll({
                where: {
                    category: 'general'
                }
            });

            const settingsMap = {};
            settings.forEach(s => {
                settingsMap[s.key] = s.value;
            });

            return {
                companyName: settingsMap['company_name'] || 'MediPharm B2B',
                companyPhone: settingsMap['company_phone'] || '+94 11 123 4567',
                companyAddress: settingsMap['company_address'] || 'Colombo, Sri Lanka',
                companyEmail: settingsMap['company_email'] || 'info@medipharm.com',
                currencySymbol: settingsMap['currency_symbol'] || 'Rs.'
            };
        } catch (error) {
            console.error('Failed to get PDF settings:', error.message);
            return {
                companyName: 'MediPharm B2B',
                companyPhone: '+94 11 123 4567',
                companyAddress: 'Colombo, Sri Lanka',
                companyEmail: 'info@medipharm.com',
                currencySymbol: 'Rs.'
            };
        }
    }

    /**
     * Generate PDF as Buffer (for emails)
     */
    async generateOrderInvoiceBuffer(order) {
        return new Promise(async (resolve, reject) => {
            const settings = await this.getPdfSettings();
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Same generation logic
            this.generateHeader(doc, settings, order);
            this.generateCustomerInfo(doc, order);
            this.generateInvoiceTable(doc, order, settings);
            this.generateFooter(doc);

            doc.end();
        });
    }

    /**
     * Generate Professional Invoice PDF to stream (for downloads)
     */
    async generateOrderInvoice(order, res) {

        const settings = await this.getPdfSettings();
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Pipe to response
        doc.pipe(res);

        // --- Header Section ---
        this.generateHeader(doc, settings, order);
        this.generateCustomerInfo(doc, order);

        // --- Table Section ---
        this.generateInvoiceTable(doc, order, settings);

        // --- Footer Section ---
        this.generateFooter(doc);

        doc.end();
    }

    generateHeader(doc, settings, order) {
        doc
            .fillColor('#444444')
            .fontSize(20)
            .text(settings.companyName, 50, 50)
            .fontSize(10)
            .text(`Phone: ${settings.companyPhone}`, 50, 75)
            .text(settings.companyAddress, 50, 90)
            .moveDown();

        doc
            .fontSize(25)
            .fillColor('#1e293b')
            .text('SALES RECEIPT', 50, 130, { align: 'left' })
            .fontSize(10)
            .fillColor('#444444')
            .text(`Invoice No: ${order?.orderNumber || 'N/A'}`, 400, 130, { align: 'right' })
            .text(`Date: ${new Date().toLocaleDateString()}`, 400, 145, { align: 'right' })

            .text(`Time: ${new Date().toLocaleTimeString()}`, 400, 160, { align: 'right' })
            .moveDown();

        // Horizontal line
        doc
            .strokeColor('#e2e8f0')
            .lineWidth(1)
            .moveTo(50, 180)
            .lineTo(550, 180)
            .stroke();
    }

    generateCustomerInfo(doc, order) {
        const shippingAddress = order.shippingAddress || {};
        const customerName = order.user ? `${order.user.firstName} ${order.user.lastName}` : (shippingAddress.contactName || 'Customer');

        doc
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('BILL TO:', 50, 200)
            .font('Helvetica')
            .fontSize(10)
            .text(customerName, 50, 215)
            .text(shippingAddress.addressLine1 || 'N/A', 50, 230)
            .text(`${shippingAddress.city || ''}, ${shippingAddress.state || ''} - ${shippingAddress.postalCode || ''}`, 50, 245)
            .text(`Tel: ${order.user?.phone || shippingAddress.contactPhone || 'N/A'}`, 50, 260)
            .moveDown();
    }

    generateInvoiceTable(doc, order, settings) {
        let i;
        const invoiceTableTop = 300;

        doc.font('Helvetica-Bold');
        this.generateTableRow(
            doc,
            invoiceTableTop,
            '#',
            'ITEM DESCRIPTION',
            'QTY',
            'PRICE',
            'DISC',
            'AMOUNT'
        );
        this.generateHr(doc, invoiceTableTop + 20);
        doc.font('Helvetica');

        let position = invoiceTableTop + 30;
        order.items.forEach((item, index) => {
            const itemPrice = parseFloat(item.unitPrice).toFixed(2);
            const itemTotal = parseFloat(item.total).toFixed(2);
            const itemDisc = item.discountAmount ? parseFloat(item.discountAmount).toFixed(2) : '-';

            this.generateTableRow(
                doc,
                position,
                index + 1,
                item.productName,
                item.quantity,
                itemPrice,
                itemDisc,
                itemTotal
            );

            this.generateHr(doc, position + 20);
            position += 30;
        });

        const subtotalPosition = position + 10;
        this.generateTotalRow(doc, subtotalPosition, 'Subtotal:', parseFloat(order.subtotal).toFixed(2), settings);

        const taxPosition = subtotalPosition + 20;
        this.generateTotalRow(doc, taxPosition, 'Tax:', parseFloat(order.taxAmount).toFixed(2), settings);

        const shippingPosition = taxPosition + 20;
        this.generateTotalRow(doc, shippingPosition, 'Shipping:', parseFloat(order.shippingAmount).toFixed(2), settings);

        const discountPosition = shippingPosition + 20;
        if (parseFloat(order.discountAmount) > 0) {
            this.generateTotalRow(doc, discountPosition, 'Discount:', `-${parseFloat(order.discountAmount).toFixed(2)}`, settings);
        }

        const totalPosition = discountPosition + 30;
        doc.font('Helvetica-Bold').fontSize(12);
        this.generateTotalRow(doc, totalPosition, 'TOTAL:', `${settings.currencySymbol} ${parseFloat(order.total).toFixed(2)}`, settings);
        doc.font('Helvetica').fontSize(10);

        const paidPosition = totalPosition + 25;
        this.generateTotalRow(doc, paidPosition, 'Paid:', parseFloat(order.paidAmount || 0).toFixed(2), settings);

        const duePosition = paidPosition + 20;
        doc.fillColor('#ef4444');
        this.generateTotalRow(doc, duePosition, 'Balance Due:', parseFloat(order.dueAmount || 0).toFixed(2), settings);
        doc.fillColor('#444444');

        // Status badge
        const statusPosition = duePosition + 30;
        const statusText = order.paymentStatus.toUpperCase();
        doc
            .font('Helvetica-Bold')
            .fillColor(order.paymentStatus === 'paid' ? '#10b981' : '#f59e0b')
            .text(statusText, 450, statusPosition, { align: 'right' });
    }

    generateTableRow(doc, y, c1, c2, c3, c4, c5, c6) {
        doc
            .fontSize(10)
            .text(c1, 50, y)
            .text(c2, 80, y, { width: 220 })
            .text(c3, 300, y, { width: 40, align: 'right' })
            .text(c4, 350, y, { width: 60, align: 'right' })
            .text(c5, 420, y, { width: 50, align: 'right' })
            .text(c6, 480, y, { width: 70, align: 'right' });
    }

    generateTotalRow(doc, y, label, value, settings) {
        doc
            .text(label, 350, y, { width: 120, align: 'right' })
            .text(value, 480, y, { width: 70, align: 'right' });
    }

    generateHr(doc, y) {
        doc
            .strokeColor('#f1f5f9')
            .lineWidth(1)
            .moveTo(50, y)
            .lineTo(550, y)
            .stroke();
    }

    generateFooter(doc) {
        doc
            .fontSize(10)
            .fillColor('#94a3b8')
            .text('Thank you for your business!', 50, 750, { align: 'center', width: 500 });

        // Barcode placeholder (aesthetic)
        doc
            .rect(200, 720, 200, 15)
            .fill('#1e293b');

        for (let i = 0; i < 40; i++) {
            const x = 200 + (i * 5);
            const w = Math.random() > 0.5 ? 1 : 3;
            doc.rect(x, 720, w, 15).fill('#ffffff');
        }
    }
}

module.exports = new PdfService();
