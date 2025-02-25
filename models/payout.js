const mongoose = require("mongoose");

const WeeklyDataSchema = new mongoose.Schema({
  weekId: {
    type: mongoose.Types.ObjectId,
    required: true,
    unique: true,
  },
  weekRange: {
    type: String,
    required: true,
  },
  payoutDone: {
    type: Boolean,
    default: false,
  },
  totalVendorPayment: {
    type: Number,
    required: true,
  },
  totalAdminCommission: {
    type: Number,
    required: true,
  },
  bookings: {
    type: Array,
    default: [],
  },
  totalCashPayments: {
    type: Number,
    required: true,
  },
});

const VendorPayOutsSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Types.ObjectId,
    required: true,
  },
  monthId: {
    type: mongoose.Types.ObjectId,
    required: true,
    unique: true, 
  },
  month: {
    type: String,
    required: true,
  },
  totalMonthlyVendorPayment: {
    type: Number,
    required: true,
  },
  totalMonthlyAdminCommission:{
type:Number,
required:true
  },

  weeks: [WeeklyDataSchema],
});

module.exports = mongoose.model(
  "VendorPayOuts",
  VendorPayOutsSchema
);
