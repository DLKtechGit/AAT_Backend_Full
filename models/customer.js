const mongoose = require("mongoose");

const validateEmail = (e) => {
  var emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
  return emailPattern.test(e);
};

const customerSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: [true, "Customer Name required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      validaate: validateEmail,
    },
    password: {
      type: String,
      // required:[true,"password is required"]
    },
    phoneNumber: {
      type: Number,
      require: [true, "Phone number is required"],
    },
    address: {
      type: String,
      require: [true, "address is required"],
    },

    resetPin: {
      type: String,
    },
    pinExpiresAt: {
      type: Date,
    },
    otp: {
      type: Number,
    },
    otpCreatedAt: {
      type: Date,
    },
    role: { type: String, default: "customer" },
    messages: [
      {
        title: { type: String },
        description: { type: String },
        dateAt: { type: Date, default: Date.now },
        readed: { type: Boolean, default: false },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    fcmToken: { type: String },
    penaltyAmount: { type: Number },
    profileImg: { type: String },

    cancellationHistory: [
      {
        date: { type: Date, default: Date.now },
      },
    ],

    expoPushToken: { type: String },
  },
  {
    versionKey: false,
  }
);

const customerModel = mongoose.model("customers", customerSchema);

module.exports = customerModel;
