const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Message = require("./models/message");

const mongoURI = "mongodb+srv://admin:Krisabhi0987@cluster0.fdxjygx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
  .then(() => {
    console.log("✅ Connected to MongoDB for payload processing");
    processPayloads();
  })
  .catch(err => console.error("❌ DB Error:", err));

const payloadDir = path.join(__dirname, "payloads");

async function processPayloads() {
  try {
    const files = fs.readdirSync(payloadDir);
    console.log("📂 Found files:", files);

    for (let file of files) {
      const filePath = path.join(payloadDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      // Messages
      try {
        const change = data.metaData.entry[0].changes[0];
        if (change.field === "messages" && change.value.messages) {
          const contact = change.value.contacts[0];
          const msg = change.value.messages[0];

          await Message.create({
  wa_id: contact.wa_id,
  name: contact.profile?.name || "Unknown",
  message: msg.text?.body || "",
  status: "sent",
  timestamp: new Date(parseInt(msg.timestamp) * 1000),
  meta_msg_id: msg.id,
  sender: "them" // 👈 mark payload messages as sent by them
});

          console.log(`📥 Inserted message from ${contact.wa_id}`);
        }

        // Status updates
        if (change.field === "statuses" && change.value.statuses) {
          const statusObj = change.value.statuses[0];
          await Message.findOneAndUpdate(
            { meta_msg_id: statusObj.id },
            { status: statusObj.status },
            { new: true }
          );
          console.log(`🔄 Updated status for ${statusObj.id} → ${statusObj.status}`);
        }
      } catch (err) {
        console.warn(`⚠ Skipped file ${file}: not a message/status format`);
      }
    }

    console.log("✅ Finished processing all payloads");
  } catch (error) {
    console.error("❌ Error processing payloads:", error);
  } finally {
    mongoose.disconnect();
  }
}
