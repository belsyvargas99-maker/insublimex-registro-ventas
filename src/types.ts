/** Una línea del pedido. unitPrice null = producto a cotizar (fuera de catálogo o sin precio). */
export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number | null;
  category?: string;
}

export interface CustomerSaleRecord {
  id: string;
  timestamp: string; // ISO format or localized
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  /** Cédula de identidad normalizada (V-12345678). */
  cedula?: string;
  /** Asesora de INSUBLIMEX que atendió la venta. */
  asesora?: string;
  /** Fecha de compra fijada por el servidor (YYYY-MM-DD, hora de Venezuela). Base de la garantía: no editable. */
  purchaseDate?: string;
  estado?: string;
  ciudad?: string;
  direccion?: string;
  /** Enlace a la imagen del comprobante (Google Drive) o ruta local /uploads/... */
  receiptImageUrl?: string;
  /** Resumen del pedido: "Combo Iniciador ×1 | Papel Qualitex ×2". */
  productName: string;
  category: string;
  /** Total de unidades del pedido. */
  quantity: number;
  /** Total del pedido según catálogo (suma de precio × cantidad). */
  unitPrice: number;
  /** Monto realmente pagado. */
  totalAmount: number;
  items?: OrderItem[];
  paymentMethod: 'Transferencia' | 'Zelle' | 'Efectivo';
  /** Pago completo o seña inicial (equipos de importación directa). */
  paymentType?: 'Pago completo' | 'Abono inicial';
  /** N° de referencia de transferencia / confirmación Zelle. */
  paymentReference?: string;
  status: 'Completado' | 'Pendiente' | 'Verificado';
  /** De dónde entró: 'portal-cliente' (el cliente lo llenó) o 'panel-asesora'. */
  source?: string;
  notes?: string;
  syncedToSheets?: boolean;
  sheetsRowIndex?: number;
  smartValidation?: {
    score: number; // 0 to 100
    isDuplicatePotential: boolean;
    anomalies: string[];
    riskLevel: 'bajo' | 'medio' | 'alto';
    suggestedCategory?: string;
  };
}

export interface SheetConfig {
  spreadsheetId: string;
  sheetName: string;
  spreadsheetUrl: string;
  title: string;
}

export interface SheetSyncLog {
  id: string;
  timestamp: string;
  type: 'sync' | 'create_sheet' | 'validation' | 'error';
  message: string;
  status: 'success' | 'warning' | 'error';
  details?: string;
}

export interface SmartSummaryMetrics {
  totalRevenue: number;
  totalTransactions: number;
  uniqueCustomers: number;
  topProduct: string;
  averageTicket: number;
  syncRate: number;
}
