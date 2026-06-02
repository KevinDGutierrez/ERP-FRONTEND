import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatQ = (val) => {
  const num = Number(val) || 0;
  if (num < 0) return `-Q${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `Q${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const dateStr = () => new Date().toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
const fileDate = () => new Date().toISOString().split('T')[0];

const addHeader = (doc, title) => {
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generado el ${dateStr()} — Street Ledger ERP`, doc.internal.pageSize.getWidth() / 2, 30, { align: 'center' });
  doc.setTextColor(0);
  doc.setDrawColor(30);
  doc.setLineWidth(0.5);
  doc.line(20, 34, doc.internal.pageSize.getWidth() - 20, 34);
};

/* ────────────────────────────────────────────────── */
/* BALANCE DE COMPROBACIÓN / SALDOS AJUSTADO         */
/* ────────────────────────────────────────────────── */
export const exportTrialBalancePDF = (data, filename = 'balance_comprobacion') => {
  const doc = new jsPDF();
  const title = filename.includes('ajustado') ? 'Balance de Saldos Ajustado' : 'Balance de Comprobación';
  addHeader(doc, title);

  const rows = (data.accounts || []).map(acc => [
    acc.code,
    acc.name,
    acc.balance > 0 ? formatQ(acc.balance) : '-',
    acc.balance < 0 ? formatQ(Math.abs(acc.balance)) : '-'
  ]);

  autoTable(doc, {
    startY: 40,
    head: [['Código', 'Nombre de la Cuenta', 'Deudor', 'Acreedor']],
    body: rows,
    foot: [['', 'TOTALES GENERALES', formatQ(data.totals?.debe), formatQ(data.totals?.haber)]],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 10 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 20, right: 20 }
  });

  doc.save(`${filename}_${fileDate()}.pdf`);
};

/* ────────────────────────────────────────────────── */
/* ESTADO DE RESULTADOS                              */
/* ────────────────────────────────────────────────── */
export const exportProfitLossPDF = (data) => {
  const doc = new jsPDF();
  addHeader(doc, 'Estado de Resultados');
  const r = data.resumen || {};
  let y = 44;

  const line = (label, value, opts = {}) => {
    const { bold, color, indent } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 11 : 10);
    if (color) doc.setTextColor(...color);
    else doc.setTextColor(30);
    const x = 25 + (indent || 0);
    doc.text(label, x, y);
    doc.text(value, 185, y, { align: 'right' });
    y += 7;
  };

  const separator = () => { doc.setDrawColor(200); doc.line(25, y - 2, 185, y - 2); y += 2; };

  doc.setFontSize(9); doc.setTextColor(59, 130, 246); doc.setFont('helvetica', 'bold');
  doc.text('INGRESOS DE OPERACIÓN', 25, y); y += 8;
  line('Ventas y Servicios', formatQ(r.totalIngresos));
  separator();
  line('TOTAL INGRESOS', formatQ(r.totalIngresos), { bold: true });
  y += 4;

  doc.setFontSize(9); doc.setTextColor(59, 130, 246); doc.setFont('helvetica', 'bold');
  doc.text('COSTOS Y GASTOS', 25, y); y += 8;
  line('Costo de Ventas', `(${formatQ(r.totalCostos)})`, { color: [220, 38, 38] });
  separator();
  line('UTILIDAD BRUTA', formatQ(r.utilidadBruta), { bold: true, color: [59, 130, 246] });
  line('Gastos de Administración', `(${formatQ(r.totalGastos)})`, { color: [220, 38, 38] });
  y += 6;

  doc.setFillColor(240, 253, 244);
  doc.roundedRect(22, y - 5, 168, 16, 3, 3, 'F');
  doc.setDrawColor(22, 163, 74); doc.setLineWidth(0.5);
  doc.roundedRect(22, y - 5, 168, 16, 3, 3, 'S');
  line('UTILIDAD NETA DEL EJERCICIO', formatQ(r.utilidadNeta), { bold: true, color: [22, 163, 74] });

  doc.save(`estado_resultados_${fileDate()}.pdf`);
};

/* ────────────────────────────────────────────────── */
/* BALANCE GENERAL                                   */
/* ────────────────────────────────────────────────── */
export const exportBalanceSheetPDF = (data) => {
  const doc = new jsPDF();
  addHeader(doc, 'Balance General');
  let y = 44;

  const section = (title, items, totalLabel, totalValue, mapFn) => {
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
    doc.text(title, 25, y); y += 2;
    doc.setDrawColor(30); doc.setLineWidth(0.4);
    doc.line(25, y, 185, y); y += 7;

    (items || []).forEach(item => {
      const val = mapFn ? mapFn(item) : item.balance;
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
      doc.text(item.name, 30, y);
      doc.text(formatQ(val), 185, y, { align: 'right' });
      y += 6;
    });

    doc.setDrawColor(30); doc.setLineWidth(0.3); doc.line(25, y, 185, y); y += 5;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
    doc.text(totalLabel, 25, y);
    doc.text(formatQ(totalValue), 185, y, { align: 'right' });
    y += 12;
  };

  section('Activos', data.activos, 'TOTAL ACTIVO', data.totales?.activo, a => a.balance);

  // Pasivos
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
  doc.text('Pasivo y Patrimonio', 25, y); y += 2;
  doc.setDrawColor(30); doc.setLineWidth(0.4); doc.line(25, y, 185, y); y += 7;

  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100);
  doc.text('PASIVOS', 25, y); y += 6;
  (data.pasivos || []).forEach(p => {
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(60);
    doc.text(p.name, 30, y);
    doc.text(formatQ(Math.abs(p.balance)), 185, y, { align: 'right' });
    y += 6;
  });
  y += 2;
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(100);
  doc.text('PATRIMONIO', 25, y); y += 6;
  (data.patrimonio || []).forEach(p => {
    const isResult = p.code === '3.2.01.01' || p.id === '_resultado_ejercicio';
    const val = isResult ? p.balance : Math.abs(p.balance);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal');
    doc.setTextColor(isResult && val < 0 ? 220 : 60, isResult && val < 0 ? 38 : 60, isResult && val < 0 ? 38 : 60);
    doc.text(p.name, 30, y);
    doc.text(formatQ(val), 185, y, { align: 'right' });
    y += 6;
  });

  doc.setDrawColor(30); doc.setLineWidth(0.3); doc.line(25, y, 185, y); y += 5;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(30);
  doc.text('TOTAL PASIVO Y CAPITAL', 25, y);
  doc.text(formatQ(data.totales?.patrimonio), 185, y, { align: 'right' });

  doc.save(`balance_general_${fileDate()}.pdf`);
};

/* ────────────────────────────────────────────────── */
/* LIBRO DIARIO                                      */
/* ────────────────────────────────────────────────── */
export const exportJournalPDF = (entries) => {
  if (!entries || entries.length === 0) return;
  const doc = new jsPDF('landscape');
  addHeader(doc, 'Libro Diario');

  const rows = [];
  entries.forEach((entry, idx) => {
    const num = idx + 1;
    if (entry.details && entry.details.length > 0) {
      entry.details.forEach(d => {
        rows.push([
          num, entry.date || '', entry.type || '', entry.description || '',
          d.accountCode || '', d.accountName || '',
          d.debit ? formatQ(d.debit) : '-', d.credit ? formatQ(d.credit) : '-'
        ]);
      });
    } else {
      rows.push([num, entry.date || '', entry.type || '', entry.description || '', '', '', '-', '-']);
    }
  });

  autoTable(doc, {
    startY: 40,
    head: [['#', 'Fecha', 'Tipo', 'Descripción', 'Código', 'Cuenta', 'Debe', 'Haber']],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 12 }, 6: { halign: 'right' }, 7: { halign: 'right' } },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 14, right: 14 }
  });

  doc.save(`libro_diario_${fileDate()}.pdf`);
};

/* ────────────────────────────────────────────────── */
/* LIBRO MAYOR                                       */
/* ────────────────────────────────────────────────── */
export const exportLedgerPDF = (account, movements) => {
  if (!movements || movements.length === 0) return;
  const doc = new jsPDF();
  addHeader(doc, 'Libro Mayor');

  let y = 40;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text(`Cuenta: ${account.code} — ${account.name}`, 25, y);
  y += 6;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
  doc.text(`Naturaleza: ${account.nature}`, 25, y);
  doc.setTextColor(0);

  const rows = movements.map((m, i) => [
    m.date, i + 1, m.description || '', m.type || '',
    m.debit ? formatQ(m.debit) : '-',
    m.credit ? formatQ(m.credit) : '-',
    formatQ(m.balance)
  ]);

  const totalDebit = movements.reduce((s, m) => s + (m.debit || 0), 0);
  const totalCredit = movements.reduce((s, m) => s + (m.credit || 0), 0);
  const finalBalance = movements.length > 0 ? movements[movements.length - 1].balance : 0;

  autoTable(doc, {
    startY: y + 6,
    head: [['Fecha', '#', 'Descripción', 'Tipo', 'Debe', 'Haber', 'Saldo']],
    body: rows,
    foot: [['', '', '', 'TOTALES', formatQ(totalDebit), formatQ(totalCredit), formatQ(finalBalance)]],
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 10 },
    columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    margin: { left: 20, right: 20 }
  });

  const safeName = (account.name || 'cuenta').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  doc.save(`libro_mayor_${safeName}_${fileDate()}.pdf`);
};

/* ────────────────────────────────────────────────── */
/* LIBRO MAYOR COMPLETO                              */
/* ────────────────────────────────────────────────── */
export const exportFullLedgerPDF = (allLedgers, dateStrSuffix) => {
  if (!allLedgers || allLedgers.length === 0) return;
  const doc = new jsPDF();
  addHeader(doc, 'Libro Mayor Completo');

  let y = 40;
  
  allLedgers.forEach((ledger, idx) => {
    const account = ledger.accountInfo;
    const movements = ledger.movements || [];
    
    if (y > 250) { 
      doc.addPage(); 
      y = 20; 
    }
    
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`Cuenta: ${account.code} — ${account.name}`, 25, y);
    y += 6;
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
    doc.text(`Naturaleza: ${account.nature}`, 25, y);
    doc.setTextColor(0);

    if (movements.length === 0) {
      y += 8;
      doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(150);
      doc.text('Sin movimientos', 25, y);
      y += 15;
      doc.setTextColor(0);
      return;
    }

    const rows = movements.map((m, i) => [
      m.date, i + 1, m.description || '', m.type || '',
      m.debit ? formatQ(m.debit) : '-',
      m.credit ? formatQ(m.credit) : '-',
      formatQ(m.balance)
    ]);

    const totalDebit = ledger.totalDebit !== undefined ? ledger.totalDebit : movements.reduce((s, m) => s + (m.debit || 0), 0);
    const totalCredit = ledger.totalCredit !== undefined ? ledger.totalCredit : movements.reduce((s, m) => s + (m.credit || 0), 0);
    const finalBalance = ledger.finalBalance !== undefined ? ledger.finalBalance : movements[movements.length - 1].balance;

    autoTable(doc, {
      startY: y + 6,
      head: [['Fecha', '#', 'Descripción', 'Tipo', 'Debe', 'Haber', 'Saldo']],
      body: rows,
      foot: [['', '', '', 'TOTALES', formatQ(totalDebit), formatQ(totalCredit), formatQ(finalBalance)]],
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      footStyles: { fillColor: [240, 240, 240], textColor: [30, 30, 30], fontStyle: 'bold', fontSize: 10 },
      columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      margin: { left: 20, right: 20 }
    });
    
    y = doc.lastAutoTable.finalY + 15;
  });

  const suffix = dateStrSuffix || fileDate();
  doc.save(`libro_mayor_completo_${suffix}.pdf`);
};
