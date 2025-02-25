const mongoose = require('mongoose');
const adminModel = require('./admin');  // Correct import for admin model
const vendorModel = require('./vendor');  // Correct import for vendor model

const vendorMessageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'senderModel',
    required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    refPath: 'receiverModel',
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },  
  isRead: { 
    type: Boolean, 
    default: false 
  },  
  timestamp: { 
    type: Date, 
    default: Date.now 
  }  
});

vendorMessageSchema.add({
  senderModel: { 
    type: String, 
    required: true, 
    enum: ['admin', 'Vendors'] 
  },
  receiverModel: { 
    type: String, 
    required: true, 
    enum: ['admin', 'Vendors'] 
  }
});

const vendorMessage = mongoose.model('vendor_Message', vendorMessageSchema);


const vendorchatSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendors', required: true },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: 'admin', required: true },
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'vendor_Message' }],
  lastUpdated: { type: Date }
});

const vendorChat = mongoose.model('vendor_Chat', vendorchatSchema);
module.exports = {vendorMessage , vendorChat}