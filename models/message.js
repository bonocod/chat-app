const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  from: String,
  to: String, // null means public
  content: String,
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Message', messageSchema);
