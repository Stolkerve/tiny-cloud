import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import User, { IUser } from "../models/User";
import { IFolder } from "../models/Folder";
import { genToken } from "../token";

const router = Router();

router.get("/login", async (req: Request, res: Response) => {
  let { email, password }: IUser = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      if (await bcrypt.compare(password, user.password)) {
        try {
          const token = await genToken({ id: user._id.toString() });
          res.json({ token });
          return;
        } catch (error: any) {
          res.status(500).send(error.message);
        }
      }
    }
    res.status(404).send("Invalid email or password");
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

router.post("/signup", async (req: Request, res: Response) => {
  let { username, email, password }: IUser = req.body;
  password = await bcrypt.hash(password, await bcrypt.genSalt(10));

  const userFolder: IFolder = {
    name: "/",
  };

  const newUser = new User({
    username,
    email,
    password,
    folders: [userFolder],
  });
  
  try {
    await newUser.save();
    res.sendStatus(200);
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

export default router;
