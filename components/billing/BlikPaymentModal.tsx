'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaymentProductType,
  MONETIZATION_PRODUCTS,
  initiateBlikTransaction,
  simulateBankAuthorization,
  BlikTransaction,
  calculateVatBreakdown,
} from '@/lib/billing/blikEngine';
import { lookupGusCompany, validatePolishNip, GusCompanyData, formatNip } from '@/lib/billing/gusVatLookup';
import { generateVatInvoice, VatInvoice } from '@/lib/billing/invoiceGenerator';
import { triggerHaptic } from '@/lib/utils';
import { playSalaryChime } from '@/lib/motion/soundEngine';

interface BlikPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: PaymentProductType;
  targetAdId?: string;
  targetAdTitle?: string;
  onPaymentSuccess?: (transaction: BlikTransaction, invoice?: VatInvoice) => void;
}

export const BlikPaymentModal: React.FC<BlikPaymentModalProps> = ({
  isOpen,
  onClose,
  productId,
  targetAdId,
  targetAdTitle,
  onPaymentSuccess,
}) => {
  const [blikCode, setBlikCode] = useState<string[]>(['', '', '', '', '', '']);
  const [step, setStep] = useState<'INPUT' | 'WAITING' | 'SUCCESS' | 'ERROR'>('INPUT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [buyerNip, setBuyerNip] = useState<string>('');
  const [companyData, setCompanyData] = useState<GusCompanyData | null>(null);
  const [wantsInvoice, setWantsInvoice] = useState<boolean>(false);
  const [activeTxn, setActiveTxn] = useState<BlikTransaction | null>(null);
  const [generatedInvoice, setGeneratedInvoice] = useState<VatInvoice | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const product = MONETIZATION_PRODUCTS[productId] || MONETIZATION_PRODUCTS.PRO_MONTHLY_SUB;
  const { formattedGross, formattedNet, formattedVat } = calculateVatBreakdown(
    product.priceGrossPln,
    product.vatRatePercent
  );

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setBlikCode(['', '', '', '', '', '']);
      setStep('INPUT');
      setErrorMessage(null);
      setTimeLeft(120);
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    }
  }, [isOpen]);

  // Countdown timer when waiting for bank push
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'WAITING' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setStep('ERROR');
            setErrorMessage('Czas na autoryzację w aplikacji bankowej minął.');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Handle NIP lookup
  const handleNipChange = async (val: string) => {
    setBuyerNip(val);
    const valid = validatePolishNip(val);
    if (valid.isValid) {
      const company = await lookupGusCompany(val);
      if (company) {
        setCompanyData(company);
        triggerHaptic(10);
      }
    } else {
      setCompanyData(null);
    }
  };

  // Handle BLIK digit input
  const handleDigitChange = (index: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const newCode = [...blikCode];
    newCode[index] = digit;
    setBlikCode(newCode);
    setErrorMessage(null);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
      triggerHaptic(5);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !blikCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (paste.length === 6) {
      setBlikCode(paste.split(''));
      inputRefs.current[5]?.focus();
      triggerHaptic(15);
    }
  };

  // Submit BLIK Code
  const handleSubmitBlik = async () => {
    const codeStr = blikCode.join('');
    const init = initiateBlikTransaction({
      productId,
      blikCode: codeStr,
      buyerEmail,
      buyerNip: companyData ? companyData.nip : buyerNip,
      targetAdId,
    });

    if (init.error || !init.transaction) {
      setErrorMessage(init.error || 'Nieprawidłowy kod BLIK');
      triggerHaptic([30, 50, 30]);
      return;
    }

    triggerHaptic(20);
    setActiveTxn(init.transaction);
    setStep('WAITING');
    setTimeLeft(120);

    // Simulate realistic bank confirmation
    try {
      const authorized = await simulateBankAuthorization(init.transaction, 2500);
      if (authorized.status === 'AUTHORIZED') {
        const invoice = generateVatInvoice(authorized, companyData);
        setActiveTxn(authorized);
        setGeneratedInvoice(invoice);
        setStep('SUCCESS');
        triggerHaptic([20, 40, 60]);
        playSalaryChime(15000); // Gold pentatonic success chime
        if (onPaymentSuccess) {
          onPaymentSuccess(authorized, invoice);
        }
      } else {
        setStep('ERROR');
        setErrorMessage('Płatność została odrzucona przez Twój bank.');
        triggerHaptic([50, 100, 50]);
      }
    } catch {
      setStep('ERROR');
      setErrorMessage('Wystąpił błąd podczas autoryzacji.');
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg bg-zinc-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 text-white shadow-2xl shadow-amber-500/10 overflow-hidden"
        >
          {/* Top glowing accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Zamknij"
            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800/60 hover:bg-zinc-700 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Product Header Summary */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 text-xs font-bold tracking-wider uppercase rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                PŁATNOŚĆ BŁYSKAWICZNA BLIK
              </span>
              {product.badge && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {product.badge}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              {product.title}
            </h2>
            <p className="text-sm text-zinc-400 mt-1">{product.subtitle}</p>

            {targetAdTitle && (
              <div className="mt-3 p-2.5 rounded-xl bg-zinc-800/70 border border-zinc-700/50 text-xs text-zinc-300">
                <span className="text-zinc-400">Dotyczy ogłoszenia: </span>
                <span className="font-semibold text-amber-300">{targetAdTitle}</span>
              </div>
            )}
          </div>

          {/* Pricing Box */}
          <div className="p-4 rounded-2xl bg-zinc-800/50 border border-zinc-700/60 mb-6 flex justify-between items-center">
            <div>
              <div className="text-xs text-zinc-400">Do zapłaty (brutto z 23% VAT)</div>
              <div className="text-2xl font-extrabold text-amber-400">{formattedGross}</div>
            </div>
            <div className="text-right text-xs text-zinc-400">
              <div>Netto: {formattedNet}</div>
              <div>VAT: {formattedVat}</div>
            </div>
          </div>

          {/* STEP 1: BLIK INPUT & FORM */}
          {step === 'INPUT' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Wpisz 6-cyfrowy kod z aplikacji Twojego banku:
              </label>

              {/* 6-box BLIK Input */}
              <div className="flex justify-between gap-2 sm:gap-3 mb-4">
                {blikCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className="w-11 h-14 sm:w-14 sm:h-16 text-center text-2xl sm:text-3xl font-extrabold bg-zinc-950/80 border-2 border-zinc-700 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 rounded-2xl text-amber-300 transition outline-none"
                  />
                ))}
              </div>

              {errorMessage && (
                <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Optional VAT B2B Invoice Accordion */}
              <div className="mb-6 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setWantsInvoice(!wantsInvoice)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition"
                >
                  <svg className={`w-3.5 h-3.5 transition-transform ${wantsInvoice ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span>{wantsInvoice ? 'Ukryj dane do Faktury VAT' : 'Chcę Fakturę VAT (pobierz dane z GUS po NIP)'}</span>
                </button>

                {wantsInvoice && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 space-y-3"
                  >
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">NIP Firmy:</label>
                      <input
                        type="text"
                        placeholder="np. 851-100-55-22"
                        value={buyerNip}
                        onChange={(e) => handleNipChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-xl focus:border-amber-500 outline-none text-white"
                      />
                    </div>

                    {companyData && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                        <div className="font-bold">{companyData.companyName}</div>
                        <div>{companyData.street} {companyData.buildingNumber}, {companyData.postalCode} {companyData.city}</div>
                        <div className="text-zinc-400 mt-1">NIP: {formatNip(companyData.nip)} | REGON: {companyData.regon}</div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Adres E-mail do wysyłki faktury:</label>
                      <input
                        type="email"
                        placeholder="biuro@twoja-firma.pl"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-zinc-950 border border-zinc-700 rounded-xl focus:border-amber-500 outline-none text-white"
                      />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleSubmitBlik}
                disabled={blikCode.join('').length !== 6}
                className="w-full py-4 px-6 rounded-2xl font-bold text-base tracking-wide bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-zinc-950 shadow-lg shadow-amber-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition transform active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Zapłać {formattedGross} kodem BLIK</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          )}

          {/* STEP 2: WAITING FOR BANK PUSH CONFIRMATION */}
          {step === 'WAITING' && (
            <div className="text-center py-6">
              <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                <span className="absolute inset-0 rounded-full bg-amber-500/20 animate-ping" />
                <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/40">
                  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Potwierdź płatność w banku</h3>
              <p className="text-sm text-zinc-300 max-w-xs mx-auto mb-4">
                Otwórz powiadomienie PUSH w aplikacji swojego banku i zatwierdź transakcję na kwotę <span className="font-bold text-amber-400">{formattedGross}</span>.
              </p>

              <div className="inline-block px-4 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-mono text-amber-400">
                Czas na potwierdzenie: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 'SUCCESS' && (
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 15 }}
                className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>

              <h3 className="text-2xl font-extrabold text-white mb-1">Płatność Zrealizowana!</h3>
              <p className="text-sm text-zinc-300 mb-6">
                Twój pakiet <span className="font-semibold text-amber-400">{product.title}</span> został natychmiast aktywowany.
              </p>

              {generatedInvoice && (
                <div className="p-4 mb-6 rounded-2xl bg-zinc-800/80 border border-zinc-700 text-left text-xs">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-zinc-400">Numer Faktury VAT:</span>
                    <span className="font-mono font-bold text-amber-300">{generatedInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Nabywca:</span>
                    <span className="text-white font-medium">{generatedInvoice.buyer.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-400 mt-1">
                    <span>Kwota Brutto:</span>
                    <span className="text-emerald-400 font-bold">{generatedInvoice.totals.formattedGross}</span>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 transition"
              >
                Zakończ i przejdź do aplikacji
              </button>
            </div>
          )}

          {/* STEP 4: ERROR / REJECTED */}
          {step === 'ERROR' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center text-red-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">Płatność nie powiodła się</h3>
              <p className="text-sm text-red-400 mb-6">{errorMessage || 'Transakcja została anulowana.'}</p>

              <button
                type="button"
                onClick={() => {
                  setStep('INPUT');
                  setBlikCode(['', '', '', '', '', '']);
                }}
                className="w-full py-3.5 px-6 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700 text-white transition"
              >
                Spróbuj ponownie
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
