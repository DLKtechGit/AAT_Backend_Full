// const mongoose = require('mongoose');
// const adminModel = require('./admin');  // Correct import for admin model
// const customerModel = require('./customer');  // Correct import for customer model

// const customermessageSchema = new mongoose.Schema({
//   sender: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     refPath: 'senderModel',
//     required: true 
//   },
//   receiver: { 
//     type: mongoose.Schema.Types.ObjectId, 
//     refPath: 'receiverModel',
//     required: true 
//   },
//   content: { 
//     type: String, 
//     required: true 
//   },  
//   isRead: { 
//     type: Boolean, 
//     default: false 
//   },  
//   timestamp: { 
//     type: Date, 
//     default: Date.now 
//   }  
// });

// customermessageSchema.add({
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

// const customerMessage = mongoose.model('Customer_Message', customermessageSchema);


// const customerchatSchema = new mongoose.Schema({
//   customer: { type: mongoose.Schema.Types.ObjectId, ref: 'customers', required: true },
//   admin: { type: mongoose.Schema.Types.ObjectId, ref: 'admin', required: true },
//   messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer_Message' }],
//   lastUpdated: { type: Date }
// });

// const customerChat = mongoose.model('Customer_Chat', customerchatSchema);
// module.exports = {customerMessage , customerChat}