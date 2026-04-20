import { jsPDF } from 'jspdf';

export class PdfService {
  /**
   * Generates a PDF buffer for the invoice.
   */
  static async generateInvoicePdf(invoice: any, user: any, client: any): Promise<Buffer> {
    // Create a new PDF document (A4 size, units in points)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const margin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 60;

    // Header: StripePay
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(17, 24, 39); // Charcoal
    doc.text('StripePay', margin, y);

    // Invoice Label & ID
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray
    doc.text('INVOICE', pageWidth - margin, y - 15, { align: 'right' });
    doc.setFontSize(14);
    doc.setTextColor(17, 24, 39);
    doc.text(`#${invoice.id.slice(-8).toUpperCase()}`, pageWidth - margin, y, { align: 'right' });

    y += 40;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);

    y += 40;
    // From / Bill To
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('FROM:', margin, y);
    doc.text('BILL TO:', pageWidth - margin, y, { align: 'right' });

    y += 15;
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(user.name || user.email, margin, y);
    doc.text(client.name, pageWidth - margin, y, { align: 'right' });

    y += 15;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(user.email, margin, y);
    doc.text(client.email, pageWidth - margin, y, { align: 'right' });

    if (user.companyName) {
      y += 15;
      doc.text(user.companyName, margin, y);
    }

    y += 60;
    // Table Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 114, 128);
    doc.text('Description', margin, y);
    doc.text('Amount', pageWidth - margin, y, { align: 'right' });

    y += 10;
    doc.line(margin, y, pageWidth - margin, y);

    y += 25;
    // Item
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.text(invoice.description, margin, y);
    doc.text(`$${(invoice.amount / 100).toFixed(2)}`, pageWidth - margin, y, { align: 'right' });

    y += 10;
    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y, pageWidth - margin, y);

    y += 50;
    // Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Total Amount Due:', pageWidth - 200, y);
    doc.text(`$${(invoice.amount / 100).toFixed(2)}`, pageWidth - margin, y, { align: 'right' });

    y += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Due by: ${new Date(invoice.dueDate).toDateString()}`, pageWidth - margin, y, { align: 'right' });

    y += 80;
    // Payment Instructions
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text('PAYMENT INSTRUCTIONS', margin, y);

    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Please use the dynamic checkout link sent to your email to complete the payment via Stripe.', margin, y);

    // Return as Buffer
    const arrayBuffer = doc.output('arraybuffer');
    return Buffer.from(arrayBuffer);
  }
}
