# mongoose-tsgen

A plug-n-play Typescript generator for Mongoose.

[![Version](https://img.shields.io/npm/v/mongoose-tsgen.svg)](https://npmjs.org/package/mongoose-tsgen)
[![npm](https://img.shields.io/npm/dt/mongoose-tsgen)](https://www.npmjs.com/package/mongoose-tsgen)
[![License](https://img.shields.io/npm/l/mongoose-tsgen.svg)](https://github.com/francescov1/mongoose-tsgen/blob/master/package.json)

<!-- [![Downloads/week](https://img.shields.io/npm/dw/mongoose-tsgen.svg)](https://npmjs.org/package/mongoose-tsgen) -->

<!-- toc -->

- [Motivation](#motivation)
- [Features](#features)
- [Compatibility](#compatibility)
- [Installation](#installation)
- [The Gist](#the-gist)
- [Usage](#usage)
- [Example](#example)
- [Known Issues](#known-issues)
- [Development](#Development)
<!-- tocstop -->

# Motivation

Using Mongoose with Typescript requires duplicating Mongoose Schemas using Typescript interfaces. To avoid duplication, libraries like [typegoose](https://github.com/typegoose/typegoose) define a custom schema syntax that is used to generate both the Mongoose Schemas and the Typescript interfaces. Unfortunately, this requires users to completely rewrite their Mongoose Schemas into an unfamiliar syntax and does not support the entire Mongoose feature set.

This library aims to remove these drawbacks by instead parsing your already-written Mongoose Schemas and generating associated Typescript interfaces. This removes the need to learn new syntax and makes this library extremely simple to integrate into an existing Mongoose project.

# Features

- 😌 Automatically generate Typescript typings for each Mongoose document, model and subdocument
- 📦 Works out of the box, don't need to rewrite your schemas
- ⛑ Type-safe [population](#query-population)
- ➕ Includes a "Mongoose-less" version of each schema interface (Mongoose typings removed)

# Compatibility

- ✅ All Mongoose types, arrays and maps
- ✅ Virtual properties
- ✅ Mongoose method, static & query functions
- ✅ Multiple schemas per file
- ✅ Typescript path aliases

### Mongoose version

Find your Mongoose version below and install the associated mongoose-tsgen version. Ensure to refer to each version's respective README for documentation (hyperlinked in table).

| mongoose       | mongoose-tsgen |
| -------------- | -------------- |
| 6.1.5+         | latest         |
| 5.11.19-6.1.14 | [8.4.7](https://github.com/francescov1/mongoose-tsgen/blob/e002649ad8649e26ee372ef964458934a555d2eb/README.md)          |
| 5.11.0-5.11.18 | [7.1.3](https://github.com/francescov1/mongoose-tsgen/blob/85ccc70b13e875b0de135a171563292fa58e5472/README.md)          |
| <5.11.0        | [6.0.10](https://github.com/francescov1/mongoose-tsgen/blob/12d2f693957f61776d5b6addf23a8b051c99294c/README.md)         |

> Note: For Mongoose `v6.3.2 - v6.4.0`, see [Known Issues](#known-issues) first.

# Installation

mongoose-tsgen can be installed globally or locally as a dev dependency. Refer to the table above to ensure you are using the correct version.

```bash
# install with npm or yarn
npm install -D mongoose-tsgen

# install mongoose-tsgen v7.1.3 for mongoose v5.10.19 (see table above for compatibility)
npm install -D mongoose-tsgen@7.1.3

# install with yarn
yarn add -D mongoose-tsgen
```

# The Gist

Once you've generated your typings file (see [Usage](#usage)), all you need to do is use the generated types in your schema definitions and throughout your project. 

### user.ts before:

```typescript
import mongoose from "mongoose";

const UserSchema = new Schema(...);

export const User = mongoose.model("User", UserSchema);
```

### user.ts after:

```typescript
import mongoose from "mongoose";
import { UserDocument, UserModel, UserSchema } from "../interfaces/mongoose.gen.ts";

const UserSchema: UserSchema = new Schema(...);

export const User: UserModel = mongoose.model<UserDocument, UserModel>("User", UserSchema);
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

Note that this practice is well documented online, I've found the following two Medium articles especially useful:
- [Complete guide for Typescript with Mongoose for Node.js](https://medium.com/@agentwhs/complete-guide-for-typescript-for-mongoose-for-node-js-8cc0a7e470c1)
- [Strongly typed models with Mongoose and TypeScript](https://medium.com/@tomanagle/strongly-typed-models-with-mongoose-and-typescript-7bc2f7197722)

# Usage

<!-- commands -->

## `mtgen <MODEL_PATH]>`

Generate a Typescript file containing Mongoose Schema typings.

> If you run into unknown type issues, [check your Mongoose version](#mongoose-version). For Mongoose v5.11+, ensure you have removed the deprecated community typings `@types/mongoose`.

```
USAGE
  $ mtgen <MODEL_PATH>

OPTIONS
  -c, --config=config     [default: ./] Path of `mtgen.config.json` or its root folder. CLI flag
                          options will take precendence over settings in `mtgen.config.json`.

  -d, --dry-run           Print output rather than writing to file.

  -h, --help              Show CLI help

  -i, --imports=imports   Custom import statements to add to the output file. Useful if you use
                          third-party types in your mongoose schema definitions. For multiple imports,
                          specify this flag more than once.

  -o, --output=output     [default: ./src/interfaces] Path of output file to write generated typings.
                          If a folder path is passed, the generator will create a `mongoose.gen.ts` file
                          in the specified folder.

  -p, --project=project   [default: ./] Path of `tsconfig.json` or its root folder.

  --dates-as-strings      Dates will be typed as strings. Useful for types returned to a frontend by API requests.

  --debug                 Print debug information if anything isn't working

  --no-format             Disable formatting generated files with prettier.

  --no-mongoose           Don't generate types that reference mongoose (i.e. documents). Replace ObjectId with
                          string.

  --no-populate-overload  Disable augmenting mongoose with Query.populate overloads (the overloads narrow
                          the return type of populated documents queries).
```

Specify the directory of your Mongoose schema definitions using `MODEL_PATH`. Defaults to `"**/models/!(index).ts"`

_See code: [src/index.ts](https://github.com/francescov1/mongoose-tsgen/blob/master/src/index.ts)_

<!-- commandsstop -->

## Blob patterns and `package.json`

Wrap blob patterns with double quotes like so: `mtgen "models/**/*.ts"`.

Use escape characters for wrapping blob patterns in `package.json`:

```json
"scripts": {
  "generate-mongoose-types": "mtgen \"models/**/*.ts\""
}
```


## Configuration File

All CLI options can be provided using a `mtgen.config.json` file. Use the `--config` option to provide the folder path containing this file ("./" will be searched if no path is provided). CLI options will take precendence over options in the `mtgen.config.json` file.

> mtgen.config.json

```json
{
  "imports": ["import Stripe from \"stripe\""],
  "output": "./src/custom/path/mongoose-types.ts"
}
```

## Use as a module

`mongoose-tsgen` can also be imported or required and used programmatically. Below is an example:

```typescript
import MongooseTsgen from "mongoose-tsgen";

async function run() {
    const tsgen = new MongooseTsgen();
    await tsgen.generateDefinitions({
        flags: {
            "dry-run": false,
            "no-format": false,
            "no-mongoose": false,
            "no-populate-overload": false,
            "dates-as-strings": false,
            debug: false,
            output: "./src/interfaces",
            project: "./tsconfig.test.json"
        },
        args: {
            model_path: "./src/helpers/tests/artifacts/**/*.ts" // optional
        }
    });
}

run()
```

## Query Population

Mongoose fields with a `ref` property will be typed as `RefDocument["_id"] | RefDocument`. As part of the generated file, mongoose will be augmented with `Query.populate` overloads to narrow return types of populated queries (this can be disabled using the `--no-populate-overload` flag). A helper type `PopulatedDocument` and a type guard function `IsPopulated` will also be generated to help with handling populated documents, see usage below:

```typescript
import { IsPopulated, PopulatedDocument } from "../interfaces/mongoose.gen.ts";

// UserDocument["bestFriend"] = mongoose.Types.ObjectId | UserDocument
function unsafeType(user: UserDocument) {
  // type guard
  if (IsPopulated(user.bestFriend))) {
    // user.bestFriend is confirmed to be populated, typescript will allow accessing its properties now
    console.log(user.bestFriend._id)
  }
}

// `user` is typed as a UserDocument with `bestFriend` populated
function safeType(user: PopulatedDocument<UserDocument, "bestFriend">) {
  console.log(user.bestFriend._id)
}

// due to the `Query.populate` overload, `user` will be typed as `PopulatedDocument<UserDocument, "bestFriend">`
// rather than the usual `UserDocument`
const user = await User.findById(uid).populate("bestFriend").exec()

// completely type-safe
safeType(user)
```

Both the mongoose `populate` overload and the `PopulateDocument` type handle nested and array types with ease; you rarely need to worry about enforcing types manually. In the case that the populated type cannot be determined, types will fallback to the generic `RefDocument["_id"] | RefDocument`.

# Example

### ./src/models/user.ts

```typescript
import mongoose, { Schema } from "mongoose";
import { UserDocument, UserModel, UserSchema, UserObject } from "../interfaces/mongoose.gen.ts";

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
    }
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
    return this.populate("bestFriend", "firstName lastName");
  }
};

export const User = mongoose.model<UserDocument, UserModel>("User", UserSchema);
```

### generate typings

```bash
# run mongoose-tsgen
npx mtgen
```

### generated typings file ./src/interfaces/mongoose.gen.ts

```typescript
import mongoose from "mongoose";

export type UserFriend = {
  uid: User["_id"] | User;
  nickname?: string;
  _id: mongoose.Types.ObjectId;
}

export type UserObject = User;

export type UserQueries = {
  populateFriends: () => mongoose.Query<any, UserDocument, UserQueries> & UserQueries;
}

export type UserMethods = {
  isMetadataString: (this: UserDocument) => boolean;
}

export type UserStatics = {
  getFriends: (this: UserModel, friendUids: UserDocument["_id"][]) => Promise<UserObject[]>;
}

export type UserModel = mongoose.Model<UserDocument, UserQueries> & UserStatics

export type UserSchema = mongoose.Schema<UserDocument, UserModel, UserMethods, UserQueries>

export type User = {
  email: string;
  firstName: string;
  lastName: string;
  bestFriend?: User["_id"] | User;
  friends: UserFriend[];
  city: {
    coordinates: number[];
  };
  _id: mongoose.Types.ObjectId;
}

export type UserFriendDocument = mongoose.Types.Subdocument & {
  uid: UserDocument["_id"] | UserDocument;
  nickname?: string;
  _id: mongoose.Types.ObjectId;
};

export type UserDocument = mongoose.Document<mongoose.Types.ObjectId, UserQueries> &
  UserMethods & {
    email: string;
    firstName: string;
    lastName: string;
    metadata?: any;
    bestFriend?: UserDocument["_id"] | UserDocument;
    friends: mongoose.Types.DocumentArray<UserFriendDocument>;
    city: {
      coordinates: mongoose.Types.Array<number>;
    };
    name: string;
    _id: mongoose.Types.ObjectId;
  };
```

## Known Issues

### Type instantiation is excessively deep and possibly infinite

This issue is present when using **Mongoose v6.3.2 - v6.4.0** due to a conflict in types.

Workarounds:
- Fix your Mongoose version to `<6.3.2` or `>6.4.0`.
- Use the `--no-populate-overload` flag.

References:
- https://github.com/Automattic/mongoose/issues/11787
- https://github.com/francescov1/mongoose-tsgen/issues/95

## Development

- [ ] Consider [population field selection](https://mongoosejs.com/docs/populate.html#field-selection) when typing populates
- [ ] Slim down dependencies: `oclif` is unnecessarily large, `prettier` should be handled by users if desired.
