import mongoose, { IUser, IUserModel, IUserQueries } from "mongoose";
const { Schema } = mongoose;

const UserSchema = new Schema({
  email: {
    type: String,
    required: true
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  metadata: Schema.Types.Mixed,
  friends: [
    {
      uid: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
      },
      nickname: String
    }
  ],
  city: {
    coordinates: {
      type: [Number],
      index: "2dsphere"
    }
  }
});

// NOTE: `this: IUser` and `this: IUserModel` is to tell TS the type of `this' value using the "fake this" feature
// you will need to add these in after your first ever run of the CLI

UserSchema.virtual("name").get(function (this: IUser) {
  return `${this.firstName} ${this.lastName}`;
});

// method functions
UserSchema.methods = {
  isMetadataString(this: IUser) {
    return typeof this.metadata === "string";
  }
};

// static functions
UserSchema.statics = {
  // friendUids could also use the type `ObjectId[]` here
  async getFriends(this: IUserModel, friendUids: IUser["_id"][]) {
    return await this.aggregate([{ $match: { _id: { $in: friendUids } } }]);
  }
};

// query functions - no `this: IUser` required here, just provide IUserQueries type
const queryFuncs: IUserQueries = {
  populateFriends() {
    return this.populate("friends.uid", "firstName lastName");
  }
};

UserSchema.query = queryFuncs;

export const User: IUserModel = mongoose.model<IUser, IUserModel>("User", UserSchema);
export default User;
