const mongoose = require('mongoose');
const adminModel = require('./admin');  // Correct import for admin model
const customerModel = require('./customer');  // Correct import for customer model

const customerMessageSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    // refPath: 'senderModel',
    // required: true 
  },
  receiver: { 
    type: mongoose.Schema.Types.ObjectId, 
    // refPath: 'receiverModel',
    // required: true 
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

// customerMessageSchema.add({
//   senderModel: { 
//     type: String, 
//     required: true, 
//     enum: ['admin', 'customers'] 
//   },
//   receiverModel: { 
//     type: String, 
//     required: true, 
//     enum: ['admin', 'customers'] 
//   }
// });

const customerMessage = mongoose.model('Customer_Message', customerMessageSchema);


const customerchatSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'sender', required: true },
  senderDetails: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
  },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'receiver', required: true },
  receiverDetails: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
  },
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer_Message' }],
  lastUpdated: { type: Date },
  new:{type:Number,default:0}
});

const customerChat = mongoose.model('Customer_Chat', customerchatSchema);
module.exports = {customerMessage , customerChat}