import fs from "fs/promises";
import zlib from "fast-zlib";
import { Router, Request, Response, NextFunction } from "express";
import { ObjectId, Types } from "mongoose";
import {
  createRegexOfPath,
  FILE_REGEX,
  getLastChildName,
  PATH_REGEX,
  removeLastCharBackSlash,
  REMOVE_ALL_BACKSLASH_REGEX,
  USERS_FOLDERS_PATH,
} from "../utils/foldersAndFiles";
import {
  IFolder,
  IMoveFolder,
  IRenameFolder,
  IFileInput,
} from "../models/Folder";
import User from "../models/User";
import { verifyToken } from "../token";
import { deflateRaw } from "zlib";

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
router.get("/", async (_req: Request, res: Response) => {
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
                    regex: new RegExp(createRegexOfPath(path)),
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

router.post("/", async (req: Request, res: Response) => {
  const userID: string = res.locals.userID;
  let { path } = req.body as { path: string };

  try {
    if (!path.length || !path.match(PATH_REGEX)) {
      res.status(500).send("Invalid name");
      return;
    }

    path = removeLastCharBackSlash(path);
  } catch (e: any) {
    res.status(400).send("Incorrect json params");
    return;
  }

  const newFolder = {
    name: path,
    dataURl: undefined,
  } as IFolder;

  try {
    const result = await User.updateOne(
      {
        _id: userID,
        "folders.name": { $ne: path },
        "folders.dataURl": { $eq: undefined },
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

// Use json would be ideal, but using the on function of Request is more efficient
router.post("/file/*", async (req: Request, res: Response) => {
  const userID = res.locals.userID;

  const path = "/" + req.params[0].replace(REMOVE_ALL_BACKSLASH_REGEX, "/");
  const fileName = getLastChildName(path);

  // I dont care it have a extension or not, so  I dont check that
  if (!fileName.length) {
    res.status(400).send("Missing filename!");
  }

  const newFile = {
    name: path,
    dataURL: new Types.ObjectId().toString(),
  } as IFolder;

  try {
    const result = await User.updateOne(
      {
        _id: userID,
        $or: [
          { "folders.name": { $ne: path } },
          { "folders.dataURL": { $ne: undefined } },
        ],
      },
      { $push: { folders: newFile } }
    );

    if (result.modifiedCount) {
      const filePath =
        USERS_FOLDERS_PATH + "/" + userID + "/" + newFile.dataURL;
      const deflate = new zlib.BrotliCompress();

      const compress = (data: Buffer | string, flag?: number) => {
        return new Promise<Buffer>((resolve) => {resolve(deflate.process(data, flag))});
      };
      req
        .on("data", async (chunk: Buffer) => {
          await compress(chunk, zlib.constants.BROTLI_OPERATION_PROCESS);
          console.log()
        })
        .on("close", async () => {
          let data = await compress("", zlib.constants.BROTLI_OPERATION_FLUSH);
          await fs.writeFile(filePath, data);
          res.sendStatus(200);
          return;
        });
      return;
    }

    res.status(500).send("File already exits!!!");
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

router.put("/move", async (req: Request, res: Response) => {
  const userID = res.locals.userID;
  let { from, to }: IMoveFolder = req.body;

  const isRoot = to == "/";
  try {
    if (
      !from.match(PATH_REGEX) ||
      (!to.match(PATH_REGEX) && !isRoot) ||
      from == to
    ) {
      res.status(500).send("Invalid name");
      return;
    }

    from = removeLastCharBackSlash(from);
    to = removeLastCharBackSlash(to);
  } catch (e: any) {
    res.status(400).send("Incorrect json params");
    return;
  }

  if (from.slice(0, -getLastChildName(from).length - 1) == to) {
    res.status(500).send("Cannot move a folder on the same parent");
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
                      regex: new RegExp(createRegexOfPath(from.substring(1))),
                    },
                  },
                  {
                    $regexMatch: {
                      input: "$$folder.name",
                      regex: new RegExp(createRegexOfPath(to.substring(1))),
                    },
                  },
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
    res.status(404).send("None path found");
    return;
  }

  let exitsMatchOfTo = isRoot;
  let movedFolders: IFolder[] = [];
  let movedFoldersIds: ObjectId[] = [];
  for (let i = 0; i < userFolders.length; i++) {
    const v = userFolders[i];

    if (v.name == to) {
      exitsMatchOfTo = true;
    }
    // check if the the new parent folder have a child with the same name
    if (v.name == v.name + from) {
      res
        .status(500)
        .send(
          '"to" param already have a child named with the "from" param name'
        );
      return;
    }
    if (v.name.startsWith(from)) {
      movedFolders.push({
        // @ts-ignore
        _id: v._id,
        name: !isRoot
          ? to + v.name
          : v.name.slice(v.name.indexOf(getLastChildName(from)) - 1),
        dataURl: v.dataURL,
      });
      // @ts-ignore
      movedFoldersIds.push(v._id);
    }
  }

  if (!exitsMatchOfTo) {
    res.status(404).send("Destination path dont exits");
    return;
  }

  try {
    const result = await User.updateOne(
      {
        _id: userID,
      },
      [
        {
          $set: {
            folders: {
              $concatArrays: [
                {
                  $map: {
                    input: "$folders",
                    as: "folder",
                    in: {
                      $cond: [
                        { $in: ["$$folder._id", movedFoldersIds] },
                        {
                          $mergeObjects: [
                            "$$folder",
                            {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: movedFolders,
                                    cond: {
                                      $eq: ["$$this._id", "$$folder._id"],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          ],
                        },
                        "$$folder",
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ]
    );
    if (result.modifiedCount) {
      res.sendStatus(200);
      return;
    }
    res.status(500).send("None folder was updated");
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

router.put("/rename", async (req: Request, res: Response) => {
  const userID = res.locals.userID;
  let { from, newName }: IRenameFolder = req.body;

  try {
    if (!from.match(PATH_REGEX) || !newName.match(/^[a-z_\-\s0-9\.]+$/)) {
      res.status(500).send("Invalid name");
      return;
    }

    from = removeLastCharBackSlash(from);
  } catch (e: any) {
    res.status(400).send("Incorrect json params");
    return;
  }

  const targetName = getLastChildName(from);

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
                      regex: new RegExp(createRegexOfPath(from.substring(1))),
                    },
                  },
                  {
                    $regexMatch: {
                      input: "$$folder.name",
                      regex: new RegExp(
                        createRegexOfPath(
                          from.substring(1).replace(targetName, newName)
                        )
                      ),
                    },
                  },
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

  let userFoldersIds: ObjectId[] = [];
  for (let i = 0; i < userFolders.length; i++) {
    const v = userFolders[i];
    const newNewName = v.name.replace(targetName, newName);

    if (v.name == newNewName) {
      res.status(500).send("");
      return;
    }

    v.name = newNewName;
    // @ts-ignore
    userFoldersIds.push(v._id);
  }

  try {
    const result = await User.updateOne(
      {
        _id: userID,
      },
      [
        {
          $set: {
            folders: {
              $concatArrays: [
                {
                  $map: {
                    input: "$folders",
                    as: "folder",
                    in: {
                      $cond: [
                        { $in: ["$$folder._id", userFoldersIds] },
                        {
                          $mergeObjects: [
                            "$$folder",
                            {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: userFolders,
                                    cond: {
                                      $eq: ["$$this._id", "$$folder._id"],
                                    },
                                  },
                                },
                                0,
                              ],
                            },
                          ],
                        },
                        "$$folder",
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ]
    );
    if (result.modifiedCount) {
      res.sendStatus(200);
      return;
    }
    res.status(500).send("None folder was updated");
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

router.put("/file/move", async (req: Request, res: Response) => {
  const userID = res.locals.userID;
  const { from, to }: IMoveFolder = req.body;
});

router.delete("/*", async (req: Request, res: Response) => {
  const userID = res.locals.userID;

  const path = req.params[0].replace(REMOVE_ALL_BACKSLASH_REGEX, "/");

  try {
    const updated = await User.updateOne(
      { _id: userID },
      {
        $pull: {
          folders: {
            name: new RegExp(createRegexOfPath(path)),
          },
        },
      }
    );

    if (updated.modifiedCount) {
      res.sendStatus(200);
      return;
    }

    res.status(404).send("Folder not exist");
  } catch (error: any) {
    res.status(500).send(error.message);
  }
});

export default router;
