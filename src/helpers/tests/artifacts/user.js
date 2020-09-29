// NOTE: you will need to import these types after your first ever run of the CLI
// See the 'Initializing Schemas' section
const mongoose = require("mongoose");
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

UserSchema.virtual("name").get(function () { 
    return `${this.firstName} ${this.lastName}`;
 });

// method functions
UserSchema.methods = {
    isMetadataString() { 
        return typeof this.metadata === "string"; 
    }
}

// static functions
UserSchema.statics = {
  // friendUids could also use the type `ObjectId[]` here
  async getFriends(friendUids) {
    return await this.aggregate([{ $match: { _id: { $in: friendUids } } }]);
  }
}

module.exports = mongoose.model("User", UserSchema);
