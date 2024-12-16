import mongoose, { Schema } from 'mongoose';

const FilesSchema = new Schema({
  'brand-name': {  // hyphenated property name
    type: String
  },
  '123number': {   // starts with number
    type: String
  },
  'class': {       // TypeScript keyword
    type: String
  },
  'special@char': { // contains special character
    type: String
  },
  'space name': {   // contains space
    type: String
  },
  'uploads.files': { // contains dots like GridFS collections
    type: String
  }
})

export const Files = mongoose.model("test.files", FilesSchema);

export default Files;