import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Send,
  ShoppingBag,
  User,
  Mail,
  Phone,
  DollarSign,
  Landmark,
  Banknote,
  ShieldCheck,
  RefreshCw,
  Printer,
  Sparkles,
  ArrowLeft,
  Clock,
  MessageCircle,
  Search,
  IdCard,
  UserRound,
  CalendarDays,
  Lock,
  MapPin,
  ImagePlus,
  X,
} from 'lucide-react';
import { BRAND, PAYMENT_METHODS, PAYMENT_TYPES, PaymentMethodId, PaymentTypeId, formatUSD, whatsappLink, normalizeCedula } from '../config/brand';
import { CATALOG_CATEGORIES, CATALOG_PRODUCTS, CatalogProduct } from '../data/catalogo';
import { VENEZUELA_STATES, OTHER_CITY, findState } from '../data/venezuela';

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

/** Muestra una fecha YYYY-MM-DD como "12 de septiembre de 2026". */
const formatPurchaseDate = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' });
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(file);
  });

interface PublicCustomerFormProps {
  onBackToAdmin?: () => void;
  isAdminViewing?: boolean;
}

const OTHER_PRODUCT = '__otro__';

const PAYMENT_ICON: Record<PaymentMethodId, React.ElementType> = {
  Transferencia: Landmark,
  Zelle: DollarSign,
  Efectivo: Banknote,
};

const inputCls =
  'w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition';

export const PublicCustomerForm: React.FC<PublicCustomerFormProps> = ({
  onBackToAdmin,
  isAdminViewing = false,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [cedula, setCedula] = useState('');
  const [asesora, setAsesora] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [asesoras, setAsesoras] = useState<string[]>([]);
  const [estado, setEstado] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [otraCiudad, setOtraCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [productFilter, setProductFilter] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customProductName, setCustomProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [amountTouched, setAmountTouched] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId>('Transferencia');
  const [paymentType, setPaymentType] = useState<PaymentTypeId>('Pago completo');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState('');
  const [submissionTimestamp, setSubmissionTimestamp] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // La fecha de compra la fija el servidor (hora de Venezuela). Aquí solo se muestra.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/purchase-date')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        if (d.purchaseDate) setPurchaseDate(d.purchaseDate);
        if (Array.isArray(d.asesoras)) setAsesoras(d.asesoras);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedState = useMemo(() => findState(estado), [estado]);
  const ciudadFinal = ciudad === OTHER_CITY ? otraCiudad.trim() : ciudad;

  const handleReceiptChange = async (file: File | null) => {
    setErrorMessage(null);
    if (!file) {
      setReceiptFile(null);
      setReceiptPreview('');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setErrorMessage('La imagen supera los 6 MB. Toma la captura de nuevo o envía una más liviana.');
      return;
    }
    setReceiptFile(file);
    setReceiptPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
  };

  const selectedProduct: CatalogProduct | null = useMemo(
    () => CATALOG_PRODUCTS.find((p) => p.id === selectedProductId) ?? null,
    [selectedProductId]
  );
  const isOther = selectedProductId === OTHER_PRODUCT;
  const productName = isOther ? customProductName.trim() : selectedProduct?.name ?? '';

  const catalogTotal = selectedProduct?.price != null ? selectedProduct.price * quantity : null;
  const amountNumber = parseFloat(amountPaid) || 0;
  const balance = catalogTotal != null && paymentType === 'Abono inicial' ? Math.max(0, catalogTotal - amountNumber) : 0;

  const filteredProducts = useMemo(() => {
    const q = productFilter
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
    if (!q) return CATALOG_PRODUCTS;
    return CATALOG_PRODUCTS.filter((p) =>
      p.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .includes(q)
    );
  }, [productFilter]);

  const syncAmountFromCatalog = (product: CatalogProduct | null, qty: number, type: PaymentTypeId) => {
    if (product?.price != null && type === 'Pago completo') {
      setAmountPaid((product.price * qty).toFixed(2));
      setAmountTouched(false);
    }
  };

  const handleSelectProduct = (id: string) => {
    setSelectedProductId(id);
    const product = CATALOG_PRODUCTS.find((p) => p.id === id) ?? null;
    if (!amountTouched || product) syncAmountFromCatalog(product, quantity, paymentType);
  };

  const handleQuantityChange = (newQty: number) => {
    const qty = Math.max(1, newQty);
    setQuantity(qty);
    syncAmountFromCatalog(selectedProduct, qty, paymentType);
  };

  const handlePaymentTypeChange = (type: PaymentTypeId) => {
    setPaymentType(type);
    if (type === 'Pago completo') {
      syncAmountFromCatalog(selectedProduct, quantity, type);
    } else {
      setAmountPaid('');
      setAmountTouched(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim() || !customerEmail.trim() || !customerPhone.trim()) {
      setErrorMessage('Completa tu nombre, correo y WhatsApp para poder contactarte por la entrega.');
      return;
    }
    const cedulaNorm = normalizeCedula(cedula);
    if (!cedulaNorm) {
      setErrorMessage('Indica tu cédula de identidad (ej. V-12345678).');
      return;
    }
    if (!asesora) {
      setErrorMessage('Selecciona la asesora que te atendió.');
      return;
    }
    if (!estado || !ciudadFinal || !direccion.trim()) {
      setErrorMessage('Indica el estado, la ciudad y la dirección de entrega.');
      return;
    }
    if (!productName) {
      setErrorMessage('Selecciona el producto que compraste (o escríbelo si no aparece en la lista).');
      return;
    }
    if (amountNumber <= 0) {
      setErrorMessage('Indica el monto que pagaste en USD.');
      return;
    }
    if (paymentMethod !== 'Efectivo' && !paymentReference.trim()) {
      setErrorMessage(
        paymentMethod === 'Zelle'
          ? 'Indica el nombre del titular de la cuenta Zelle o el número de confirmación.'
          : 'Indica el número de referencia de la transferencia (aparece en tu comprobante bancario).'
      );
      return;
    }
    if (!receiptFile && paymentMethod !== 'Efectivo') {
      setErrorMessage('Adjunta la captura del comprobante de pago.');
      return;
    }

    let receiptImage = '';
    if (receiptFile) {
      try {
        receiptImage = await readFileAsDataUrl(receiptFile);
      } catch (err: any) {
        setErrorMessage(err.message);
        return;
      }
    }

    const payload = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim().toLowerCase(),
      customerPhone: customerPhone.trim(),
      cedula: cedulaNorm,
      asesora,
      estado,
      ciudad: ciudadFinal,
      direccion: direccion.trim(),
      receiptImage,
      productName,
      quantity: Number(quantity) || 1,
      totalAmount: Number(amountNumber.toFixed(2)),
      paymentMethod,
      paymentType,
      paymentReference: paymentReference.trim(),
      notes: [
        selectedProduct?.price != null ? `Precio catálogo: ${formatUSD(selectedProduct.price)} c/u` : 'Producto fuera de catálogo',
        paymentType === 'Abono inicial' && catalogTotal != null ? `Saldo pendiente: ${formatUSD(balance)}` : '',
        notes.trim(),
      ]
        .filter(Boolean)
        .join(' | '),
      source: 'portal-clientes-insublimex',
    };

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/public/submit-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSubmissionId(data.receiptId);
        setSubmissionTimestamp(data.timestamp || new Date().toISOString());
        if (data.purchaseDate) setPurchaseDate(data.purchaseDate);
        setIsSubmitted(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        throw new Error(data.error || 'No pudimos registrar tu pago. Intenta de nuevo.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error de conexión. Verifica tu internet e intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setCustomerName('');
    setCustomerEmail('');
    setCustomerPhone('');
    setCedula('');
    setAsesora('');
    setEstado('');
    setCiudad('');
    setOtraCiudad('');
    setDireccion('');
    setReceiptFile(null);
    setReceiptPreview('');
    setProductFilter('');
    setSelectedProductId('');
    setCustomProductName('');
    setQuantity(1);
    setAmountPaid('');
    setAmountTouched(false);
    setPaymentType('Pago completo');
    setPaymentReference('');
    setNotes('');
    setIsSubmitted(false);
    setErrorMessage(null);
  };

  const whatsappReceiptText = `Hola INSUBLIMEX 👋 Ya registré mi pago en el portal.
Comprobante: ${submissionId}
Producto: ${productName}${quantity > 1 ? ` x${quantity}` : ''}
Monto: ${formatUSD(amountNumber)} (${paymentMethod}${paymentType === 'Abono inicial' ? ', abono inicial' : ''})${paymentReference ? `\nReferencia: ${paymentReference}` : ''}
Fecha de compra: ${formatPurchaseDate(purchaseDate)}
Nombre: ${customerName} · CI ${normalizeCedula(cedula) ?? cedula}
Asesora: ${asesora}
Entrega: ${ciudadFinal}, ${estado}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans selection:bg-emerald-500 selection:text-white">
      {isAdminViewing && onBackToAdmin && (
        <div className="bg-slate-900 text-white px-4 py-2.5 text-xs border-b border-slate-700 shadow-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] uppercase tracking-wider">
                <Sparkles className="w-3 h-3" /> Vista previa del asesor
              </span>
              <span className="text-slate-300 hidden sm:inline">
                Así ve el portal tu cliente. No tiene acceso al panel ni a la hoja de Google Sheets.
              </span>
            </div>
            <button
              type="button"
              onClick={onBackToAdmin}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-100 text-slate-950 font-bold rounded-lg transition shrink-0 cursor-pointer shadow-xs text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al Panel</span>
            </button>
          </div>
        </div>
      )}

      {/* Cabecera de marca */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={BRAND.logo}
              alt={BRAND.name}
              className="h-10 w-10 rounded-full object-cover shrink-0"
            />
            <div className="min-w-0">
              <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-emerald-700 block">
                {BRAND.name}
              </span>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight truncate">
                Confirmación de pago
              </h1>
            </div>
          </div>
          <a
            href={whatsappLink('Hola, tengo una duda con el registro de mi pago')}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-[11px] font-semibold hover:bg-emerald-100 transition shrink-0"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">¿Dudas? Escríbenos</span>
            <span className="sm:hidden">WhatsApp</span>
          </a>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-10">
        {isSubmitted ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden print:shadow-none">
            <div className="bg-gradient-to-r from-emerald-500 via-emerald-700 to-teal-600 text-white p-6 sm:p-8 text-center">
              <div className="w-16 h-16 bg-white/15 rounded-full mx-auto flex items-center justify-center mb-3 ring-4 ring-white/20">
                <CheckCircle2 className="w-10 h-10 text-amarillo" />
              </div>
              <span className="inline-block px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest bg-white/20 text-white rounded-full mb-2">
                Pago registrado
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                ¡Gracias, {(customerName.trim().split(/\s+/)[0] || '').replace(/^./, (c) => c.toUpperCase())}!
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100 mt-2 max-w-md mx-auto leading-relaxed">
                Tu pago quedó registrado en {BRAND.name}. Guarda tu número de comprobante: es tu respaldo mientras confirmamos el pago y coordinamos la entrega.
              </p>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                      N° de comprobante
                    </span>
                    <span className="font-mono text-base font-black text-slate-900 tracking-wide">
                      {submissionId}
                    </span>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block tracking-wider">
                      Fecha y hora
                    </span>
                    <span className="text-slate-700 font-medium flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {new Date(submissionTimestamp || Date.now()).toLocaleString('es-VE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Cliente</span>
                    <span className="font-bold text-slate-800 text-sm block">{customerName}</span>
                    <span className="text-slate-500 text-[11px] block">CI {normalizeCedula(cedula) ?? cedula}</span>
                    <span className="text-slate-500 text-[11px] block">{customerEmail}</span>
                    <span className="text-slate-500 text-[11px] block">{customerPhone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Producto</span>
                    <span className="font-bold text-slate-800 text-sm block">{productName}</span>
                    <span className="text-slate-500 text-[11px] block">
                      Cantidad: {quantity} · {paymentMethod}
                      {paymentType === 'Abono inicial' ? ' · Abono inicial' : ''}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Fecha de compra (garantía)</span>
                    <span className="font-bold text-slate-800 block">{formatPurchaseDate(purchaseDate)}</span>
                    <span className="text-slate-500 text-[11px] block">Atendió: {asesora}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Entrega</span>
                    <span className="font-semibold text-slate-800 block">{ciudadFinal}, {estado}</span>
                    <span className="text-slate-500 text-[11px] block">{direccion}</span>
                  </div>
                </div>

                {paymentReference && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-slate-500">Referencia de pago</span>
                    <span className="font-mono font-semibold text-slate-800">{paymentReference}</span>
                  </div>
                )}
                {receiptPreview && (
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-400 block text-[11px] mb-1.5">Comprobante adjunto</span>
                    <img src={receiptPreview} alt="Comprobante de pago" className="max-h-48 rounded-lg border border-slate-200" />
                  </div>
                )}

                <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-sm">
                  <span className="font-bold text-slate-700">
                    {paymentType === 'Abono inicial' ? 'Abono registrado' : 'Total pagado'}
                  </span>
                  <span className="text-xl font-black text-emerald-700">{formatUSD(amountNumber)}</span>
                </div>
                {paymentType === 'Abono inicial' && catalogTotal != null && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Saldo pendiente (según catálogo)</span>
                    <span className="font-semibold">{formatUSD(balance)}</span>
                  </div>
                )}
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 text-xs text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold text-emerald-950">¿Qué sigue?</p>
                  <p>
                    Un asesor verifica tu pago y te escribe por WhatsApp para coordinar la entrega o el retiro. Si quieres agilizarlo, envíale tu número de comprobante con el botón de abajo.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 print:hidden">
                <a
                  href={whatsappLink(whatsappReceiptText)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar comprobante por WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer border border-slate-200"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Imprimir / Guardar PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Registrar otro pago</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xl">
            <div className="mb-6 space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Registra el pago de tu pedido
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Si ya acordaste tu compra con un asesor por WhatsApp y realizaste el pago, completa estos datos para que quede registrado y podamos coordinar la entrega.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Datos del cliente */}
              <div className="space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span>1. Tus datos</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Nombre y apellido *</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ej: María Pérez"
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">WhatsApp *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="0412-1234567"
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Por aquí te confirmamos el pago y la entrega.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Correo electrónico *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="maria@gmail.com"
                        className={`${inputCls} pl-10`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Cédula de identidad *</label>
                    <div className="relative">
                      <IdCard className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        inputMode="numeric"
                        value={cedula}
                        onChange={(e) => setCedula(e.target.value)}
                        onBlur={() => {
                          const n = normalizeCedula(cedula);
                          if (n) setCedula(n);
                        }}
                        placeholder="V-12345678"
                        className={`${inputCls} pl-10 font-mono`}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Asesora que te atendió *</label>
                    <div className="relative">
                      <UserRound className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                      <select
                        required
                        value={asesora}
                        onChange={(e) => setAsesora(e.target.value)}
                        className={`${inputCls} pl-10`}
                      >
                        <option value="">Selecciona…</option>
                        {asesoras.map((a) => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Fecha de compra</label>
                    <div className="relative">
                      <CalendarDays className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="text"
                        readOnly
                        tabIndex={-1}
                        value={purchaseDate ? formatPurchaseDate(purchaseDate) : 'Cargando…'}
                        className={`${inputCls} pl-10 pr-9 bg-slate-100 text-slate-700 font-semibold cursor-not-allowed select-none`}
                      />
                      <Lock className="w-3.5 h-3.5 absolute right-3.5 top-3.5 text-slate-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Fecha de hoy fijada por el sistema. Es la que cuenta para tu garantía.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dirección de entrega</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Estado *</label>
                      <select
                        required
                        value={estado}
                        onChange={(e) => {
                          setEstado(e.target.value);
                          setCiudad('');
                          setOtraCiudad('');
                        }}
                        className={inputCls}
                      >
                        <option value="">Selecciona tu estado…</option>
                        {VENEZUELA_STATES.map((st) => (
                          <option key={st.id} value={st.name}>
                            {st.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Ciudad *</label>
                      <select
                        required
                        value={ciudad}
                        disabled={!selectedState}
                        onChange={(e) => setCiudad(e.target.value)}
                        className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-400`}
                      >
                        <option value="">{selectedState ? 'Selecciona tu ciudad…' : 'Primero elige el estado'}</option>
                        {selectedState?.cities.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        {selectedState && <option value={OTHER_CITY}>{OTHER_CITY}</option>}
                      </select>
                    </div>
                  </div>
                  {ciudad === OTHER_CITY && (
                    <div className="mt-3.5">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Escribe tu ciudad o población *</label>
                      <input
                        type="text"
                        required
                        value={otraCiudad}
                        onChange={(e) => setOtraCiudad(e.target.value)}
                        placeholder="Ej: El Sombrero"
                        className={inputCls}
                      />
                    </div>
                  )}
                  <div className="mt-3.5">
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Dirección específica *</label>
                    <textarea
                      required
                      rows={2}
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                      placeholder="Calle, casa o edificio, punto de referencia. Si prefieres retirar en tienda, escríbelo aquí."
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Producto */}
              <div className="space-y-3.5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <ShoppingBag className="w-4 h-4 text-emerald-600" />
                  <span>2. ¿Qué compraste?</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Buscar en el catálogo</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      placeholder="Ej: combo, plotter, prensa 38x38, tinta…"
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Producto *</label>
                  <select
                    required
                    value={selectedProductId}
                    onChange={(e) => handleSelectProduct(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Selecciona tu producto…</option>
                    {CATALOG_CATEGORIES.map((cat) => {
                      const items = filteredProducts.filter((p) => p.category === cat.id);
                      if (!items.length) return null;
                      return (
                        <optgroup key={cat.id} label={cat.label}>
                          {items.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                              {p.price != null ? ` — ${formatUSD(p.price)}` : ' — consultar precio'}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                    <optgroup label="No está en la lista">
                      <option value={OTHER_PRODUCT}>Otro producto (escribir)</option>
                    </optgroup>
                  </select>
                </div>

                {isOther && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Escribe el producto *</label>
                    <input
                      type="text"
                      required
                      value={customProductName}
                      onChange={(e) => setCustomProductName(e.target.value)}
                      placeholder="Tal como te lo indicó el asesor"
                      className={inputCls}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Cantidad</label>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Precio de catálogo</label>
                    <div className="px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                      {catalogTotal != null ? formatUSD(catalogTotal) : selectedProductId ? 'Según cotización del asesor' : '—'}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Pago */}
              <div className="space-y-3.5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span>3. Tu pago</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">¿Cómo pagaste? *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((m) => {
                      const Icon = PAYMENT_ICON[m.id];
                      const isSelected = paymentMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPaymentMethod(m.id)}
                          className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-600'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <span className="text-[11px] leading-tight">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tipo de pago *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_TYPES.map((t) => {
                      const isSelected = paymentType === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handlePaymentTypeChange(t.id)}
                          className={`px-3 py-2 rounded-xl border text-xs transition cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-1 ring-emerald-600'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                  {paymentType === 'Abono inicial' && (
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Para equipos que vienen de importación directa se acuerda una seña y el resto contra entrega. Escribe solo lo que pagaste ahora.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Monto pagado (USD) *</label>
                    <div className="relative">
                      <DollarSign className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={amountPaid}
                        onChange={(e) => {
                          setAmountPaid(e.target.value);
                          setAmountTouched(true);
                        }}
                        placeholder="0.00"
                        className={`${inputCls} pl-10 font-bold text-slate-900`}
                      />
                    </div>
                    {paymentType === 'Abono inicial' && catalogTotal != null && amountNumber > 0 && (
                      <p className="text-[11px] text-slate-500 mt-1">Saldo pendiente: {formatUSD(balance)}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      {paymentMethod === 'Zelle'
                        ? 'Titular Zelle / confirmación *'
                        : paymentMethod === 'Transferencia'
                        ? 'N° de referencia *'
                        : 'Referencia (opcional)'}
                    </label>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder={
                        paymentMethod === 'Zelle'
                          ? 'Ej: Juan Pérez / 4F8A2C'
                          : paymentMethod === 'Transferencia'
                          ? 'Ej: 00123456789'
                          : 'Ej: recibo en tienda'
                      }
                      className={`${inputCls} font-mono`}
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.hint}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Captura del comprobante {paymentMethod === 'Efectivo' ? '(foto de las divisas o del recibo, opcional)' : '*'}
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleReceiptChange(e.target.files?.[0] ?? null)}
                  />
                  {receiptFile ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl border border-emerald-300 bg-emerald-50">
                      {receiptPreview ? (
                        <img src={receiptPreview} alt="Comprobante" className="w-16 h-16 object-cover rounded-lg border border-emerald-200" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-white border border-emerald-200 flex items-center justify-center text-[10px] font-bold text-emerald-700">
                          PDF
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-emerald-900 truncate">{receiptFile.name}</p>
                        <p className="text-[11px] text-emerald-800">{(receiptFile.size / 1024).toFixed(0)} KB · listo para enviar</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleReceiptChange(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-rose-600 transition cursor-pointer"
                        aria-label="Quitar imagen"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-1.5 p-5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:border-emerald-500 hover:bg-emerald-50 transition cursor-pointer text-slate-600"
                    >
                      <ImagePlus className="w-6 h-6 text-emerald-600" />
                      <span className="text-xs font-bold">Tomar foto o subir captura</span>
                      <span className="text-[11px] text-slate-400">JPG, PNG o PDF · máx. 6 MB</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Notas para el asesor (opcional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: retiro en tienda de Guanare, envío por MRW a Valencia, color del equipo…"
                    className={inputCls}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-5 text-sm font-extrabold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Registrando tu pago…</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Registrar mi pago</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1 text-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tus datos se usan solo para confirmar tu pago y coordinar la entrega.</span>
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[11px] text-slate-400">
        <div className="max-w-2xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <span>
            {BRAND.legal.razonSocial} · RIF {BRAND.legal.rif} · {BRAND.legal.ciudad}, {BRAND.legal.pais}
          </span>
          <a href={BRAND.website} target="_blank" rel="noreferrer" className="text-emerald-700 font-semibold hover:underline">
            insublimexvnzla.com
          </a>
        </div>
      </footer>
    </div>
  );
};
