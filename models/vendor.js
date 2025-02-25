const mongoose = require("mongoose");
const carSchema = require("../models/car");
const vanSchema = require("../models/van");
const autoSchema = require("../models/auto");
const busSchema = require("../models/bus");
const truckSchema = require("../models/truck");

const vendorSchema = new mongoose.Schema({
  userName: {
    type: String,
    required: [true, "Vendor Name required"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    validate: {
      validator: function (email) {
        var emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
        return emailPattern.test(email);
      },
      message: "Invalid email format",
    },
  },
  otp: {
    type: Number,
  },
  otpCreatedAt: {
    type: Date,
  },
  password: {
    type: String,
    // required: [true, "Password is required"],
  },
  phoneNumber: {
    type: Number,
    required: [true, "Phone number is required"],
  },
  address: {
    type: String,
    // required: [true, "address is required"],
  },
  role: {
    type: String,
    default: "vendor",
  },
  resetPin: {
    type: String,
  },
  pinExpiresAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },

  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  locationUpdatedAt: {
    type: Date,
    default: Date.now,
  },
  expoPushToken: { type: String },

  vehicles: {
    cars: [carSchema],
    vans: [vanSchema],
    autos: [autoSchema],
    buses: [busSchema],
    lorries: [],
    trucks: [truckSchema],
  },
  messages: [
    {
      title: { type: String },
      description: { type: String },
      dateAt: { type: Date, default: Date.now },
      readed: { type: Boolean, default: false },
    },
  ],
  rejectionHistory: [
    {
      date: { type: Date, default: Date.now },
    },
  ],
  noOfBookings: { type: Number },

  totalEarnings: { type: Number },
  profileImg: { type: String },
});

const vendorModel = mongoose.model("Vendors", vendorSchema);

module.exports = vendorModel;
