// Definición única de las columnas de la hoja "Ventas". La usan el servidor
// (para escribir y leer) y el panel (para mostrar). Si se cambia el orden aquí,
// cambia en todos lados a la vez.

import { CustomerSaleRecord } from '../types';

export const SHEET_COLUMNS = [
  'ID Registro',
  'Fecha y Hora de Registro',
  'Fecha de Compra',
  'Cliente',
  'Cédula',
  'Email',
  'Teléfono',
  'Estado',
  'Ciudad',
  'Dirección',
  'Asesora',
  'Producto',
  'Categoría',
  'Cantidad',
  'Total Catálogo ($)',
  'Monto Pagado ($)',
  'Método de Pago',
  'Tipo de Pago',
  'Referencia de Pago',
  'Comprobante (imagen)',
  'Estado del Registro',
  'Origen',
  'Score',
  'Nivel Riesgo',
  'Notas / Validación',
] as const;

export const COL = Object.fromEntries(SHEET_COLUMNS.map((c, i) => [c, i])) as Record<(typeof SHEET_COLUMNS)[number], number>;

export function recordToRowValues(record: CustomerSaleRecord): (string | number)[] {
  return [
    record.id,
    record.timestamp,
    record.purchaseDate ?? '',
    record.customerName,
    record.cedula ?? '',
    record.customerEmail,
    record.customerPhone,
    record.estado ?? '',
    record.ciudad ?? '',
    record.direccion ?? '',
    record.asesora ?? '',
    record.productName,
    record.category,
    record.quantity,
    record.unitPrice,
    record.totalAmount,
    record.paymentMethod,
    record.paymentType ?? 'Pago completo',
    record.paymentReference ?? '',
    record.receiptImageUrl ?? '',
    record.status,
    record.source ?? '',
    record.smartValidation?.score ?? 100,
    record.smartValidation?.riskLevel ?? 'bajo',
    [
      record.notes,
      record.smartValidation?.anomalies?.length ? `Validaciones: ${record.smartValidation.anomalies.join('; ')}` : '',
    ]
      .filter(Boolean)
      .join(' | '),
  ];
}

const num = (v: string | undefined) => {
  const n = parseFloat(String(v ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

/** Convierte una fila de la hoja en un registro. `rowNumber` es 1-based (fila real en la hoja). */
export function rowToRecord(row: string[], rowNumber: number): CustomerSaleRecord | null {
  const get = (name: (typeof SHEET_COLUMNS)[number]) => row[COL[name]] ?? '';
  const id = get('ID Registro');
  if (!id) return null;
  const notesRaw = get('Notas / Validación');
  const [notes, validations] = notesRaw.split(' | Validaciones: ');
  const status = get('Estado del Registro') as CustomerSaleRecord['status'];
  return {
    id,
    timestamp: get('Fecha y Hora de Registro'),
    purchaseDate: get('Fecha de Compra'),
    customerName: get('Cliente'),
    cedula: get('Cédula'),
    customerEmail: get('Email'),
    customerPhone: get('Teléfono'),
    estado: get('Estado'),
    ciudad: get('Ciudad'),
    direccion: get('Dirección'),
    asesora: get('Asesora'),
    productName: get('Producto'),
    category: get('Categoría'),
    quantity: num(get('Cantidad')) || 1,
    unitPrice: num(get('Total Catálogo ($)')),
    totalAmount: num(get('Monto Pagado ($)')),
    paymentMethod: (get('Método de Pago') || 'Transferencia') as CustomerSaleRecord['paymentMethod'],
    paymentType: (get('Tipo de Pago') || 'Pago completo') as CustomerSaleRecord['paymentType'],
    paymentReference: get('Referencia de Pago'),
    receiptImageUrl: get('Comprobante (imagen)'),
    status: ['Pendiente', 'Verificado', 'Completado'].includes(status) ? status : 'Pendiente',
    source: get('Origen'),
    notes: notes || '',
    syncedToSheets: true,
    sheetsRowIndex: rowNumber,
    smartValidation: {
      score: num(get('Score')) || 100,
      riskLevel: (get('Nivel Riesgo') || 'bajo') as 'bajo' | 'medio' | 'alto',
      isDuplicatePotential: /duplicado|ya fue usada/i.test(validations || ''),
      anomalies: validations ? validations.split('; ') : [],
    },
  };
}
