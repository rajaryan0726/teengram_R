import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const VerificationCodeSchema = new Schema({
    code: { type: String, required: true, unique: true },
    institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    sub_admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // The Admin who created it
    is_active: { type: Boolean, default: true },
    expires_at: { type: Date }
}, { timestamps: true });

export default mongoose.models.VerificationCode || model('VerificationCode', VerificationCodeSchema);
