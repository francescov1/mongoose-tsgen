import mongoose, { Schema } from "mongoose";
import {
  Video_scenarioDocument,
  Video_scenarioModel,
  Video_scenarioSchema,
  Phishing_scenarioDocument,
  Phishing_scenarioModel,
  Phishing_scenarioSchema,
  Quiz_scenarioDocument,
  Quiz_scenarioModel,
  Quiz_scenarioSchema,
  CampaignDocument,
  CampaignModel,
  CampaignSchema
} from "./refPath.gen";

// VideoScenario Schema
const VideoScenarioSchema: Video_scenarioSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  videoUrl: {
    type: String,
    required: true
  }
});

export const Video_scenario: Video_scenarioModel = mongoose.model<
  Video_scenarioDocument,
  Video_scenarioModel
>("Video_scenario", VideoScenarioSchema);

// PhishingScenario Schema
const PhishingScenarioSchema: Phishing_scenarioSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  emailTemplate: {
    type: String,
    required: true
  }
});

export const Phishing_scenario: Phishing_scenarioModel = mongoose.model<
  Phishing_scenarioDocument,
  Phishing_scenarioModel
>("Phishing_scenario", PhishingScenarioSchema);

// QuizScenario Schema
const QuizScenarioSchema: Quiz_scenarioSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  questions: {
    type: [String],
    required: true
  }
});

export const Quiz_scenario: Quiz_scenarioModel = mongoose.model<
  Quiz_scenarioDocument,
  Quiz_scenarioModel
>("Quiz_scenario", QuizScenarioSchema);

// Campaign Schema - uses refPath for dynamic refs
const CampaignSchema: CampaignSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  scenario_type: {
    type: String,
    enum: ["Video_scenario", "Phishing_scenario", "Quiz_scenario"],
    required: true
  },
  scenario: {
    type: Schema.Types.ObjectId,
    refPath: "scenario_type",
    required: false
  }
});

export const Campaign: CampaignModel = mongoose.model<CampaignDocument, CampaignModel>(
  "Campaign",
  CampaignSchema
);
