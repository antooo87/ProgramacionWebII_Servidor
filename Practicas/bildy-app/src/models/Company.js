import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({

    owner:
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required:true
    },

    name:
    {
        type: String,
        required: [true, 'El nombre de la empresa es obligatorio'],
        trim: true
    },

    cif: {
        type: String,
        required: [true, 'El CIF de la empresa es obligatorio'],
        unique: true,
        trim: true,
        uppercase: true
    },

    address: 
    {    
         
      street: { type: String, trim: true },
      number: { type: String, trim: true },
      postal: { type: String, trim: true },
      city:   { type: String, trim: true },
      province: { type: String, trim: true }
    },      
    logo: {
      type: String,
      default: null
    },
    isFreelance: {
      type: Boolean,
      default: false
    },

    deleted: {
      type: Boolean,
      default: false
    }
  },
  {

    timestamps: true
  }
)
const Company = mongoose.model('Company', companySchema)

export default Company