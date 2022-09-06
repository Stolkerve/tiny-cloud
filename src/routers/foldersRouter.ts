import { Router, Request, Response, NextFunction } from "express";
import IFolder, {
  getParentName,
  PATH_REGEX,
  RequestFolder,
} from "../models/Folder";
import User from "../models/User";
import { verifyToken } from "../token";

const router = Router();

router.use(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7, authHeader.length).trim();
    try {
      const payload = await verifyToken(token);
      res.locals.userID = payload.id;
      next();
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  }
});

router.get("/", async (req: Request, res: Response) => {
  const userID: string = res.locals.userID;
  try {
    const user = await User.findOne({ _id: userID }, { _id: 0, folders: 1 });
    if (user) {
      res.json(user);
      return;
    }
    res.status(404).send("User not exist");
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

router.post("/folder", async (req: Request, res: Response) => {
  const userID: string = res.locals.userID;
  let { path }: RequestFolder = req.body;

  if (!path.length || !path.match(PATH_REGEX)) {
    res.status(500).send("Invalid name");
    return;
  }

  const newFolder = {
    name: path,
    type: 0,
  } as IFolder;

  const result = await User.updateOne(
    {
      _id: userID,
      $and: [
        { "folders.name": { $ne: path} },
      ],
    },
    { $push: { folders: newFolder } }
  );

  if (result.modifiedCount) {
    res.sendStatus(200);
    return;
  }
  res.status(500).send("Folder already exits!!");
});

router.post("/file", (req: Request, res: Response) => {
  const userID = res.locals.userID;
});

export default router;
