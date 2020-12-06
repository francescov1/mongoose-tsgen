# mongoose-tsgen

An plug-n-play Typescript interface generator for Mongoose.

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/mongoose-tsgen.svg)](https://npmjs.org/package/mongoose-tsgen)
[![npm](https://img.shields.io/npm/dt/mongoose-tsgen)](https://www.npmjs.com/package/mongoose-tsgen)
[![License](https://img.shields.io/npm/l/mongoose-tsgen.svg)](https://github.com/Bounced-Inc/mongoose-tsgen/blob/master/package.json)

<!-- [![Downloads/week](https://img.shields.io/npm/dw/mongoose-tsgen.svg)](https://npmjs.org/package/mongoose-tsgen) -->

<!-- toc -->

- [Features](#features)
- [Compatibility](#compatibility)
- [Installation](#installation)
- [Usage](#usage)
- [Example](#example)
- [Development](#Development)
<!-- tocstop -->

# Features

- [x] Automatically generate a Typescript file containing typings for each Mongoose document, model and subdocument
- [x] Works out of the box, don't need to rewrite your schemas
- [x] Includes a "Mongoose-less" version of each schema interface (Mongoose typings removed)

# Compatibility

- [x] All Mongoose types and arrays
- [x] Virtual properties
- [x] Both Typescript and Javascript schema files
- [x] Typescript path aliases
- [x] Mongoose method, static & query functions
- [x] Typesafe document creation with `Model.Create`
- [ ] Setting subdocument arrays without casting to `any` (currently you need to do `user.friends = [{ uid, name }] as any` or you can initialize the subdocument prior to setting it)

# Installation

<!-- usage -->

```sh-session
$ npm install -D mongoose-tsgen
$ npx mtgen --help # print usage
```

<!-- usagestop -->

# Usage

<!-- commands -->

## `mtgen [ROOT_PATH]`

Generate a Typescript file containing Mongoose Schema typings.

```
USAGE
  $ mtgen [ROOT_PATH - default = "."]

OPTIONS
  -c, --config=config    [default: ./] Path of mtgen.config.json or its root folder. CLI flag options will take precendence over settings in mtgen.config.json
  -d, --dry-run          Print output rather than writing to file.
  -h, --help             Show CLI help
  -i, --imports=import  Custom import statements to add to the output file. Useful if you use third-party types in your mongoose schema definitions. For multiple imports, specify this flag more than once. 
  -j, --js               Search for Mongoose schemas in Javascript files rather than in Typescript files.
  -o, --output=output    [default: ./src/interfaces] Path of output file containing generated typings. If a folder path is passed, the generator 
                         will default to creating an `mongoose.gen.ts` file in the specified folder.
  -p, --project=project  [default: ./] Path of tsconfig.json or its root folder.
  --augment              Augment generated typings into the 'mongoose' module
  --no-format            Disable formatting generated files with prettier and fixing with eslint.
  --no-func-types        Disable using TS compiler API for method, static and query typings.
```

All sub-directories of `ROOT_PATH` will be searched for `models/*.ts` files (or `models/*.js`). Files in this folder (other than an index file) are expected to export a Mongoose model.

<i>NOTE: --output requires a folder path or a file path ending in `index.d.ts`. If the path does not exist, it will be created.</i>

_See code: [src/index.ts](https://github.com/Bounced-Inc/mongoose-tsgen/blob/master/src/index.ts)_

<!-- commandsstop -->

## Configuration File

All CLI options can be provided using a `mtgen.config.json` file. Use the `--config` option to provide the folder path containing this file ("./" will be searched if no path is provided). CLI options will take precendence over options in the `mtgen.config.json` file.

> mtgen.config.json

```json
{
  "imports": ["import Stripe from \"stripe\""],
  "output": "./src/custom/path/mongoose-types.ts"
}
```

# Example

### ./src/models/user.ts

```typescript
// NOTE: you will need to import these types after your first ever run of the CLI
// See the 'Initializing Schemas' section
import mongoose from "mongoose";
import { UserDocument, UserModel, UserQueries } from "../interfaces/mongoose.gen.ts";

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

// NOTE: `this: UserDocument` and `this: UserModel` is to tell TS the type of `this' value using the "fake this" feature
// you will need to add these in after your first ever run of the CLI

UserSchema.virtual("name").get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// method functions
UserSchema.methods = {
  isMetadataString(this: UserDocument) {
    return typeof this.metadata === "string";
  }
};

// static functions
UserSchema.statics = {
  // friendUids could also use the type `ObjectId[]` here
  async getFriends(this: UserModel, friendUids: UserDocument["_id"][]) {
    return await this.aggregate([{ $match: { _id: { $in: friendUids } } }]);
  }
};

// query functions - no `this: UserDocument` required here, just provide UserQueries type
const queryFuncs: UserQueries = {
  populateFriends() {
    return this.populate("friends.uid", "firstName lastName");
  }
};

UserSchema.query = queryFuncs;

export const User: UserModel = mongoose.model<UserDocument, UserModel>("User", UserSchema);
export default User;
```

### generate typings

```bash
$ mtgen
```

### generated typings file ./src/interfaces/mongoose.gen.ts
<!-- TODO: generate test file and replace with this -->
```typescript
/* tslint:disable */
/* eslint-disable */

// ######################################## THIS FILE WAS GENERATED BY MONGOOSE-TSGEN ######################################## //

// NOTE: ANY CHANGES MADE WILL BE OVERWRITTEN ON SUBSEQUENT EXECUTIONS OF MONGOOSE-TSGEN.

import mongoose from "mongoose";

export interface UserFriend {
  uid: User["_id"] | User;
  nickname?: string;
  _id: mongoose.Types.ObjectId;
}

export interface UserQueries {
  populateFriends<Q extends mongoose.DocumentQuery<any, UserDocument, {}>>(
    this: Q,
    ...args: any[]
  ): Q;
}

export interface UserModel extends mongoose.Model<UserDocument, UserQueries> {
  getFriends: (this: any, friendUids: UserDocument["_id"][]) => Promise<any>;
}

export interface User {
  email: string;
  firstName: string;
  lastName: string;
  bestFriend?: mongoose.Types.ObjectId;
  friends: UserFriend[];
  city: {
    coordinates?: number[];
  };
  _id: mongoose.Types.ObjectId;
}

export type UserFriendDocument = mongoose.Types.Subdocument & {
  uid: UserDocument["_id"] | UserDocument;
} & UserFriend;

export type UserDocument = mongoose.Document & {
  metadata?: any;
  friends: mongoose.Types.DocumentArray<UserFriendDocument>;
  city: {};
  name: any;
  isMetadataString: (this: any) => boolean;
} & User;
```

## Initializing Schemas

Once you've generated your typings file, all you need to do is add the following types to your schema definitions:

### user.ts before:

```typescript
import mongoose from "mongoose";

const UserSchema = new Schema(...);

export const User = mongoose.model("User", UserSchema);
export default User;
```

### user.ts after:

```typescript
import mongoose from "mongoose";
import { UserDocument, UserModel } from "../interfaces/mongoose.gen.ts";

const UserSchema = new Schema(...);

export const User: UserModel = mongoose.model<UserDocument, UserModel>("User", UserSchema);
export default User;
```

Then you can import the typings across your application from the Mongoose module and use them for document types:

```typescript
// import types from mongoose module
import { UserDocument } from "./interfaces/mongoose.gen.ts";

async function getUser(uid: string): UserDocument {
  // user will be of type User
  const user = await User.findById(uid);
  return user;
}

async function editEmail(user: UserDocument, newEmail: string): UserDocument {
  user.email = newEmail;
  return await user.save();
}
```

## Development

- [ ] The generating piece of `src/helpers/parser.ts` needs to be rewritten using [ts-morph](https://github.com/dsherret/ts-morph). Currently it builds the interfaces by appending generated lines of code to a string sequentially, with no knowledge of the AST. This leads to pretty confusing logic, using the TS compiler API would simplify it a ton.
- [ ] Query function parameters are typed using a rest parameter `(...args: any[])`, this needs to be fine tunned to use the actual parameters and types.
- [ ] Top-level schema fields that refer to the schema itself (i.e. an array of User friend IDs at the root of the User schema) will be typed as the barebones Mongoose-less Schema interface, rather than the Document type (in example above, would refer to `User` instead of `UserDocument`). This is because the Document type is a TS type, rather than an interface, thus it cannot reference itself. This edge-case only really arises to users if they populate that specific property, otherwise this would references an ObjectId in both cases.
- [ ] Generating types for specifically the method and static functions objects. This is how query functions are currently handled, it removes the need to fill in the "fake this" parameter for each function.
