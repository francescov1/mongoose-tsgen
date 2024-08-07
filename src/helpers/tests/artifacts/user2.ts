import mongoose from 'mongoose';
import { User2Document, User2Model, User2Schema } from './user2.gen';

const addressSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
    },
    coordinates: [{ lat: Number, long: Number }]
  },
  { _id: false }
);

const anotherSchema = new mongoose.Schema(
  {
    info: {
      type: String,
      required: true,
    },
    creator: String,
    time: Number
  }
);


const User2Schema: User2Schema = new mongoose.Schema(
  {
    _id: {
      type: Number,
      required: true,
    },
    address: {
      type: addressSchema,
      // this test ensures the required property here is projected properly by `processChild` in `src/helpers/parser.ts`
      required: true,
    },
    lastOnlineAt: Date,
    anotherSchema: anotherSchema,

    // Testing https://github.com/francescov1/mongoose-tsgen/issues/114
    anArrayOfSchemasWithArrayDocuments: [addressSchema],
    
    // Testing schema maps
    aMapOfSchemas: {
      type: Map,
      of: anotherSchema,
      required: true
    },
    aMapOfSchemaArrays: {
      type: Map,
      of: [anotherSchema]
    },
    anArrayOfSchemaMaps: [
      {
        type: Map,
        of: anotherSchema
      }
    ],
    // Testing singular of special cases
    children: [
      {
        uid: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User2",
          required: true
        }
      }
    ],
    people: [
      {
        name: String
      }
    ]
  },
  {
    timestamps: true,
  }
);

export const User2 = mongoose.model<User2Document, User2Model>('User2', User2Schema);