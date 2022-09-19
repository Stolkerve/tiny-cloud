import fs from "fs/promises";

export const PATH_REGEX = /(\/[a-zA-Z0-9_-]+)+\/?/;
export const FILE_REGEX = /^(\/[a-z_\-\s0-9\.]+)+$/i;
export const REMOVE_ALL_BACKSLASH_REGEX = /(\/)\1+/;
export const USERS_FOLDERS_PATH = "./users_files";

export const getLastChildName = (path: string) => {
  let name = "";
  for (let i = path.length - 1; i > 0; i--) {
    if (path[i] === "/") break;

    name = path[i] + name;
  }

  return name;
};

export const createRegexOfPath = (path: string): string => {
  return "^(/" + path + ")(|/[a-z_-s0-9.]+)+$";
};

export const removeLastCharBackSlash = (path: string): string => {
  return path[path.length - 1] == "/" ? path.slice(0, path.length - 1) : path;
};

export const existFolder = async (path: string) => {
  try {
    await fs.access(path);
    return true;
  } catch (e: any) {}

  return false;
};
//([a-zA-Z]:)?(\\[a-zA-Z0-9_-]+)+\\?
