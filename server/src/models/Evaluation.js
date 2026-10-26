import mongoose from 'mongoose';

const evaluationSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    // Lower-cased, whitespace-collapsed name used to group a student's results.
    studentKey: { type: String, required: true },
    // Stored as UTC midnight of the test day.
    testDate: { type: Date, required: true },
    testName: { type: String, default: '', trim: true },
    percentage: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: true }
);

// One result per student per test: re-sending the same evaluation updates it.
evaluationSchema.index({ studentKey: 1, testDate: 1, testName: 1 }, { unique: true });

export default mongoose.model('Evaluation', evaluationSchema);
