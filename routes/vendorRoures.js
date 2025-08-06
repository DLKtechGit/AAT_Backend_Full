const express = require("express");
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadMiddleware");

const vendor = require("../controllers/vendor");

const router = express.Router();

// router.post('/registerVendorWithCar',vendor.registerVendorWithCar)
router.post("/vendorSignup", vendor.vendorSignup);
router.post("/vendorLogin", upload.none(), vendor.vendorLogin);
router.post("/forgotPassword", vendor.forgotPassword);
router.post("/validatePin", vendor.validatePin);
router.post("/resetPassword", vendor.resetPassword);
router.post("/getVendorById", auth.validate, vendor.getVendorById);
router.get("/getAllVendors", auth.validate, vendor.getAllVendors);
router.post("/editVendorProfile", upload.fields([{ name: "profileImg", maxCount: 1 }]), auth.validate, vendor.editVendorProfile);
router.post("/editPassword", auth.validate, vendor.editPassword),
router.get("/getAllVehiclesByVendor/:vendorId",
    vendor.getAllVehiclesByVendor
  ),  
  router.get("/getVehicleDetailsByvehicleId/:vendorId/:vehicleId",
    vendor.getVehicleDetailsByvehicleId
  ),
  router.get("/getVendorCars/:vendorId", vendor.getVendorAuots),
  router.get("/getVendorAuots/:vendorId", vendor.getVendorAuots);
router.put(
  "/editCar/:vendorId/:vehicleId",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC",maxCount:2 },
  ]),
  auth.validate,
  vendor.editCar
);  

router.post(
  "/createCar",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),

  vendor.createCar
);

router.post(
  "/recreateCar",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.recreateCar
);

// In your server routes (likely routes/vendor.js)
router.post(
  "/createAuto",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  (req, res, next) => {
    console.log("Request received at /createAuto"); // Add this line
    next();
  },
  vendor.createAuto
);

router.post(
  "/recreateAuto",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.recreateAuto
);

router.post(
  "/editAuto/:vendorId/:vehicleId",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.editAuto
);

router.post(
  "/createVan",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.createVan
);

router.post(
  "/recreateVan",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.recreateVan
);

router.get("/getVendorVans/:vendorId", vendor.getVendorVans);

router.post(
  "/editVan/:vendorId/:vehicleId",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.editVan
);

router.post(
  "/createbus",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.createbus
);

router.post(
  "/recreatebus",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.recreatebus
);

router.get("/getVendorBus/:vendorId", vendor.getVendorBus);

router.post(
  "/editBus/:vendorId/:vehicleId",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.editBus
);

router.post(
  "/createTruck",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.createTruck
);  

router.post(
  "/recreateTruck",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.recreateTruck
);

router.get("/getVendorTruck/:vendorId", vendor.getVendorTruck);

router.post(
  "/editTruck/:vendorId/:vehicleId",
  upload.fields([
    { name: "vehicleImages", maxCount: 5 },
    { name: "ownerImage", maxCount: 1 },
    { name: "ownerAdharCard", maxCount: 2 },
    { name: "ownerDrivingLicense", maxCount: 2 },
    { name: "vehicleInsurance", maxCount: 2 },
    { name: "vehicleRC", maxCount: 2 },
  ]),
  vendor.editTruck
);

router.get("/getBookingsByVendorId/:vendorId", vendor.getBookingsByVendorId);
router.post(
  "/vendorBookingApproval",
  upload.none(),
  vendor.vendorBookingApproval
);
router.post(
  "/storeFCMTokenToVendor",
  upload.none(),
  vendor.storeFCMTokenToVendor
);
router.post("/vendorCompleteRide", upload.none(), vendor.vendorCompleteRide);

router.post(
  "/getVendorBookingsByMonth",
  upload.none(),
  vendor.getVendorBookingsByMonth
);
router.post(
  "/getVendorBookingsByMonthAndWeek",
  upload.none(),
  vendor.getVendorBookingsByMonthAndWeek
);
router.post(
  "/getVendorBookingsByWeek",
  upload.none(),
  vendor.getVendorBookingsByWeek
);
router.post(
  "/getVendorBookingsPaymentByCashByWeek",
  upload.none(),
  vendor.getVendorBookingsPaymentByCashByWeek
);
router.post("/vendorAdvanceRefund", upload.none(), vendor.vendorAdvanceRefund);
router.post("/VendorStartTrip", upload.none(), vendor.VendorStartTrip);
router.post("/vendorSendMessage", upload.none(), vendor.vendorSendMessage);
router.post("/getVendorNotification",upload.none(),vendor.getVendorNotification)
router.post('/deleteNotification',upload.none(),vendor.deleteNotification)
router.post('/notificatonReaded',upload.none(),vendor.notificatonReaded)
router.post('/updateReturndate',upload.none(),vendor.updateReturndate)
router.post('/getStoredVendorBookings',vendor.getStoredVendorBookings)
router.post('/GetMontWithWeekPayouts',vendor.GetMontWithWeekPayouts)
router.post('/getvendorPayouts',vendor.getvendorPayouts)
router.post('/vehicleAvailableStatus',vendor.vehicleAvailableStatus)
router.post('/sendLoginOtp',vendor.sendLoginOtp)
router.post('/verifyOtp',vendor.verifyOtp)

router.post('/updateVendorLocaiton',vendor.updateVendorLocaiton)


module.exports = router;
