import mongoose, { Schema } from 'mongoose';

const FilesSchema = new Schema({
  brand: {
    type: String
  }
})

export const Files = mongoose.model("Files", FilesSchema);

export default Files;