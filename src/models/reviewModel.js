const mongoose = require('mongoose')

const reviewSchema = new mongoose.Schema({
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        required: 'BookId is  Required',
        ref: 'Book',
        trim:true
    },
    reviewedBy: {
        type: String,
        required: true,
        default: 'Guest',
        trim:true
    },
    reviewedAt: {
        type: Date,
        required: 'This field is Required'
    },
    rating: {
        type: Number,
        minlength: 1,
        maxlength: 5,
        required: 'Rating is Required'
    },
    review: {
        type: String,
        trim:true
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
})

module.exports = mongoose.model('review', reviewSchema)