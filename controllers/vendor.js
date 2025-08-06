const auth = require("../middleware/auth");
const dotenv = require("dotenv");
const vendorModel = require("../models/vendor");
const nodemailer = require("nodemailer");
const upload = require("../middleware/uploadMiddleware");
const crypto = require("crypto");
const mongoose = require("mongoose");
const bookingModel = require("../models/booking");
const customerModel = require("../models/customer");
const VendorMonthlyBookings = require("../models/payout");
const adminModel = require("../models/admin");
const axios = require("axios");
const twilio = require("twilio");
const path = require('path');
const fs =require('fs')

const {
  vendorMessage,
  vendorChat,
} = require("../models/chatAndMessageForVendor");
const { Expo } = require("expo-server-sdk");

dotenv.config();

// const sendLoginOtp = async (req, res) => {
//   const { phoneNumber } = req.body;

//   if (!phoneNumber) {
//     return res.status(400).json({ message: "Phone number is required" });
//   }

//   const phoneNumberWithCode = `+91${phoneNumber}`;

//   try {
//     const vendor = await vendorModel.findOne({ phoneNumber: phoneNumberWithCode });

//     if (!vendor) {
//       return res.status(404).json({
//         message: "Mobile number is not registered",
//       });
//     }

//     const otp = Math.floor(1000 + Math.random() * 9000);

//     vendor.otp = otp;
//     vendor.otpCreatedAt = Date.now();

//     await vendor.save();

//     await client.messages.create({
//       body: `Your OTP code is: ${otp}`,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: phoneNumberWithCode,
//     });

//     res.json({ success: true, message: "OTP sent successfully" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ success: false, message: "Failed to send OTP", error: error.message });
//   }
// };

const sendOtp = async (phoneNumber, otp) => {
  const apiKey = "SCHrexQjdEOtmXhaA6FKNQ";
  const senderId = "AATWPL";
  const dlttemplateid = "1307173830616107946";
  const EntityId = "1301173812812460311";
  const phoneNumberWithCode = `91${phoneNumber}`;
  const otpMessage = `One Time Password OTP for verifying your Login for AAT app is ${otp}, This OTP is Valid for 5  min, please do not share with anyone. Thank you. AAT WORLD (OPC) PRIVATE LIMITED`;

  const url = "https://www.smsgatewayhub.com/api/mt/SendSMS";

  const params = {
    APIKey: apiKey,
    senderid: senderId,
    channel: 2,
    DCS: 0,
    flashsms: 0,
    number: phoneNumberWithCode,
    text: otpMessage,
    route: "Transactional",
    EntityId: EntityId,
    dlttemplateid: dlttemplateid,
  };

  try {
    const response = await axios.get(url, { params });

    if (response.data.ErrorCode === "000") {
      return { success: true, message: "OTP sent successfully!" };
    } else {
      return { success: false, message: response.data.ErrorMessage };
    }
  } catch (error) {
    console.error("Failed to send OTP:", error.message);
    return {
      success: false,
      message: "Failed to send OTP",
      error: error.message,
    };
  }
};
const sendLoginOtp = async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  const phoneNumberWithCode = `91${phoneNumber}`;

  try {
    const vendor = await vendorModel.findOne({
      phoneNumber: phoneNumberWithCode,
    });

    if (!vendor) {
      return res.status(404).json({
        message: "Mobile number is not registered",
      });
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    const result = await sendOtp(phoneNumber, otp);

    if (result.success) {
      vendor.otp = otp;
      vendor.otpCreatedAt = Date.now();
      await vendor.save();
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    return res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const verifyOtp = async (req, res) => {
  const { phoneNumber, otp } = req.body;

  if (!phoneNumber || !otp) {
    return res.status(400).json({ message: "Please enter OTP" });
  }

  const phoneNumberWithCode = `91${phoneNumber}`;

  try {
    const user = await vendorModel.findOne({
      phoneNumber: phoneNumberWithCode,
    });

    if (!user) {
      return res.status(404).json({
        message: "Mobile number is not registered",
      });
    }

    if (user.otp !== parseInt(otp)) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    const otpExpiryTime = 5 * 60 * 1000;
    const otpAge = Date.now() - user.otpCreatedAt;

    if (otpAge > otpExpiryTime) {
      await vendorModel.updateOne(
        { phoneNumber: phoneNumberWithCode },
        { $unset: { otp: "", otpCreatedAt: "" } }
      );
      return res.status(400).json({ message: "OTP has expired" });
    }
    const token = await auth.createToken({
      _id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      role: user.role,
    });
    await vendorModel.updateOne(
      { phoneNumber: phoneNumberWithCode },
      { $unset: { otp: "", otpCreatedAt: "" } }
    );

    res.json({
      success: true,
      message: "OTP verified successfully",
      token,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: error.message,
    });
  }
};

const vendorSignup = async (req, res) => {
  const { userName, email, phoneNumber } = req.body;

  if (!userName || !email || !phoneNumber) {
    return res.status(400).send({ message: "All fields are required " });
  }

  try {
    const user = await vendorModel.findOne({
      phoneNumber: `91${phoneNumber}`,
    });
    if (user) {
      return res.status(409).send({ message: `Phone number already exists` });
    }

    if (phoneNumber.length !== 10) {
      return res
        .status(400)
        .send({ message: "Phone number should be 10 digits" });
    }

    // if (password !== confirmPassword) {
    //   return res
    //     .status(400)
    //     .send({ message: "Password and Confirm Password does not match" });
    // }

    // const hashedPassword = await auth.hashPassword(password);

    const newVendor = new vendorModel({
      userName,
      email,
      phoneNumber: `91${phoneNumber}`,
    });
    const savedVendor = await newVendor.save();

    res
      .status(201)
      .send({ message: "Vendor created successfully", savedVendor });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const vendorLogin = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).send({ message: "All fields are required" });
  }
  try {
    const user = await vendorModel.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "Vendor email  does not exist" });
    }
    const hashCompare = await auth.hashCompare(password, user.password);

    if (!hashCompare) {
      return res.status(401).send({ message: "Incorrect Password" });
    }

    const token = await auth.createToken({
      _id: user._id,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      role: user.role,
    });

    res.status(201).send({ message: "Vendor Login successfully", token, user });
  } catch (error) {
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const generatePin = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

const generatePinCar = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

const sendEmail = async (email, pin) => {
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  let mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Password Reset PIN",
    text: `Your password reset PIN is ${pin}. This PIN will expire in 3 minutes.`,
  };

  await transporter.sendMail(mailOptions);
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).send({ message: "Email is required" });
  }

  try {
    const user = await vendorModel.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: `Email not found` });
    }

    const pin = generatePin();
    const pinExpiresAt = new Date(Date.now() + 1 * 60 * 1000);

    user.resetPin = pin;
    user.pinExpiresAt = pinExpiresAt;
    await user.save();

    await sendEmail(email, pin);

    res.status(201).send({
      message: "PIN sent to your email. It will expire in 3 minutes.",
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const validatePin = async (req, res) => {
  const { email, resetPin } = req.body;

  if (!resetPin || !email) {
    return res.status(400).send({ message: "Please enter the OTP" });
  }

  try {
    const user = await vendorModel.findOne({ email });

    if (!user) {
      return res.status(404).send({ message: `Email is not exist` });
    }

    if (user.resetPin !== resetPin) {
      return res.status(400).send({ message: "Invalid Pin" });
    }

    if (!user.resetPin || !user.pinExpiresAt) {
      return res
        .status(400)
        .send({ message: "No valid PIN found for this account" });
    }

    const currentTime = new Date();
    if (currentTime > user.pinExpiresAt) {
      user.resetPin = null;
      user.pinExpiresAt = null;
      await user.save();

      return res.status(400).send({ message: "PIN has expired" });
    }

    if (user.resetPin !== resetPin) {
      return res.status(400).send({ message: "Invalid PIN" });
    }

    user.pinExpiresAt = null;

    await user.save();

    res.status(201).send({
      message: "OTP verified successfully.",
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const resetPassword = async (req, res) => {
  const { email, resetPin, newPassword, confirmPassword } = req.body;

  if (!email || !resetPin || !newPassword || !confirmPassword) {
    return res.status(400).send({ message: "Fill the all required fields" });
  }

  if (newPassword !== confirmPassword) {
    return res
      .status(404)
      .send({ message: "New password and confirm password do not match" });
  }

  try {
    const user = await vendorModel.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (user.resetPin !== resetPin) {
      return res
        .status(400)
        .send({ message: "session expired please regenerate the otp" });
    }

    const hashedPassword = await auth.hashPassword(newPassword);

    user.password = hashedPassword;
    user.resetPin = null;

    await user.save();

    res.status(201).send({ message: "Password has been reset successfully" });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorById = async (req, res) => {
  const { vendorId } = req.body;
  if (!vendorId) {
    return res.status(400).send({ message: "vendorId is required" });
  }
  try {
    const user = await vendorModel.findById({ _id: vendorId });
    if (!user) {
      return res.status(404).send({ message: "vendor not found" });
    }
    return res
      .status(200)
      .send({ message: "vendor fetched successfully", user });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllVendors = async (req, res) => {
  try {
    const vendors = await vendorModel.find();

    if (vendors.length === 0) {
      return res.status(404).send({ message: "No vendors found" });
    }

    return res
      .status(200)
      .send({ message: "Vendors fetched successfully", vendors });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const editVendorProfile = async (req, res) => {
  try {
    const { vendorId, userName, email, phoneNumber, address, profileImg } =
      req.body;
    const files = req.files;

    if (!userName || !email || !phoneNumber || !address) {
      return res.status(400).json({ message: "Fill all required fields" });
    }

    const user = await vendorModel.findById(vendorId);
    const formatedNumber = `91${phoneNumber}`;
    if (!user) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const existingUser = await vendorModel.findOne({
      phoneNumber: formatedNumber,
      _id: { $ne: vendorId },
    });

    if (existingUser) {
      return res.status(400).json({ message: "Phone number already exists" });
    }

    let newProfileImg = user.profileImg;

    if (files && files["profileImg"]) {
      newProfileImg = `${process.env.baseURL}/uploads/${files["profileImg"][0].filename}`;
    } else if (profileImg) {
      newProfileImg = profileImg;
    }

    user.userName = userName;
    user.email = email;
    user.phoneNumber = formatedNumber;
    user.address = address;
    user.profileImg = newProfileImg;

    await user.save();

    return res.status(201).json({
      message: "Vendor profile updated successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const editPassword = async (req, res) => {
  const { _id, oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).send({ message: "Please fill all required fields" });
  }

  try {
    const user = await vendorModel.findById(_id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    const isMatch = await auth.hashCompare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).send({ message: "Invalid Old Password" });
    }

    if (newPassword !== confirmPassword) {
      return res
        .status(400)
        .send({ message: "New password and Confirm password do not match" });
    }

    const hashedPassword = await auth.hashPassword(newPassword);

    user.password = hashedPassword;
    await user.save();

    res.status(201).send({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const createCar = async (req, res) => {
  try {
    // Validate payload size first
    if (req.headers['content-length'] > 50 * 1024 * 1024) { // 50MB
      return res.status(413).json({ 
        message: "Payload too large (max 50MB)",
        suggestion: "Please reduce file sizes or upload fewer files"
      });
    }

    const {
      vendorId,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      vehicleType,
      milage,
      pricePerDay,
      pricePerKm,
      fuelType,
      registerAmount = 2000,
      ownerImage,
      ownerAdharCard = [],
      ownerDrivingLicense = [],
      vehicleImages = [],
      vehicleInsurance = [],
      vehicleRC = []
    } = req.body;

    // Basic validation
    if (!vendorId || !vehicleMake || !vehicleModel || !licensePlate || 
        !vehicleColor || !numberOfSeats || !vehicleType || !milage || 
        !pricePerDay || !pricePerKm || !fuelType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // File validation
    const validateFiles = (files, requiredCount) => {
      return files.filter(file => file !== null).length >= requiredCount;
    };

    if (
      !validateFiles([ownerImage], 1) ||
      !validateFiles(ownerAdharCard, 2) ||
      !validateFiles(ownerDrivingLicense, 2) ||
      !validateFiles(vehicleImages, 5) ||
      !validateFiles(vehicleInsurance, 2) ||
      !validateFiles(vehicleRC, 2)
    ) {
      return res.status(400).json({ message: "Incorrect number of valid files uploaded" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Process files and save to disk
    const processFiles = async (files, folder) => {
      const uploadsDir = path.join(__dirname, '../uploads');
      console.log(`Saving to: ${filePath}`);
      console.log("Received base64 string length:", base64Str?.length);


      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      return Promise.all(
        files.filter(Boolean).map(async (base64Str, index) => {
          try {
            const match = base64Str.match(/^data:(.+?);base64,(.+)$/);
            if (!match) return null;
            
            const [_, mimeType, data] = match;
            const ext = mimeType.split('/')[1] || 'bin';
            const filename = `${folder}_${Date.now()}_${index}.${ext}`;
            const filePath = path.join(uploadsDir, filename);
            
            await fs.promises.writeFile(filePath, Buffer.from(data, 'base64'));
           return `https://worldofaat.com/api/uploads/${filename}`;
          } catch (error) {
            console.error(`Error processing ${folder} file:`, error);
            return null;
          }
        })
      );
    };

    // Process all files
    const [
      ownerImageUrl,
      aadharUrls,
      licenseUrls,
      vehicleImageUrls,
      insuranceUrls,
      rcUrls
    ] = await Promise.all([
      processFiles([ownerImage], 'owner_images'),
      processFiles(ownerAdharCard, 'aadhar_cards'),
      processFiles(ownerDrivingLicense, 'licenses'),
      processFiles(vehicleImages, 'vehicle_images'),
      processFiles(vehicleInsurance, 'insurances'),
      processFiles(vehicleRC, 'rcs')
    ]);

    // Create new car entry
    const newCar = {
      ownerImage: ownerImageUrl[0] || null,
      ownerAdharCard: aadharUrls.filter(Boolean),
      ownerDrivingLicense: licenseUrls.filter(Boolean),
      vehicleImages: vehicleImageUrls.filter(Boolean),
      vehicleInsurance: insuranceUrls.filter(Boolean),
      vehicleRC: rcUrls.filter(Boolean),
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      vehicleType,
      milage,
      pricePerDay,
      pricePerKm,
      fuelType,
      registerAmount
    };

    vendor.vehicles.cars.push(newCar);
    await vendor.save();

    // Admin notification
    const adminMessage = {
      title: "New Car Creation Request",
      description: `A new car has been created by vendor ${vendor.userName} (${vendor.email}). Please review the car details.`,
    };
    const admin = await adminModel.findOne();
    if (admin) {
      admin.messages.push(adminMessage);
      await admin.save();
    }

    res.status(201).json({ 
      message: "Car created successfully",
      data: newCar
    });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
};

const recreateCar = async (req, res) => {
  const {
    vendorId,
    vehicleId,
    vehicleMake,
    vehicleModel,
    licensePlate,
    vehicleType,
    vehicleColor,
    numberOfSeats,
    milage,
    pricePerDay,
    pricePerKm,
    fuelType,
  } = req.body;
  const files = req.files;

  if (
    !vendorId ||
    !vehicleId ||
    !vehicleMake ||
    !vehicleModel ||
    !licensePlate ||
    !vehicleColor ||
    !numberOfSeats ||
    !vehicleType ||
    !milage ||
    files.ownerAdharCard.length !== 2 ||
    !files.ownerImage ||
    files.ownerDrivingLicense.length !== 2 ||
    files.vehicleImages.length !== 5 ||
    files.vehicleInsurance.length !== 2 ||
    files.vehicleRC.length !== 2 ||
    !pricePerDay ||
    !pricePerKm ||
    !fuelType
  ) {
    return res
      .status(400)
      .send({ message: "All car details and vendorId are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const carIndex = vendor.vehicles.cars.find(
      (car) =>
        car._id.toString() === vehicleId &&
        car.vehicleApprovedByAdmin === "rejected"
    );
    if (!carIndex) {
      return res.status(404).send({ message: "Car not found or not rejected" });
    }
    vendor.vehicles.cars.splice(carIndex, 1);

    const newCar = {
      ownerImage: `${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerAdharCard: files?.ownerAdharCard.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      ownerDrivingLicense: files?.ownerDrivingLicense.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleImages: files?.vehicleImages.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleInsurance: files?.vehicleInsurance.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleRC: files?.vehicleRC.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      vehicleType,
      vehicleApprovedByAdmin: "pending",
      pricePerDay,
      pricePerKm,
      fuelType,
    };

    vendor.vehicles.cars.push(newCar);
    const savedVendor = await vendor.save();

    res.status(201).send({
      message: "Car recreated successfully with pending status",
      savedVendor,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllVehiclesByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const allVehicles = [
      ...vendor.vehicles.cars,
      ...vendor.vehicles.vans,
      ...vendor.vehicles.buses,
      ...vendor.vehicles.autos,
      ...vendor.vehicles.lorries,
      ...vendor.vehicles.trucks,
    ];

    res.status(200).send({
      message: "All vehicles fetched successfully",
      vehicles: allVehicles,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getVehicleDetailsByvehicleId = async (req, res) => {
  try {
    const { vendorId, vehicleId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    let foundVehicle = null;
    const categories = ["cars", "vans", "buses", "autos", "trucks"];

    for (const category of categories) {
      if (Array.isArray(vendor.vehicles[category])) {
        const vehicleDetails = vendor.vehicles[category].id(vehicleId);
        if (vehicleDetails) {
          foundVehicle = {
            _id: vendor._id,
            userName: vendor.userName,
            email: vendor.email,
            phoneNumber: vendor.phoneNumber,
            address: vendor.address,
            vehicleDetails,
          };
          break;
        }
      }
    }

    if (!foundVehicle) {
      return res.status(404).send({ message: "Vehicle not found" });
    }

    res.status(200).send({
      message: "Vehicle details fetched successfully",
      foundVehicle,
    });
  } catch (error) {
    // Catch any server errors
    res.status(500).send({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const getVendorCars = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    if (
      !vendor.vehicles ||
      !vendor.vehicles.cars ||
      vendor.vehicles.cars.length === 0
    ) {
      return res
        .status(404)
        .send({ message: "No cars available for the vendor" });
    }

    const cars = vendor.vehicles.cars;

    res
      .status(200)
      .send({ message: "Approved cars retrieved successfully", cars });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const editCar = async (req, res) => {
  const { vendorId, vehicleId } = req.params;
  const updatedData = req.body;
  const files = req.files;
  if (!vendorId || !vehicleId) {
    return res
      .status(400)
      .send({ message: "VendorId and VehicleId are required" });
  }

  if (
    !files?.ownerAdharCard ||
    !files?.ownerImage ||
    !files?.ownerDrivingLicense ||
    !files?.vehicleImages ||
    !files?.vehicleInsurance ||
    !files?.vehicleRC
  ) {
    return res
      .status(400)
      .send({ message: "All required Document must be uploaded" });
  }

  if (
    files.ownerAdharCard.length !== 2 ||
    files.ownerImage.length !== 1 ||
    files.ownerDrivingLicense.length !== 2 ||
    files.vehicleImages.length !== 5 ||
    files.vehicleInsurance.length !== 2 ||
    files.vehicleRC.length !== 2
  ) {
    return res
      .status(400)
      .send({ message: "Incorrect number of files uploaded" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendot not found " });
    }

    const carToUpdate = vendor.vehicles.cars.find(
      (car) => car._id.toString() === vehicleId
    );

    if (!carToUpdate) {
      return res.status(404).send({ message: "Car not found" });
    }

    if (files) {
      carToUpdate.ownerAdharCard = files?.ownerAdharCard
        ? files.ownerAdharCard.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : carToUpdate.ownerAdharCard;

      carToUpdate.ownerImage = files?.ownerImage
        ? `${process.env.baseURL}/${files?.ownerImage[0]?.path}`
        : carToUpdate.ownerImage;

      carToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense
        ? files.ownerDrivingLicense.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : carToUpdate.ownerDrivingLicense;

      carToUpdate.vehicleImages = files?.vehicleImages
        ? files.vehicleImages.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : carToUpdate.vehicleImages;

      carToUpdate.vehicleInsurance = files?.vehicleInsurance
        ? files.vehicleInsurance.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : carToUpdate.vehicleInsurance;

      carToUpdate.vehicleRC = files?.vehicleRC
        ? files.vehicleRC.map((file) => `${process.env.baseURL}/${file.path}`)
        : carToUpdate.vehicleRC;
    }

    carToUpdate.vehicleMake =
      updatedData.vehicleMake || carToUpdate.vehicleMake;
    carToUpdate.vehicleModel =
      updatedData.vehicleModel || carToUpdate.vehicleModel;
    carToUpdate.licensePlate =
      updatedData.licensePlate || carToUpdate.licensePlate;
    carToUpdate.vehicleColor =
      updatedData.vehicleColor || carToUpdate.vehicleColor;
    carToUpdate.numberOfSeats =
      updatedData.numberOfSeats || carToUpdate.numberOfSeats;
    carToUpdate.milage = updatedData.milage || carToUpdate.milage;
    carToUpdate.pricePerDay =
      updatedData.pricePerDay || carToUpdate.pricePerDay;
    carToUpdate.pricePerKm = updatedData.pricePerKm || carToUpdate.pricePerKm;
    carToUpdate.fuelType = updatedData.fuelType || carToUpdate.fuelType;
    carToUpdate.vehicleType =
      updatedData.vehicleType || carToUpdate.vehicleType;
    carToUpdate.vehicleApprovedByAdmin = "pending";
    carToUpdate.rejectedReason = "";

    const updatedcar = await vendor.save();

    res.status(200).send({ message: "Car updated successfully", updatedcar });
  } catch (error) {
    console.error("Error updating car:", error);
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const createAuto = async (req, res) => {
  const {
    vendorId,
    vehicleModel,
    vehicleMake,
    licensePlate,
    pricePerDay,
    pricePerKm,
    fuelType,
    registerAmount,
    ownerImage,
    ownerAdharCard = [],
    ownerDrivingLicense = [],
    vehicleImages = [],
    vehicleInsurance = [],
    vehicleRC = []
  } = req.body;

  console.log(req)

  // Validation
  if (!vendorId || !vehicleModel || !licensePlate || !vehicleMake || 
      !pricePerDay || !pricePerKm || !fuelType) {
    return res.status(400).json({ message: "All auto details are required" });
  }

  // File validation
  const validateFiles = (files, requiredCount) => {
    return files.filter(file => file !== null).length >= requiredCount;
  };

  if (
    !validateFiles([ownerImage], 1) ||
    !validateFiles(ownerAdharCard, 2) ||
    !validateFiles(ownerDrivingLicense, 2) ||
    !validateFiles(vehicleImages, 5) ||
    !validateFiles(vehicleInsurance, 2) ||
    !validateFiles(vehicleRC, 2)
  ) {
    return res.status(400).json({ message: "Incorrect number of valid files uploaded" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Process files and save to disk
    const processFiles = async (files, folder) => {
      const uploadsDir = path.join(__dirname, '../uploads', folder);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      return Promise.all(
        files.filter(Boolean).map(async (base64Str, index) => {
          try {
            const match = base64Str.match(/^data:(.+?);base64,(.+)$/);
            if (!match) return null;
            
            const [_, mimeType, data] = match;
            const ext = mimeType.split('/')[1] || 'bin';
            const filename = `${folder}_${Date.now()}_${index}.${ext}`;
            const filePath = path.join(uploadsDir, filename);
            
            await fs.promises.writeFile(filePath, Buffer.from(data, 'base64'));
            return `https://worldofaat.com/api/uploads/${filename}`;
          } catch (error) {
            console.error(`Error processing ${folder} file:`, error);
            return null;
          }
        })
      );
    };

    // Process all files
    const [
  ownerImageUrls,
  aadharUrls,
  licenseUrls,
  vehicleImageUrls,
  insuranceUrls,
  rcUrls
] = await Promise.all([
  processFiles(ownerImage, 'owner_images'),
  processFiles(ownerAdharCard, 'aadhar_cards'),
  processFiles(ownerDrivingLicense, 'licenses'),
  processFiles(vehicleImages, 'vehicle_images'),
  processFiles(vehicleInsurance, 'insurances'),
  processFiles(vehicleRC, 'rcs')
]);


    // Create new auto entry
    const newAuto = {
       ownerImage: ownerImageUrls.filter(Boolean), // same format as others
      ownerAdharCard: aadharUrls.filter(Boolean),
      ownerDrivingLicense: licenseUrls.filter(Boolean),
      vehicleImages: vehicleImageUrls.filter(Boolean),
      vehicleInsurance: insuranceUrls.filter(Boolean),
      vehicleRC: rcUrls.filter(Boolean),
      vehicleModel,
      licensePlate,
      pricePerDay,
      pricePerKm,
      fuelType,
      vehicleMake,
      registerAmount
    };

    vendor.vehicles.autos.push(newAuto);
    await vendor.save();

    res.status(201).json({ 
      message: "Auto created successfully",
      data: newAuto
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
};


const recreateAuto = async (req, res) => {
  const {
    vendorId,
    vehicleId,
    vehicleModel,
    vehicleMake,
    licensePlate,
    pricePerDay,
    pricePerKm,
    fuelType,
  } = req.body;
  const files = req.files;

  if (
    !vendorId ||
    !vehicleId ||
    !vehicleModel ||
    !vehicleMake ||
    !licensePlate ||
    files.ownerAdharCard.length !== 2 ||
    !files.ownerImage ||
    files.ownerDrivingLicense.length !== 2 ||
    files.vehicleImages.length !== 5 ||
    files.vehicleInsurance.length !== 2 ||
    files.vehicleRC.length !== 2 ||
    !pricePerDay ||
    !pricePerKm ||
    !fuelType
  ) {
    return res.status(400).send({ message: "All auto details  are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const autoIndex = vendor.vehicles.autos.find(
      (car) =>
        car._id.toString() === vehicleId &&
        car.vehicleApprovedByAdmin === "rejected"
    );
    if (!autoIndex) {
      return res
        .status(404)
        .send({ message: "Auto not found or not rejected" });
    }
    vendor.vehicles.autos.splice(autoIndex, 1);

    const newAuto = {
      ownerImage: `${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerAdharCard: files?.ownerAdharCard.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      ownerDrivingLicense: files?.ownerDrivingLicense.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleImages: files?.vehicleImages.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleInsurance: files?.vehicleInsurance.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleRC: files?.vehicleRC.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleModel,
      licensePlate,
      vehicleApprovedByAdmin: "pending",
      pricePerDay,
      pricePerKm,
      vehicleMake,
      fuelType,
    };

    vendor.vehicles.autos.push(newAuto);
    const savedVendor = await vendor.save();

    res.status(201).send({
      message: "Auto recreated successfully with pending status",
      savedVendor,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorAuots = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    if (
      !vendor.vehicles ||
      !vendor.vehicles.autos ||
      vendor.vehicles.autos.length === 0
    ) {
      return res
        .status(404)
        .send({ message: "No autos available for the vendor" });
    }

    const autos = vendor.vehicles.autos;

    res.status(200).send({ message: " autos retrieved successfully", autos });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const editAuto = async (req, res) => {
  const { vendorId, vehicleId } = req.params;
  const updatedData = req.body;
  const files = req.files;

  if (!vendorId || !vehicleId) {
    return res
      .status(400)
      .send({ message: "VendorID and vehicleID are required" });
  }

  if (
    !files?.ownerAdharCard ||
    !files?.ownerImage ||
    !files?.ownerDrivingLicense ||
    !files?.vehicleImages ||
    !files?.vehicleInsurance ||
    !files?.vehicleRC
  ) {
    return res
      .status(400)
      .send({ message: "All required Document must be uploaded" });
  }

  if (
    files.ownerAdharCard.length !== 2 ||
    files.ownerImage.length !== 1 ||
    files.ownerDrivingLicense.length !== 2 ||
    files.vehicleImages.length !== 5 ||
    files.vehicleInsurance.length !== 2 ||
    files.vehicleRC.length !== 2
  ) {
    return res
      .status(400)
      .send({ message: "Incorrect number of files uploaded" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const autoToUpdate = vendor.vehicles.autos.find(
      (auto) => auto._id.toString() === vehicleId
    );
    if (!autoToUpdate) {
      return res.status(404).send({ message: "Auto not found" });
    }

    if (files) {
      autoToUpdate.ownerAdharCard = files?.ownerAdharCard
        ? files.ownerAdharCard.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : autoToUpdate.ownerAdharCard;

      autoToUpdate.ownerImage = files?.ownerImage
        ? `${process.env.baseURL}/${files?.ownerImage[0]?.path}`
        : autoToUpdate.ownerImage;

      autoToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense
        ? files.ownerDrivingLicense.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : autoToUpdate.ownerDrivingLicense;

      autoToUpdate.vehicleImages = files?.vehicleImages
        ? files.vehicleImages.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : autoToUpdate.vehicleImages;

      autoToUpdate.vehicleInsurance = files?.vehicleInsurance
        ? files.vehicleInsurance.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : autoToUpdate.vehicleInsurance;

      autoToUpdate.vehicleRC = files?.vehicleRC
        ? files.vehicleRC.map((file) => `${process.env.baseURL}/${file.path}`)
        : autoToUpdate.vehicleRC;
    }

    autoToUpdate.vehicleModel =
      updatedData.vehicleModel || autoToUpdate.vehicleModel;
    autoToUpdate.vehicleMake =
      updatedData.vehicleMake || autoToUpdate.vehicleMake;
    autoToUpdate.licensePlate =
      updatedData.licensePlate || autoToUpdate.licensePlate;
    autoToUpdate.pricePerDay =
      updatedData.pricePerDay || autoToUpdate.pricePerDay;
    autoToUpdate.pricePerKm = updatedData.pricePerKm || autoToUpdate.pricePerKm;
    autoToUpdate.fuelType = updatedData.fuelType || autoToUpdate.fuelType;
    autoToUpdate.vehicleApprovedByAdmin = "pending";
    autoToUpdate.rejectedReason = "";

    await vendor.save();

    res
      .status(201)
      .send({ message: "Auto updated successfully", auto: autoToUpdate });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const createVan = async (req, res) => {
  try {
    // Validate payload size first
    if (req.headers['content-length'] > 50 * 1024 * 1024) { // 50MB
      return res.status(413).json({ 
        message: "Payload too large (max 50MB)",
        suggestion: "Please reduce file sizes or upload fewer files"
      });
    }

    const {
      vendorId,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      pricePerDay,
      pricePerKm,
      fuelType,
      registerAmount = 2000,
      ownerImage,
      ownerAdharCard = [],
      ownerDrivingLicense = [],
      vehicleImages = [],
      vehicleInsurance = [],
      vehicleRC = []
    } = req.body;

    // Basic validation
    if (!vendorId || !vehicleMake || !vehicleModel || !licensePlate || 
        !vehicleColor || !numberOfSeats || !milage || 
        !pricePerDay || !pricePerKm || !fuelType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // File validation
    const validateFiles = (files, requiredCount) => {
      return files.filter(file => file !== null).length >= requiredCount;
    };

    if (
      !validateFiles([ownerImage], 1) ||
      !validateFiles(ownerAdharCard, 2) ||
      !validateFiles(ownerDrivingLicense, 2) ||
      !validateFiles(vehicleImages, 5) ||
      !validateFiles(vehicleInsurance, 2) ||
      !validateFiles(vehicleRC, 2)
    ) {
      return res.status(400).json({ message: "Incorrect number of valid files uploaded" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Process files and save to disk
    const processFiles = async (files, folder) => {
      const uploadsDir = path.join(__dirname, '../uploads', folder);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      return Promise.all(
        files.filter(Boolean).map(async (base64Str, index) => {
          try {
            const match = base64Str.match(/^data:(.+?);base64,(.+)$/);
            if (!match) return null;
            
            const [_, mimeType, data] = match;
            const ext = mimeType.split('/')[1] || 'bin';
            const filename = `${folder}_${Date.now()}_${index}.${ext}`;
            const filePath = path.join(uploadsDir, filename);
            
            await fs.promises.writeFile(filePath, Buffer.from(data, 'base64'));
            return `https://worldofaat.com/api/uploads/${filename}`;
          } catch (error) {
            console.error(`Error processing ${folder} file:`, error);
            return null;
          }
        })
      );
    };

    // Process all files
    const [
      ownerImageUrl,
      aadharUrls,
      licenseUrls,
      vehicleImageUrls,
      insuranceUrls,
      rcUrls
    ] = await Promise.all([
      processFiles([ownerImage], 'owner_images'),
      processFiles(ownerAdharCard, 'aadhar_cards'),
      processFiles(ownerDrivingLicense, 'licenses'),
      processFiles(vehicleImages, 'vehicle_images'),
      processFiles(vehicleInsurance, 'insurances'),
      processFiles(vehicleRC, 'rcs')
    ]);

    // Create new van entry
    const newVan = {
      ownerImage: ownerImageUrl[0] || null,
      ownerAdharCard: aadharUrls.filter(Boolean),
      ownerDrivingLicense: licenseUrls.filter(Boolean),
      vehicleImages: vehicleImageUrls.filter(Boolean),
      vehicleInsurance: insuranceUrls.filter(Boolean),
      vehicleRC: rcUrls.filter(Boolean),
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      pricePerDay,
      pricePerKm,
      fuelType,
      registerAmount
    };

    vendor.vehicles.vans.push(newVan);
    await vendor.save();

    res.status(201).json({ 
      message: "Van created successfully",
      data: newVan
    });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
};

const recreateVan = async (req, res) => {
  const {
    vendorId,
    vehicleId,
    vehicleMake,
    vehicleModel,
    licensePlate,
    vehicleColor,
    numberOfSeats,
    milage,
    pricePerDay,
    pricePerKm,
    fuelType,
  } = req.body;
  const files = req.files;

  if (
    !vendorId ||
    !vehicleMake ||
    !vehicleModel ||
    !licensePlate ||
    !vehicleColor ||
    !numberOfSeats ||
    !milage ||
    files.ownerAdharCard.length !== 2 ||
    !files.ownerImage ||
    files.ownerDrivingLicense.length !== 2 ||
    files.vehicleImages.length !== 5 ||
    files.vehicleInsurance.length !== 2 ||
    files.vehicleRC.length !== 2 ||
    !pricePerDay ||
    !pricePerKm ||
    !fuelType
  ) {
    return res
      .status(400)
      .send({ message: "All van details and vendorId are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const vanIndex = vendor.vehicles.vans.find(
      (van) =>
        van._id.toString() === vehicleId &&
        van.vehicleApprovedByAdmin === "rejected"
    );
    if (!vanIndex) {
      return res.status(404).send({ message: "van not found or not rejected" });
    }
    vendor.vehicles.vans.splice(vanIndex, 1);

    const newVan = {
      ownerImage: `${process.env.baseURL}/${files?.ownerImage[0]?.path}`,
      ownerAdharCard: files?.ownerAdharCard.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      ownerDrivingLicense: files?.ownerDrivingLicense.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleImages: files?.vehicleImages.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleInsurance: files?.vehicleInsurance.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleRC: files?.vehicleRC.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      vehicleApprovedByAdmin: "pending",
      pricePerDay,
      pricePerKm,
      fuelType,
    };

    vendor.vehicles.vans.push(newVan);
    const savedVendor = await vendor.save();

    res.status(201).send({
      message: "Car recreated successfully with pending status",
      savedVendor,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorVans = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "vendor not found" });
    }

    if (
      !vendor.vehicles ||
      !vendor.vehicles.vans ||
      vendor.vehicles.vans.length === 0
    ) {
      return res
        .status(404)
        .send({ message: "No vans available for the vendor" });
    }

    const vanData = vendor.vehicles.vans;

    res.status(200).send({ message: "Vans fetched successfully", vanData });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const editVan = async (req, res) => {
  const { vendorId, vehicleId } = req.params;
  const updatedData = req.body;
  const files = req.files;

  if (!vendorId || !vehicleId) {
    return res
      .status(400)
      .send({ message: "VendorID and vehicleID are required" });
  }

  if (
    !files?.ownerAdharCard ||
    !files?.ownerImage ||
    !files?.ownerDrivingLicense ||
    !files?.vehicleImages ||
    !files?.vehicleInsurance ||
    !files?.vehicleRC
  ) {
    return res
      .status(400)
      .send({ message: "All required Document must be uploaded" });
  }

  if (
    files.ownerAdharCard.length !== 2 ||
    files.ownerImage.length !== 1 ||
    files.ownerDrivingLicense.length !== 2 ||
    files.vehicleImages.length !== 5 ||
    files.vehicleInsurance.length !== 2 ||
    files.vehicleRC.length !== 2
  ) {
    return res
      .status(400)
      .send({ message: "Incorrect number of files uploaded" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const vanToUpdate = vendor.vehicles.vans.find(
      (van) => van._id.toString() === vehicleId
    );
    if (!vanToUpdate) {
      return res.status(404).send({ message: "van not found" });
    }

    if (files) {
      vanToUpdate.ownerAdharCard = files?.ownerAdharCard
        ? files.ownerAdharCard.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : vanToUpdate.ownerAdharCard;

      vanToUpdate.ownerImage = files?.ownerImage
        ? `${process.env.baseURL}/${files.ownerImage[0]?.path}`
        : vanToUpdate.ownerImage;

      vanToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense
        ? files.ownerDrivingLicense.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : vanToUpdate.ownerDrivingLicense;

      vanToUpdate.vehicleImages = files?.vehicleImages
        ? files.vehicleImages.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : vanToUpdate.vehicleImages;

      vanToUpdate.vehicleInsurance = files?.vehicleInsurance
        ? files.vehicleInsurance.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : vanToUpdate.vehicleInsurance;

      vanToUpdate.vehicleRC = files?.vehicleRC
        ? files.vehicleRC.map((file) => `${process.env.baseURL}/${file.path}`)
        : vanToUpdate.vehicleRC;
    }

    vanToUpdate.vehicleModel =
      updatedData.vehicleModel || vanToUpdate.vehicleModel;
    vanToUpdate.numberOfSeats =
      updatedData.numberOfSeats || vanToUpdate.numberOfSeats;
    vanToUpdate.licensePlate =
      updatedData.licensePlate || vanToUpdate.licensePlate;
    vanToUpdate.vehicleMake =
      updatedData.vehicleMake || vanToUpdate.vehicleMake;
    vanToUpdate.vehicleColor =
      updatedData.vehicleColor || vanToUpdate.vehicleColor;
    vanToUpdate.milage = updatedData.milage || vanToUpdate.milage;
    vanToUpdate.pricePerDay =
      updatedData.pricePerDay || vanToUpdate.pricePerDay;
    vanToUpdate.pricePerKm = updatedData.pricePerKm || vanToUpdate.pricePerKm;
    vanToUpdate.fuelType = updatedData.fuelType || vanToUpdate.fuelType;
    vanToUpdate.vehicleApprovedByAdmin = "pending";
    vanToUpdate.rejectedReason = "";

    await vendor.save();

    res
      .status(201)
      .send({ message: "Auto updated successfully", auto: vanToUpdate });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const createbus = async (req, res) => {
  try {
    // Validate payload size first
    if (req.headers['content-length'] > 50 * 1024 * 1024) { // 50MB
      return res.status(413).json({ 
        message: "Payload too large (max 50MB)",
        suggestion: "Please reduce file sizes or upload fewer files"
      });
    }

    const {
      vendorId,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      ac,
      pricePerDay,
      pricePerKm,
      fuelType,
      registerAmount = 2000,
      ownerImage,
      ownerAdharCard = [],
      ownerDrivingLicense = [],
      vehicleImages = [],
      vehicleInsurance = [],
      vehicleRC = []
    } = req.body;

    // Basic validation
    if (!vendorId || !vehicleMake || !vehicleModel || !licensePlate || 
        !vehicleColor || !numberOfSeats || !milage || !ac ||
        !pricePerDay || !pricePerKm || !fuelType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // File validation
    const validateFiles = (files, requiredCount) => {
      return files.filter(file => file !== null).length >= requiredCount;
    };

    if (
      !validateFiles([ownerImage], 1) ||
      !validateFiles(ownerAdharCard, 2) ||
      !validateFiles(ownerDrivingLicense, 2) ||
      !validateFiles(vehicleImages, 5) ||
      !validateFiles(vehicleInsurance, 2) ||
      !validateFiles(vehicleRC, 2)
    ) {
      return res.status(400).json({ message: "Incorrect number of valid files uploaded" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Process files and save to disk
    const processFiles = async (files, folder) => {
      const uploadsDir = path.join(__dirname, '../uploads', folder);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      return Promise.all(
        files.filter(Boolean).map(async (base64Str, index) => {
          try {
            const match = base64Str.match(/^data:(.+?);base64,(.+)$/);
            if (!match) return null;
            
            const [_, mimeType, data] = match;
            const ext = mimeType.split('/')[1] || 'bin';
            const filename = `${folder}_${Date.now()}_${index}.${ext}`;
            const filePath = path.join(uploadsDir, filename);
            
            await fs.promises.writeFile(filePath, Buffer.from(data, 'base64'));
            return `https://worldofaat.com/api/uploads/${filename}`;
          } catch (error) {
            console.error(`Error processing ${folder} file:`, error);
            return null;
          }
        })
      );
    };

    // Process all files
    const [
      ownerImageUrl,
      aadharUrls,
      licenseUrls,
      vehicleImageUrls,
      insuranceUrls,
      rcUrls
    ] = await Promise.all([
      processFiles([ownerImage], 'owner_images'),
      processFiles(ownerAdharCard, 'aadhar_cards'),
      processFiles(ownerDrivingLicense, 'licenses'),
      processFiles(vehicleImages, 'vehicle_images'),
      processFiles(vehicleInsurance, 'insurances'),
      processFiles(vehicleRC, 'rcs')
    ]);

    // Create new bus entry
    const newBus = {
      ownerImage: ownerImageUrl[0] || null,
      ownerAdharCard: aadharUrls.filter(Boolean),
      ownerDrivingLicense: licenseUrls.filter(Boolean),
      vehicleImages: vehicleImageUrls.filter(Boolean),
      vehicleInsurance: insuranceUrls.filter(Boolean),
      vehicleRC: rcUrls.filter(Boolean),
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      ac,
      pricePerDay,
      pricePerKm,
      fuelType,
      registerAmount
    };

    vendor.vehicles.buses.push(newBus);
    await vendor.save();

    res.status(201).json({ 
      message: "Bus created successfully",
      data: newBus
    });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
};

const recreatebus = async (req, res) => {
  const {
    vendorId,
    vehicleId,
    vehicleMake,
    vehicleModel,
    licensePlate,
    vehicleColor,
    numberOfSeats,
    milage,
    ac,
    pricePerDay,
    pricePerKm,
    fuelType,
  } = req.body;
  const files = req.files;

  if (
    !vendorId ||
    !vehicleMake ||
    !vehicleModel ||
    !licensePlate ||
    !vehicleColor ||
    !numberOfSeats ||
    !milage ||
    !ac ||
    files.ownerAdharCard.length !== 2 ||
    !files.ownerImage ||
    files.ownerDrivingLicense.length !== 2 ||
    files.vehicleImages.length !== 5 ||
    files.vehicleInsurance.length !== 2 ||
    files.vehicleRC.length !== 2 ||
    !pricePerDay ||
    !pricePerKm ||
    !fuelType
  ) {
    return res
      .status(400)
      .send({ message: "All bus details and vendorId are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const busIndex = vendor.vehicles.buses.find(
      (bus) =>
        bus._id.toString() === vehicleId &&
        bus.vehicleApprovedByAdmin === "rejected"
    );
    if (!busIndex) {
      return res.status(404).send({ message: "bus not found or not rejected" });
    }
    vendor.vehicles.buses.splice(busIndex, 1);

    const newBus = {
      ownerImage: `${process.env.baseURL}/${files?.ownerImage[0]?.path}`,

      ownerAdharCard: files?.ownerAdharCard.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      ownerDrivingLicense: files?.ownerDrivingLicense.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleImages: files?.vehicleImages.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleInsurance: files?.vehicleInsurance.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleRC: files?.vehicleRC.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      numberOfSeats,
      milage,
      vehicleApprovedByAdmin: "pending",
      ac,
      pricePerDay,
      pricePerKm,
      fuelType,
    };

    vendor.vehicles.buses.push(newBus);
    const savedVendor = await vendor.save();

    res.status(201).send({
      message: "bus recreated successfully with pending status",
      savedVendor,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorBus = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    if (
      !vendor.vehicles ||
      !vendor.vehicles.buses ||
      vendor.vehicles.buses.length === 0
    ) {
      return res
        .status(404)
        .send({ message: "No buses available for the vendor" });
    }

    const buses = vendor.vehicles.cars;

    res.status(200).send({ message: " Buses retrieved successfully", buses });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const editBus = async (req, res) => {
  const { vendorId, vehicleId } = req.params;
  const updatedData = req.body;
  const files = req.files;
  if (!vendorId || !vehicleId) {
    return res
      .status(400)
      .send({ message: "VendorId and VehicleId are required" });
  }

  if (
    !files?.ownerAdharCard ||
    !files?.ownerImage ||
    !files?.ownerDrivingLicense ||
    !files?.vehicleImages ||
    !files?.vehicleInsurance ||
    !files?.vehicleRC
  ) {
    return res
      .status(400)
      .send({ message: "All required Document must be uploaded" });
  }

  if (
    files.ownerAdharCard.length !== 2 ||
    files.ownerImage.length !== 1 ||
    files.ownerDrivingLicense.length !== 2 ||
    files.vehicleImages.length !== 5 ||
    files.vehicleInsurance.length !== 2 ||
    files.vehicleRC.length !== 2
  ) {
    return res
      .status(400)
      .send({ message: "Incorrect number of files uploaded" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendot not found " });
    }

    const busToUpdate = vendor.vehicles.buses.find(
      (bus) => bus._id.toString() === vehicleId
    );

    if (!busToUpdate) {
      return res.status(404).send({ message: "bus not found" });
    }

    if (files) {
      busToUpdate.ownerAdharCard = files?.ownerAdharCard
        ? files.ownerAdharCard.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : busToUpdate.ownerAdharCard;

      busToUpdate.ownerImage = files?.ownerImage
        ? `${process.env.baseURL}/${files?.ownerImage[0]?.path}`
        : busToUpdate.ownerImage;

      busToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense
        ? files.ownerDrivingLicense.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : busToUpdate.ownerDrivingLicense;

      busToUpdate.vehicleImages = files?.vehicleImages
        ? files.vehicleImages.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : busToUpdate.vehicleImages;

      busToUpdate.vehicleInsurance = files?.vehicleInsurance
        ? files.vehicleInsurance.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : busToUpdate.vehicleInsurance;

      busToUpdate.vehicleRC = files?.vehicleRC
        ? files.vehicleRC.map((file) => `${process.env.baseURL}/${file.path}`)
        : busToUpdate.vehicleRC;
    }

    busToUpdate.vehicleMake =
      updatedData.vehicleMake || busToUpdate.vehicleMake;
    busToUpdate.vehicleModel =
      updatedData.vehicleModel || busToUpdate.vehicleModel;
    busToUpdate.licensePlate =
      updatedData.licensePlate || busToUpdate.licensePlate;
    busToUpdate.vehicleColor =
      updatedData.vehicleColor || busToUpdate.vehicleColor;
    busToUpdate.numberOfSeats =
      updatedData.numberOfSeats || busToUpdate.numberOfSeats;
    busToUpdate.milage = updatedData.milage || busToUpdate.milage;
    busToUpdate.ac = updatedData.ac || busToUpdate.ac;
    busToUpdate.pricePerDay =
      updatedData.pricePerDay || busToUpdate.pricePerDay;
    busToUpdate.pricePerKm = updatedData.pricePerKm || busToUpdate.pricePerKm;
    busToUpdate.fuelType = updatedData.fuelType || busToUpdate.fuelType;
    busToUpdate.vehicleApprovedByAdmin = "pending";
    busToUpdate.rejectedReason = "";

    const updatedBus = await vendor.save();

    res.status(201).send({ message: "Bus updated successfully", updatedBus });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const createTruck = async (req, res) => {
  try {
    // Validate payload size first
    if (req.headers['content-length'] > 50 * 1024 * 1024) { // 50MB
      return res.status(413).json({ 
        message: "Payload too large (max 50MB)",
        suggestion: "Please reduce file sizes or upload fewer files"
      });
    }

    const {
      vendorId,
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      ton,
      size,
      goodsType,
      pricePerDay,
      pricePerKm,
      fuelType,
      milage,
      ownerImage,
      ownerAdharCard = [],
      ownerDrivingLicense = [],
      vehicleImages = [],
      vehicleInsurance = [],
      vehicleRC = []
    } = req.body;

    // Basic validation
    if (!vendorId || !vehicleMake || !licensePlate || !vehicleColor || !ton || !size || !goodsType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Tonnage validation based on goodsType
    const tonValue = Number(ton);
    if (goodsType === "Small" && (tonValue < 500 || tonValue > 1000)) {
      return res.status(400).json({ 
        message: "Tonnage must be between 500 kg and 1000 kg for Small vehicles"
      });
    } else if (goodsType === "Medium" && tonValue < 1000) {
      return res.status(400).json({ 
        message: "Tonnage must be 1000 kg or above for Medium vehicles"
      });
    } else if (goodsType === "Large" && tonValue < 10000) {
      return res.status(400).json({ 
        message: "Tonnage must be 10000 kg or above for Large vehicles"
      });
    } else if (goodsType === "XL" && tonValue < 20000) {
      return res.status(400).json({ 
        message: "Tonnage must be 20000 kg or above for XL vehicles"
      });
    }

    // File validation
    const validateFiles = (files, requiredCount) => {
      return files.filter(file => file !== null).length >= requiredCount;
    };

    if (
      !validateFiles([ownerImage], 1) ||
      !validateFiles(ownerAdharCard, 2) ||
      !validateFiles(ownerDrivingLicense, 2) ||
      !validateFiles(vehicleImages, 5) ||
      !validateFiles(vehicleInsurance, 2) ||
      !validateFiles(vehicleRC, 2)
    ) {
      return res.status(400).json({ message: "Incorrect number of valid files uploaded" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    // Process files and save to disk
    const processFiles = async (files, folder) => {
      const uploadsDir = path.join(__dirname, '../uploads', folder);
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      return Promise.all(
        files.filter(Boolean).map(async (base64Str, index) => {
          try {
            const match = base64Str.match(/^data:(.+?);base64,(.+)$/);
            if (!match) return null;
            
            const [_, mimeType, data] = match;
            const ext = mimeType.split('/')[1] || 'bin';
            const filename = `${folder}_${Date.now()}_${index}.${ext}`;
            const filePath = path.join(uploadsDir, filename);
            
            await fs.promises.writeFile(filePath, Buffer.from(data, 'base64'));
            return `https://worldofaat.com/api/uploads/${filename}`;
          } catch (error) {
            console.error(`Error processing ${folder} file:`, error);
            return null;
          }
        })
      );
    };

    // Process all files
    const [
      ownerImageUrl,
      aadharUrls,
      licenseUrls,
      vehicleImageUrls,
      insuranceUrls,
      rcUrls
    ] = await Promise.all([
      processFiles([ownerImage], 'owner_images'),
      processFiles(ownerAdharCard, 'aadhar_cards'),
      processFiles(ownerDrivingLicense, 'licenses'),
      processFiles(vehicleImages, 'vehicle_images'),
      processFiles(vehicleInsurance, 'insurances'),
      processFiles(vehicleRC, 'rcs')
    ]);

    // Create new truck entry
    const newTruck = {
      ownerImage: ownerImageUrl[0] || null,
      ownerAdharCard: aadharUrls.filter(Boolean),
      ownerDrivingLicense: licenseUrls.filter(Boolean),
      vehicleImages: vehicleImageUrls.filter(Boolean),
      vehicleInsurance: insuranceUrls.filter(Boolean),
      vehicleRC: rcUrls.filter(Boolean),
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      ton,
      size,
      goodsType,
      pricePerDay,
      pricePerKm,
      fuelType,
      milage
    };

    vendor.vehicles.trucks.push(newTruck);
    await vendor.save();

    res.status(201).json({ 
      message: "Truck created successfully",
      data: newTruck
    });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ 
      message: "Internal server error",
      error: error.message 
    });
  }
};

const recreateTruck = async (req, res) => {
  const {
    vendorId,
    vehicleId,
    vehicleMake,
    vehicleModel,
    licensePlate,
    vehicleColor,
    ton,
    size,
    pricePerDay,
    pricePerKm,
    fuelType,
    milage,
  } = req.body;
  const files = req.files;

  if (
    !vendorId ||
    !vehicleId ||
    !vehicleMake ||
    !vehicleModel ||
    !licensePlate ||
    !vehicleColor ||
    !ton ||
    !size ||
    !milage ||
    files.ownerAdharCard.length !== 2 ||
    !files.ownerImage ||
    files.ownerDrivingLicense.length !== 2 ||
    files.vehicleImages.length !== 5 ||
    files.vehicleInsurance.length !== 2 ||
    files.vehicleRC.length !== 2 ||
    !pricePerDay ||
    !pricePerKm ||
    !fuelType
  ) {
    return res.status(400).send({ message: "All truck details are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const truckIndex = vendor.vehicles.trucks.find(
      (truck) =>
        truck._id.toString() === vehicleId &&
        truck.vehicleApprovedByAdmin === "rejected"
    );
    if (!truckIndex) {
      return res
        .status(404)
        .send({ message: "truck not found or not rejected" });
    }
    vendor.vehicles.trucks.splice(truckIndex, 1);

    const newTruck = {
      ownerImage: `${process.env.baseURL}/${files?.ownerImage[0]?.path}`,

      ownerAdharCard: files?.ownerAdharCard.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      ownerDrivingLicense: files?.ownerDrivingLicense.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleImages: files?.vehicleImages.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleInsurance: files?.vehicleInsurance.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleRC: files?.vehicleRC.map(
        (file) => `${process.env.baseURL}/${file.path}`
      ),
      vehicleMake,
      vehicleModel,
      licensePlate,
      vehicleColor,
      ton,
      size,
      vehicleApprovedByAdmin: "pending",
      pricePerDay,
      pricePerKm,
      fuelType,
      milage,
    };

    vendor.vehicles.trucks.push(newTruck);
    const savedVendor = await vendor.save();

    res.status(201).send({
      message: "Truck recreated successfully with pending status",
      savedVendor,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorTruck = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    if (
      !vendor.vehicles ||
      !vendor.vehicles.trucks ||
      vendor.vehicles.trucks.length === 0
    ) {
      return res
        .status(404)
        .send({ message: "No trucks available for the vendor" });
    }

    const trucks = vendor.vehicles.trucks;

    res.status(200).send({ message: " Trucks retrieved successfully", trucks });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const editTruck = async (req, res) => {
  const { vendorId, vehicleId } = req.params;
  const updatedData = req.body;
  const files = req.files;
  if (!vendorId || !vehicleId) {
    return res
      .status(400)
      .send({ message: "VendorId and VehicleId are required" });
  }

  if (
    !files?.ownerImage ||
    !files?.ownerAdharCard ||
    !files?.ownerDrivingLicense ||
    !files?.vehicleImages ||
    !files?.vehicleInsurance ||
    !files?.vehicleRC
  ) {
    return res
      .status(400)
      .json({ message: "All required Documents must be uploaded" });
  }

  if (
    files.ownerAdharCard.length !== 2 ||
    files.ownerDrivingLicense.length !== 2 ||
    files.vehicleImages.length !== 5 ||
    files.vehicleInsurance.length !== 2 ||
    files.vehicleRC.length !== 2
  ) {
    return res
      .status(400)
      .json({ message: "Incorrect number of files uploaded" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendot not found " });
    }

    const truckToUpdate = vendor.vehicles.trucks.find(
      (truck) => truck._id.toString() === vehicleId
    );

    if (!truckToUpdate) {
      return res.status(404).send({ message: "trucks not found" });
    }

    if (files) {
      truckToUpdate.ownerAdharCard = files?.ownerAdharCard
        ? files.ownerAdharCard.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : truckToUpdate.ownerAdharCard;

      truckToUpdate.ownerImage = files?.ownerImage
        ? `${process.env.baseURL}/${files?.ownerImage[0]?.path}`
        : truckToUpdate.ownerImage;

      truckToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense
        ? files.ownerDrivingLicense.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : truckToUpdate.ownerDrivingLicense;

      truckToUpdate.vehicleImages = files?.vehicleImages
        ? files.vehicleImages.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : truckToUpdate.vehicleImages;

      truckToUpdate.vehicleInsurance = files?.vehicleInsurance
        ? files.vehicleInsurance.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : truckToUpdate.vehicleInsurance;

      truckToUpdate.vehicleRC = files?.vehicleRC
        ? files.vehicleRC.map((file) => `${process.env.baseURL}/${file.path}`)
        : truckToUpdate.vehicleRC;
    }

    truckToUpdate.vehicleMake =
      updatedData.vehicleMake || truckToUpdate.vehicleMake;
    truckToUpdate.vehicleModel =
      updatedData.vehicleModel || truckToUpdate.vehicleModel;
    truckToUpdate.licensePlate =
      updatedData.licensePlate || truckToUpdate.licensePlate;
    truckToUpdate.vehicleColor =
      updatedData.vehicleColor || truckToUpdate.vehicleColor;
    truckToUpdate.ton = updatedData.ton || truckToUpdate.ton;
    truckToUpdate.size = updatedData.size || truckToUpdate.size;
    truckToUpdate.pricePerDay =
      updatedData.pricePerDay || truckToUpdate.pricePerDay;
    truckToUpdate.pricePerKm =
      updatedData.pricePerKm || truckToUpdate.pricePerKm;
    truckToUpdate.fuelType = updatedData.fuelType || truckToUpdate.fuelType;
    truckToUpdate.milage = updatedData.milage || truckToUpdate.milage;
    truckToUpdate.vehicleApprovedByAdmin = "pending";
    truckToUpdate.rejectedReason = "";

    const updatedTruck = await vendor.save();

    res
      .status(201)
      .send({ message: "Truck updated successfully", updatedTruck });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getBookingsByVendorId = async (req, res) => {
  const { vendorId } = req.params;

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }

  try {
    const bookings = await bookingModel.find({
      "vehicleDetails.vendorId": new mongoose.Types.ObjectId(vendorId),
    });

    res
      .status(200)
      .send({ message: "Bookings retrieved successfully", bookings });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const vendorBookingApproval = async (req, res) => {
  const { bookingId, totalFare, vendorRejectedReason, vendorApprovedStatus } = req.body;

  // Validate input
  if (!bookingId) {
    return res.status(400).json({ message: "Booking ID is required" });
  }
  if (!["approved", "rejected"].includes(vendorApprovedStatus)) {
    return res.status(400).json({ message: "Invalid approval status" });
  }

  try {
    // Fetch booking
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Fetch vendor and customer
    const vendor = await vendorModel.findById(booking.vehicleDetails.vendorId);
    const customer = await customerModel.findById(booking.customer.customerId);
    if (!vendor || !customer) {
      return res.status(404).json({ message: "Vendor or Customer not found" });
    }

    // Find vehicle
    const targetVehicleId = booking.vehicleDetails.foundVehicle._id.toString();
    let foundVehicle = null;
    const vehicleCategories = Object.values(vendor.vehicles);
    for (const category of vehicleCategories) {
      foundVehicle = category.find((vehicle) => vehicle._id.toString() === targetVehicleId);
      if (foundVehicle) break;
    }
    if (!foundVehicle) {
      return res.status(404).json({ message: "Vehicle not found in vendor's inventory" });
    }

    if (vendorApprovedStatus === "rejected") {
      // Validate rejection reason
      if (!vendorRejectedReason) {
        return res.status(400).json({ message: "Please provide a reason for rejection" });
      }

      // Check rejection limit
      const currentMonthRejections = vendor.rejectionHistory.filter((rejection) => {
        const rejectionDate = new Date(rejection.date);
        const now = new Date();
        return (
          rejectionDate.getMonth() === now.getMonth() &&
          rejectionDate.getFullYear() === now.getFullYear()
        );
      });

      if (currentMonthRejections.length >= 2) {
        return res.status(403).json({
          message: "You have exceeded the rejection limit for this month (2 rejections allowed).",
        });
      }

      // Update rejection history
      vendor.rejectionHistory.push({ date: new Date() });

      // Update booking status
      booking.vendorRejectedReason = vendorRejectedReason;
      booking.vendorApprovedStatus = "rejected";
      booking.tripStatus = "cancelled";
      booking.vendorCancelled = true;
      await booking.save();

      // Update vehicle availability
      const activeBookings = await bookingModel.find({
        "vehicleDetails.foundVehicle._id": foundVehicle._id,
        vendorApprovedStatus: { $in: ["pending", "approved"] },
        tripStatus: { $nin: ["ongoing", "completed", "cancelled"] },
      });
      foundVehicle.vehicleAvailable = activeBookings.length > 0 ? "no" : "yes";
      if (foundVehicle.vehicleAvailable === "yes") {
        foundVehicle.returnDate = null;
      }
      await vendor.save();

      // Notify customer
      const rejectionMessage = {
        title: "Booking Rejected",
        description: `Dear ${customer.userName}, your booking for the ${foundVehicle.subCategory}, ${foundVehicle.vehicleModel} (${foundVehicle.licensePlate}) has been rejected. Reason: ${vendorRejectedReason}.`,
      };
      customer.messages.push(rejectionMessage);
      await customer.save();

      // Send push notification
      if (customer.expoPushToken) {
        const expo = new Expo();
        const message = {
          to: customer.expoPushToken,
          sound: "default",
          title: rejectionMessage.title,
          body: rejectionMessage.description,
          data: { screen: "Notifications" },
        };
        try {
          await expo.sendPushNotificationsAsync([message]);
        } catch (error) {
          console.error("Error sending push notification:", error);
        }
      }

      return res.status(200).json({ message: "Booking cancelled successfully", booking });
    }

    if (vendorApprovedStatus === "approved") {
      // Validate totalFare for non-auto vehicles
      // if (
      //   booking.vehicleDetails.foundVehicle.subCategory !== "auto" &&
      //   (!totalFare || isNaN(totalFare) || totalFare <= 0)
      // ) {
      //   return res.status(400).json({ message: "Valid total fare is required for approval" });
      // }

      // Generate OTP for auto or car (One Day Trip)
      if (
        booking.vehicleDetails.foundVehicle.subCategory === "auto" ||
        (booking.vehicleDetails.foundVehicle.subCategory === "car" &&
          booking.tripType === "One Day Trip")
      ) {
        booking.otpForAuto = generatePin();
        booking.otpForCar = generatePinCar();

      }

      // Calculate payments
      const commissionPercentage = foundVehicle.adminCommissionPercentage || 0;
      const adminCommissionAmount = (commissionPercentage / 100) * totalFare;
      const penaltyAmount = 0;

      booking.totalFare = penaltyAmount ? totalFare + penaltyAmount : totalFare;
      booking.remainingPayment = booking.advanceAmount
        ? booking.totalFare - booking.advanceAmount
        : booking.totalFare;
      booking.penaltyAmount = penaltyAmount;
      booking.adminCommissionAmount = penaltyAmount
        ? penaltyAmount + adminCommissionAmount
        : adminCommissionAmount;
      booking.vendorTotalPayment = totalFare - adminCommissionAmount;
      booking.totalTripFare = booking.advanceAmount
        ? booking.advanceAmount + booking.totalFare
        : booking.totalFare;
      booking.vendorApprovedStatus = "approved";
      booking.tripStatus = "start";

      await booking.save();

      // Reset customer penalty
      customer.penaltyAmount = 0;
      const approvalMessage = {
        title: "Booking Approved",
        description: `Dear ${customer.userName}, your booking for the ${foundVehicle.subCategory}, ${foundVehicle.vehicleModel} (${foundVehicle.licensePlate}) has been approved. Total fare is ${totalFare}, with remaining payment of ${booking.remainingPayment}.`,
      };
      customer.messages.push(approvalMessage);
      await customer.save();

      // Send push notification
      if (customer.expoPushToken) {
        const expo = new Expo();
        const message = {
          to: customer.expoPushToken,
          sound: "default",
          title: approvalMessage.title,
          body: approvalMessage.description,
          data: { screen: "Notifications" },
        };
        try {
          await expo.sendPushNotificationsAsync([message]);
        } catch (error) {
          console.error("Error sending push notification:", error);
        }
      }

      return res.status(200).json({ message: "Booking approved successfully", booking });
    }
  } catch (error) {
    console.error("Error in vendorBookingApproval:", error);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const VendorStartTrip = async (req, res) => {
  const { bookingId, otp } = req.body;

  if (!bookingId) {
    return res.status(400).send({ message: "Booking ID is required" });
  }

  try {
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).send({ message: "Bookings not found" });
    }

    if (booking.vehicleDetails.foundVehicle.subCategory === "auto") {
      if (!otp) {
        return res.status(400).send({ message: "OTP is required for auto " });
      }

      if (booking.otpForAuto != otp) {
        return res
          .status(401)
          .send({ message: "Invalid OTP, please enter a valid OTP" });
      }

      console.log("booking.otpForAuto", booking.otpForAuto);
      console.log("otp", otp);
    }
    if ((booking.vehicleDetails.foundVehicle.subCategory === "car") && (booking.tripType === "One Day Trip") ) {
      if (!otp) {
        return res.status(400).send({ message: "OTP is required for Car " });
      }

      // if (booking.otpForCar != otp) {
      //   return res
      //     .status(401)
      //     .send({ message: "Invalid OTP, please enter a valid OTP" });
      // }

      console.log("booking.otpForCar", booking.otpForCar);
      console.log("otp", otp);
    }


    booking.tripStatus = "ongoing";
    await booking.save();
    await res
      .status(200)
      .send({ message: "Trip Started successfully", booking });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const vendorCompleteRide = async (req, res) => {
  const { bookingId, paymentMethod } = req.body;

  if (!bookingId) {
    return res.status(400).send({ message: "Booking ID is required" });
  }

  try {
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).send({ message: "Booking not found" });
    }

    const vendor = await vendorModel.findById(booking.vehicleDetails.vendorId);
    const customer = await customerModel.findById(booking.customer.customerId);
    const admin = await adminModel.findOne();

    if (!vendor || !customer || !admin) {
      return res
        .status(404)
        .send({ message: "Vendor ,Customer or admin  not found" });
    }

    const targetVehicleId = booking.vehicleDetails.foundVehicle._id.toString();

    const vehicleCategories = Object.values(vendor.vehicles);

    let foundVehicle = null;
    for (const category of vehicleCategories) {
      foundVehicle = category.find(
        (vehicle) => vehicle._id.toString() === targetVehicleId
      );
      if (foundVehicle) {
        break;
      }
    }

    if (!foundVehicle) {
      return res
        .status(404)
        .send({ message: "Vehicle not found in the vendor's inventory" });
    }
    const activeBookings = await bookingModel.find({
      "vehicleDetails.foundVehicle._id": foundVehicle._id,
      vendorApprovedStatus: { $in: ["pending", "approved"] },
      tripStatus: { $nin: ["ongoing", "completed", "cancelled"] },
    });

    const vehicleAvailableLogic = () => {
      if (activeBookings.length > 0) {
        foundVehicle.vehicleAvailable = "no";
      } else {
        foundVehicle.vehicleAvailable = "yes";
        foundVehicle.returnDate = null;
      }
    };

    vehicleAvailableLogic();
    vendor.noOfBookings = vendor.noOfBookings ? vendor.noOfBookings + 1 : 1;
    vendor.totalEarnings = Number(
      vendor.totalEarnings
        ? vendor.totalEarnings + booking.vendorTotalPayment
        : booking.vendorTotalPayment
    );
    await vendor.save();

    admin.adminEarnings = admin.adminEarnings
      ? admin.adminEarnings + booking.adminCommissionAmount
      : booking.adminCommissionAmount;

    await admin.save();

    const vendoreEarnigsLogic = () => {
      if (paymentMethod === "cash") {
        booking.vendorTotalPayment = Number(
          booking.vendorTotalPayment - booking.remainingPayment
        );
      }
    };

    vendoreEarnigsLogic();

    booking.completedAt = new Date();
    booking.paymentMethod = paymentMethod;
    booking.tripStatus = "completed";
    booking.otpForAuto = undefined;
    booking.otpForCar = undefined;

    await booking.save();

    return res
      .status(200)
      .send({ message: "Trip completed successfully", booking });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const storeFCMTokenToVendor = async (req, res) => {
  const { vendorId, expoPushToken } = req.body;

  if (!vendorId || !expoPushToken) {
    return res
      .status(400)
      .send({ message: "Vendor ID and FCM token are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    vendor.expoPushToken = expoPushToken;
    await vendor.save();

    res.status(200).send({ message: "FCM token stored successfully", vendor });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorBookingsByMonth = async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }

  try {
    const bookingsByMonth = await bookingModel.aggregate([
      {
        $match: {
          "vehicleDetails.vendorId": new mongoose.Types.ObjectId(vendorId),
          tripStatus: "completed",
          bookedAt: { $exists: true, $type: "date" },
        },
      },
      {
        $project: {
          year: { $year: "$bookedAt" },
          month: { $month: "$bookedAt" },
          vendorTotalPayment: 1,
          bookingDetails: "$$ROOT",
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          totalVendorPayment: { $sum: "$vendorTotalPayment" },
          bookings: { $push: "$bookingDetails" },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    if (bookingsByMonth.length === 0) {
      return res
        .status(404)
        .send({ message: "No bookings found for this vendor." });
    }

    res.status(200).send({
      message: "Monthly bookings data fetched successfully",
      bookingsByMonth,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getVendorBookingsByWeek = async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }

  try {
    const bookingsByWeek = await bookingModel.aggregate([
      {
        $match: {
          "vehicleDetails.vendorId": new mongoose.Types.ObjectId(vendorId),
          tripStatus: "completed",
          bookedAt: { $exists: true, $type: "date" },
        },
      },
      {
        $project: {
          year: { $year: "$bookedAt" },
          month: { $month: "$bookedAt" },
          week: { $isoWeek: "$bookedAt" },
          vendorTotalPayment: 1,
          bookingDetails: "$$ROOT",
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month", week: "$week" },
          totalVendorPayment: { $sum: "$vendorTotalPayment" },
          bookings: { $push: "$bookingDetails" },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1, "_id.week": -1 },
      },
    ]);

    if (bookingsByWeek.length === 0) {
      return res
        .status(404)
        .send({ message: "No bookings found for this vendor." });
    }

    const formattedBookings = bookingsByWeek.map((weekData) => {
      const firstDayOfWeek = getFirstDayOfWeek(
        weekData._id.year,
        weekData._id.week
      );
      const lastDayOfWeek = getLastDayOfWeek(
        weekData._id.year,
        weekData._id.week
      );

      return {
        weekRange: `${formatDate(firstDayOfWeek)} - ${formatDate(
          lastDayOfWeek
        )}`,
        totalVendorPayment: weekData.totalVendorPayment,
        bookings: weekData.bookings,
      };
    });

    res.status(200).send({
      message: "Weekly bookings data fetched successfully",
      bookingsByWeek: formattedBookings[0],
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

// const getVendorBookingsByMonthAndWeek = async (req, res) => {
//   const { vendorId } = req.body;

//   if (!vendorId) {
//     return res.status(400).send({ message: "Vendor ID is required" });
//   }

//   try {
//     const bookingsByMonthAndWeek = await bookingModel.aggregate([
//       {
//         $match: {
//           "vehicleDetails.vendorId": new mongoose.Types.ObjectId(vendorId),
//           tripStatus: "completed",
//           bookedAt: { $exists: true, $type: "date" },
//         },
//       },
//       {
//         $project: {
//           year: { $year: "$bookedAt" },
//           month: { $month: "$bookedAt" },
//           week: { $isoWeek: "$bookedAt" },
//           vendorTotalPayment: 1,
//           bookingDetails: "$$ROOT",
//         },
//       },
//       {
//         $group: {
//           _id: { year: "$year", month: "$month", week: "$week" },
//           totalVendorPayment: { $sum: "$vendorTotalPayment" },
//           bookings: { $push: "$bookingDetails" },
//         },
//       },
//       {
//         $group: {
//           _id: { year: "$_id.year", month: "$_id.month" },
//           totalMonthlyVendorPayment: { $sum: "$totalVendorPayment" },
//           weeklyData: {
//             $push: {
//               week: "$_id.week",
//               totalVendorPayment: "$totalVendorPayment",
//               bookings: "$bookings",
//             },
//           },
//         },
//       },
//       {
//         $sort: { "_id.year": 1, "_id.month": 1 },
//       },
//     ]);

//     if (bookingsByMonthAndWeek.length === 0) {
//       return res
//         .status(404)
//         .send({ message: "No bookings found for this vendor." });
//     }

//     const formattedBookings = bookingsByMonthAndWeek.map((monthData) => {
//       const weeklyDataFormatted = monthData.weeklyData.map((weekData) => {
//         const firstDayOfWeek = getFirstDayOfWeek(
//           monthData._id.year,
//           weekData.week
//         );
//         const lastDayOfWeek = getLastDayOfWeek(
//           monthData._id.year,
//           weekData.week
//         );

//         return {
//           weekRange: `${formatDate(firstDayOfWeek)} - ${formatDate(
//             lastDayOfWeek
//           )}`,
//           totalVendorPayment: weekData.totalVendorPayment,
//           bookings: weekData.bookings,
//         };
//       });

//       return {
//         month: `${monthData._id.month}-${monthData._id.year}`,
//         totalMonthlyVendorPayment: monthData.totalMonthlyVendorPayment,
//         weeks: weeklyDataFormatted,
//       };
//     });

//     res.status(200).send({
//       message: "Monthly and weekly bookings data fetched successfully",
//       bookingsByMonthAndWeek: formattedBookings,
//     });
//   } catch (error) {
//     res
//       .status(500)
//       .send({ message: "Internal Server Error", error: error.message });
//   }
// };

const getVendorBookingsByMonthAndWeek = async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }

  try {
    const bookingsByMonthAndWeek = await bookingModel.aggregate([
      {
        $match: {
          "vehicleDetails.vendorId": new mongoose.Types.ObjectId(vendorId),
          tripStatus: "completed",
          bookedAt: { $exists: true, $type: "date" },
        },
      },
      {
        $project: {
          year: { $year: "$bookedAt" },
          month: { $month: "$bookedAt" },
          week: { $isoWeek: "$bookedAt" },
          vendorTotalPayment: 1,
          adminCommissionAmount: 1,
          paymentMethod: 1,
          remainingPayment: 1, // Include remainingPayment for cash calculations
          bookingDetails: "$$ROOT",
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month", week: "$week" },
          totalVendorPayment: { $sum: "$vendorTotalPayment" },
          totalAdminCommission: { $sum: "$adminCommissionAmount" },
          cashPayment: {
            $sum: {
              $cond: [
                { $eq: ["$paymentMethod", "cash"] },
                "$remainingPayment",
                0,
              ],
            },
          }, // Sum remainingPayment for cash bookings
          bookings: { $push: "$bookingDetails" },
        },
      },
      {
        $group: {
          _id: { year: "$_id.year", month: "$_id.month" },
          totalMonthlyVendorPayment: { $sum: "$totalVendorPayment" },
          totalMonthlyAdminCommission: { $sum: "$totalAdminCommission" },
          weeklyData: {
            $push: {
              week: "$_id.week",
              totalVendorPayment: "$totalVendorPayment",
              totalAdminCommission: "$totalAdminCommission",
              cashPayment: "$cashPayment", // Include cash payment for the week
              bookings: "$bookings",
            },
          },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    if (bookingsByMonthAndWeek.length === 0) {
      return res
        .status(404)
        .send({ message: "No bookings found for this vendor." });
    }

    const formattedBookings = bookingsByMonthAndWeek.map((monthData) => {
      const weeklyDataFormatted = monthData.weeklyData.map((weekData) => {
        const firstDayOfWeek = getFirstDayOfWeek(
          monthData._id.year,
          weekData.week
        );
        const lastDayOfWeek = getLastDayOfWeek(
          monthData._id.year,
          weekData.week
        );

        return {
          weekId: new mongoose.Types.ObjectId(), // Generate unique ID for each week
          weekRange: `${formatDate(firstDayOfWeek)} - ${formatDate(
            lastDayOfWeek
          )}`,
          totalVendorPayment: weekData.totalVendorPayment,
          totalAdminCommission: weekData.totalAdminCommission,
          totalCashPayments: weekData.cashPayment, // Store weekly cash payment
          bookings: weekData.bookings,
        };
      });

      return {
        monthId: new mongoose.Types.ObjectId(), // Generate unique ID for each month
        month: `${monthData._id.month}-${monthData._id.year}`,
        totalMonthlyVendorPayment: monthData.totalMonthlyVendorPayment,
        totalMonthlyAdminCommission: monthData.totalMonthlyAdminCommission,
        weeks: weeklyDataFormatted,
      };
    });

    // Save the formatted data to the database
    for (const monthData of formattedBookings) {
      const existingRecord = await VendorMonthlyBookings.findOne({
        vendorId,
        month: monthData.month,
      });

      if (existingRecord) {
        // Update existing record
        existingRecord.totalMonthlyVendorPayment =
          monthData.totalMonthlyVendorPayment;
        existingRecord.totalMonthlyAdminCommission =
          monthData.totalMonthlyAdminCommission;
        existingRecord.weeks = monthData.weeks;
        await existingRecord.save();
      } else {
        // Create a new record
        const newRecord = new VendorMonthlyBookings({
          vendorId,
          month: monthData.month,
          monthId: monthData.monthId,
          totalMonthlyVendorPayment: monthData.totalMonthlyVendorPayment,
          totalMonthlyAdminCommission: monthData.totalMonthlyAdminCommission,
          weeks: monthData.weeks.map((week) => ({
            ...week,
            weekId: week.weekId,
          })),
        });
        await newRecord.save();
      }
    }

    res.status(200).send({
      message:
        "Monthly and weekly bookings data fetched and stored successfully",
      bookingsByMonthAndWeek: formattedBookings,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getFirstDayOfWeek = (year, week) => {
  const firstDayOfYear = new Date(year, 0, 1);
  const dayOffset = (week - 1) * 7;
  const firstDayOfWeek = new Date(
    firstDayOfYear.setDate(firstDayOfYear.getDate() + dayOffset)
  );

  if (firstDayOfWeek.getFullYear() > year) return new Date(year, 0, 1);
  return firstDayOfWeek;
};

const getLastDayOfWeek = (year, week) => {
  const firstDayOfWeek = getFirstDayOfWeek(year, week);
  return new Date(firstDayOfWeek.setDate(firstDayOfWeek.getDate() + 6));
};

const formatDate = (date) => {
  return `${date.getDate().toString().padStart(2, "0")} ${date.toLocaleString(
    "default",
    { month: "long" }
  )} ${date.getFullYear()}`;
};

const getVendorBookingsPaymentByCashByWeek = async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }

  try {
    const bookingsByWeek = await bookingModel.aggregate([
      {
        $match: {
          "vehicleDetails.vendorId": new mongoose.Types.ObjectId(vendorId),
          tripStatus: "completed",
          paymentMethod: "cash",
          bookedAt: { $exists: true, $type: "date" },
        },
      },
      {
        $project: {
          year: { $year: "$bookedAt" },
          month: { $month: "$bookedAt" },
          week: { $isoWeek: "$bookedAt" },
          vendorTotalPayment: 1,
          bookingDetails: "$$ROOT",
        },
      },
      {
        $group: {
          _id: { year: "$year", month: "$month", week: "$week" },
          totalVendorPayment: { $sum: "$vendorTotalPayment" },
          bookings: { $push: "$bookingDetails" },
        },
      },
      {
        $sort: { "_id.year": -1, "_id.month": -1, "_id.week": -1 },
      },
    ]);

    if (bookingsByWeek.length === 0) {
      return res
        .status(404)
        .send({ message: "No bookings found for this vendor." });
    }

    const formattedBookings = bookingsByWeek.map((weekData) => {
      const firstDayOfWeek = getFirstDayOfWeek(
        weekData._id.year,
        weekData._id.week
      );
      const lastDayOfWeek = getLastDayOfWeek(
        weekData._id.year,
        weekData._id.week
      );

      return {
        weekRange: `${formatDate(firstDayOfWeek)} - ${formatDate(
          lastDayOfWeek
        )}`,
        totalVendorPayment: weekData.totalVendorPayment,
        bookings: weekData.bookings,
      };
    });

    res.status(200).send({
      message: "Weekly bookings data fetched successfully",
      bookingsByWeek: formattedBookings,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const vendorAdvanceRefund = async (req, res) => {
  const { bookingId } = req.body;
  if (!bookingId) {
    return res.status(400).send({ message: "Booking ID is required" });
  }

  try {
    const booking = await bookingModel.findById(bookingId);

    if (!booking) {
      return res.status(404).send({ message: "Booking not found" });
    }

    booking.advanceRefund = true;
    await booking.save();

    res.status(200).send({ message: "Advance refunded successfully" });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const vendorSendMessage = async (req, res) => {
  const { vendorId, adminId, content } = req.body;

  if (!vendorId || !adminId || !content) {
    return res
      .status(400)
      .send({ message: "Please fill the all required fields" });
  }

  try {
    let chat = await vendorChat.findOne({ vendor: vendorId, admin: adminId });

    if (!chat) {
      chat = new vendorChat({
        vendor: vendorId,
        admin: adminId,
      });
      await chat.save();
    }

    const message = new vendorMessage({
      sender: vendorId,
      receiver: adminId,
      content,
      senderModel: "Vendors",
      receiverModel: "admin",
    });

    await message.save();

    chat.messages.push(message._id);
    chat.lastUpdated = new Date();

    await chat.save();

    return res.status(200).json({ message: "Message sent", chat });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const getVendorNotification = async (req, res) => {
  const { vendorId } = req.body;
  if (!vendorId) {
    return res.status(400).send({ message: "VendorId is required" });
  }
  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({
        message: "Vendor not found",
      });
    }
    const vendorMessage = vendor.messages;
    res.status(200).send({
      messsage: "Vendor notifications fetch successfully",
      vendorMessage,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const deleteNotification = async (req, res) => {
  const { vendorid, messageId } = req.body;
  if (!vendorid || !messageId) {
    return res.status(400).send({ message: "VendorId is required" });
  }
  try {
    const result = await vendorModel.findByIdAndUpdate(
      vendorid,
      { $pull: { messages: { _id: messageId } } },
      { new: true }
    );
    if (!result) {
      return res.status(404).json({ message: "Vendor or Message not found" });
    }

    res.status(200).send({
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "An error occurred", error });
  }
};

const notificatonReaded = async (req, res) => {
  const { vendorId } = req.body;
  if (!vendorId) {
    return res.status(400).send({
      message: "VendorId is required",
    });
  }

  try {
    await vendorModel.updateMany(
      { _id: vendorId, "messages.readed": "false" },
      { $set: { "messages.$[].readed": "true" } }
    );

    res.status(200).json({ message: "Notifications marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating notifications" });
  }
};

const updateReturndate = async (req, res) => {
  const { bookingId, vendorId, vehicleId, date } = req.body;
  if (!bookingId || !vendorId || !vehicleId || !date) {
    return res.status(400).send({
      message: "All fields are required",
    });
  }
  try {
    const booking = await bookingModel.findById(bookingId);

    const vendor = await vendorModel.findById(vendorId);
    if (!booking) {
      return res.status(404).send({
        message: "Bookings not found",
      });
    }
    if (!vendor) {
      return res.status(404).send({
        message: "Vendor not found",
      });
    }
    const vehicleCategories = Object.values(vendor.vehicles);
    let foundVehicle = null;

    for (const category of vehicleCategories) {
      foundVehicle = category.find((vehicle) => vehicle._id == vehicleId);
      if (foundVehicle) {
        break;
      }
    }
    if (!foundVehicle) {
      return res
        .status(404)
        .send({ message: "Vehicle not found in the vendor's inventory" });
    }

    foundVehicle.returnDate = date;
    foundVehicle.vehicleAvailable = "yes";

    await vendor.save();

    booking.returnDate = date;

    await booking.save();

    res.status(200).send({
      message: "Vehicle available date updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating notifications" });
  }
};

const getStoredVendorBookings = async (req, res) => {
  const { vendorId } = req.body;

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }

  try {
    const vendorBookings = await VendorMonthlyBookings.find({ vendorId });

    // if (vendorBookings.length === 0) {
    //   return res
    //     .status(404)
    //     .send({ message: "No data found for this vendor." });
    // }

    res.status(200).send({
      message: "Vendor monthly and weekly bookings fetched successfully",
      vendorBookings,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const GetMontWithWeekPayouts = async (req, res) => {
  const { vendorId } = req.body;
  try {
    const vendor = await VendorMonthlyBookings.find({ vendorId });

    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const weeks = vendor.flatMap((week) => week.weeks);

    res.status(200).send({
      return: "Vendor payouts fetched successfully",
      weeks,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getvendorPayouts = async (req, res) => {
  const { vendorId } = req.body;
  try {
    const vendor = await VendorMonthlyBookings.find({ vendorId });

    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    res.status(200).send({
      return: "Vendor payouts fetched successfully",
      vendor,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const updateVendorLocaiton = async (req, res) => {
  try {
    const { vendorId, latitude, longitude } = req.body;

    if (!vendorId || !latitude || !longitude) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const updatedVendor = await vendorModel.findOneAndUpdate(
      { _id: vendorId },
      { latitude, longitude, locationUpdatedAt: Date.now() },
      { new: true, upsert: true }
    );

    res
      .status(200)
      .json({ message: "Location updated", vendor: updatedVendor });
  } catch (error) {
    console.error("Error updating location:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const vehicleAvailableStatus = async (req, res) => {
  try {
    const { vendorId, vehicleId, status} = req.body;

    if ( !vendorId || !vehicleId ) {
      return res.status(400).json({ message: "VendorId and vehicleId are required" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    let foundVehicle = null;
    const categories = ["cars", "vans", "buses", "autos", "trucks"];

    for (const category of categories) {
      if (vendor.vehicles[category]) { 
        const vehicle = vendor.vehicles[category].id(vehicleId);
        if (vehicle) {
          foundVehicle = vehicle;
          break;
        }
      }
    }

    if (!foundVehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    foundVehicle.vehicleIsOnline = status?true:false;
    await vendor.save();

    if(status){
      res.status(200).json({ message: "Now Vehicle is available" });
    }
    if(!status){
      res.status(200).json({ message: "Now Vehicle is unavailable" });
    }

    
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = {
  vendorSignup,
  vendorLogin,
  forgotPassword,
  validatePin,
  resetPassword,
  getVendorById,
  getAllVendors,
  editVendorProfile,
  editPassword,
  createCar,
  recreateCar,
  getAllVehiclesByVendor,
  getVendorCars,
  editCar,
  createAuto,
  recreateAuto,
  getVendorAuots,
  editAuto,
  createVan,
  recreateVan,
  getVendorVans,
  editVan,
  createbus,
  recreatebus,
  getVendorBus,
  editBus,
  createTruck,
  recreateTruck,
  getVendorTruck,
  editTruck,
  getBookingsByVendorId,
  vendorBookingApproval,
  storeFCMTokenToVendor,
  vendorCompleteRide,
  getVendorBookingsByMonth,
  getVendorBookingsByMonthAndWeek,
  getVendorBookingsByWeek,
  getVendorBookingsPaymentByCashByWeek,
  vendorAdvanceRefund,
  VendorStartTrip,
  vendorSendMessage,
  getVehicleDetailsByvehicleId,
  getVendorNotification,
  deleteNotification,
  notificatonReaded,
  updateReturndate,
  getStoredVendorBookings,
  GetMontWithWeekPayouts,
  getvendorPayouts,
  sendLoginOtp,
  verifyOtp,
  updateVendorLocaiton,
  vehicleAvailableStatus
};
