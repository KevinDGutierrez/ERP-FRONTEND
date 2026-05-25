import * as XLSX from 'xlsx';

const fileDate = () => new Date().toISOString().split('T')[0];

const saveExcel = (worksheet, sheetName, filename) => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}_${fileDate()}.xlsx`);
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

  entries.forEach((entry, idx) => {
    const num = idx + 1;
    const fecha = entry.date || '';
    const tipo = entry.type || '';
    const desc = entry.description || '';

    if (entry.details && entry.details.length > 0) {
      entry.details.forEach(d => {
        rows.push([
          num, 
          fecha, 
          tipo, 
          desc,
          d.accountCode || '', 
          d.accountName || '',
          d.debit || 0, 
          d.credit || 0
        ]);
      });
    } else {
      rows.push([num, fecha, tipo, desc, '', '', 0, 0]);
    }
    // Add empty row for readability between entries
    rows.push([]);
  });

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Set number format for Debit and Credit columns (F and G in 0-index: 6 and 7)
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = 4; R <= range.e.r; ++R) {
    const debeCell = worksheet[XLSX.utils.encode_cell({c: 6, r: R})];
    const haberCell = worksheet[XLSX.utils.encode_cell({c: 7, r: R})];
    if (debeCell && typeof debeCell.v === 'number') debeCell.z = '"Q"#,##0.00;-"Q"#,##0.00';
    if (haberCell && typeof haberCell.v === 'number') haberCell.z = '"Q"#,##0.00;-"Q"#,##0.00';
  }

  worksheet['!cols'] = [
    { wch: 8 },  // Partida
    { wch: 12 }, // Fecha
    { wch: 12 }, // Tipo
    { wch: 40 }, // Descripción
    { wch: 12 }, // Código
    { wch: 30 }, // Cuenta
    { wch: 15 }, // Debe
    { wch: 15 }  // Haber
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
    
    rows.push([
      m.date, 
      i + 1, 
      m.description || '', 
      m.type || '', 
      m.debit || 0, 
      m.credit || 0, 
      m.balance || 0
    ]);
  });

  rows.push([]);
  rows.push(['', '', 'TOTALES GENERALES', '', totalDebit, totalCredit, finalBalance]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = 6; R <= range.e.r; ++R) {
    for (let C = 4; C <= 6; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({c: C, r: R})];
      if (cell && typeof cell.v === 'number') cell.z = '"Q"#,##0.00;-"Q"#,##0.00';
    }
  }

  worksheet['!cols'] = [
    { wch: 12 }, // Fecha
    { wch: 8 },  // Partida
    { wch: 40 }, // Descripción
    { wch: 12 }, // Tipo
    { wch: 15 }, // Debe
    { wch: 15 }, // Haber
    { wch: 15 }  // Saldo
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
  rows.push(['Fecha:', new Date(data.date).toLocaleDateString('es-GT')]);
  rows.push([]);
  rows.push(['Código', 'Nombre de la Cuenta', 'Deudor', 'Acreedor']);

  (data.accounts || []).forEach(acc => {
    rows.push([
      acc.code,
      acc.name,
      acc.balance > 0 ? acc.balance : 0,
      acc.balance < 0 ? Math.abs(acc.balance) : 0
    ]);
  });

  rows.push([]);
  rows.push(['', 'TOTALES GENERALES', data.totals?.debe || 0, data.totals?.haber || 0]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = 4; R <= range.e.r; ++R) {
    for (let C = 2; C <= 3; ++C) {
      const cell = worksheet[XLSX.utils.encode_cell({c: C, r: R})];
      if (cell && typeof cell.v === 'number' && cell.v !== 0) {
        cell.z = '"Q"#,##0.00;-"Q"#,##0.00';
      } else if (cell && cell.v === 0) {
        // Clear 0s to empty for accounting clarity
        cell.v = '';
      }
    }
  }

  worksheet['!cols'] = [
    { wch: 15 }, // Código
    { wch: 40 }, // Cuenta
    { wch: 15 }, // Deudor
    { wch: 15 }  // Acreedor
  ];

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
  rows.push(['Costo de Ventas', r.totalCostos || 0]);
  rows.push(['UTILIDAD BRUTA', r.utilidadBruta || 0]);
  rows.push(['Gastos de Administración', r.totalGastos || 0]);
  rows.push([]);
  
  rows.push(['UTILIDAD NETA DEL EJERCICIO', r.utilidadNeta || 0]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = 3; R <= range.e.r; ++R) {
    const cell = worksheet[XLSX.utils.encode_cell({c: 1, r: R})];
    if (cell && typeof cell.v === 'number') {
      cell.z = '"Q"#,##0.00;-"Q"#,##0.00';
    }
  }

  worksheet['!cols'] = [
    { wch: 40 }, // Rubro
    { wch: 20 }  // Monto
  ];

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
  (data.activos || []).forEach(a => {
    rows.push([a.name, a.balance]);
  });
  rows.push(['TOTAL ACTIVO', data.totales?.activo || 0]);
  rows.push([]);
  
  rows.push(['PASIVOS', '']);
  (data.pasivos || []).forEach(p => {
    rows.push([p.name, Math.abs(p.balance)]);
  });
  rows.push([]);
  
  rows.push(['PATRIMONIO', '']);
  (data.patrimonio || []).forEach(p => {
    const isResult = p.code === '3.2.01.01' || p.id === '_resultado_ejercicio';
    const val = isResult ? p.balance : Math.abs(p.balance);
    rows.push([p.name, val]);
  });
  rows.push([]);
  
  rows.push(['TOTAL PASIVO Y CAPITAL', data.totales?.patrimonio || 0]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let R = 3; R <= range.e.r; ++R) {
    const cell = worksheet[XLSX.utils.encode_cell({c: 1, r: R})];
    if (cell && typeof cell.v === 'number') {
      cell.z = '"Q"#,##0.00;-"Q"#,##0.00';
    }
  }

  worksheet['!cols'] = [
    { wch: 40 }, // Rubro
    { wch: 20 }  // Monto
  ];

  saveExcel(worksheet, 'Balance General', 'balance_general');
};
