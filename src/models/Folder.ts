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
  dataURL?: string;
}

export interface IFileInput {
  path: string;
  data: string;
}
