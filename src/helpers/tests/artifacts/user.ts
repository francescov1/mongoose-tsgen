import mongoose from "mongoose";
import { UserDocument, UserModel, UserSchema, UserMethods, UserStatics, UserQueries, UserObject } from "mongoose";

const { Schema } = mongoose;

// UserSchema type
const UserSchema: UserSchema = new Schema({
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
  bestFriend: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
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
    },
    subdocWithoutDefault: {
      type: [{
        a: String
      }],
      default: undefined
    }
  },
  tags: [String],
  alternateObjectId: mongoose.Types.ObjectId,
  socialMediaHandles: {
    type: Map,
    of: String
  },
  arrayOfMaps: [
    {
      type: Map,
      of: Number
    }
  ],
  buffer: {
    type: Buffer,
    required: true
  },
  bufferString: 'Buffer'
});

// NOTE: `this: UserDocument` is required for virtual properties to tell TS the type of `this` value using the "fake this" feature
// you will need to add these in after your first ever run of the CLI
UserSchema.virtual("name").get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// method functions, use Type Assertion (cast to UserMethods) for type safety
UserSchema.methods = <UserMethods>{
  isMetadataString() {
    return typeof this.metadata === "string";
  }
};

// static functions, use Type Assertion (cast to UserStatics) for type safety
UserSchema.statics = <UserStatics>{
  async getFriends(friendUids: UserDocument["_id"][]): Promise<UserObject[]> {
    return await this.aggregate([{ $match: { _id: { $in: friendUids } } }]);
  }
};

// query functions, use Type Assertion (cast to UserQueries) for type safety
UserSchema.query = <UserQueries>{
  populateFriends() {
    return this.populate("friends.uid", "firstName lastName");
  }
};

export const User: UserModel = mongoose.model<UserDocument, UserModel>("User", UserSchema);
export default User;
