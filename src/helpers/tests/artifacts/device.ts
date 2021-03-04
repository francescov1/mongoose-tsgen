import mongoose, { Schema, model } from 'mongoose';
import { DeviceDocument, DeviceModel, HomeDocument, HomeModel } from './types/mongoose.gen';

const homeSchema = new Schema(
  {
    homeId: String,
    homeName: String,
  }
);


const DeviceSchema = new Schema({
  name: String,
  home: homeSchema,
});

homeSchema.virtual("status")
    .get(function(this: HomeDocument): "available" | "max" | "almostMax" {
        return "available";
    });

DeviceSchema.methods = {
    test() {
        return "hi";
    }
}

export const device = mongoose.model<DeviceDocument, DeviceModel>('Device', DeviceSchema);
export const device2 = mongoose.model('Device2', DeviceSchema);
export const device3 = mongoose.model<
DeviceDocument, 
DeviceModel
>('Device3', DeviceSchema);
export const device4 = model('Device4', DeviceSchema);
export default mongoose.model<HomeDocument, HomeModel>('Home', homeSchema);