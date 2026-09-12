import React from 'react';
import { InvoiceData } from '../types';
import { numberToWordsLKR } from '../lib/gazetteUtils';

interface InvoicePreviewProps {
  className?: string;
  data: InvoiceData;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ data, className = '' }) => {
  const MIN_ROWS = 8;
  const emptyRows = Math.max(0, MIN_ROWS - (data.items?.length || 0));
  
  const vatPercentage = Math.round((data.vatRate || 0.18) * 100);
  const isVat = data.isVat !== false; // default true unless explicitly false

  const amountInWords = data.amountInWords || numberToWordsLKR(data.grandTotal || 0);

  return (
    <div
      className={`invoice-container bg-white text-black font-sans leading-tight ${className} w-[210mm] min-h-[297mm] mx-auto p-6 relative overflow-hidden print:w-full print:min-h-0 print:p-4 print:shadow-none shadow-xl border border-gray-300 text-sm`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* OUTER ENCLOSING BORDER */}
      <div className="border-2 border-black w-full h-full flex flex-col justify-between">
        
        {/* HEADER: PROMINENT TITLE */}
        <div className="flex justify-center pt-3 pb-2 border-b-2 border-black bg-white">
          <div className="border-2 border-black px-10 py-1.5 font-bold text-xl tracking-wider uppercase text-center bg-gray-50">
            {isVat ? "TAX INVOICE" : "INVOICE"}
          </div>
        </div>

        {/* TOP SECTION: SUPPLIER & PURCHASER DETAILS */}
        <div className="grid grid-cols-2 border-b border-black">
          
          {/* LEFT: SUPPLIER DETAILS */}
          <div className="p-3 border-r border-black space-y-1.5">
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-semibold text-xs">Date of Invoice:</span>
              <span className="col-span-7 font-mono font-bold text-xs">{data.date}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-semibold text-xs">Supplier's TIN :</span>
              <span className="col-span-7 font-mono font-bold text-xs">{data.supplier?.tin || "N/A"}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-semibold text-xs">Supplier's Name :</span>
              <span className="col-span-7 font-bold uppercase text-xs">{data.supplier?.name || ""}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-semibold text-xs">Address :</span>
              <span className="col-span-7 text-xs whitespace-pre-line">{data.supplier?.address || ""}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-semibold text-xs">Telephone No.:*</span>
              <span className="col-span-7 text-xs">{data.supplier?.phone || "-"}</span>
            </div>
          </div>

          {/* RIGHT: PURCHASER DETAILS */}
          <div className="p-3 space-y-1.5">
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-semibold text-xs">{isVat ? "Tax Invoice No. :" : "Invoice No. :"}</span>
              <span className="col-span-7 font-mono font-bold text-xs tracking-wide">{data.invoiceNo}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-semibold text-xs">Purchaser's TIN :</span>
              <span className="col-span-7 font-mono font-bold text-xs">{data.purchaser?.tin || "N/A"}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-semibold text-xs">Purchaser's Name :</span>
              <span className="col-span-7 font-bold uppercase text-xs">{data.purchaser?.name || ""}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-semibold text-xs">Address :</span>
              <span className="col-span-7 text-xs whitespace-pre-line">{data.purchaser?.address || ""}</span>
            </div>
            <div className="grid grid-cols-12">
              <span className="col-span-5 font-semibold text-xs">Telephone No.:*</span>
              <span className="col-span-7 text-xs">{data.purchaser?.phone || "-"}</span>
            </div>
          </div>

        </div>

        {/* SUB-ROW: DATE OF SUPPLY & PLACE OF SUPPLY */}
        <div className="grid grid-cols-2 border-b border-black text-xs">
          <div className="p-2 border-r border-black flex items-center gap-2">
            <span className="font-semibold">Date of Supply :</span>
            <span className="font-mono font-medium">{data.dateOfSupply || data.date}</span>
          </div>
          <div className="p-2 flex items-center gap-2">
            <span className="font-semibold">Place of Supply :*</span>
            <span>{data.placeOfSupply || "Same as Supplier Address"}</span>
          </div>
        </div>

        {/* ADDITIONAL INFORMATION */}
        <div className="p-2 border-b border-black text-xs min-h-[32px] flex items-center gap-2">
          <span className="font-semibold">Additional Information if any:*</span>
          <span className="text-gray-800">{data.additionalNotes || "-"}</span>
        </div>

        {/* ITEM TABLE (Annexure I Specimen Format) */}
        <div className="flex-1 flex flex-col justify-start">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b-2 border-black bg-gray-100 text-center font-bold">
                <th className="border-r border-black py-2 px-2 w-[14%] text-left">Reference*</th>
                <th className="border-r border-black py-2 px-3 w-[46%] text-left">Description of Goods or Services</th>
                <th className="border-r border-black py-2 px-2 w-[12%] text-center">Quantity</th>
                <th className="border-r border-black py-2 px-2 w-[14%] text-right">Unit Price</th>
                <th className="py-2 px-3 w-[14%] text-right">
                  {isVat ? "Amount Excluding VAT (Rs.)" : "Amount (Rs.)"}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.items?.map((item, index) => (
                <tr key={item.id || index} className="border-b border-gray-300">
                  <td className="border-r border-black py-1.5 px-2 font-mono text-[11px] text-gray-700">
                    {item.reference || (index + 1).toString().padStart(2, '0')}
                  </td>
                  <td className="border-r border-black py-1.5 px-3 font-medium uppercase text-[11px]">
                    {item.description}
                  </td>
                  <td className="border-r border-black py-1.5 px-2 text-center font-medium">
                    {item.quantity}
                  </td>
                  <td className="border-r border-black py-1.5 px-2 text-right font-mono">
                    {Number(item.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 px-3 text-right font-mono font-medium">
                    {Number(item.total || (item.quantity * item.unitPrice) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}

              {/* Empty placeholder rows to maintain proper vertical grid height */}
              {Array.from({ length: emptyRows }).map((_, idx) => (
                <tr key={`empty-${idx}`} className="border-b border-gray-200 h-7">
                  <td className="border-r border-black py-1 px-2">&nbsp;</td>
                  <td className="border-r border-black py-1 px-3">&nbsp;</td>
                  <td className="border-r border-black py-1 px-2">&nbsp;</td>
                  <td className="border-r border-black py-1 px-2">&nbsp;</td>
                  <td className="py-1 px-3">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* TOTALS & BREAKDOWN SECTION (Exact Gazette Layout) */}
        <div className="border-t-2 border-black">
          <table className="w-full text-xs border-collapse">
            <tbody>
              
              {/* Total Value of Supply */}
              <tr className="border-b border-black">
                <td className="p-2 font-bold w-[72%] text-right border-r border-black">
                  Total Value of Supply:
                </td>
                <td className="p-2 font-mono font-bold text-right w-[28%] text-sm">
                  {Number(data.totalValueOfSupply || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

              {/* VAT Amount (Only when VAT is applicable) */}
              {isVat && (
                <tr className="border-b border-black bg-gray-50">
                  <td className="p-2 font-bold w-[72%] text-right border-r border-black">
                    VAT Amount (Total Value of Supply @ {vatPercentage}%):
                  </td>
                  <td className="p-2 font-mono font-bold text-right w-[28%] text-sm">
                    {Number(data.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              )}

              {/* Total Consideration including VAT */}
              <tr className="border-b-2 border-black bg-gray-100">
                <td className="p-2 font-bold w-[72%] text-right border-r border-black text-sm">
                  {isVat ? "Total Amount/consideration including VAT:" : "Total Amount:"}
                </td>
                <td className="p-2 font-mono font-bold text-right w-[28%] text-base text-black">
                  LKR {Number(data.grandTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>

            </tbody>
          </table>
        </div>

        {/* FOOTER: AMOUNT IN WORDS & MODE OF PAYMENT */}
        <div className="p-3 border-b border-black space-y-2 text-xs">
          <div className="flex items-start gap-2">
            <span className="font-bold whitespace-nowrap">Total Amount in words:*</span>
            <span className="font-medium italic">{amountInWords}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold whitespace-nowrap">Mode of Payment:*</span>
            <span className="font-semibold uppercase tracking-wide bg-gray-100 px-2.5 py-0.5 rounded border border-gray-300">
              {data.modeOfPayment || "Credit"}
            </span>
            {data.status && (
              <span className={`ml-4 text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                data.status === 'paid' ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
              }`}>
                {data.status} {data.balanceDue > 0 ? `(Balance Due: LKR ${data.balanceDue.toLocaleString()})` : ''}
              </span>
            )}
          </div>
        </div>

        {/* SIGNATURE & LEGAL DISCLAIMER */}
        <div className="p-4 grid grid-cols-2 gap-8 text-xs">
          <div>
            <p className="text-[10px] text-gray-500">
              Generated via <strong>Pyxis Cloud Billing</strong>. Compliant with Inland Revenue Department (IRD) Sri Lanka Gazette No. 2481/22.
            </p>
          </div>
          <div className="text-right space-y-6">
            <div className="inline-block text-center pt-8">
              <div className="w-48 border-b border-black mb-1"></div>
              <p className="text-[10px] uppercase font-bold text-gray-700">Authorized Signature & Stamp</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};