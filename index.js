const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const customerRoutes = require("./routes/customerRoutes");
const adminRoutes = require("./routes/adminRoutes");
const vendorRoutes = require("./routes/vendorRoures"); // Fixed typo: vendorRoures -> vendorRoutes
const path = require("path");
const http = require("http");
const bodyParser = require("body-parser");
const {
  customerChat,
  customerMessage,
} = require("./models/chatandMessageForCustomer");
const customerModel = require("./models/customer");
const vendorModel = require("./models/vendor");
const adminModel = require("./models/admin");

dotenv.config();
const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: ["http://localhost:3000", "http://92.205.105.104:3000"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});

app.use(cors({
  origin: ["http://localhost:3000", "http://92.205.105.104:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json());
app.use(bodyParser.json()); // Note: express.json() may make bodyParser redundant
app.options("*", cors()); // Handle preflight requests

mongoose
  .connect(process.env.dbUrl)
  .then(() => console.log("MongoDB Connected"))
  .catch((error) => console.log("Error connecting to MongoDB:", error));

// Routes
app.use("/customer", customerRoutes);
app.use("/vendor", vendorRoutes);
app.use("/admin", adminRoutes);

app.get("/", (req, res) => {
  res.send("Hello root node");
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Socket.IO
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("send_message", async (data) => {
    const { sender, receiver, content } = data;

    try {
      let senderDetails =
        (await customerModel.findById(sender)) ||
        (await vendorModel.findById(sender)) ||
        (await adminModel.findById(sender));

      let receiverDetails =
        (await customerModel.findById(receiver)) ||
        (await vendorModel.findById(receiver)) ||
        (await adminModel.findById(receiver));

      if (!senderDetails || !receiverDetails) {
        console.error("Sender or receiver not found in any schema.");
        return;
      }

      let chat = await customerChat.findOne({
        $or: [
          { sender, receiver },
          { sender: receiver, receiver: sender },
        ],
      });

      if (!chat) {
        chat = new customerChat({
          sender,
          senderDetails: {
            id: senderDetails._id,
            name: senderDetails.userName,
            role: senderDetails.role,
          },
          receiver,
          receiverDetails: {
            id: receiverDetails._id,
            name: receiverDetails.userName,
            role: receiverDetails.role,
          },
        });
      }

      const newMessage = new customerMessage({
        sender,
        receiver,
        content,
      });

      await newMessage.save();

      chat.messages.push(newMessage._id);
      chat.new = chat.new + 1;
      chat.lastUpdated = new Date();

      await chat.save();

      io.to(receiver).emit("receive_message", {
        sender,
        receiver,
        content,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in send_message:", error);
    }
  });

  socket.on("join_room", (username) => {
    socket.join(username);
    console.log(`${username} joined their room`);
    socket.emit("message", { content: `${username} has joined the chat.` });
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`App is listening on port ${PORT}`));