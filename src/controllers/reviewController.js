// =================================[ Imports]=================================

const mongoose = require('mongoose')
const bookModel = require("../models/bookModel");
const reviewModel = require("../models/reviewModel");

const isValidvalue = function (value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true;
}




// =================================[ Create Reviews]=================================

let createReview = async (req, res) => {
    try {
        let data = req.body;
        let bookId = req.params.bookId;

        if (Object.keys(data).length == 0) return res.status(400).send({ status: false, message: 'please eneter data to create review' })

        if (!mongoose.Types.ObjectId.isValid(bookId)) return res.status(400).send({ status: false, message: 'please enter the bookId' });

        //-------(Find Book)

        let findBook = await bookModel.findOne({ _id: bookId, isDeleted: false });
        if (!findBook) return res.status(404).send({ status: false, message: 'bookId does not exists' })

        //-------(Destructuring)

        let { rating, review, reviewedBy } = data;

        //=======================(Validations)================

        //----(ReviewedBY)

        if("reviewedBy" in req.body){
            if (!isValidvalue(reviewedBy)) return res.status(400).send({ status: false, message: 'please enter valid reviewedBy' })
        }

        //----(Rating)

        if (!rating) return res.status(400).send({ status: false, message: 'ratings required and value should not be zero' })
        if (typeof rating != 'number') return res.status(400).send({ status: false, message: 'please enter a number' })
        if (!(rating <= 5)) return res.status(400).send({ status: false, message: 'please enter valid rating which less than or equal to 5' });

        //------(Set Review Date)

        let reviewedAt = Date.now();

        let filter = {
            bookId: bookId,
            reviewedBy: reviewedBy,
            reviewedAt,
            rating: rating,
            review: review
        };
        
        // --------(Creating Reviews)

        let saveData = await reviewModel.create(filter);
        let response = await reviewModel.findById(saveData._id).select({ __v: 0, updatedAt: 0, createdAt: 0, isDeleted: 0 })

        let { _id, title, category, subcategory, excerpt, reviews, updatedAt, createdAt, releasedAt, isDeleted, } = findBook
        let bookData = { _id, title, category, subcategory, excerpt, reviews, updatedAt, createdAt, releasedAt, isDeleted, reviewsData:response }

        //---------(Updating Reviews Count)

        findBook.reviews = findBook.reviews + 1;
        findBook.save();

        //---------(Response)
        
        res.status(201).send({ status: true, message: 'success', data: bookData })

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}

// =================================[ Update Reviews]=================================

let updateReview = async (req, res) => {
    try {
        let body = req.body;
        let bookId = req.params.bookId;
        let reviewId = req.params.reviewId;

        if (Object.keys(body).length == 0) return res.status(400).send({ status: false, message: 'please enter data to update' })

        if (!mongoose.isValidObjectId(bookId)) return res.status(400).send({ status: false, message: 'please enter valid book id' });

        if (!mongoose.Types.ObjectId.isValid(reviewId)) return res.status(400).send({ status: false, message: 'please enter valid review id' });

        //-------(Find Book)

        let findBook = await bookModel.findOne({ _id: bookId, isDeleted: false })
        if (!findBook) return res.status(404).send({ status: false, message: 'book not found' })

        //-------(Find Review)

        let findReview = await reviewModel.findOne({ _id: reviewId, bookId: bookId ,isDeleted: false });
        if (!findReview) return res.status(404).send({ status: false, message: 'review not found' });

        //-------(Validation for Rating)

        if (body.rating) {
            if (typeof body.rating != "number") return res.status(400).send({ status: false, message: 'please enter a number' });
            if (!(body.rating <= 5)) return res.status(400).send({ status: false, message: 'please enter rating less than or equal to 5' });

        } else if (body.rating === 0) {
            return res.status(400).send({ status: false, message: 'please enter rating greater than 0' });
        }

        //-------(Update)

        let update = {
            review: body.review,
            rating: body.rating,
            reviewedBy: body.reviewedBy,
        }
        await reviewModel.findByIdAndUpdate({ _id: reviewId }, update);

        //-------(Find Review)

        let reviewsData = await reviewModel.find({ _id: reviewId, isDeleted: false }).select({ __v: 0, isDeleted: 0 })

        let { _id, title, category, subcategory, excerpt, reviews, updatedAt, createdAt, releasedAt, isDeleted, } = findBook
        let bookData = { _id, title, category, subcategory, excerpt, reviews, updatedAt, createdAt, releasedAt, isDeleted, reviewsData:reviewsData }

        //-------(Send Response)

        res.status(200).send({ status: true, message: 'Book list', data: bookData })

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }

}

//=================================[ Delete Reviews]=================================

let deleteReview = async (req, res) => {
    try {
        let bookId = req.params.bookId;
        let reviewId = req.params.reviewId;

        if (!mongoose.isValidObjectId(bookId)) return res.status(400).send({ status: false, message: 'please enter valid book id' });

        if (!mongoose.Types.ObjectId.isValid(reviewId)) return res.status(400).send({ status: false, message: 'please enter valid review id' });

        //-------(Find Book)

        let findBook = await bookModel.findOne({ _id: bookId, isDeleted: false })
        if (!findBook) return res.status(404).send({ status: false, message: 'book not found' })

        //-------(Find Review)

        let findReview = await reviewModel.find({_id: reviewId, bookId: bookId, isDeleted: false });
        if (!findReview) return res.status(404).send({ status: false, message: 'review not found' });

        //-------(Update Review)

        await reviewModel.findOneAndUpdate({ _id: reviewId, bookId: bookId }, { isDeleted: true })

        //-------(Decrease Count of Reviews)

        findBook.reviews = findBook.reviews - 1;
        findBook.save();

        //-------(Respose)

        res.status(200).send({ status: true, message: 'successfully deleted' });

    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}

// =================================[ Exports ]=================================

module.exports.deleteReview = deleteReview
module.exports.updateReview = updateReview
module.exports.createReview = createReview