const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http"); // ✅ For creating HTTP server
const { Server } = require("socket.io");
require('dotenv').config();

const Message = require("./models/message");

const app = express();
const server = http.createServer(app); // ✅ Pass app to HTTP server
const PORT = process.env.PORT || 5000;

// ✅ Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PATCH"]
  }
});


// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB connection
const mongoURI = process.env.MONGO_URI;
mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.log("❌ DB Error:", err));

// API endpoints
app.get("/messages", async (req, res) => {
  const messages = await Message.find().sort({ timestamp: 1 });
  res.json(messages);
});

app.post("/messages", async (req, res) => {
  const { wa_id, name, message } = req.body;
  const newMsg = new Message({
    wa_id,
    name,
    message,
    status: "sent",
    timestamp: new Date(),
    sender: "me" // 👈 mark as sent by you
  });
  await newMsg.save();

  // ✅ Send new message instantly to all connected clients
  io.emit("newMessage", newMsg);

  res.json(newMsg);
});

app.patch("/messages/:id", async (req, res) => {
  const updated = await Message.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );

  // ✅ Notify clients that a message status changed
  io.emit("messageUpdated", updated);

  res.json(updated);
});

app.get("/", (req, res) => {
  res.send("✅ WhatsApp Clone Backend is running!");
});

// ✅ Handle socket connections
io.on("connection", socket => {
  console.log("🔌 New WebSocket connection:", socket.id);

  socket.on("disconnect", () => {
    console.log("❌ WebSocket disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Server running with WebSockets on http://localhost:${PORT}`);
});
