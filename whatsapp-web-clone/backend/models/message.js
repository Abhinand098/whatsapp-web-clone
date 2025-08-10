const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  wa_id: String,
  name: String,
  message: String,
  status: String, // sent, delivered, read
  timestamp: Date,
  meta_msg_id: String,
  sender: String // 👈 'me' or 'them'
});

module.exports = mongoose.model("Message", MessageSchema);
