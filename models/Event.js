import mongoose from "mongoose";

const EventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  eventType: {
    type: String,
    required: true,
    enum: ['Hackathon', 'Sports', 'Art', 'Festival', 'Seminar', 'Other']
  },
  details: {
    type: String,
    required: true,
  },
  organiser: {
    type: String,
    required: true,
  },
  posterUrl: {
    type: String,
    // Optional initially, can be populated via UploadThing
  },
  eventDate: {
    type: Date,
    required: true,
  },
  timing: {
    type: String,
    required: true,
  },
  locationType: {
    type: String,
    required: true,
    enum: ['Online', 'Offline']
  },
  locationDetails: {
    type: String,
    // Either a meeting link or a physical venue address
    required: true,
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

export default mongoose.models.Event || mongoose.model("Event", EventSchema);
