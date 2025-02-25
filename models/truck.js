
const mongoose = require('mongoose')

const truckSchema = new mongoose.Schema({
    ownerImage:[{type:String }],
    ownerAdharCard:[{type:String , required:true}],
    ownerDrivingLicense:[{type:String , required:true}],
    vehicleImages: [{ type: String, required: true }], 
    vehicleInsurance:[{type:String , required:true}],
    vehicleRC:[{type:String , required:true}],
    vehicleMake:{type:String},
    vehicleModel:{type:String},
    licensePlate: { type: String, required: true }, 
    vehicleColor:{type:String },
    ton:{type:String},
    size:{type:String},
    // numberOfSeats:{type:String, required:true},
    milage:{type:String },
    vehicleApprovedByAdmin :{type:String,enum: ['pending', 'approved', 'rejected'],default:'pending'},
    adminCommissionAmount:{type:String},
    advanceAmount :{type:String},
    totalEarnings:{type:String },
    noOfBookings:{type:Number},
    categoryType:{type:String,default:'goods', required:true},
    subCategory:{type:String,default:'truck'},
    rejectedReason:{type:String},
    pickupDate : {type:Date},
    returnDate : {type:Date},
    vehicleAvailable:{type:String,default:'no'},
    adminCommissionPercentage:{type:Number},
    tripStartedAt:{type:Date},
    pricePerDay:{type:String},
    pricePerKm:{type:String},
    fuelType:{type:String},
    goodsType:{type:String},
    createdAt: {
        type: Date,
        default: Date.now,
      },
      registerAmount: { type: Number },
      registerAmountRefund:{type:Boolean , default:false},
      vehicleIsOnline:{type:Boolean , default:false}



})

module.exports = truckSchema