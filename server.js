// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config(); // Load from .env
const Message = require('./models/message');



const app = express();
const server = http.createServer(app); // We need raw http server for Socket.IO
const io = new Server(server); // Attach Socket.IO to the server

mongoose.connect(process.env.MONGO_URI
).then(() => {
  console.log('📦 Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});


// Set view engine to EJS
app.set('view engine', 'ejs');

// Serve static files (CSS, client-side JS, etc.)
app.use(express.static('public'));

// Root route - render chat UI
app.get('/', (req, res) => {
  res.render('chat');
});

const users = new Map(); // socket.id -> username
const nameToId = new Map(); // username → socket.id

// When a client connects
io.on('connection', (socket) => {
  console.log('🟢 A user connected');

  socket.on('user joined', async (username) => {
    users.set(socket.id, username);
    nameToId.set(username, socket.id);
    socket.username = username;

    socket.broadcast.emit('chat message', {
      from: 'System',
      content: `🔔 ${username} joined the chat`,
      timestamp: new Date(),
    });

    io.emit('user list', Array.from(users.values()));

    // Send message history
    const messages = await Message.find({
      $or: [
        { to: null }, // public
        { to: username }, // private to this user
        { from: username } // private from this user
      ]
    }).sort({ timestamp: 1 });

    messages.forEach((msg) => {
      if (msg.to) {
        // Private
        io.to(socket.id).emit('private message', {
          from: msg.from,
          message: msg.content,
          timestamp: msg.timestamp
        });
      } else {
        // Public
        // Public
        io.to(socket.id).emit('chat message', {
          from: msg.from || 'System',
          content: msg.content || msg,
          timestamp: msg.timestamp || new Date()
        });

      }
    });
  });




  socket.on('chat message', async (msg) => {
    const message = await Message.create({
      from: socket.username,
      to: null,
      content: msg,
    });

    io.emit('chat message', {
      from: socket.username,
      content: msg,
      timestamp: message.timestamp,
    });
  });



  socket.on('typing', (username) => {
    socket.broadcast.emit('typing', username);
  });

  socket.on('private message', async ({ toUsername, from, message }) => {
    const targetId = nameToId.get(toUsername);
    if (targetId) {
      const saved = await Message.create({
        from,
        to: toUsername,
        content: message,
      });

      io.to(targetId).emit('private message', {
        from,
        message,
        timestamp: saved.timestamp,
      });
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      users.delete(socket.id);
      nameToId.delete(socket.username);
      io.emit('chat message', {
        from: 'System',
        content: `❌ ${socket.username} left the chat`,
        timestamp: new Date(),
      });

      io.emit('user list', Array.from(users.values()));
    }
  });

});





// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
