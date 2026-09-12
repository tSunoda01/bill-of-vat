import mongoose, { Schema } from 'mongoose';

const BusinessSchema = new Schema({
  id: { type: String, required: true, unique: true },
  businessName: { type: String, required: true },
  tin: { type: String, default: '' },
  brNumber: { type: String, default: '' },
  address: { type: String, default: '' },
  phone: { type: String, default: '' },
  slogan: { type: String, default: '' },
  ownerName: { type: String, default: '' },
  ownerEmail: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  branchCode: { type: String, default: 'BR01' },
  isVatRegistered: { type: Boolean, default: true },
  vatRate: { type: Number, default: 0.18 },
  invoiceSequence: { type: Number, default: 1 },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

const CustomerSchema = new Schema({
  id: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  address: { type: String, default: '' },
  tin: { type: String, default: '' },
  phone: { type: String, default: '' },
  email: { type: String, default: '' }
});

const ProductSchema = new Schema({
  id: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  code: { type: String, default: '' },
  description: { type: String, required: true },
  unitPrice: { type: Number, required: true, default: 0 }
});

const InvoiceSchema = new Schema({
  id: { type: String, required: true, unique: true },
  businessId: { type: String, required: true, index: true },
  invoiceNo: { type: String, required: true },
  date: { type: String, required: true },
  dateOfSupply: { type: String, default: '' },
  placeOfSupply: { type: String, default: '' },
  additionalNotes: { type: String, default: '' },
  supplier: {
    tin: String,
    name: String,
    address: String,
    phone: String
  },
  purchaser: {
    tin: String,
    name: String,
    address: String,
    phone: String
  },
  customerId: { type: String, default: '' },
  items: { type: Array, default: [] },
  totalValueOfSupply: { type: Number, default: 0 },
  isVat: { type: Boolean, default: true },
  vatRate: { type: Number, default: 0.18 },
  vatAmount: { type: Number, default: 0 },
  grandTotal: { type: Number, default: 0 },
  amountInWords: { type: String, default: '' },
  modeOfPayment: { type: String, default: 'Credit' },
  status: { type: String, default: 'credit' },
  payments: { type: Array, default: [] },
  balanceDue: { type: Number, default: 0 }
});

const SettingSchema = new Schema({
  key: { type: String, required: true, unique: true },
  value: Schema.Types.Mixed
});

export const BusinessModel = mongoose.models.Business || mongoose.model('Business', BusinessSchema);
export const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);
export const ProductModel = mongoose.models.Product || mongoose.model('Product', ProductSchema);
export const InvoiceModel = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
export const SettingModel = mongoose.models.Setting || mongoose.model('Setting', SettingSchema);