const express = require("express");
const admin = require("../controllers/admin");
const auth = require("../middleware/auth");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/createAdmin", upload.none(), admin.createAdmin);
router.post("/login", upload.none(), admin.login);
router.post(
  "/passengersVehicleApproval",
  auth.validate,
  auth.adminGaurd,
  upload.none(),
  admin.passengersVehicleApproval
 
); 
router.get(
  "/getAllRejectedVehicles",
  auth.validate,
  auth.adminGaurd,
  upload.none(),
  admin.getAllRejectedVehicles
);
router.get(
  "/getAllPendingVehicles",
  auth.validate,
  auth.adminGaurd,
  upload.none(),
  admin.getAllPendingVehicles
);
router.get(
  "/getAllApprovedVehicles",
  auth.validate,
  // auth.adminGaurd,
  upload.none(),
  admin.getAllApprovedVehicles
);
router.delete(
  "/deleteVehicle/:vendorId/:vehicleId",
  auth.validate,
  // auth.adminGaurd,
  upload.none(),
  admin.deleteVehicle
);
router.get(
  "/getAllVehicles",
  auth.validate,
  auth.adminGaurd,
  admin.getAllVehicles
);
router.get(
  "/getALLBookings",
  // auth.validate,
  // auth.adminGaurd,
  admin.getALLBookings
);
router.post(
  "/cancelBookingByAdmin",
  auth.validate,
  auth.adminGaurd,
  admin.cancelBookingByAdmin
);
router.get(
  "/getALLCompletedBookings",
  auth.validate,
  auth.adminGaurd,
  admin.getALLCompletedBookings
);
router.get(
  "/getALLCancelledBookings",
  auth.validate,
  auth.adminGaurd,
  admin.getALLCancelledBookings
);
router.post(
  "/CreateCustomerBannerImg",
  auth.validate,
  auth.adminGaurd,
  upload.fields([
    {
      name: "banner1",
      maxCount: 1,
    },
    {
      name: "banner2",
      maxCount: 1,
    },
    {
      name: "banner3",
      maxCount: 1,
    },
  ]),
  admin.CreateCustomerBannerImg    

); 

router.post(
    "/UpdateCustomerBannerImg",
    auth.validate,
    auth.adminGaurd,
    upload.fields([
      {
        name: "banner1",
        maxCount: 1,
      },
      {
        name: "banner2",
        maxCount: 1,
      },
      {
        name: "banner3",
        maxCount: 1,
      },
    ]),
    admin.CreateCustomerBannerImg    
  
  );      

  router.post(
    "/CreateVendorBannerImg",
    auth.validate,
    auth.adminGaurd,
    upload.fields([
      {
        name: "banner1",
        maxCount: 1,
      },
      {
        name: "banner2",
        maxCount: 1,
      },
      {
        name: "banner3",
        maxCount: 1,
      }, 
    ]),
    admin.CreateVendorBannerImg    
  
  );  

  router.post(
    "/UpdateVendorBannerImg",
    auth.validate,
    auth.adminGaurd,
    upload.fields([
      {
        name: "banner1",
        maxCount: 1,
      },
      {
        name: "banner2",
        maxCount: 1,
      },
      {
        name: "banner3",
        maxCount: 1,
      }, 
    ]),
    admin.UpdateVendorBannerImg    
  
  );          

  router.post(
    "/adminReply",
    admin.adminReply
  );  
 router.get('/getAllCustomerChats/:adminId',admin.getAllCustomerChats)  
 router.get('/getCustomerChatHistory/:customerId/:adminId',admin.getCustomerChatHistory)  
 router.post('/adminReplyToVendor',admin.adminReplyToVendor) 
 router.get('/getAllVendorChats/:adminId',admin.getAllVendorChats)  
 router.post('/getVendorChatHistory',admin.getVendorChatHistory) 
 router.post('/refundVendorFee',admin.refundVendorFee)
 router.post('/DeleteVendor',admin.DeleteVendor)
 router.get('/getbookingsbyId/:bookingId',admin.getBookingsbyId)
 router.post('/MakeVendorPayout',admin.MakeVendorPayout)
 router.get('/getAllAdminNotification',admin.getAllAdminNotification)
 router.post('/DeleteAdminNotificaton',admin.DeleteAdminNotificaton)
 router.get('/getAllChatList',admin.getAllChatList)
 router.post('/chatMarkAsRead',admin.chatMarkAsRead)
 router.get('/getAdmin',admin.getAdmin)

 router.post('/editDocuments', upload.fields([
  // { name: "vehicleImages", maxCount: 5 },
  // { name: "ownerImage", maxCount: 1 },
  { name: "ownerAdharCard", maxCount: 2 },
  { name: "ownerDrivingLicense", maxCount: 2 },
  { name: "vehicleInsurance", maxCount: 2 },
  { name: "vehicleRC",maxCount:2 },
]),admin.editDocuments)
 
module.exports = router;
 