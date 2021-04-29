import mongoose, { Schema, model } from 'mongoose';
import { DeviceDocument, DeviceModel, HomeDocument, HomeModel, HomeSchema, DeviceSchema } from './device.gen';

const homeSchema: HomeSchema = new Schema(
  {
    homeId: String,
    homeName: String,
  },
  {
      _id: false
  }
);

homeSchema.virtual("status")
    .get(function(this: HomeDocument): string {
        return "available";
    });

export const home = mongoose.model<HomeDocument, HomeModel>('Home', homeSchema);

const DeviceSchema: DeviceSchema = new Schema({
  name: String,
  home: home.schema,
});

DeviceSchema.methods = {
    test() {
        return "hi";
    }
}

DeviceSchema.statics = {
    test() {
        return "hi";
    }
}

// multiple versions of mongoose model init

export const device = mongoose.model<DeviceDocument, DeviceModel>('Device', DeviceSchema);
export const device2 = mongoose.model('Device2', DeviceSchema);
export const device3 = mongoose.model<
    DeviceDocument,
    DeviceModel
>('Device3', DeviceSchema);
export const device4 = model('Device4', 
    DeviceSchema
);
export default mongoose.model<DeviceDocument, DeviceModel>('DeviceDefault', DeviceSchema);