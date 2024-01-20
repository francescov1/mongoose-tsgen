import mongoose, { Schema } from 'mongoose';

const LandingPageSchema = new Schema({
  brand: String,
  models: [
      {
          name: String
      }
  ],
})

export const Landing = mongoose.model("Landing", LandingPageSchema);

export default Landing;
