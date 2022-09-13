import { Router, Request, Response, NextFunction } from "express";
import { ObjectId, Types } from "mongoose";
import IFolder, {
  getLastChildName,
  IMoveFolder,
  IRenameFolder,
  PATH_REGEX,
  REMOVE_ALL_BACKSLASH_REGEX,
} from "../models/Folder";
import User, { IUser } from "../models/User";
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

// Get all folders and files
router.get("/", async (req: Request, res: Response) => {
  const userID: string = res.locals.userID;
  try {
    const user = await User.findOne({ _id: userID }, "-_id folders");
    if (user) {
      res.json(user);
      return;
    }
    res.status(404).send("User not exist");
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

// get childs folders and files of a folder
router.get("/*", async (req: Request, res: Response) => {
  const userID: string = res.locals.userID;

  const path = req.params[0].replace(REMOVE_ALL_BACKSLASH_REGEX, "/");

  try {
    const userFolders = (
      await User.aggregate([
        { $match: { _id: new Types.ObjectId(userID) } },
        {
          $project: {
            folders: {
              $filter: {
                input: "$folders",
                as: "folder",
                cond: {
                  $regexMatch: {
                    input: "$$folder.name",
                    regex: new RegExp("^(/" + path + ")(|/[a-z_-s0-9.]+)+$"),
                  },
                },
              },
            },
            _id: 0,
          },
        },
      ])
    )[0].folders as IFolder[];

    if (userFolders.length) {
      res.json(userFolders.slice(1));
      return;
    }

    res.status(404).send("Folder not exist");
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

router.post("/folder", async (req: Request, res: Response) => {
  const userID: string = res.locals.userID;
  let { path } = req.body as { path: string };

  if (!path.length || !path.match(PATH_REGEX)) {
    res.status(500).send("Invalid name");
    return;
  }

  const newFolder = {
    name: path,
    type: 0,
  } as IFolder;

  try {
    const result = await User.updateOne(
      {
        _id: userID,
        "folders.name": { $ne: path },
      },
      { $push: { folders: newFolder } }
    );

    if (result.modifiedCount) {
      res.sendStatus(200);
      return;
    }
  } catch (error: any) {
    res.status(500).send(error.message);
  }

  res.status(500).send("Folder already exits!!");
});

router.post("/file", (req: Request, res: Response) => {
  const userID = res.locals.userID;
});

// move also act as a rename function, like the gnu "mv" command
router.put("/move", async (req: Request, res: Response) => {
  const userID = res.locals.userID;
  const { from, to }: IMoveFolder = req.body;

  if (!from.match(PATH_REGEX) || !to.match(PATH_REGEX) || from == to) {
    res.status(500).send("Invalid name");
    return;
  }

  const userFolders = (
    await User.aggregate([
      { $match: { _id: new Types.ObjectId(userID) } },
      {
        $project: {
          folders: {
            $filter: {
              input: "$folders",
              as: "folder",
              cond: {
                $or: [
                  {
                    $regexMatch: {
                      input: "$$folder.name",
                      regex: new RegExp(
                        "^(/" + from.substring(1) + ")(|/[a-z_-s0-9.]+)+$"
                      ),
                    },
                  },
                  { $eq: ["$$folder.name", to] },
                ],
              },
            },
          },
          _id: 0,
        },
      },
    ])
  )[0].folders as IFolder[];
  if (!userFolders.length) {
    res.status(500).send("Old path not found");
    return;
  }

  console.log(userFolders);

  // false is move, true is rename
  const operation = !userFolders.find((v: IFolder) => v.name == to);
  res.json(operation);
  return;

  // try {
  //   const result = await User.updateOne(
  //     {
  //       _id: userID,
  //     },
  //     [
  //       {
  //         $set: {
  //           folders: {
  //             $concatArrays: [
  //               {
  //                 $map: {
  //                   input: "$folders",
  //                   as: "folder",
  //                   in: {
  //                     $cond: [
  //                       { $in: ["$$folder._id", updatedFoldersIds] },
  //                       {
  //                         $mergeObjects: [
  //                           "$$folder",
  //                           {
  //                             $arrayElemAt: [
  //                               {
  //                                 $filter: {
  //                                   input: updatedFolders,
  //                                   cond: {
  //                                     $eq: ["$$this._id", "$$folder._id"],
  //                                   },
  //                                 },
  //                               },
  //                               0,
  //                             ],
  //                           },
  //                         ],
  //                       },
  //                       "$$folder",
  //                     ],
  //                   },
  //                 },
  //               },
  //             ],
  //           },
  //         },
  //       },
  //     ]
  //   );
  //   console.log(result);
  //   if (result.modifiedCount) {
  //     res.sendStatus(200);
  //     return;
  //   }
  // } catch (error: any) {
  //   res.status(500).send(error.message);
  // }
});

router.put("/file/move", (req: Request, res: Response) => {
  const userID = res.locals.userID;
  const { from, to }: IMoveFolder = req.body;
});

router.delete("/*", (req: Request, res: Response) => {
  const userID = res.locals.userID;

  const path = req.params[0].replace(REMOVE_ALL_BACKSLASH_REGEX, "/");
});

export default router;
