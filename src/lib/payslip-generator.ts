import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PayslipData {
  // Company Info
  companyName: string;
  companyAddress?: string;
  
  // Employee Info
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  bankAccount: string;
  bankName: string;
  
  // Period
  month: string;
  year: number;
  
  // Attendance
  presentDays: number;
  totalDays: number;
  
  // Earnings
  gross: number;
  basic: number;
  hra: number;
  otherAllowances: number;
  arrears: number;
  totalEarnings: number;
  
  // Deductions
  pfAmount: number;
  esiAmount: number;
  tdsAmount: number;
  totalDeductions: number;
  
  // Net
  netPayable: number;
  
  // Status
  generatedDate: Date;
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Format currency for PDF display
 */
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate a PDF Payslip for an employee
 */
export function generatePayslipPDF(data: PayslipData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Colors
  const primaryColor: [number, number, number] = [37, 99, 235]; // Corporate blue
  const textColor: [number, number, number] = [30, 41, 59]; // Slate gray
  const mutedColor: [number, number, number] = [100, 116, 139]; // Muted gray
  
  let yPos = 20;
  
  // ===== HEADER =====
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Company Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(data.companyName, pageWidth / 2, 18, { align: 'center' });
  
  // Payslip Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payslip for ${data.month} ${data.year}`, pageWidth / 2, 30, { align: 'center' });
  
  yPos = 55;
  
  // ===== EMPLOYEE DETAILS =====
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Details', 14, yPos);
  
  yPos += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Left column
  doc.setTextColor(...mutedColor);
  doc.text('Employee Name:', 14, yPos);
  doc.text('Employee ID:', 14, yPos + 6);
  doc.text('Department:', 14, yPos + 12);
  doc.text('Designation:', 14, yPos + 18);
  
  doc.setTextColor(...textColor);
  doc.text(data.employeeName, 55, yPos);
  doc.text(data.employeeCode, 55, yPos + 6);
  doc.text(data.department || '-', 55, yPos + 12);
  doc.text(data.designation || '-', 55, yPos + 18);
  
  // Right column
  doc.setTextColor(...mutedColor);
  doc.text('Bank Name:', 110, yPos);
  doc.text('Bank Account:', 110, yPos + 6);
  doc.text('Days Present:', 110, yPos + 12);
  doc.text('Pay Period:', 110, yPos + 18);
  
  doc.setTextColor(...textColor);
  doc.text(data.bankName || '-', 150, yPos);
  doc.text(data.bankAccount ? `****${data.bankAccount.slice(-4)}` : '-', 150, yPos + 6);
  doc.text(`${data.presentDays} / ${data.totalDays}`, 150, yPos + 12);
  doc.text(`${data.month} ${data.year}`, 150, yPos + 18);
  
  yPos += 35;
  
  // ===== EARNINGS & DEDUCTIONS TABLE =====
  // Earnings Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Earnings', 14, yPos);
  
  yPos += 3;
  
  const earningsData = [
    ['Basic Salary (50%)', formatAmount(data.basic)],
    ['HRA (20%)', formatAmount(data.hra)],
    ['Other Allowances (30%)', formatAmount(data.otherAllowances)],
  ];
  
  // Add Arrears if present
  if (data.arrears !== 0) {
    earningsData.push([
      data.arrears >= 0 ? 'Arrears / Adjustment (+)' : 'Deductions from Arrears (-)', 
      formatAmount(Math.abs(data.arrears))
    ]);
  }
  
  earningsData.push(['Total Earnings', formatAmount(data.totalEarnings)]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: earningsData,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: 14, right: pageWidth / 2 + 5 },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    footStyles: {
      fillColor: [240, 240, 240],
      fontStyle: 'bold',
    },
  });
  
  // Deductions Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...textColor);
  doc.text('Deductions', pageWidth / 2 + 10, yPos);
  
  const deductionsData = [
    ['Provident Fund (PF)', formatAmount(data.pfAmount)],
    ['ESI', formatAmount(data.esiAmount)],
    ['TDS / Income Tax', formatAmount(data.tdsAmount)],
    ['Total Deductions', formatAmount(data.totalDeductions)],
  ];
  
  autoTable(doc, {
    startY: yPos,
    head: [['Description', 'Amount']],
    body: deductionsData,
    theme: 'striped',
    headStyles: {
      fillColor: [220, 38, 38], // Red for deductions
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 40, halign: 'right' },
    },
    margin: { left: pageWidth / 2 + 10, right: 14 },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    footStyles: {
      fillColor: [240, 240, 240],
      fontStyle: 'bold',
    },
  });
  
  // Get the Y position after tables
  const finalY = Math.max(
    (doc as any).lastAutoTable?.finalY || yPos + 60,
    yPos + 60
  );
  
  yPos = finalY + 15;
  
  // ===== NET PAYABLE BOX =====
  doc.setFillColor(...primaryColor);
  doc.roundedRect(14, yPos, pageWidth - 28, 25, 3, 3, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Net Payable', 20, yPos + 10);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(formatAmount(data.netPayable), pageWidth - 20, yPos + 16, { align: 'right' });
  
  yPos += 40;
  
  // ===== CALCULATION SUMMARY =====
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const calcFormula = `Net Payable = Gross (${formatAmount(data.gross)}) + Arrears (${formatAmount(data.arrears)}) - PF (${formatAmount(data.pfAmount)}) - ESI (${formatAmount(data.esiAmount)}) - TDS (${formatAmount(data.tdsAmount)})`;
  doc.text(calcFormula, pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;
  
  // ===== FOOTER =====
  doc.setDrawColor(...mutedColor);
  doc.line(14, yPos, pageWidth - 14, yPos);
  
  yPos += 8;
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.text(`Generated on: ${data.generatedDate.toLocaleDateString('en-IN', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}`, 14, yPos);
  
  doc.text('This is a computer-generated payslip and does not require a signature.', pageWidth / 2, yPos + 6, { align: 'center' });
  
  // Save the PDF
  const fileName = `Payslip_${data.employeeCode}_${data.month}_${data.year}.pdf`;
  doc.save(fileName);
}

/**
 * Generate payslips for multiple employees (bulk download)
 */
export function generateBulkPayslips(payslips: PayslipData[]): void {
  payslips.forEach((data, index) => {
    // Small delay to prevent browser issues with multiple downloads
    setTimeout(() => {
      generatePayslipPDF(data);
    }, index * 500);
  });
}
