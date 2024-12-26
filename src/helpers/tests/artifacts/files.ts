import mongoose, { Schema } from 'mongoose';
import { TestFilesSchema, TestFilesDocument, TestFilesModel } from './files.gen';

enum FileType {
  Public = 'public',
  Private = 'private',
  Restricted = 'restricted'
}

// FilesSchema type
const FilesSchema = new Schema({
  'brand-name': {  // hyphenated property name
    type: String,
    required: true
  },
  '123number': {   // starts with number
    type: String,
    required: true
  },
  'class': {       // TypeScript keyword
    type: String,
    enum: ['class1', 'class2', 'class3']
  },
  'special@char': { // contains special character
    type: String,
    default: 'default@value'
  },
  'space name': {   // contains space
    type: String
  },
  'uploadsFiles': { // contains dots like GridFS collections
    type: String
  },
  'typeof': {      // testing nested dots with enum
    type: String,
    enum: FileType,
    required: true
  },
  'meta_data': {    // nested object with special characters
    'size-kb': Number,
    'mime-type': String,
    'created@': Date
  },
  'arrayItems': [{ // array with special character fields
    'item@id': String,
    'item#name': String
  }],
  'function': {     // another TypeScript keyword
    type: String
  },
  'interfaceMap': {  // Map with special characters
    type: Map,
    of: String
  }
}, {
  timestamps: true,
  toObject: { virtuals: true }
});

// Virtual properties
FilesSchema.virtual('full.path').get(function(this: TestFilesDocument):string {
  return `${this['brand-name']}/${this['123number']}`;
});

// Instance methods
FilesSchema.methods = {
  'validate@type'(this: TestFilesDocument): boolean {
    return Object.values(FileType).includes(this.typeof as FileType);
  },
  'get.size'(this: TestFilesDocument) {
    return this.meta_data['size-kb']
  }
};

// Static methods
FilesSchema.statics = {
  async 'find.byType'(fileType: TestFilesDocument) {
    return await this.find({ 'type.of': fileType });
  },
  async 'count@extension'(ext: string){
    return await this.countDocuments({
      'meta.data.mime.type': new RegExp(`${ext}$`)
    });
  }
};

// Query helpers
FilesSchema.query = {
  'by.brand'(brandName: string) {
    return this.where({ 'brand-name': brandName });
  },
  'with.metadata'() {
    return this.select('meta.data');
  }
};

// // Middleware
// FilesSchema.pre('save', function(next) {
//   if (!this['meta.data']['created@']) {
//     this['meta.data']['created@'] = new Date();
//   }
//   next();
// });

const Files = mongoose.model<TestFilesDocument, TestFilesModel>("test.files", FilesSchema);

export default Files;