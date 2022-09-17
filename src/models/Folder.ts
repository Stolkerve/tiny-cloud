export const PATH_REGEX = /^(\/[a-z_\-\s0-9\.]+)+$/i;
export const REMOVE_ALL_BACKSLASH_REGEX = /(\/)\1+/;

export interface IMoveFolder {
  from: string;
  to: string;
}

export interface IRenameFolder {
  from: string;
  newName: string;
}

export interface IFolder {
  name: string;
  dataURl?: string;
}

export const getLastChildName = (path: string) => {
  let name = "";
  for (let i = path.length - 1; i > 0; i--) {
    if (path[i] === "/") break;

    name = path[i] + name;
  }

  return name;
};

export const createRegexOfPath = (path: string): string => {
  return "^(/" + path + ")(|/[a-z_\-s0-9.]+)+$";
};

export default IFolder;
