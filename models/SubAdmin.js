import mongoose from 'mongoose';
const { Schema, model } = mongoose;

if (mongoose.models.SubAdmin) {
    delete mongoose.models.SubAdmin;
}

const SubAdminSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    institution: { type: Schema.Types.ObjectId, ref: 'Institution', required: true },
    name: { type: String, required: true },
    assigned_class_department: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    plain_password: { type: String }
}, { timestamps: true });

export default mongoose.models.SubAdmin || model('SubAdmin', SubAdminSchema);
