const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  userName: {
    type: String,
    // required: true,
  },
  email: {
    type: String,
    // required: true,
  },
  role: {
    type: String,
    default: "admin",
  },
  password: {
    type: String,
    // required: true,
  },
  messages:[
    {
     title:{type:String},
     description:{type:String},
     dateAt:{type:Date,default: Date.now}

    }
  ],
  CustomerbannerImgs: {
    banner1: {type:String},
    banner2:  {type:String},
    banner3:  {type:String}
  }
, 
VendorbannerImgs: {
  banner1: {type:String},
  banner2:  {type:String},
  banner3:  {type:String}
}
, 
adminEarnings:{
  type:Number,
}
});

const adminModel = mongoose.model("adminUsers",adminSchema)

module.exports = adminModel
