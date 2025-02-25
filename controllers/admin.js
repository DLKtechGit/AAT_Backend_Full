const vendorModel = require("../models/vendor");
const adminModel = require("../models/admin");
const auth = require("../middleware/auth");
const bookingModel = require("../models/booking");
const customerModel = require("../models/customer");
const {
  customerChat,
  customerMessage,
} = require("../models/chatandMessageForCustomer");
const {
  vendorChat,
  vendorMessage,
} = require("../models/chatAndMessageForVendor");
const payoutModel = require("../models/payout");
const { Expo } = require("expo-server-sdk");

// const customerMessage = require("../models/customerMessage");

const createAdmin = async (req, res) => {
  const { userName, email, password } = req.body;

  if (!userName || !email || !password) {
    return res.status(400).send({ message: "Fill all required fields" });
  }

  try {
    const admin = await adminModel.findOne({ email });
    if (admin) {
      return res
        .status(409)
        .send({ message: `Account with ${email} already exist` });
    }

    const hashedPassword = await auth.hashPassword(password);

    const adminData = await adminModel.create({
      ...req.body,
      password: hashedPassword,
    });
    res.status(201).send({ message: "Admin created successfully", adminData });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .send({ message: "Please fill all required fields." });
  }

  try {
    const admin = await adminModel.findOne({ email });
    if (!admin) {
      return res.status(404).send({ message: "Admin not found." });
    }

    const isPasswordValid = await auth.hashCompare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(400).send({ message: "Incorrect password." });
    }

    const token = await auth.createToken({
      id: admin._id,
      email: admin.email,
      role: admin.role,
    });

    res.status(201).send({ message: "Login successful.", token, admin });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const passengersVehicleApproval = async (req, res) => {
  const { vendorId, vehicleId, action, rejectedReason, commission } = req.body;

  if (!vendorId || !vehicleId || !action) {
    return res.status(400).send({ message: "Fill all the required fields" });
  }

  if (!["approved", "rejected"].includes(action)) {
    return res
      .status(400)
      .send({ message: "Action must be 'approved' or 'rejected'" });
  }

  try {
    const vendor = await vendorModel.findById({ _id: vendorId });

    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    let foundVehicle = null;
    const categories = ["cars", "vans", "buses", "autos", "trucks"];

    for (const category of categories) {
      const vehicle = vendor.vehicles[category].id(vehicleId);
      if (vehicle) {
        foundVehicle = vehicle;
        break;
      }
    }

    if (!foundVehicle) {
      return res.status(404).send({ message: "Vehicle not found" });
    }

    if (action === "rejected" && !rejectedReason) {
      return res
        .status(400)
        .send({ message: "Please provide the rejected reason" });
    }
    if (action === "approved" && !commission) {
      return res.status(400).send({ message: "Please provide the commission" });
    }

    foundVehicle.vehicleApprovedByAdmin = action;
    if (action === "rejected") {
      foundVehicle.rejectedReason = rejectedReason;
    }
    foundVehicle.vehicleAvailable =
      action === "rejected" ? foundVehicle.vehicleAvailable : "yes";
    foundVehicle.adminCommissionPercentage = commission;

    foundVehicle.returnDate = null;

    const approvalMessage = {
      title: `Vehicle ${action} by admin`,
      description: `Dear ${
        vendor.userName
      }, your vehicle for registration the ${foundVehicle.subCategory} , ${
        foundVehicle.vehicleModel
      } (${foundVehicle.licensePlate}) has been ${action}. ${
        rejectedReason ? `Rejected Reason is ${rejectedReason}` : "Successfully"
      }`,
    };
    vendor.messages.push(approvalMessage);

    await vendor.save();

    const expo = new Expo();
    if (vendor.expoPushToken) {
      const message = {
        to: vendor.expoPushToken,
        sound: "default",
        title: approvalMessage.title,
        body: approvalMessage.description,
        data: {
          withSome: "data",
          screen: "Notifications",
          additionalInfo: "some other data",
        },
      };
      try {
        const ticket = await expo.sendPushNotificationsAsync([message]);
        console.log("Successfully sent notification:", ticket);
      } catch (error) {
        console.log("Error sending notification:", error);
      }
    } else {
      console.log("Vendor doesn't have an Expo push token.");
    }

    res
      .status(200)
      .send({ message: `Vehicle ${action} successfully`, foundVehicle });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllPendingVehicles = async (req, res) => {
  try {
    const vendors = await vendorModel.find({
      $or: [
        { "vehicles.cars.vehicleApprovedByAdmin": "pending" },
        { "vehicles.vans.vehicleApprovedByAdmin": "pending" },
        { "vehicles.buses.vehicleApprovedByAdmin": "pending" },
        { "vehicles.autos.vehicleApprovedByAdmin": "pending" },
        { "vehicles.lorries.vehicleApprovedByAdmin": "pending" },
        { "vehicles.trucks.vehicleApprovedByAdmin": "pending" },
      ],
    });

    const pendingVehicles = [];

    vendors.forEach((vendor) => {
      const categories = [
        "cars",
        "vans",
        "buses",
        "autos",
        "lorries",
        "trucks",
      ];
      categories.forEach((category) => {
        vendor.vehicles[category].forEach((vehicle) => {
          if (vehicle.vehicleApprovedByAdmin === "pending") {
            pendingVehicles.push({
              vendorId: vendor._id,
              vehicleId: vehicle._id,
              userName: vendor.userName,
              email: vendor.email,
              phoneNumber: vendor.phoneNumber,
              address: vendor.address,
              category,
              vehicleDetails: vehicle,
            });
          }
        });
      });
    });

    res.status(200).send({
      message: "Pending vehicles fetched successfully",
      pendingVehicles,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllRejectedVehicles = async (req, res) => {
  try {
    const vendors = await vendorModel.find({
      $or: [
        { "vehicles.cars.vehicleApprovedByAdmin": "rejected" },
        { "vehicles.vans.vehicleApprovedByAdmin": "rejected" },
        { "vehicles.autos.vehicleApprovedByAdmin": "rejected" },
        { "vehicles.buses.vehicleApprovedByAdmin": "rejected" },
        { "vehicles.lorries.vehicleApprovedByAdmin": "rejected" },
        { "vehicles.trucks.vehicleApprovedByAdmin": "rejected" },
      ],
    });

    const rejectedVehicles = [];

    vendors.forEach((vendor) => {
      const categories = [
        "cars",
        "vans",
        "buses",
        "autos",
        "lorries",
        "trucks",
      ];
      categories.forEach((category) => {
        vendor.vehicles[category].forEach((vehicle) => {
          if (vehicle.vehicleApprovedByAdmin === "rejected") {
            rejectedVehicles.push({
              vendorId: vendor._id,
              vehicleId: vehicle._id,
              userName: vendor.userName,
              email: vendor.email,
              phoneNumber: vendor.phoneNumber,
              address: vendor.address,
              category,
              vehicleDetails: vehicle,
            });
          }
        });
      });
    });

    res.status(200).send({
      message: "Rejected vehicles fetched successfully",
      rejectedVehicles,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllApprovedVehicles = async (req, res) => {
  try {
    const vendors = await vendorModel.find({
      $or: [
        { "vehicles.cars.vehicleApprovedByAdmin": "approved" },
        { "vehicles.vans.vehicleApprovedByAdmin": "approved" },
        { "vehicles.buses.vehicleApprovedByAdmin": "approved" },
        { "vehicles.autos.vehicleApprovedByAdmin": "approved" },
        { "vehicles.lorries.vehicleApprovedByAdmin": "approved" },
        { "vehicles.trucks.vehicleApprovedByAdmin": "approved" },
      ],
    });
    if (!vendors) {
      return res.status(404).send({ message: "Approved dara is not found" });
    }

    const approvedVechicles = [];

    vendors.forEach((vendor) => {
      const categories = [
        "cars",
        "vans",
        "buses",
        "autos",
        "lorries",
        "trucks",
      ];
      categories.forEach((category) => {
        vendor.vehicles[category].forEach((vehicle) => {
          if (vehicle.vehicleApprovedByAdmin === "approved") {
            approvedVechicles.push({
              vendorId: vendor._id,
              vehicleId: vehicle._id,
              userName: vendor.userName,
              email: vendor.email,
              phoneNumber: vendor.phoneNumber,
              address: vendor.address,
              category,
              vehicleDetails: vehicle,
            });
          }
        });
      });
    });

    res.status(200).send({
      message: "Approved vehicles fetched successfully",
      approvedVechicles,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const deleteVehicle = async (req, res) => {
  const { vendorId, vehicleId } = req.params;

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }
    const categories = ["cars", "vans", "buses", "autos", "lorries", "trucks"];

    let vehicleFound = false;

    for (const category of categories) {
      const vehicleIndex = vendor.vehicles[category].findIndex(
        (vehicle) => vehicle._id.toString() === vehicleId
      );

      if (vehicleIndex !== -1) {
        vendor.vehicles[category].splice(vehicleIndex, 1);
        vehicleFound = true;
        break;
      }
    }

    if (!vehicleFound) {
      return res.status(404).send({ message: "Vehicle not found" });
    }
    await vendor.save();

    res.status(200).send({ message: "Vehicle deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllVehicles = async (req, res) => {
  try {
    const vendor = await vendorModel.find();

    const allVehicles = [];

    vendor.forEach((vendors) => {
      const categories = [
        "cars",
        "vans",
        "buses",
        "autos",
        "lorries",
        "trucks",
      ];

      categories.forEach((category) => {
        vendors.vehicles[category].forEach((vehicle) => {
          allVehicles.push({
            vendorId: vendors._id,
            vehicleId: vehicle._id,
            userName: vendors.userName,
            email: vendors.email,
            phoneNumber: vendors.phoneNumber,
            address: vendors.address,
            category,
            vehicleDetails: vehicle,
          });
        });
      });
    });

    res
      .status(200)
      .send({ message: "Vehicles fetched successfully", allVehicles });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getALLBookings = async (req, res) => {
  try {
    const bookings = await bookingModel.find();
    res.status(200).send({ message: "Booking fetched successfully", bookings });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getBookingsbyId = async (req, res) => {
  const { bookingId } = req.params;
  try {
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).send({ message: "Booking not found" });
    }

    res.status(200).send({ message: "Booking fetched successfully", booking });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const cancelBookingByAdmin = async (req, res) => {
  const { bookingId, reason } = req.body;

  if (!bookingId || !reason) {
    return res.status(400).send({ message: "Fill all  required fields" });
  }

  try {
    const booking = await bookingModel.findById(bookingId);
    if (!booking) {
      return res.status(404).send({ message: "Booking not found" });
    }

    const customerId = booking.customer.customerId;
    const vendorId = booking.vehicleDetails.vendorId;

    const customer = await customerModel.findById(customerId);
    if (!customer) {
      return res.status(404).send({ message: "Customer not found" });
    }

    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
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

    booking.adminCancelled = true;
    booking.adminCancelledReason = reason;
    booking.tripStatus = "cancelled";
    await booking.save();

    const activeBookings = await bookingModel.find({
      "vehicleDetails.foundVehicle._id": foundVehicle._id,
      vendorApprovedStatus: { $in: ["pending", "approved"] },
      tripStatus: { $nin: ["ongoing", "completed", "cancelled"] },
    });

    foundVehicle.vehicleAvailable = activeBookings.length > 0 ? "no" : "yes";
    if (foundVehicle.vehicleAvailable === "yes") {
      foundVehicle.returnDate = undefined;
    }
    await vendor.save();

    const cancellationMessageForVendor = {
      title: "Booking Cancelled",
      description: `Dear ${vendor.userName}, the booking for the ${foundVehicle.subCategory} ,${foundVehicle.vehicleModel} (${foundVehicle.licensePlate}) has been cancelled by the admin. Reason: ${reason}`,
    };
    vendor.messages.push(cancellationMessageForVendor);
    await vendor.save();

    const cancellationMessageForCustomer = {
      title: "Booking Cancelled",
      description: `Dear ${customer.userName}, the booking for the ${foundVehicle.subCategory} , ${foundVehicle.vehicleModel} (${foundVehicle.licensePlate}) has been cancelled by the admin. Reason: ${reason}`,
    };

    customer.messages.push(cancellationMessageForCustomer);
    await customer.save();

    const expo = new Expo();

    if (vendor.expoPushToken) {
      const vendorMessage = {
        to: vendor.expoPushToken,
        sound: "default",
        title: cancellationMessageForVendor.title,
        body: cancellationMessageForVendor.description,
        data: {
          withSome: "data",
          screen: "Notifications",
          additionalInfo: "some other data",
        },
      };
      try {
        const ticket = await expo.sendPushNotificationsAsync([vendorMessage]);
        console.log("Successfully sent notification to vendor:", ticket);
      } catch (error) {
        console.log("Error sending notification to vendor:", error);
      }
    } else {
      console.log("Vendor doesn't have an Expo push token.");
    }

    if (customer.expoPushToken) {
      const customerMessage = {
        to: customer.expoPushToken,
        sound: "default",
        title: cancellationMessageForCustomer.title,
        body: cancellationMessageForCustomer.description,
        data: {
          withSome: "data",
          screen: "Notifications",
          additionalInfo: "some other data",
        },
      };
      try {
        const ticket = await expo.sendPushNotificationsAsync([customerMessage]);
        console.log("Successfully sent notification to Customer:", ticket);
      } catch (error) {
        console.log("Error sending notification to customer:", error);
      }
    } else {
      console.log("Vendor doesn't have an Expo push token.");
    }

    res
      .status(200)
      .send({ message: "Booking cancelled successfully", booking });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getALLCompletedBookings = async (req, res) => {
  try {
    const bookings = await bookingModel.find({
      tripStatus: { $in: ["completed"] },
    });
    if (bookings.length === 0) {
      return res.status(404).send({ message: "No bookings  found" });
    }

    res
      .status(200)
      .send({ message: "Bookings fetched successfully", bookings });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getALLCancelledBookings = async (req, res) => {
  try {
    const bookings = await bookingModel.find({
      tripStatus: { $in: ["cancelled"] },
    });
    if (bookings.length === 0) {
      return res.status(404).send({ message: "No bookings  found" });
    }

    res
      .status(200)
      .send({ message: "Bookings fetched successfully", bookings });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const CreateCustomerBannerImg = async (req, res) => {
  const files = req.files;

  if (!files?.banner1 || !files?.banner2 || !files?.banner3) {
    return res.status(400).send({ message: "Please upload all three images" });
  }

  try {
    const admin = await adminModel.findOne();
    if (!admin) {
      return res.status(404).send({ message: "Admin not found" });
    }

    admin.CustomerbannerImgs = {
      banner1: `${process.env.baseURL}/${files?.banner1[0]?.path}`,
      banner2: `${process.env.baseURL}/${files?.banner2[0]?.path}`,
      banner3: `${process.env.baseURL}/${files?.banner3[0]?.path}`,
    };

    await admin.save();

    res.status(201).send({
      message: "Customer banner images created successfully",
      Banners: admin.CustomerbannerImgs,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const UpdateCustomerBannerImg = async (req, res) => {
  const files = req.files;

  try {
    const admin = await adminModel.findOne();
    if (!admin) {
      return res.status(404).send({ message: "Admin not found" });
    }

    const updatedBanners = {
      banner1: files?.banner1
        ? `${process.env.baseURL}/${files.banner1[0].path}`
        : admin.CustomerbannerImgs.banner1,
      banner2: files?.banner2
        ? `${process.env.baseURL}/${files.banner2[0].path}`
        : admin.CustomerbannerImgs.banner2,
      banner3: files?.banner3
        ? `${process.env.baseURL}/${files.banner3[0].path}`
        : admin.CustomerbannerImgs.banner3,
    };

    admin.CustomerbannerImgs = updatedBanners;

    await admin.save();

    res.status(200).send({
      message: "Customer banner images updated successfully",
      Banners: admin.CustomerbannerImgs,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const CreateVendorBannerImg = async (req, res) => {
  const files = req.files;

  if (!files?.banner1 || !files?.banner2 || !files?.banner3) {
    return res.status(400).send({ message: "Please upload all three images" });
  }

  try {
    const admin = await adminModel.findOne();
    if (!admin) {
      return res.status(404).send({ message: "Admin not found" });
    }

    admin.VendorbannerImgs = {
      banner1: `${process.env.baseURL}/${files?.banner1[0]?.path}`,
      banner2: `${process.env.baseURL}/${files?.banner2[0]?.path}`,
      banner3: `${process.env.baseURL}/${files?.banner3[0]?.path}`,
    };

    await admin.save();

    res.status(201).send({
      message: "Vendor banner images created successfully",
      Banners: admin.VendorbannerImgs,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const UpdateVendorBannerImg = async (req, res) => {
  const files = req.files;

  try {
    const admin = await adminModel.findOne();
    if (!admin) {
      return res.status(404).send({ message: "Admin not found" });
    }

    const updatedBanners = {
      banner1: files?.banner1
        ? `${process.env.baseURL}/${files.banner1[0].path}`
        : admin.CustomerbannerImgs.banner1,
      banner2: files?.banner2
        ? `${process.env.baseURL}/${files.banner2[0].path}`
        : admin.CustomerbannerImgs.banner2,
      banner3: files?.banner3
        ? `${process.env.baseURL}/${files.banner3[0].path}`
        : admin.CustomerbannerImgs.banner3,
    };

    admin.VendorbannerImgs = updatedBanners;

    await admin.save();

    res.status(200).send({
      message: "vendor banner images updated successfully",
      Banners: admin.VendorbannerImgs,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const adminReply = async (req, res) => {
  const { customerId, adminId, content } = req.body;

  if (!customerId || !adminId || !content) {
    return res.status(400).send({ message: "Please fill all required fields" });
  }

  try {
    const chat = await customerChat.findOne({
      customer: customerId,
      admin: adminId,
    });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const message = new customerMessage({
      sender: adminId,
      receiver: customerId,
      content,
      senderModel: "admin",
      receiverModel: "customers",
    });

    await message.save();

    chat.messages.push(message._id);
    chat.lastUpdated = new Date();

    await chat.save();

    return res.status(200).json({ message: "Reply sent customer", chat });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const getAllCustomerChats = async (req, res) => {
  const { adminId } = req.params;

  try {
    const chats = await customerChat
      .find({ admin: adminId })
      .populate("customer", "userName email")
      .populate({
        path: "messages",
        options: { sort: { timestamp: -1 }, limit: 1 },
      })
      .sort({ lastUpdated: -1 });

    const formattedChats = chats.map((chat) => ({
      customer: chat.customer,
      lastMessage: chat.messages[0]?.content || "No messages yet",
      lastMessageTime: chat.messages[0]?.timestamp || null,
    }));

    return res.status(200).json({ success: true, chats: formattedChats });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

const getCustomerChatHistory = async (req, res) => {
  const { customerId, adminId } = req.body;

  if (!customerId || !adminId) {
    return res.status(400).send({ message: "Please fill all required fields" });
  }

  try {
    const chat = await customerChat
      .findOne({ customer: customerId, admin: adminId })
      .populate("messages")
      .populate("customer", "name email");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    return res.status(200).json({ chat });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const adminReplyToVendor = async (req, res) => {
  const { vendorId, adminId, content } = req.body;

  if (!vendorId || !adminId || !content) {
    return res.status(400).send({ message: "Please fill all required fields" });
  }

  try {
    const chat = await vendorChat.findOne({ vendor: vendorId, admin: adminId });

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    const message = new vendorMessage({
      sender: adminId,
      receiver: vendorId,
      content,
      senderModel: "admin",
      receiverModel: "Vendors",
    });

    await message.save();

    chat.messages.push(message._id);
    chat.lastUpdated = new Date();

    await chat.save();

    return res.status(200).json({ message: "Reply sent to vendor", chat });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const getAllVendorChats = async (req, res) => {
  const { adminId } = req.params;

  try {
    const chats = await vendorChat
      .find({ admin: adminId })
      .populate("vendor", "userName email")
      .populate({
        path: "messages",
        options: { sort: { timestamp: -1 }, limit: 1 },
      })
      .sort({ lastUpdated: -1 });

    const formattedChats = chats.map((chat) => ({
      vendor: chat.vendor,
      lastMessage: chat.messages[0]?.content || "No messages yet",
      lastMessageTime: chat.messages[0]?.timestamp || null,
    }));

    return res.status(200).json({ success: true, chats: formattedChats });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

const getVendorChatHistory = async (req, res) => {
  const { vendorId, adminId } = req.body;

  if (!vendorId || !adminId) {
    return res.status(400).send({ message: "Please fill all required fields" });
  }

  try {
    const chat = await vendorChat
      .findOne({ vendor: vendorId, admin: adminId })
      .populate("messages")
      .populate("vendor", "name email");

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    return res.status(200).json({ chat });
  } catch (error) {
    return res
      .status(500)
      .json({ error: "Internal Server Error", details: error.message });
  }
};

const refundVendorFee = async (req, res) => {
  const { vendorId, vehicleId } = req.body;

  if (!vendorId) {
    return res.status(400).send({ message: "Vendor ID is required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
      return res.status(404).send({
        message: "Vendor not found",
      });
    }

    let foundVehicle = null;
    const categories = ["cars", "vans", "buses", "autos", "trucks"];

    for (const category of categories) {
      const vehicle = vendor.vehicles[category].id(vehicleId);
      if (vehicle) {
        foundVehicle = vehicle;
        break;
      }
    }

    if (!foundVehicle) {
      return res.status(404).send({
        message: "Vehicle not found",
      });
    }

    foundVehicle.registerAmountRefund = true;

    await vendor.save();

    return res.status(200).send({
      message: "Refund successfully",
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

const editDocuments = async (req, res) => {
  const { vendorId, vehicleId } = req.body;
  const files = req.files;
  if (!vendorId || !vehicleId) {
    return res
      .status(400)
      .send({ message: "VendorId and VehicleId are required" });
  }

  try {
    const vendor = await vendorModel.findById(vendorId);
    if (!vendor) {
      return res.status(404).send({ message: "Vendot not found " });
    }

    const vehicleCategories = Object.values(vendor.vehicles);

    let carToUpdate = null;

    for (const category of vehicleCategories) {
      carToUpdate = category.find(
        (vehicle) => vehicle._id.toString() === vehicleId
      );

      if (carToUpdate) {
        break;
      }
    }
    if (!carToUpdate) {
      return res.status(404).send({ message: "Vehicle not found" });
    }

    if (files) {
      carToUpdate.ownerAdharCard = files?.ownerAdharCard
        ? files.ownerAdharCard.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : carToUpdate.ownerAdharCard;

      //   carToUpdate.ownerImage = files?.ownerImage
      //     ? `${process.env.baseURL}/${files?.ownerImage[0]?.path}`
      //     : carToUpdate.ownerImage;

      carToUpdate.ownerDrivingLicense = files?.ownerDrivingLicense
        ? files.ownerDrivingLicense.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : carToUpdate.ownerDrivingLicense;

      //   carToUpdate.vehicleImages = files?.vehicleImages
      //     ? files.vehicleImages.map(
      //         (file) => `${process.env.baseURL}/${file.path}`
      //       )
      //     : carToUpdate.vehicleImages;

      carToUpdate.vehicleInsurance = files?.vehicleInsurance
        ? files.vehicleInsurance.map(
            (file) => `${process.env.baseURL}/${file.path}`
          )
        : carToUpdate.vehicleInsurance;

      carToUpdate.vehicleRC = files?.vehicleRC
        ? files.vehicleRC.map((file) => `${process.env.baseURL}/${file.path}`)
        : carToUpdate.vehicleRC;
    }

    const updatedVehicle = await vendor.save();

    res
      .status(201)
      .send({ message: "Vehicle updated successfully", updatedVehicle });
  } catch (error) {
    console.error("Error updating Vehicle:", error);
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const DeleteVendor = async (req, res) => {
  const { vendorId } = req.body;

  try {
    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
      return res.status(404).send({
        message: "Vendor not found.",
      });
    }

    if (
      vendor.vehicles &&
      Object.values(vendor.vehicles).some(
        (vehicleList) => vehicleList.length > 0
      )
    ) {
      return res.status(400).send({
        message:
          "Vendor cannot be deleted because they have associated vehicles.",
      });
    }

    await vendorModel.findByIdAndDelete(vendorId);

    return res.status(200).send({
      message: "Vendor deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting vendor:", error);
    return res.status(500).send({
      message: "An error occurred while deleting the vendor.",
      error: error.message,
    });
  }
};

const MakeVendorPayout = async (req, res) => {
  const { vendorId, weekId } = req.body;
  try {
    const vendor = await vendorModel.findById(vendorId);

    if (!vendor) {
      return res.status(404).send({ message: "Vendor not found" });
    }

    const VendorPayout = await payoutModel.findOne({
      vendorId,
      "weeks._id": weekId,
    });

    if (!VendorPayout) {
      return res.status(404).send({ message: "Payout not found" });
    }

    const week = VendorPayout.weeks.find(
      (week) => week._id.toString() === weekId
    );
    if (!week) {
      return res.status(404).send({ message: "Week not found" });
    }

    week.payoutDone = true;
    await VendorPayout.save();

    const PaymentConfirmationMsg = {
      title: "Weekly Payout Confirmation",
      description: `Dear ${vendor.userName}, your weekly payout for the period ${week.weekRange} has been successfully processed. 
Payout Amount: ${week.totalVendorPayment}. 
Total Bookings: ${week.bookings.length}. 
Thank you for your partnership!`,
    };

    vendor.messages.push(PaymentConfirmationMsg);
    await vendor.save();

    const expo = new Expo();
    if (vendor.expoPushToken) {
      const message = {
        to: vendor.expoPushToken,
        sound: "default",
        title: PaymentConfirmationMsg.title,
        body: PaymentConfirmationMsg.description,
        data: {
          withSome: "data",
          screen: "Notifications",
          additionalInfo: "some other data",
        },
      };

      try {
        const ticket = await expo.sendPushNotificationsAsync([message]);
        console.log("Successfully sent notification:", ticket);
      } catch (error) {
        console.log("Error sending notification:", error);
      }
    } else {
      console.log("Vendor doesn't have an Expo push token.");
    }

    res.status(200).send({ message: "Payout done successfully", VendorPayout });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllAdminNotification = async (req, res) => {
  try {
    const admin = await adminModel.find();

    if (!admin) {
      return res.status(400).send({ message: "Admin not found " });
    }
    const notifications = admin.flatMap((e) => e.messages).reverse();
    // const notifications = messageData.reverse()

    res.status(200).send({
      message: "Admin notification fetched successfully",
      notifications,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const DeleteAdminNotificaton = async (req, res) => {
  try {
    const admin = await adminModel.find();

    if (!admin) {
      return res.status(404).send({
        message: "Admin not found",
      });
    }

    await adminModel.updateOne({ _id: admin._id, $set: { messages: [] } });

    res.status(200).send({ message: "Notifications deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAllChatList = async (req, res) => {
  try {
    const Chats = await customerChat.find();

    res.status(200).send({
      message: "Chats retrived successfully",
      Chats,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const chatMarkAsRead = async (req, res) => {
  const { chatId } = req.body;

  try {
    const chat = await customerChat.findById(chatId);

    if (!chat) {
      return res.status(404).send({
        message: "Chat not found",
      });
    }

    chat.new = 0;

    await chat.save();

    res.status(200).send({
      message: "Chat marked as read successfully",
      chat,
    });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

const getAdmin = async (req, res) => {
  try {
    const admin = await adminModel.find();
    if (!admin) {
      return res.status(404).send({ message: "Admin not found" });
    }
    res.status(200).send({ message: "Admin fetched successfully", admin });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Internal Server Error", error: error.message });
  }
};

module.exports = {
  passengersVehicleApproval,
  createAdmin,
  login,
  getAllPendingVehicles,
  getAllApprovedVehicles,
  deleteVehicle,
  getAllVehicles,
  getALLBookings,
  cancelBookingByAdmin,
  getALLCompletedBookings,
  getALLCancelledBookings,
  CreateCustomerBannerImg,
  UpdateCustomerBannerImg,
  CreateVendorBannerImg,
  UpdateVendorBannerImg,
  adminReply,
  getAllCustomerChats,
  getCustomerChatHistory,
  adminReplyToVendor,
  getAllVendorChats,
  getVendorChatHistory,
  getAllRejectedVehicles,
  refundVendorFee,
  editDocuments,
  DeleteVendor,
  getBookingsbyId,
  MakeVendorPayout,
  getAllAdminNotification,
  DeleteAdminNotificaton,
  getAllChatList,
  chatMarkAsRead,
  getAdmin,
};
