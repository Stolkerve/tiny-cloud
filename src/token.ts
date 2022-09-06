import jsonwebtoken from "jsonwebtoken";

export const genToken = (payload: Object): Promise<string> => {
  return new Promise((resolve, reject) => {
    jsonwebtoken.sign(
      payload,
      "secreto",
      (error: Error | null, encode: string | undefined) => {
        if (!error && encode) {
          resolve(encode);
        }
        reject(error);
      }
    );
  });
};

export const verifyToken = (token: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    jsonwebtoken.verify(
      token,
      "secreto",
      (error: Error | null, decode: any) => {
        if (!error) {
          resolve(decode);
        }

        reject(error);
      }
    );
  });
};
