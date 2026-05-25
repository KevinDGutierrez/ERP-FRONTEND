import * as XLSX from 'xlsx-js-style';

const fileDate = () => new Date().toISOString().split('T')[0];

const saveExcel = (worksheet, sheetName, filename) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}_${fileDate()}.xlsx`);
};

const STYLES = {
  title: { font: { bold: true, sz: 14, color: { rgb: "111827" } }, alignment: { vertical: "center", horizontal: "left" } },
  subtitle: { font: { color: { rgb: "4B5563" }, italic: true }, alignment: { vertical: "center", horizontal: "left" } },
  tableHead: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "3B82F6" } }, alignment: { vertical: "center", horizontal: "center" } },
  tableHeadDark: { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1F2937" } }, alignment: { vertical: "center", horizontal: "center" } },
  totalRow: { font: { bold: true, color: { rgb: "111827" } }, fill: { fgColor: { rgb: "F3F4F6" } }, alignment: { vertical: "center", horizontal: "right" } },
  totalRowLabel: { font: { bold: true, color: { rgb: "111827" } }, fill: { fgColor: { rgb: "F3F4F6" } }, alignment: { vertical: "center", horizontal: "left" } },
  entrySubtotal: { font: { bold: true, color: { rgb: "1E40AF" } }, fill: { fgColor: { rgb: "EFF6FF" } }, alignment: { vertical: "center", horizontal: "right" } },
  entrySubtotalLabel: { font: { bold: true, color: { rgb: "1E40AF" } }, fill: { fgColor: { rgb: "EFF6FF" } }, alignment: { vertical: "center", horizontal: "left" } },
  sectionTitle: { font: { bold: true, color: { rgb: "374151" } }, fill: { fgColor: { rgb: "E5E7EB" } }, alignment: { vertical: "center", horizontal: "left" } },
  defaultText: { alignment: { vertical: "center", horizontal: "left" } },
  defaultNumber: { alignment: { vertical: "center", horizontal: "right" } }
};

const applyRowStyle = (worksheet, rowIndex, colsCount, styleObj) => {
  for (let c = 0; c < colsCount; c++) {
    const cellRef = XLSX.utils.encode_cell({ c: c, r: rowIndex });
    if (!worksheet[cellRef]) worksheet[cellRef] = { v: '', t: 's' };
    worksheet[cellRef].s = { ...worksheet[cellRef].s, ...styleObj };
  }
};

const applyCellStyle = (worksheet, r, c, styleObj) => {
  const cellRef = XLSX.utils.encode_cell({ c, r });
  if (!worksheet[cellRef]) worksheet[cellRef] = { v: '', t: 's' };
  worksheet[cellRef].s = { ...worksheet[cellRef].s, ...styleObj };
};

/* ────────────────────────────────────────────────── */
/* LIBRO DIARIO                                      */
/* ────────────────────────────────────────────────── */
export const exportJournalExcel = (entries) => {
  if (!entries || entries.length === 0) return;

  const rows = [];
  rows.push(['LIBRO DIARIO']);
  rows.push(['Generado el:', new Date().toLocaleDateString('es-GT')]);
  rows.push([]);
  rows.push(['Partida', 'Fecha', 'Tipo', 'Descripción', 'Código', 'Cuenta', 'Debe', 'Haber']);

  let grandTotalDebit = 0;
  let grandTotalCredit = 0;

  entries.forEach((entry, idx) => {
    const num = idx + 1;
    const fecha = entry.date || '';
    const tipo = entry.type || '';
    const desc = entry.description || '';

    let entryDebit = 0;
    let entryCredit = 0;

    if (entry.details && entry.details.length > 0) {
      entry.details.forEach(d => {
        entryDebit += (d.debit || 0);
        entryCredit += (d.credit || 0);
        rows.push([
          num, fecha, tipo, desc,
          d.accountCode || '', d.accountName || '',
          d.debit || 0, d.credit || 0
        ]);
      });
    } else {
      rows.push([num, fecha, tipo, desc, '', '', 0, 0]);
    }

    grandTotalDebit += entryDebit;
    grandTotalCredit += entryCredit;

    // Subtotal de la partida
    rows.push(['', '', '', `Total Partida #${num}`, '', '', entryDebit, entryCredit]);
    // Espacio
    rows.push([]);
  });

  rows.push(['', '', '', 'TOTALES GENERALES', '', '', grandTotalDebit, grandTotalCredit]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(worksheet['!ref']);

  // Aplicar Estilos
  applyRowStyle(worksheet, 0, 8, STYLES.title);
  applyRowStyle(worksheet, 1, 8, STYLES.subtitle);
  applyRowStyle(worksheet, 3, 8, STYLES.tableHeadDark);

  for (let R = 4; R <= range.e.r; ++R) {
    const debeCell = worksheet[XLSX.utils.encode_cell({c: 6, r: R})];
    const haberCell = worksheet[XLSX.utils.encode_cell({c: 7, r: R})];
    const descCell = worksheet[XLSX.utils.encode_cell({c: 3, r: R})];
    
    if (debeCell && typeof debeCell.v === 'number') debeCell.z = '"Q"#,##0.00;-"Q"#,##0.00';
    if (haberCell && typeof haberCell.v === 'number') haberCell.z = '"Q"#,##0.00;-"Q"#,##0.00';

    if (descCell && typeof descCell.v === 'string' && descCell.v.startsWith('Total Partida #')) {
      applyRowStyle(worksheet, R, 8, STYLES.entrySubtotal);
      applyCellStyle(worksheet, R, 3, STYLES.entrySubtotalLabel);
    }
  }

  // Estilo Totales Generales
  applyRowStyle(worksheet, range.e.r, 8, STYLES.totalRow);
  applyCellStyle(worksheet, range.e.r, 3, STYLES.totalRowLabel);

  worksheet['!cols'] = [
    { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 45 },
    { wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 18 }
  ];

  saveExcel(worksheet, 'Libro Diario', 'libro_diario');
};

/* ────────────────────────────────────────────────── */
/* LIBRO MAYOR                                       */
/* ────────────────────────────────────────────────── */
export const exportLedgerExcel = (account, movements) => {
  if (!movements || movements.length === 0) return;

  const rows = [];
  rows.push(['LIBRO MAYOR']);
  rows.push(['Cuenta:', `${account.code} - ${account.name}`]);
  rows.push(['Naturaleza:', account.nature]);
  rows.push(['Generado el:', new Date().toLocaleDateString('es-GT')]);
  rows.push([]);
  rows.push(['Fecha', 'Partida', 'Descripción', 'Tipo', 'Debe', 'Haber', 'Saldo']);

  let totalDebit = 0;
  let totalCredit = 0;
  let finalBalance = 0;

  movements.forEach((m, i) => {
    totalDebit += (m.debit || 0);
    totalCredit += (m.credit || 0);
    finalBalance = m.balance;
    
    rows.push([m.date, i + 1, m.description || '', m.type || '', m.debit || 0, m.credit || 0, m.balance || 0]);
  });

  rows.push([]);
  rows.push(['', '', 'TOTALES GENERALES', '', totalDebit, totalCredit, finalBalance]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(worksheet['!ref']);

  applyRowStyle(worksheet, 0, 7, STYLES.title);
  applyRowStyle(worksheet, 1, 7, STYLES.subtitle);
  applyRowStyle(worksheet, 2, 7, STYLES.subtitle);
  applyRowStyle(worksheet, 3, 7, STYLES.subtitle);
  applyRowStyle(worksheet, 5, 7, STYLES.tableHeadDark);

  for (let R = 6; R <= range.e.r; ++R) {
    for (let C = 4; C <= 6; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({c: C, r: R})];
      if (cell && typeof cell.v === 'number') cell.z = '"Q"#,##0.00;-"Q"#,##0.00';
    }
  }

  applyRowStyle(worksheet, range.e.r, 7, STYLES.totalRow);
  applyCellStyle(worksheet, range.e.r, 2, STYLES.totalRowLabel);

  worksheet['!cols'] = [
    { wch: 14 }, { wch: 10 }, { wch: 45 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }
  ];

  const safeName = (account.name || 'cuenta').toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  saveExcel(worksheet, 'Libro Mayor', `libro_mayor_${safeName}`);
};

/* ────────────────────────────────────────────────── */
/* BALANCE DE COMPROBACIÓN / SALDOS AJUSTADO         */
/* ────────────────────────────────────────────────── */
export const exportTrialBalanceExcel = (data, isAdjusted = false) => {
  const rows = [];
  const title = isAdjusted ? 'BALANCE DE SALDOS AJUSTADO' : 'BALANCE DE COMPROBACIÓN';
  rows.push([title]);
  rows.push(['Generado el:', new Date(data.date).toLocaleDateString('es-GT')]);
  rows.push([]);
  rows.push(['Código', 'Nombre de la Cuenta', 'Deudor', 'Acreedor']);

  (data.accounts || []).forEach(acc => {
    rows.push([acc.code, acc.name, acc.balance > 0 ? acc.balance : 0, acc.balance < 0 ? Math.abs(acc.balance) : 0]);
  });

  rows.push([]);
  rows.push(['', 'TOTALES GENERALES', data.totals?.debe || 0, data.totals?.haber || 0]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(worksheet['!ref']);

  applyRowStyle(worksheet, 0, 4, STYLES.title);
  applyRowStyle(worksheet, 1, 4, STYLES.subtitle);
  applyRowStyle(worksheet, 3, 4, STYLES.tableHeadDark);

  for (let R = 4; R <= range.e.r; ++R) {
    for (let C = 2; C <= 3; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({c: C, r: R})];
      if (cell && typeof cell.v === 'number' && cell.v !== 0) {
        cell.z = '"Q"#,##0.00;-"Q"#,##0.00';
      } else if (cell && cell.v === 0) {
        cell.v = '';
      }
    }
  }

  applyRowStyle(worksheet, range.e.r, 4, STYLES.totalRow);
  applyCellStyle(worksheet, range.e.r, 1, STYLES.totalRowLabel);

  worksheet['!cols'] = [{ wch: 18 }, { wch: 45 }, { wch: 20 }, { wch: 20 }];
  const filename = isAdjusted ? 'balance_saldos_ajustado' : 'balance_comprobacion';
  saveExcel(worksheet, 'Saldos', filename);
};

/* ────────────────────────────────────────────────── */
/* ESTADO DE RESULTADOS                              */
/* ────────────────────────────────────────────────── */
export const exportPnLExcel = (data) => {
  const r = data.resumen || {};
  const rows = [];
  
  rows.push(['ESTADO DE RESULTADOS']);
  rows.push(['Generado el:', new Date().toLocaleDateString('es-GT')]);
  rows.push([]);
  
  rows.push(['INGRESOS DE OPERACIÓN']);
  rows.push(['Ventas y Servicios', r.totalIngresos || 0]);
  rows.push(['TOTAL INGRESOS', r.totalIngresos || 0]);
  rows.push([]);
  
  rows.push(['COSTOS Y GASTOS']);
  rows.push(['Costo de Ventas', -(r.totalCostos || 0)]);
  rows.push(['UTILIDAD BRUTA', r.utilidadBruta || 0]);
  rows.push(['Gastos de Administración', -(r.totalGastos || 0)]);
  rows.push([]);
  
  rows.push(['UTILIDAD NETA DEL EJERCICIO', r.utilidadNeta || 0]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(worksheet['!ref']);

  applyRowStyle(worksheet, 0, 2, STYLES.title);
  applyRowStyle(worksheet, 1, 2, STYLES.subtitle);
  
  applyRowStyle(worksheet, 3, 2, STYLES.sectionTitle); // INGRESOS
  applyRowStyle(worksheet, 5, 2, STYLES.entrySubtotal); // TOTAL INGRESOS
  applyCellStyle(worksheet, 5, 0, STYLES.entrySubtotalLabel);

  applyRowStyle(worksheet, 7, 2, STYLES.sectionTitle); // COSTOS Y GASTOS
  applyRowStyle(worksheet, 9, 2, STYLES.entrySubtotal); // UTILIDAD BRUTA
  applyCellStyle(worksheet, 9, 0, STYLES.entrySubtotalLabel);

  applyRowStyle(worksheet, 12, 2, STYLES.totalRow); // UTILIDAD NETA
  applyCellStyle(worksheet, 12, 0, STYLES.totalRowLabel);

  for (let R = 3; R <= range.e.r; ++R) {
    const cell = worksheet[XLSX.utils.encode_cell({c: 1, r: R})];
    if (cell && typeof cell.v === 'number') cell.z = '"Q"#,##0.00;[Red]-"Q"#,##0.00';
  }

  worksheet['!cols'] = [{ wch: 50 }, { wch: 25 }];
  saveExcel(worksheet, 'Resultados', 'estado_resultados');
};

/* ────────────────────────────────────────────────── */
/* BALANCE GENERAL                                   */
/* ────────────────────────────────────────────────── */
export const exportBalanceSheetExcel = (data) => {
  const rows = [];
  rows.push(['BALANCE GENERAL']);
  rows.push(['Generado el:', new Date().toLocaleDateString('es-GT')]);
  rows.push([]);
  
  rows.push(['ACTIVOS', '']);
  let y = 3;
  (data.activos || []).forEach(a => { rows.push([a.name, a.balance]); });
  rows.push(['TOTAL ACTIVO', data.totales?.activo || 0]);
  const totalActivoRow = rows.length - 1;
  rows.push([]);
  
  rows.push(['PASIVOS', '']);
  const pasivosHeaderRow = rows.length - 1;
  (data.pasivos || []).forEach(p => { rows.push([p.name, Math.abs(p.balance)]); });
  rows.push([]);
  
  rows.push(['PATRIMONIO', '']);
  const patrimonioHeaderRow = rows.length - 1;
  (data.patrimonio || []).forEach(p => {
    const isResult = p.code === '3.2.01.01' || p.id === '_resultado_ejercicio';
    const val = isResult ? p.balance : Math.abs(p.balance);
    rows.push([p.name, val]);
  });
  rows.push([]);
  
  rows.push(['TOTAL PASIVO Y CAPITAL', data.totales?.patrimonio || 0]);
  const totalPasivoCapitalRow = rows.length - 1;

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const range = XLSX.utils.decode_range(worksheet['!ref']);

  applyRowStyle(worksheet, 0, 2, STYLES.title);
  applyRowStyle(worksheet, 1, 2, STYLES.subtitle);
  
  applyRowStyle(worksheet, 3, 2, STYLES.sectionTitle); // ACTIVOS
  applyRowStyle(worksheet, totalActivoRow, 2, STYLES.totalRow);
  applyCellStyle(worksheet, totalActivoRow, 0, STYLES.totalRowLabel);

  applyRowStyle(worksheet, pasivosHeaderRow, 2, STYLES.sectionTitle); // PASIVOS
  applyRowStyle(worksheet, patrimonioHeaderRow, 2, STYLES.sectionTitle); // PATRIMONIO

  applyRowStyle(worksheet, totalPasivoCapitalRow, 2, STYLES.totalRow);
  applyCellStyle(worksheet, totalPasivoCapitalRow, 0, STYLES.totalRowLabel);

  for (let R = 3; R <= range.e.r; ++R) {
    const cell = worksheet[XLSX.utils.encode_cell({c: 1, r: R})];
    if (cell && typeof cell.v === 'number') cell.z = '"Q"#,##0.00;[Red]-"Q"#,##0.00';
  }

  worksheet['!cols'] = [{ wch: 50 }, { wch: 25 }];
  saveExcel(worksheet, 'Balance General', 'balance_general');
};
