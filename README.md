# mongoose-tsgen

A plug-n-play Typescript interface generator for Mongoose.

[![Version](https://img.shields.io/npm/v/mongoose-tsgen.svg)](https://npmjs.org/package/mongoose-tsgen)
[![npm](https://img.shields.io/npm/dt/mongoose-tsgen)](https://www.npmjs.com/package/mongoose-tsgen)
[![License](https://img.shields.io/npm/l/mongoose-tsgen.svg)](https://github.com/Bounced-Inc/mongoose-tsgen/blob/master/package.json)

<!-- [![Downloads/week](https://img.shields.io/npm/dw/mongoose-tsgen.svg)](https://npmjs.org/package/mongoose-tsgen) -->

<!-- toc -->

- [Motivation](#motivation)
- [Features](#features)
- [Compatibility](#compatibility)
- [Installation](#installation)
- [The Gist](#the-gist)
- [Usage](#usage)
- [Example](#example)
- [Development](#Development)
<!-- tocstop -->

# Motivation

Using Mongoose with Typescript requires duplicating Mongoose Schemas using Typescript interfaces (see [this post by the Mongoose creator](https://thecodebarbarian.com/working-with-mongoose-in-typescript.html)). To avoid duplication, libraries such as [typegoose](https://github.com/typegoose/typegoose) & [ts-mongoose](https://github.com/lstkz/ts-mongoose) have sprouted up which define a custom schema syntax that is used to generate both the Mongoose Schemas and the Typescript interfaces. Unfortunately, this requires users to completely rewrite their Mongoose Schemas using an unfamiliar and less-supported syntax than Mongoose itself.

This library aims to remove these drawbacks by instead parsing your already-written Mongoose Schemas and generating associated Typescript interfaces. This removes the need to learn a whole new library and makes this library extremely simple to integrate into an existing Mongoose project.

# Features

- [x] Automatically generate Typescript typings for each Mongoose document, model and subdocument
- [x] Works out of the box, don't need to rewrite your schemas
- [x] Includes a "Mongoose-less" version of each schema interface (Mongoose typings removed)

# Compatibility

Mongoose: v5.11+

> For previous Mongoose versions, install mongoose-tsgen v6.0.10 with `npm install mongoose-tsgen@6.0.10` and see [its README](https://github.com/Bounced-Inc/mongoose-tsgen/blob/12d2f693957f61776d5b6addf23a8b051c99294c/README.md) for instructions.

- [x] All Mongoose types, arrays and maps
- [x] Virtual properties
- [x] Typescript path aliases
- [x] Mongoose method, static & query functions
- [x] Both Typescript and Javascript schema files

# Installation

<!-- usage -->

```sh-session
$ npm install -D mongoose-tsgen
$ npx mtgen --help # print usage
```

<!-- usagestop -->

# The Gist

Once you've generated your typings file (see [Usage](#usage)), all you need to do is use the generated types in your schema definitions and throughout your project. Note that this practice is well documented online, I've found the following two Medium articles especially useful:
- [Complete guide for Typescript with Mongoose for Node.js](https://medium.com/@agentwhs/complete-guide-for-typescript-for-mongoose-for-node-js-8cc0a7e470c1)
- [Strongly typed models with Mongoose and TypeScript](https://medium.com/@tomanagle/strongly-typed-models-with-mongoose-and-typescript-7bc2f7197722)

> If you run into unknown type issues, ensure you've updated Mongoose to v5.11+ and have removed the deprecated community typings `@types/mongoose`.
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
import { UserDocument, UserModel, UserSchema } from "../interfaces/mongoose.gen.ts";

const UserSchema: UserSchema = new Schema(...);

export const User: UserModel = mongoose.model<UserDocument, UserModel>("User", UserSchema);
export default User;
```

Then you can import the typings across your application from the Mongoose module and use them for document types:

```typescript
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

# Usage

<!-- commands -->

## `mtgen [MODEL_PATH]`

Generate a Typescript file containing Mongoose Schema typings.

_Note that these docs refer to Typescript files only. If you haven't yet converted Mongoose schema definition files to Typescript, you can use the `--js` flag to still generate types._

```
USAGE
  $ mtgen [MODEL_PATH]

OPTIONS
  -c, --config=config    [default: ./] Path of `mtgen.config.json` or its root folder. CLI flag 
                         options will take precendence over settings in `mtgen.config.json`.

  -d, --dry-run          Print output rather than writing to file.

  -h, --help             Show CLI help

  -i, --imports=import   Custom import statements to add to the output file. Useful if you use 
                         third-party types  in your mongoose schema definitions. For multiple imports, 
                         specify this flag more than once. 

  -j, --js               Search for Javascript schema files rather than Typescript files. 
                         Passing this flag also triggers --no-func-types.

  -o, --output=output    [default: ./src/interfaces] Path of output file to write generated typings. 
                         If a folder path is passed, the generator will create a `mongoose.gen.ts` file 
                         in the specified folder.

  -p, --project=project  [default: ./] Path of `tsconfig.json` or its root folder.

  --augment              Augment generated typings into the 'mongoose' module.

  --no-format            Disable formatting generated files with prettier and fixing with eslint.

  --no-func-types        Disable using TS compiler API for method, static and query typings.
```

Specify the directory of your Mongoose schema definitions using `MODEL_PATH`. If left blank, all sub-directories will be searched for `models/*.ts` (ignores `index.ts` files). Files found are expected to export a Mongoose model. 

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

## Query Population

Any field with a `ref` property will be typed as `RefDocument["_id"] | RefDocument`. This allows you to use the same type whether you populate a field or not. When populating a field, you will need to use [Typeguards](https://www.typescriptlang.org/docs/handbook/advanced-types.html#type-guards-and-differentiating-types) or [Type Assertion](https://www.typescriptlang.org/docs/handbook/basic-types.html#type-assertions) to tell Typescript that the field is populated:

```typescript
// fetch user with bestFriend populated
const user = await User.findById(uid).populate("bestFriend").exec()

// typescript won't allow this, since `bestFriend` is typed as `UserDocument["_id"] | UserDocument`  
console.log(user.bestFriend._id)

// instead use type assertion
const bestFriend = user.bestFriend as UserDocument;
console.log(bestFriend._id);

// or use typeguards

function isPopulated<T>(doc: T | mongoose.Types.ObjectId): doc is T {
  return doc instanceof mongoose.Document;
}

if (isPopulated<UserDocument>(user.bestFriend)) {
  // user.bestFriend is a UserDocument
  console.log(user.bestFriend._id)
}

```

# Example

### ./src/models/user.ts

```typescript
import mongoose from "mongoose";
import { UserDocument, UserModel, UserSchema, UserMethods, UserStatics, UserQueries, UserObject } from "../interfaces/mongoose.gen.ts";

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
  bestFriend: mongoose.Types.ObjectId,
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

// NOTE: `this: UserDocument` is required for virtual properties to tell TS the type of `this` value using the "fake this" feature
// you will need to add these in after your first ever run of the CLI
UserSchema.virtual("name").get(function (this: UserDocument) {
  return `${this.firstName} ${this.lastName}`;
});

// method functions, use Type Assertion (cast to UserMethods) for type safety
UserSchema.methods = <UserMethods>{
  // the return type (boolean) will be inferred from the TS compiler here 
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

export type UserObject = User;

export type UserQueries = {
  populateFriends: <Q extends mongoose.Query<any, UserDocument>>(this: Q) => Q;
}

declare module "mongoose" {
  interface Query<ResultType, DocType extends Document> extends UserQueries {}
}

export type UserMethods = {
  isMetadataString: (this: UserDocument) => boolean;
}

export type UserStatics = {
  getFriends: (this: UserModel, friendUids: UserDocument["_id"][]) => Promise<UserObject[]>;
}

export interface UserModel extends mongoose.Model<UserDocument>, UserStatics {}

export type UserSchema = mongoose.Schema<UserDocument, UserModel>

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

export type UserFriendDocument = mongoose.Types.EmbeddedDocument & {
  uid: UserDocument["_id"] | UserDocument;
} & UserFriend;

export type UserDocument = mongoose.Document<mongoose.Types.ObjectId> &
  UserMethods & {
    metadata?: any;
    friends: mongoose.Types.DocumentArray<UserFriendDocument>;
    city: {};
    name: string;
  } & User;
```

## Development

- [ ] The generating piece of `src/helpers/parser.ts` needs to be rewritten using [ts-morph](https://github.com/dsherret/ts-morph). Currently it builds the interfaces by appending generated lines of code to a string sequentially, with no knowledge of the AST. This leads to pretty confusing logic, using the TS compiler API would simplify it a ton.
- [ ] Top-level schema fields that refer to the schema itself (e.g. a `bestFriend` property on a User schema refering to a User ID) should be typed as `bestFriend: UserDocument["_id"] | UserDocument`. Unfortunately Typescript does not support recursively accessing a property of a type, so this is currently typed like so: `bestFriend: User["_id"] | User`.
   - [ ] Eventually it would be nice to give the option to type `User["_id"]` as a string rather than an ObjectId (see [#7](https://github.com/Bounced-Inc/mongoose-tsgen/issues/7)), but this will not be possible until a better workaround is found for the issue above.
- [ ] Cut down node_modules by using peer dependencies (i.e. mongoose) and stripping oclif.
