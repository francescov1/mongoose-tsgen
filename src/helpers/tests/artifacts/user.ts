import mongoose, { Schema } from 'mongoose';
import { UserDocument, UserModel, UserSchema, UserQueries, UserObject } from "./user.gen";

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
      type: [Number]
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
  mapOfArrays: {
    type: Map,
    of: [Number]
  },
  buffer: {
    type: Buffer,
    required: true
  },
  bufferString: 'Buffer',
  bufferSchemaType: {
    type: Schema.Types.Buffer,
    default: null
  },
  decimal128: Schema.Types.Decimal128,
  otherDecimal128: mongoose.Types.Decimal128,
  numberString: "Number",
  stringString: "String",
  otherNumberString: {
    type: "Number",
    required: true
  },
  otherStringString: {
    type: "String",
    required: true
  },
}, {
  toObject: {
    virtuals: true,
  }
});

// NOTE: `this: UserDocument` is required for virtual properties to tell TS the type of `this` value using the "fake this" feature
// you will need to add these in after your first ever run of the CLI
UserSchema.virtual("name").get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

UserSchema.methods = {
  isMetadataString() {
    return this.metadata === "string";
  }
};

UserSchema.statics = {
  async getFriends(friendUids: UserDocument["_id"][]): Promise<UserObject[]> {
    return await this.aggregate([{ $match: { _id: { $in: friendUids } } }]);
  }
};

UserSchema.query = {
  populateFriends() {
    return this.populate("friends.uid", "firstName lastName")
  }
};

export const User: UserModel = mongoose.model<UserDocument, UserModel, UserQueries>("User", UserSchema);

export default User;
