const mongoose = require('mongoose');
const adminModel = require('./admin');
const customerModel = require('./customer');

const customerMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'receiverModel',
    required: true,
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['admin', 'customers','vendors'],
  },
  receiverModel: {
    type: String,
    required: true,
    enum: ['admin', 'customers','vendors'],
  },
  content: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const customerChatSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'senderModel',
    required: true,
  },
  senderModel: {
    type: String,
    required: true,
    enum: ['admin', 'customers','vendors'],
  },
  senderDetails: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'customer','vendors'] },
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'receiverModel',
    required: true,
  },
  receiverModel: {
    type: String,
    required: true,
    enum: ['admin', 'customers','vendors'],
  },
  receiverDetails: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true, enum: ['admin', 'customer','vendors'] },
  },
  messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Customer_Message' }],
  lastUpdated: { type: Date, default: Date.now },
  new: { type: Number, default: 0 },
});

const customerMessage = mongoose.model('Customer_Message', customerMessageSchema);
const customerChat = mongoose.model('Customer_Chat', customerChatSchema);

module.exports = { customerMessage, customerChat };