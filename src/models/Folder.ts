import { model, Schema } from "mongoose";

// FOLDER = 0,
// FILE = 1

export const PATH_REGEX = /^(\/[a-z_\-\s0-9\.]+)+$/i;
export const REMOVE_ALL_BACKSLASH_REGEX = /(\/)\1+/;

export interface IMoveFolder {
  from: string;
  to: string;
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

// export const cmpFolder = (
//   root: Folder,
//   folders: string[],
//   name: string,
//   counter = 1
// ): boolean | Folder => {
//   if (folders.length == 1) {
//     root.name == folders[0] && name != root.name ? root : false;
//   }

//   if (counter == folders.length && name != root.name) {
//     return root;
//   }

//   if (root.childs?.length) {
//     for (let i = 0; i < root.childs.length; i++) {
//       if (folders[counter] == root.childs[i].name) {
//         counter++;
//         return cmpFolder(root.childs[i], folders, name, counter);
//       }
//     }
//   }

//   return false;
// };
export default IFolder;
