const mongoose = require("mongoose");

const carSchema = new mongoose.Schema({
  ownerImage: [{ type: String }],
  ownerAdharCard: [{ type: String, }],
  ownerDrivingLicense: [{ type: String, }],
  vehicleImages: [{ type: String, }],
  vehicleInsurance: [{ type: String, }],
  vehicleRC: [{ type: String, }],
  vehicleMake: { type: String },
  vehicleModel: { type: String },
  licensePlate: { type: String, },
  vehicleColor: { type: String },
  numberOfSeats: { type: String, },
  milage: { type: String },
  vehicleApprovedByAdmin: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  advanceAmount: { type: String },
  noOfBookings: { type: Number },
  categoryType: { type: String, default: "Passengers", },
  subCategory: { type: String, default: "car" },
  rejectedReason: { type: String },
  vehicleAvailable: { type: String, default: "no" },
  pickupDate: { type: Date },
  returnDate: { type: Date },
  adminCommissionPercentage: { type: Number },
  tripStartedAt: { type: Date },
  pricePerDay: { type: String },
  pricePerKm: { type: String },
  fuelType: { type: String },
  vehicleType: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  registerAmount: { type: Number },
  registerAmountRefund:{type:Boolean , default:false},
  vehicleIsOnline:{type:Boolean , default:false}
});

module.exports = carSchema;
