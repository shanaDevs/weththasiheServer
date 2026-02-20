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
    // ============================
    //  PURCHASE ORDER PDF
    // ============================

    /**
     * Generate a Purchase Order PDF Buffer (for email attachments)
     */
    async generatePurchaseOrderPdfBuffer(po) {
        return new Promise(async (resolve, reject) => {
            const settings = await this.getPdfSettings();
            const doc = new PDFDocument({ margin: 50, size: 'A4' });
            const chunks = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            this._buildPurchaseOrderDoc(doc, settings, po);
            doc.end();
        });
    }

    /**
     * Generate a Purchase Order PDF and stream it to the HTTP response (for downloads)
     */
    async generatePurchaseOrderPdf(po, res) {
        const settings = await this.getPdfSettings();
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        doc.pipe(res);
        this._buildPurchaseOrderDoc(doc, settings, po);
        doc.end();
    }

    /**
     * Internal: build PO document content
     */
    _buildPurchaseOrderDoc(doc, settings, po) {
        const supplier = po.supplier || {};
        const items = po.items || [];
        const pageWidth = 545;
        const marginL = 50;

        // ═══════════════════════════════════════════════════
        //  TOP BANNER — dark background with PO title (left)
        //  and status badge (right), on same banner row
        // ═══════════════════════════════════════════════════

        // Status colours lookup
        const statusColors = {
            draft: '#64748b',
            sent: '#3b82f6',
            partially_received: '#f59e0b',
            received: '#10b981',
            cancelled: '#ef4444',
        };
        const statusColor = statusColors[(po.status || 'draft')] || '#64748b';
        const statusText = (po.status || 'DRAFT').replace(/_/g, ' ').toUpperCase();

        // Full-width banner rectangle
        doc
            .fillColor('#0f172a')
            .rect(marginL, 40, pageWidth, 52)
            .fill();

        // "PURCHASE ORDER" aligned LEFT inside banner
        doc
            .font('Helvetica-Bold')
            .fontSize(20)
            .fillColor('#ffffff')
            .text('PURCHASE ORDER', marginL + 12, 55, { width: 330, align: 'left' });

        // Status badge — right side of banner, clearly separate from title
        // Pill background
        doc
            .fillColor(statusColor)
            .roundedRect(marginL + pageWidth - 130, 56, 118, 20, 10)
            .fill();

        // Status text inside pill
        doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor('#ffffff')
            .text(statusText, marginL + pageWidth - 130, 62, { width: 118, align: 'center' });

        // Thin emerald accent line below banner
        doc
            .fillColor('#10b981')
            .rect(marginL, 92, pageWidth, 3)
            .fill();

        // ═══════════════════════════════════════════════════
        //  HEADER ROW — Company info (left) | PO ref box (right)
        //  These are BELOW the banner, clearly separated
        // ═══════════════════════════════════════════════════
        const headerY = 106;

        // Left: Company name
        doc
            .font('Helvetica-Bold')
            .fontSize(12)
            .fillColor('#0f172a')
            .text(settings.companyName, marginL, headerY, { width: 280 });

        // Left: Contact details stacked below company name
        doc
            .font('Helvetica')
            .fontSize(8)
            .fillColor('#64748b')
            .text(`Phone: ${settings.companyPhone}`, marginL, headerY + 17)
            .text(settings.companyAddress, marginL, headerY + 28)
            .text(settings.companyEmail, marginL, headerY + 39);

        // Right: reference box (no status pill inside — status is in the banner)
        const refBoxX = 365;
        const refBoxY = headerY - 2;
        const refBoxW = 180;
        const refBoxH = 58;

        doc
            .fillColor('#f1f5f9')
            .rect(refBoxX, refBoxY, refBoxW, refBoxH)
            .fill();

        // Label
        doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#94a3b8')
            .text('PO NUMBER', refBoxX + 10, refBoxY + 8);

        // PO number value — large and bold
        doc
            .font('Helvetica-Bold')
            .fontSize(12)
            .fillColor('#0f172a')
            .text(po.poNumber, refBoxX + 10, refBoxY + 18, { width: refBoxW - 20 });

        // Dates below PO number
        doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#64748b')
            .text(
                `Order Date: ${new Date(po.orderDate || po.createdAt).toLocaleDateString()}`,
                refBoxX + 10, refBoxY + 36
            )
            .text(
                `Expected: ${po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : 'N/A'}`,
                refBoxX + 10, refBoxY + 47
            );

        // ═══════════════════════════════════════════════════
        //  DIVIDER
        // ═══════════════════════════════════════════════════
        const divY = headerY + 66;
        doc
            .strokeColor('#e2e8f0')
            .lineWidth(1)
            .moveTo(marginL, divY)
            .lineTo(pageWidth + marginL, divY)
            .stroke();

        // ═══════════════════════════════════════════════════
        //  TWO-COLUMN INFO ROW: Vendor (left) | Notes (right)
        // ═══════════════════════════════════════════════════
        const infoY = divY + 14;

        doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor('#94a3b8')
            .text('VENDOR / SUPPLIER', marginL, infoY);

        doc
            .font('Helvetica-Bold')
            .fontSize(10)
            .fillColor('#0f172a')
            .text(supplier.name || 'N/A', marginL, infoY + 12, { width: 240 });

        doc
            .font('Helvetica')
            .fontSize(8.5)
            .fillColor('#475569');

        const details = [
            supplier.code ? `Code: ${supplier.code}` : null,
            supplier.contactPerson ? `Contact: ${supplier.contactPerson}` : null,
            supplier.email ? `Email: ${supplier.email}` : null,
            supplier.phone ? `Phone: ${supplier.phone}` : null,
            supplier.address ? `Address: ${supplier.address}` : null,
        ].filter(Boolean);

        let dY = infoY + 25;
        details.forEach(line => {
            doc.text(line, marginL, dY, { width: 240 });
            dY += 12;
        });

        // Notes on the right
        if (po.notes) {
            doc
                .font('Helvetica-Bold')
                .fontSize(8)
                .fillColor('#94a3b8')
                .text('NOTES', 320, infoY);
            doc
                .font('Helvetica')
                .fontSize(8.5)
                .fillColor('#475569')
                .text(po.notes, 320, infoY + 12, { width: 225, ellipsis: true });
        }

        // ═══════════════════════════════════════════════════
        //  LINE ITEMS TABLE
        // ═══════════════════════════════════════════════════
        const tableTop = Math.max(dY + 18, infoY + 90);

        // Table header background
        doc
            .fillColor('#0f172a')
            .rect(marginL, tableTop, pageWidth, 20)
            .fill();

        doc
            .font('Helvetica-Bold')
            .fontSize(8)
            .fillColor('#ffffff')
            .text('#', 55, tableTop + 6)
            .text('PRODUCT / SKU', 75, tableTop + 6, { width: 175 })
            .text('QTY', 255, tableTop + 6, { width: 45, align: 'right' })
            .text('UNIT PRICE', 305, tableTop + 6, { width: 70, align: 'right' })
            .text('TAX %', 380, tableTop + 6, { width: 50, align: 'right' })
            .text('TAX AMT', 435, tableTop + 6, { width: 55, align: 'right' })
            .text('TOTAL', 495, tableTop + 6, { width: 50, align: 'right' });

        // Table rows
        let y = tableTop + 26;
        items.forEach((item, idx) => {
            const product = item.product || {};
            const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

            doc.fillColor(rowBg).rect(marginL, y - 4, pageWidth, 22).fill();

            doc
                .font('Helvetica-Bold')
                .fontSize(8)
                .fillColor('#334155')
                .text(String(idx + 1), 55, y);

            doc
                .font('Helvetica-Bold')
                .fontSize(8)
                .fillColor('#0f172a')
                .text(product.name || `Product #${item.productId}`, 75, y, { width: 175 });

            if (product.sku) {
                doc
                    .font('Helvetica')
                    .fontSize(7)
                    .fillColor('#94a3b8')
                    .text(`SKU: ${product.sku}`, 75, y + 10, { width: 175 });
            }

            doc
                .font('Helvetica')
                .fontSize(8.5)
                .fillColor('#334155')
                .text(String(item.quantity), 255, y, { width: 45, align: 'right' })
                .text(parseFloat(item.unitPrice).toFixed(2), 305, y, { width: 70, align: 'right' })
                .text(`${parseFloat(item.taxPercentage || 0).toFixed(1)}%`, 380, y, { width: 50, align: 'right' })
                .text(parseFloat(item.taxAmount || 0).toFixed(2), 435, y, { width: 55, align: 'right' })
                .font('Helvetica-Bold')
                .fillColor('#10b981')
                .text(parseFloat(item.total).toFixed(2), 495, y, { width: 50, align: 'right' });

            doc
                .strokeColor('#e2e8f0')
                .lineWidth(0.5)
                .moveTo(marginL, y + 17)
                .lineTo(pageWidth + marginL, y + 17)
                .stroke();

            y += product.sku ? 24 : 22;
        });

        // ═══════════════════════════════════════════════════
        //  TOTALS SECTION
        // ═══════════════════════════════════════════════════
        y += 8;

        const taxTotal = items.reduce((sum, i) => sum + parseFloat(i.taxAmount || 0), 0);
        const subTotal = items.reduce((sum, i) => sum + parseFloat(i.quantity) * parseFloat(i.unitPrice), 0);

        // Totals background
        doc
            .fillColor('#f8fafc')
            .rect(350, y - 4, pageWidth + marginL - 350, 60)
            .fill();

        doc
            .strokeColor('#e2e8f0')
            .lineWidth(1)
            .moveTo(350, y - 4)
            .lineTo(pageWidth + marginL, y - 4)
            .stroke();

        doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#64748b')
            .text('Sub Total:', 355, y, { width: 130, align: 'right' })
            .fillColor('#0f172a')
            .text(`${settings.currencySymbol} ${subTotal.toFixed(2)}`, 490, y, { width: 55, align: 'right' });

        y += 16;
        doc
            .font('Helvetica')
            .fontSize(9)
            .fillColor('#64748b')
            .text('Tax Total:', 355, y, { width: 130, align: 'right' })
            .fillColor('#0f172a')
            .text(`${settings.currencySymbol} ${taxTotal.toFixed(2)}`, 490, y, { width: 55, align: 'right' });

        y += 14;

        // Grand total highlight row
        doc
            .fillColor('#0f172a')
            .rect(350, y, pageWidth + marginL - 350, 22)
            .fill();

        doc
            .font('Helvetica-Bold')
            .fontSize(11)
            .fillColor('#ffffff')
            .text('GRAND TOTAL:', 355, y + 5, { width: 130, align: 'right' })
            .fillColor('#10b981')
            .text(
                `${settings.currencySymbol} ${parseFloat(po.totalAmount || 0).toFixed(2)}`,
                490, y + 5, { width: 55, align: 'right' }
            );

        // ═══════════════════════════════════════════════════
        //  FOOTER
        // ═══════════════════════════════════════════════════
        doc
            .fillColor('#e2e8f0')
            .rect(marginL, 748, pageWidth, 1)
            .fill();

        doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#94a3b8')
            .text(
                `This is a system-generated Purchase Order from ${settings.companyName}. Please confirm receipt.`,
                marginL, 754, { align: 'center', width: pageWidth }
            )
            .text(
                `${settings.companyEmail}  |  ${settings.companyPhone}`,
                marginL, 764, { align: 'center', width: pageWidth }
            );
    }
}

module.exports = new PdfService();
