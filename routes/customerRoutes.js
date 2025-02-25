const express = require('express')
const  customer = require('../controllers/customer')
const auth = require("../middleware/auth")
const upload = require('../middleware/uploadMiddleware')

const router = express.Router() 
 
router.post('/signup',upload.none(),customer.signup)
router.post('/login',upload.none(),customer.login)
router.post('/forgotpassword',customer.forgotPassword)
router.post('/validateOTP',customer.validatePin)
router.post('/resetPassword',customer.resetPassword)
router.post('/getCustomerById',auth.validate,customer.getCustomerById)
router.get('/getAllCustomers',auth.validate,customer.getAllCustomers)
router.post('/editCustomerProfile',upload.fields([{ name: "profileImg", maxCount: 1 }]), auth.validate,customer.editCustomerProfile)
router.post('/editPassword',auth.validate,customer.editPassword)
router.post('/AvailableCarsforBooking',upload.none(),customer.AvailableCarsforBooking)
router.post('/bookcar',upload.none(),customer.bookcar)
router.get('/getBookingsByCustomerId/:customerId',upload.none(),customer.getBookingsByCustomerId)
router.post('/cancelBookingByCustomer',upload.none(),customer.cancelBookingByCustomer)
router.post('/storeFCMTokenToCustomer',upload.none(),customer.storeFCMTokenToCustomer)
router.post('/availableAutosforBooking',upload.none(),customer.availableAutosforBooking)
router.post('/AvailableVansforBooking',upload.none(),customer.AvailableVansforBooking)
router.post('/AvailableBusesforBooking',upload.none(),customer.AvailableBusesforBooking)  
router.post('/AvailableTrucksforBooking',upload.none(),customer.AvailableTrucksforBooking)
router.post('/AvailableVehiclesForBooking',upload.none(),customer.AvailableVehiclesForBooking)
router.post('/getCustomerNotification',upload.none(),customer.getCustomerNotification)
router.post('/deleteNotification',upload.none(),customer.deleteNotification)
router.post('/GetParticularChat',upload.none(),customer.GetParticularChat) 
router.post(
    "/CustomerSendMessage",
    // auth.validate,
    // auth.adminGaurd,
    customer.CustomerSendMessage
  );  
  router.post('/notificatonReaded',upload.none(),customer.notificatonReaded)
  router.post('/sendLoginOtp',upload.none(),customer.sendLoginOtp)
  router.post('/verifyOtp',upload.none(),customer.verifyOtp)
  router.post('/CustomerPayedOnline',upload.none(),customer.CustomerPayedOnline)



 
     
  
module.exports = router;
  