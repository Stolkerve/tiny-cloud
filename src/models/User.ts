import { Schema, model } from "mongoose";
import { IFolder } from "./Folder";

export interface IUser {
  username: string;
  email: string;
  password: string;
  folders: Array<IFolder>;
}

const userSchema = new Schema<IUser>({
  username: { type: String, required: true, maxlength: 50},
  email: { type: String, required: true, unique: true, maxlength: 255 },
  password: { type: String, required: true, maxlength: 80 },
  folders: {
    type: [
      {
        name: { type: String, required: true, maxlength: 255 },
        type: { type: Number, required: true },
        dataID: { type: String, required: false },
      },
    ],
    required: true,
  },
});

const User = model("User", userSchema);

export default User;
