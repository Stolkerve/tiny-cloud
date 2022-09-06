import express from "express";
import cors from "cors";
import morgan from "morgan";

import { connectDB } from "./db";
import userRouter from "./routers/usersRouter"
import folderRouter from "./routers/foldersRouter"

const PORT = 3000;

const init = async () => {
  const app = express();
  app.use(cors());
  app.use(morgan("dev"));
  app.use(express.json());

  app.use("/users", userRouter);
  app.use("/folders", folderRouter);

  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Listen on port ${PORT}`);
    });
  } catch(e: any) {
    console.log(e.message);
    process.exit(-1);
  }

}

init();
