/**
 * B2B VAT Invoice Generator for Polish Trade Platform "Na Etacie"
 * Generates structured VAT Invoice documents (Faktura VAT) conforming to Polish tax laws.
 */

import { BlikTransaction, MONETIZATION_PRODUCTS, calculateVatBreakdown } from './blikEngine';
import { GusCompanyData, formatNip } from './gusVatLookup';

export interface InvoiceSellerData {
  name: string;
  nip: string;
  street: string;
  city: string;
  postalCode: string;
  bankAccount: string;
  bankName: string;
}

export const PLATFORM_SELLER_DATA: InvoiceSellerData = {
  name: 'NA ETACIE SP. Z O.O.',
  nip: '8513254477',
  street: 'ul. Cyfrowa 6',
  city: 'Szczecin',
  postalCode: '71-441',
  bankAccount: 'PL 42 1090 1492 0000 0001 4567 8901',
  bankName: 'Santander Bank Polska S.A.',
};

export interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  netPricePln: number;
  netValuePln: number;
  vatRatePercent: number;
  vatValuePln: number;
  grossValuePln: number;
}

export interface VatInvoice {
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  saleDate: string;  // YYYY-MM-DD
  paymentDueDate: string;
  paymentMethod: string;
  isPaid: boolean;
  seller: InvoiceSellerData;
  buyer: {
    name: string;
    nip?: string;
    street?: string;
    city?: string;
    postalCode?: string;
    email?: string;
  };
  items: InvoiceItem[];
  totals: {
    netPln: number;
    vatPln: number;
    grossPln: number;
    formattedGross: string;
  };
  notes?: string;
}

/**
 * Generates official sequence-based Invoice Number (e.g. FV/2026/08/142)
 */
export function generateInvoiceNumber(date: Date = new Date(), sequence = 1): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');
  return `FV/${year}/${month}/${seq}`;
}

/**
 * Builds complete VAT Invoice object from an authorized BLIK transaction.
 */
export function generateVatInvoice(
  transaction: BlikTransaction,
  buyerCompany?: GusCompanyData | null,
  sequence = 1
): VatInvoice {
  const product = MONETIZATION_PRODUCTS[transaction.productId];
  const now = transaction.authorizedAt || new Date();
  const dateStr = now.toISOString().split('T')[0];

  const { grossPln, netPln, vatPln, formattedGross } = calculateVatBreakdown(
    transaction.amountGross,
    product ? product.vatRatePercent : 23
  );

  const invoiceItem: InvoiceItem = {
    name: product ? product.title : 'Usługa elektroniczna - Na Etacie',
    quantity: 1,
    unit: 'szt.',
    netPricePln: netPln,
    netValuePln: netPln,
    vatRatePercent: 23,
    vatValuePln: vatPln,
    grossValuePln: grossPln,
  };

  const invoice: VatInvoice = {
    invoiceNumber: generateInvoiceNumber(now, sequence),
    issueDate: dateStr,
    saleDate: dateStr,
    paymentDueDate: dateStr,
    paymentMethod: 'Płatność natychmiastowa BLIK',
    isPaid: true,
    seller: PLATFORM_SELLER_DATA,
    buyer: buyerCompany
      ? {
          name: buyerCompany.companyName,
          nip: formatNip(buyerCompany.nip),
          street: `${buyerCompany.street} ${buyerCompany.buildingNumber}`,
          city: buyerCompany.city,
          postalCode: buyerCompany.postalCode,
          email: transaction.buyerEmail,
        }
      : {
          name: transaction.buyerEmail || 'Osoba prywatna / Użytkownik Na Etacie',
          nip: transaction.buyerNip ? formatNip(transaction.buyerNip) : undefined,
          email: transaction.buyerEmail,
        },
    items: [invoiceItem],
    totals: {
      netPln,
      vatPln,
      grossPln,
      formattedGross,
    },
    notes: `Identyfikator transakcji: ${transaction.transactionId}. Zapłacono w całości.`,
  };

  return invoice;
}
