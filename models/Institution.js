import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const InstitutionSchema = new Schema({
    institution_name: { type: String, required: true },
    institution_type: { 
        type: String, 
        required: true,
        enum: ['School', 'College', 'University', 'Coaching']
    },
    year_of_establishment: { type: String },
    affiliation_board_university: { type: String },
    institution_registration_number: { type: String },
    official_website_url: { type: String },
    
    // Cloudinary details for documents
    mandatory_documents: [{
        name: { type: String },
        file_url: { type: String }, // Cloudinary URL
        file_id: { type: String },  // Cloudinary public_id
    }],
    supporting_documents: [{
        name: { type: String },
        file_url: { type: String },
        file_id: { type: String },
    }],
    
    address: {
        line1: { type: String, required: true },
        line2: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        pincode: { type: String, required: true }
    },
    
    contact: {
        official_email: { type: String, required: true },
        contact_number: { type: String, required: true },
        landline_number: { type: String }
    },
    
    representative: {
        name: { type: String, required: true },
        designation: { type: String, required: true },
        email: { type: String, required: true },
        contact: { type: String, required: true },
        employee_id: { type: String }
    },
    
    admin: { type: Schema.Types.ObjectId, ref: 'User' },
    
    status: { 
        type: String, 
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    rejection_reason: { type: String },
    verified_by: { type: Schema.Types.ObjectId, ref: 'User' } // SUPER_ADMIN
}, { timestamps: true });

export default mongoose.models.Institution || model('Institution', InstitutionSchema);
