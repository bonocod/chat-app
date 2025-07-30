// delete.js
const mongoose = require('mongoose');
const Message = require('./models/message');
require('dotenv').config();

async function deleteMessages() {
  try {
    // connect to MongoDB (replace with your URI & DB name)
    await mongoose.connect(process.env.MONGO_URI);

    const result = await Message.deleteMany({});
    console.log(`${result.deletedCount} messages deleted.`);
  } catch (err) {
    console.error("Error deleting messages:", err);
  } finally {
    await mongoose.disconnect();
  }
}

deleteMessages();
