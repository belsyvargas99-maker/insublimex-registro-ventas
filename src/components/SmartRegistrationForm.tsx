import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, ArrowRight, RefreshCw, Lock, ImagePlus, X } from 'lucide-react';
import { CustomerSaleRecord } from '../types';
import { evaluateSaleRecord, autoCategorize, findCatalogProduct, CATEGORY_LABELS, DEFAULT_CATEGORY } from '../services/smartEngine';
import { CATALOG_CATEGORIES, CATALOG_PRODUCTS } from '../data/catalogo';
import { PAYMENT_METHODS, PAYMENT_TYPES, formatUSD, normalizeCedula } from '../config/brand';
import { VENEZUELA_STATES, OTHER_CITY, findState } from '../data/venezuela';

const INPUT_CLS =
  'w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition';

/** Fecha de hoy en Venezuela (YYYY-MM-DD). La fija el sistema, no el asesor. */
const todayInVenezuela = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((x) => x.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};
const formatPurchaseDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
};

interface SmartRegistrationFormProps {
  existingRecords: CustomerSaleRecord[];
  /** El servidor sube el comprobante a Drive y escribe la fila en la hoja. */
  onSubmit: (record: Omit<CustomerSaleRecord, 'id' | 'timestamp'>, receiptFile: File | null) => Promise<void>;
  isSyncing: boolean;
  connectedSheetTitle?: string;
  asesoras: string[];
}

export const SmartRegistrationForm: React.FC<SmartRegistrationFormProps> = ({
  existingRecords,
  onSubmit,
  isSyncing,
  connectedSheetTitle,
  asesoras,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cedula, setCedula] = useState('');
  const [asesora, setAsesora] = useState('');
  const [estado, setEstado] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [otraCiudad, setOtraCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const purchaseDate = useMemo(() => todayInVenezuela(), []);
  const selectedState = useMemo(() => findState(estado), [estado]);
  const ciudadFinal = ciudad === OTHER_CITY ? otraCiudad.trim() : ciudad;
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<CustomerSaleRecord['paymentMethod']>('Transferencia');
  const [paymentType, setPaymentType] = useState<NonNullable<CustomerSaleRecord['paymentType']>>('Pago completo');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [autoFixEnabled, setAutoFixEnabled] = useState(true);

  // Auto-category suggestion on product change
  useEffect(() => {
    if (productName.trim()) {
      setCategory(autoCategorize(productName));
      // Si el nombre coincide con el catálogo, precargar el precio real
      const match = findCatalogProduct(productName);
      if (match?.price != null) setUnitPrice(match.price);
    }
  }, [productName]);

  const totalAmount = Number((quantity * unitPrice).toFixed(2));

  // Live Smart Engine Evaluation
  const previewValidation = evaluateSaleRecord(
    {
      customerName,
      customerEmail,
      customerPhone,
      productName,
      category,
      quantity,
      unitPrice,
      totalAmount,
      paymentMethod,
      paymentType,
      paymentReference,
      status: 'Verificado',
      notes,
    },
    existingRecords
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail || !productName) return;
    setReceiptError(null);

    const extraFields = {
      cedula: normalizeCedula(cedula) ?? cedula.trim(),
      asesora,
      purchaseDate,
      estado,
      ciudad: ciudadFinal,
      direccion: direccion.trim(),
    };

    const dataToSubmit = autoFixEnabled
      ? {
          customerName: previewValidation.normalizedData.customerName,
          customerEmail: previewValidation.normalizedData.customerEmail,
          customerPhone: previewValidation.normalizedData.customerPhone,
          productName: productName.trim(),
          category,
          quantity,
          unitPrice,
          totalAmount: previewValidation.normalizedData.totalAmount,
          paymentMethod,
          paymentType,
          paymentReference: paymentReference.trim(),
          status: 'Verificado' as const,
          notes,
          smartValidation: {
            score: previewValidation.score,
            isDuplicatePotential: previewValidation.isDuplicatePotential,
            anomalies: previewValidation.anomalies,
            riskLevel: previewValidation.riskLevel,
            suggestedCategory: previewValidation.suggestedCategory,
          },
        }
      : {
          customerName,
          customerEmail,
          customerPhone,
          productName,
          category,
          quantity,
          unitPrice,
          totalAmount,
          paymentMethod,
          paymentType,
          paymentReference: paymentReference.trim(),
          status: 'Verificado' as const,
          notes,
          smartValidation: {
            score: previewValidation.score,
            isDuplicatePotential: previewValidation.isDuplicatePotential,
            anomalies: previewValidation.anomalies,
            riskLevel: previewValidation.riskLevel,
            suggestedCategory: previewValidation.suggestedCategory,
          },
        };

    try {
      await onSubmit({ ...dataToSubmit, ...extraFields }, receiptFile);
    } catch (err: any) {
      setReceiptError(err.message || 'No se pudo registrar la venta.');
      return;
    }

    // Reset form after submission
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCedula('');
    setEstado('');
    setCiudad('');
    setOtraCiudad('');
    setDireccion('');
    setReceiptFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setProductName('');
    setQuantity(1);
    setUnitPrice(0);
    setPaymentType('Pago completo');
    setPaymentReference('');
    setNotes('');
  };

  const handleSimulateQuickSale = () => {
    const priced = CATALOG_PRODUCTS.filter((p) => p.price != null);
    const names = ['Carlos Mendoza', 'Valentina Ríos', 'José Gregorio Morales', 'Luisana Silva', 'Andrés Duarte'];
    const chosenProd = priced[Math.floor(Math.random() * priced.length)];
    const chosenName = names[Math.floor(Math.random() * names.length)];
    const emailPrefix = chosenName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.');
    const operadora = ['412', '414', '416', '424', '426'][Math.floor(Math.random() * 5)];
    const methods: CustomerSaleRecord['paymentMethod'][] = ['Transferencia', 'Zelle', 'Efectivo'];

    setCustomerName(chosenName);
    setCustomerEmail(`${emailPrefix}@gmail.com`);
    setCustomerPhone(`0${operadora}-${Math.floor(1000000 + Math.random() * 9000000)}`);
    setProductName(chosenProd.name);
    setUnitPrice(chosenProd.price as number);
    setQuantity(1);
    setPaymentMethod(methods[Math.floor(Math.random() * methods.length)]);
    setPaymentReference(`${Math.floor(10000000 + Math.random() * 90000000)}`);
    setCedula(`V-${Math.floor(8000000 + Math.random() * 22000000)}`);
    if (asesoras.length) setAsesora(asesoras[Math.floor(Math.random() * asesoras.length)]);
    setEstado('Portuguesa');
    setCiudad('Guanare');
    setDireccion('Retiro en tienda');
  };

  return (
    <div id="smart-registration-card" className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-medium">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">
              Registrar venta cerrada por WhatsApp
            </h2>
            <p className="text-xs text-slate-500">
              Precio de catálogo automático, validación de teléfono venezolano, duplicados y referencias repetidas. Se guarda en tu Google Sheet.
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-quick-sample"
          onClick={handleSimulateQuickSale}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          Cargar ejemplo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Customer Details Row */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
            Datos del Cliente
          </span>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="input-customer-name" className="block text-xs font-medium text-slate-700 mb-1">
                Nombre Completo *
              </label>
              <input
                id="input-customer-name"
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej. María Pérez"
                className="w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition"
              />
            </div>

            <div>
              <label htmlFor="input-customer-email" className="block text-xs font-medium text-slate-700 mb-1">
                Correo Electrónico *
              </label>
              <input
                id="input-customer-email"
                type="email"
                required
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="maria@gmail.com"
                className="w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition"
              />
            </div>

            <div>
              <label htmlFor="input-customer-phone" className="block text-xs font-medium text-slate-700 mb-1">
                Teléfono / WhatsApp *
              </label>
              <input
                id="input-customer-phone"
                type="text"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="0412-1234567"
                className="w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition"
              />
            </div>
          </div>
        </div>

        {/* Identidad, asesora y fecha */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="input-cedula" className="block text-xs font-medium text-slate-700 mb-1">
              Cédula de identidad *
            </label>
            <input
              id="input-cedula"
              type="text"
              required
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              onBlur={() => {
                const n = normalizeCedula(cedula);
                if (n) setCedula(n);
              }}
              placeholder="V-12345678"
              className={`${INPUT_CLS} font-mono`}
            />
          </div>
          <div>
            <label htmlFor="select-asesora" className="block text-xs font-medium text-slate-700 mb-1">
              Asesora que atendió *
            </label>
            <select id="select-asesora" required value={asesora} onChange={(e) => setAsesora(e.target.value)} className={INPUT_CLS}>
              <option value="">Selecciona…</option>
              {asesoras.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Fecha de compra (garantía)</label>
            <div className="relative">
              <input
                type="text"
                readOnly
                tabIndex={-1}
                value={formatPurchaseDate(purchaseDate)}
                className={`${INPUT_CLS} pr-9 bg-slate-100 font-semibold cursor-not-allowed select-none`}
              />
              <Lock className="w-3.5 h-3.5 absolute right-3 top-3 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Dirección de entrega */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
            Dirección de entrega
          </span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="select-estado" className="block text-xs font-medium text-slate-700 mb-1">
                Estado *
              </label>
              <select
                id="select-estado"
                required
                value={estado}
                onChange={(e) => {
                  setEstado(e.target.value);
                  setCiudad('');
                  setOtraCiudad('');
                }}
                className={INPUT_CLS}
              >
                <option value="">Selecciona…</option>
                {VENEZUELA_STATES.map((st) => (
                  <option key={st.id} value={st.name}>
                    {st.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="select-ciudad" className="block text-xs font-medium text-slate-700 mb-1">
                Ciudad *
              </label>
              <select
                id="select-ciudad"
                required
                disabled={!selectedState}
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                className={`${INPUT_CLS} disabled:bg-slate-100 disabled:text-slate-400`}
              >
                <option value="">{selectedState ? 'Selecciona…' : 'Primero el estado'}</option>
                {selectedState?.cities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {selectedState && <option value={OTHER_CITY}>{OTHER_CITY}</option>}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="input-direccion" className="block text-xs font-medium text-slate-700 mb-1">
                Dirección específica *
              </label>
              <input
                id="input-direccion"
                type="text"
                required
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle, casa/edificio, referencia — o 'Retiro en tienda'"
                className={INPUT_CLS}
              />
            </div>
          </div>
          {ciudad === OTHER_CITY && (
            <div className="mt-3 md:w-1/2">
              <label htmlFor="input-otra-ciudad" className="block text-xs font-medium text-slate-700 mb-1">
                Escribe la ciudad o población *
              </label>
              <input
                id="input-otra-ciudad"
                type="text"
                required
                value={otraCiudad}
                onChange={(e) => setOtraCiudad(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          )}
        </div>

        {/* Product and Transaction Row */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-3">
            Detalle del Producto Adquirido
          </span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="input-product-name" className="block text-xs font-medium text-slate-700 mb-1">
                Producto o Servicio *
              </label>
              <input
                id="input-product-name"
                type="text"
                required
                list="catalogo-insublimex"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Escribe para buscar en el catálogo (o un producto fuera de lista)"
                className="w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition"
              />
              <datalist id="catalogo-insublimex">
                {CATALOG_CATEGORIES.map((cat) =>
                  CATALOG_PRODUCTS.filter((p) => p.category === cat.id).map((p) => (
                    <option key={p.id} value={p.name}>
                      {cat.label}
                      {p.price != null ? ` · ${formatUSD(p.price)}` : ''}
                    </option>
                  ))
                )}
              </datalist>
            </div>

            <div>
              <label htmlFor="select-category" className="block text-xs font-medium text-slate-700 mb-1">
                Categoría (Auto-asignada)
              </label>
              <select
                id="select-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition"
              >
                {CATEGORY_LABELS.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
                <option value={DEFAULT_CATEGORY}>{DEFAULT_CATEGORY}</option>
              </select>
            </div>

            <div>
              <label htmlFor="select-payment-method" className="block text-xs font-medium text-slate-700 mb-1">
                Método de Pago
              </label>
              <select
                id="select-payment-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label htmlFor="input-quantity" className="block text-xs font-medium text-slate-700 mb-1">
                Cantidad
              </label>
              <input
                id="input-quantity"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition"
              />
            </div>

            <div>
              <label htmlFor="input-unit-price" className="block text-xs font-medium text-slate-700 mb-1">
                Precio unitario (USD)
              </label>
              <input
                id="input-unit-price"
                type="number"
                min="0.1"
                step="0.01"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Total
              </label>
              <div className="px-3 py-2 text-sm font-semibold bg-emerald-50/50 border border-emerald-200/80 rounded-lg text-emerald-900 flex items-center justify-between">
                <span>Total:</span>
                <span>{formatUSD(totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div>
              <label htmlFor="select-payment-type" className="block text-xs font-medium text-slate-700 mb-1">
                Tipo de pago
              </label>
              <select
                id="select-payment-type"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition"
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="input-payment-reference" className="block text-xs font-medium text-slate-700 mb-1">
                Referencia de pago (N° transferencia / titular Zelle)
              </label>
              <input
                id="input-payment-reference"
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Ej. 00123456789 o Juan Pérez (Zelle)"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 text-slate-800 transition"
              />
            </div>
          </div>
        </div>

        {/* Comprobante de pago */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Captura del comprobante (transferencia, Zelle o foto de las divisas)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            className="hidden"
            onChange={(e) => {
              setReceiptError(null);
              setReceiptFile(e.target.files?.[0] ?? null);
            }}
          />
          {receiptFile ? (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-xs">
              <span className="font-semibold text-emerald-900 truncate flex-1">{receiptFile.name}</span>
              <span className="text-emerald-800">{(receiptFile.size / 1024).toFixed(0)} KB</span>
              <button
                type="button"
                onClick={() => {
                  setReceiptFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1 rounded text-slate-500 hover:text-rose-600 cursor-pointer"
                aria-label="Quitar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-dashed border-slate-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition cursor-pointer"
            >
              <ImagePlus className="w-4 h-4 text-emerald-600" />
              Adjuntar imagen o PDF
            </button>
          )}
          <p className="text-[11px] text-slate-400 mt-1">
            Queda guardada en el servidor de Insublimex y el enlace va en la hoja de ventas.
          </p>
          {receiptError && <p className="text-[11px] text-rose-600 mt-1 font-medium">{receiptError}</p>}
        </div>

        {/* Live Autonomous Validation Box */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${previewValidation.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className="text-xs font-semibold text-slate-800">
                Calidad del registro:{' '}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    previewValidation.score >= 85
                      ? 'bg-emerald-100 text-emerald-800'
                      : previewValidation.score >= 60
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {previewValidation.score}% ({previewValidation.riskLevel.toUpperCase()})
                </span>
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 font-medium select-none">
              <input
                type="checkbox"
                checked={autoFixEnabled}
                onChange={(e) => setAutoFixEnabled(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              Normalizar (nombre, correo, teléfono +58)
            </label>
          </div>

          {previewValidation.anomalies.length > 0 ? (
            <div className="space-y-1 pt-1">
              {previewValidation.anomalies.map((anomaly, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50/80 px-2.5 py-1.5 rounded-md border border-amber-200/60">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>{anomaly}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50/60 px-2.5 py-1.5 rounded-md border border-emerald-200/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Registro consistente: sin anomalías, duplicados ni referencias repetidas.</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            {connectedSheetTitle ? (
              <span>Destino: <strong className="text-slate-800">{connectedSheetTitle}</strong></span>
            ) : (
              <span>Se escribe directo en la hoja de ventas de Insublimex.</span>
            )}
          </div>

          <button
            id="btn-register-sale"
            type="submit"
            disabled={isSyncing || !customerName || !customerEmail || !productName || !cedula || !asesora || !estado || !ciudadFinal || !direccion}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-xl shadow-xs hover:shadow transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Registrando y Sincronizando...
              </>
            ) : (
              <>
                <span>Registrar venta en Google Sheets</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
