const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const customerRoutes = require('./routes/customerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const vendorRoutes = require('./routes/vendorRoures'); // Fixed typo: vendorRoures -> vendorRoutes
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const {
  customerChat,
  customerMessage,
} = require('./models/chatandMessageForCustomer');
const { vendorChat,vendorMessage} = require('./models/chatAndMessageForVendor')
const customerModel = require('./models/customer');
const vendorModel = require('./models/vendor');
const adminModel = require('./models/admin');

dotenv.config();
const app = express();
const server = http.createServer(app);

// Socket.IO configuration
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000', // Frontend web app
      'https://worldofaat.com', // React Native (Expo)
      
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  path: "/socket.io", // This is required
});

// Express middleware
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://worldofaat.com'],
    credentials: true,
  }),
);
app.use(express.json()); // Replaces bodyParser.json()

// MongoDB connection with retry
const connectDB = async () => {
  let retries = 5;
  while (retries) {
    try {
      await mongoose.connect(process.env.dbUrl, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('MongoDB Connected');
      break;
    } catch (error) {
      console.error('Error connecting to MongoDB:', error.message);
      retries -= 1;
      if (retries === 0) {
        console.error('MongoDB connection failed after retries');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5s before retry
    }
  }
};
connectDB();

// Routes
app.use('/customer', customerRoutes);
app.use('/vendor', vendorRoutes);
app.use('/admin', adminRoutes);

app.get('/', (req, res) => {
  res.send('Hello root node');
});

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Express error:', err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// Socket.IO events
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_room', (userId) => {
    if (!userId) return;
    socket.join(userId);
    console.log(`${userId} joined room`);
    socket.emit('message', { content: `${userId} has joined the chat.` });
  });

  // In server.js, update the send_message handler
socket.on('send_message', async (data) => {
  const { sender, receiver, content, senderModel, receiverModel } = data;

  // Validate input
  if (
    !sender ||
    !receiver ||
    !content ||
    !mongoose.isValidObjectId(sender) ||
    !mongoose.isValidObjectId(receiver)
  ) {
    socket.emit('error', { message: 'Invalid message data' });
    return;
  }

  try {
    // Fetch sender and receiver details
    let senderDetails =
      (await customerModel.findById(sender)) ||
      (await vendorModel.findById(sender)) ||
      (await adminModel.findById(sender));
    let receiverDetails =
      (await customerModel.findById(receiver)) ||
      (await vendorModel.findById(receiver)) ||
      (await adminModel.findById(receiver));

    if (!senderDetails || !receiverDetails) {
      socket.emit('error', { message: 'Sender or receiver not found' });
      return;
    }

    // Validate models
    const resolvedSenderModel = ['admin', 'customers', 'vendors'].includes(senderModel)
      ? senderModel
      : senderDetails instanceof customerModel
        ? 'customers'
        : senderDetails instanceof vendorModel
          ? 'vendors'
          : 'admin';
    const resolvedReceiverModel = ['admin', 'customers', 'vendors'].includes(receiverModel)
      ? receiverModel
      : receiverDetails instanceof customerModel
        ? 'customers'
        : receiverDetails instanceof vendorModel
          ? 'vendors'
          : 'admin';

    // Find or create chat
    let chat = await customerChat.findOne({
      $or: [
        { sender, receiver, senderModel: resolvedSenderModel, receiverModel: resolvedReceiverModel },
        { sender: receiver, receiver: sender, senderModel: resolvedReceiverModel, receiverModel: resolvedSenderModel },
      ],
    });

    if (!chat) {
      chat = new customerChat({
        sender,
        senderModel: resolvedSenderModel,
        senderDetails: {
          id: senderDetails._id,
          name: senderDetails.userName || 'Unknown',
          role: senderDetails.role || (resolvedSenderModel === 'vendors' ? 'vendor' : resolvedSenderModel),
        },
        receiver,
        receiverModel: resolvedReceiverModel,
        receiverDetails: {
          id: receiverDetails._id,
          name: receiverDetails.userName || 'Unknown',
          role: receiverDetails.role || (resolvedReceiverModel === 'vendors' ? 'vendor' : resolvedReceiverModel),
        },
        messages: [],
        lastUpdated: new Date(),
      });
      await chat.save();
    }

    // Create new message
    const newMessage = new customerMessage({
      sender,
      receiver,
      senderModel: resolvedSenderModel,
      receiverModel: resolvedReceiverModel,
      content,
      timestamp: new Date(),
    });
    await newMessage.save();

    // Update chat
    await customerChat.updateOne(
      { _id: chat._id },
      {
        $push: { messages: newMessage._id },
        $inc: { new: 1 },
        $set: { lastUpdated: new Date() },
      },
    );

    // Emit message
    const messageData = {
      sender,
      receiver,
      content,
      senderModel: resolvedSenderModel,
      receiverModel: resolvedReceiverModel,
      timestamp: newMessage.timestamp.toISOString(),
      _id: newMessage._id,
    };
    io.to(sender).to(receiver).emit('receive_message', messageData);
  } catch (error) {
    console.error('Error in send_message:', error.message);
    socket.emit('error', { message: 'Failed to send message' });
  }
});

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`App is listening on port ${PORT}`));