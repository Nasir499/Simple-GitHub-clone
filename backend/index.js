import dotenv from 'dotenv';
import express from 'express';
import mongoose from "mongoose"; 
import { Server } from "socket.io";
import http from 'http';
import cors from 'cors';
import { mainrouter } from "./routes/main.route.js";
import morgan from "morgan"; 

dotenv.config();

function startServer() {
  const app = express();
  app.set('trust proxy', true);
  const port = process.env.PORT || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(morgan('tiny'));

  const mongoUrl = process.env.MONGODB_URI;

  if (mongoUrl) {
    mongoose
      .connect(mongoUrl)
      .then(() => console.log("MongoDB Connected"))
      .catch((err) => console.error("MongoDB Connection Error:", err));
  } else {
    console.warn("Warning: MONGODB_URI environment variable is not defined.");
  }

  app.use(cors({ origin: '*' }));
  app.use("/", mainrouter);

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    socket.on("joinRoom", (userID) => {
      socket.userId = userID;
      console.log("User joined:", socket.userId);
      socket.join(userID);
    });
  });

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`SERVER is running on : http://localhost:${port}`);  
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    httpServer.close(() => {
      mongoose.connection.close(false, () => {
        console.log('Server closed.');
        process.exit(0);
      });
    });
  });
}

startServer();
