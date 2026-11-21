import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ALL_CATEGORIES, EXPENSE_CATEGORIES } from '../data/smartCatalog';
import type { CategoryBudget, ExpenseCategoryId, Transaction } from '../types/finance';
import { formatDateID, formatIDR, formatMonthLabelID } from '../utils/format';

export function exportMonthlyReportPDF(
  monthKey: string,
  transactions: Transaction[],
  budgets: CategoryBudget[]
): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const monthTxs = transactions
    .filter((t) => t.date.startsWith(monthKey))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalIncome = monthTxs
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = monthTxs
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  // Header band
  doc.setFillColor(15, 118, 110);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('KAS RUMAH', 14, 13);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Laporan Keuangan Rumah Tangga — Periode ${formatMonthLabelID(monthKey)}`, 14, 20);
  doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' })}`, 196, 20, {
    align: 'right',
  });

  // Ringkasan Kas
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Ringkasan Kas Bulanan', 14, 38);

  autoTable(doc, {
    startY: 42,
    head: [['Total Uang Masuk', 'Total Pengeluaran', 'Selisih / Saldo Bersih', 'Rasio Hemat']],
    body: [[formatIDR(totalIncome), formatIDR(totalExpense), formatIDR(netBalance), `${savingsRate}%`]],
    theme: 'grid',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 10, fontStyle: 'bold', textColor: [15, 23, 42] },
    margin: { left: 14, right: 14 },
  });

  // Realisasi Anggaran per Kategori
  const afterSummaryY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 65;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Realisasi Anggaran per Kategori', 14, afterSummaryY + 10);

  const budgetRows = (Object.keys(EXPENSE_CATEGORIES) as ExpenseCategoryId[]).map((catId) => {
    const meta = EXPENSE_CATEGORIES[catId];
    const limit = budgets.find((b) => b.category === catId)?.monthlyLimit ?? 0;
    const spent = monthTxs
      .filter((t) => t.type === 'expense' && t.category === catId)
      .reduce((sum, t) => sum + t.amount, 0);
    const remaining = limit - spent;
    const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    const status = limit === 0 ? 'Tanpa Batas' : spent > limit ? 'Melebihi Batas' : pct >= 85 ? 'Mendekati Batas' : 'Aman';
    return [meta.label, formatIDR(limit), formatIDR(spent), formatIDR(remaining), `${pct}% (${status})`];
  });

  autoTable(doc, {
    startY: afterSummaryY + 14,
    head: [['Kategori', 'Anggaran', 'Terpakai', 'Sisa', 'Status']],
    body: budgetRows,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  // Daftar Transaksi
  const afterBudgetY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 140;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`3. Rincian Transaksi (${monthTxs.length} catatan)`, 14, afterBudgetY + 10);

  const txRows = monthTxs.map((tx) => {
    const catLabel = ALL_CATEGORIES[tx.category]?.label ?? tx.category;
    const tipe = tx.type === 'income' ? 'Uang Masuk' : 'Pengeluaran';
    const nominal = tx.type === 'income' ? `+${formatIDR(tx.amount)}` : `-${formatIDR(tx.amount)}`;
    return [formatDateID(tx.date), tx.title, catLabel, tipe, nominal];
  });

  autoTable(doc, {
    startY: afterBudgetY + 14,
    head: [['Tanggal', 'Keterangan', 'Kategori', 'Tipe', 'Nominal']],
    body: txRows.length > 0 ? txRows : [['-', 'Belum ada transaksi pada periode ini', '-', '-', '-']],
    theme: 'striped',
    headStyles: { fillColor: [15, 118, 110], textColor: 255, fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      4: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Kas Rumah · Halaman ${i} dari ${pageCount}`, 105, 290, { align: 'center' });
  }

  doc.save(`Laporan_Kas_Rumah_${monthKey}.pdf`);
}
