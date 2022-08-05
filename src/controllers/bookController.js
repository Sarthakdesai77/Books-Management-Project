// =================================[ Imports ]=================================
const userModel = require('../models/userModel')
const bookModel = require('../models/bookModel')
const reviewModel = require('../models/reviewModel')
const { default: mongoose } = require('mongoose')
const aws = require("aws-sdk")

//----(Value Validation)

const isValidvalue = function (value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true;
}

//===============================================================================

aws.config.update({
    accessKeyId: "AKIAY3L35MCRVFM24Q7U",
    secretAccessKey: "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",
    region: "ap-south-1"
})

let uploadFile = async (file) => {
    return new Promise(function (resolve, reject) {
        let s3 = new aws.S3({ apiVersion: '2006-03-01' });
        var uploadParams = {
            ACL: "public-read",
            Bucket: "classroom-training-bucket",
            Key: "abc/" + file.originalname,
            Body: file.buffer
        }
        s3.upload(uploadParams, function (err, data) {
            if (err) {
                return reject({ "error": err })
            }
            return resolve(data.Location)
        })
    })
}

//=================================[ Create Book]=================================
let createBook = async (req, res) => {
    try {
        let body = req.body

        if (Object.keys(body).length === 0) return res.status(400).send({ status: false, message: "Please Provide data to create a new book." })

        let { title, excerpt, userId, ISBN, category, subcategory, reviews, releasedAt } = body

        //---------[Required fields]

        if (!title) return res.status(400).send({ status: false, message: "title is required" })

        if (!excerpt) return res.status(400).send({ status: false, message: "excerpt is required" })

        if (!userId) return res.status(400).send({ status: false, message: "userId is required" })

        if (!ISBN) return res.status(400).send({ status: false, message: "ISBN is required" })

        if (!category) return res.status(400).send({ status: false, message: "category is required" })

        if (!subcategory) return res.status(400).send({ status: false, message: "subcategory is required" })

        if (!releasedAt) return res.status(400).send({ status: false, message: "releasedAt is required" })

        //-------------[Validations for Unique fields]

        //------(Check Title)

        let checkTitle = await bookModel.findOne({ title })
        if (checkTitle) return res.status(400).send({ status: false, message: "Title is already used" })
        if (!(/^[A-Za-z_ ]+$/.test(title))) return res.status(400).send({ status: false, message: "Please enter valid title" })

        //------(Check UserId)

        if (!mongoose.Types.ObjectId.isValid(userId)) return res.status(400).send({ status: false, message: "Invalid UserId" })
        let checkUserid = await userModel.findById(userId)
        if (!checkUserid) return res.status(404).send({ status: false, message: "userId not found" })

        //------(Check ISBN)

        if (!(/^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/.test(ISBN))) return res.status(400).send({ status: false, message: "Invalid ISBN Number" })
        let checkISBN = await bookModel.findOne({ ISBN })
        if (checkISBN) return res.status(400).send({ status: false, message: "ISBN is already used" })

        //------(Check Date)

        let validateDate = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/gm
        if (!validateDate.test(releasedAt)) {
            return res.status(400).send({ status: false, message: "date must be in format  YYYY-MM-DD!!!" })
        }

        //------(Check Review)

        if ("reviews" in req.body) {
            if (typeof reviews != "number") return res.status(400).send({ status: false, message: "reviews should be of type number" })
            if (!(reviews >= 0)) return res.status(400).send({ status: false, message: "reviews should not be minus" })
        }

        //----------[Authorisation]

        const token = req.userId
        if (token !== body.userId.toString()) return res.status(403).send({ status: false, message: "you cannot create other users books please provide your user ID" });

        let files = req.files
        if (files && files.length > 0) {
            let uploadedFileURL = await uploadFile(files[0])
            req.uploadedFileURL = uploadedFileURL;
            body.bookCover = uploadedFileURL
        }
        else {
            return res.status(400).send({ msg: "No file found" })
        }

        //------(Create Book)

        let book = await bookModel.create(body)

        const response = await bookModel.findOne({ _id: book._id }).select({ __v: 0 })

        //------(Response)

        res.status(201).send({ status: true, message: "Success", data: response })

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


// =================================[ Get Books ]=================================
let getBook = async (req, res) => {
    try {
        let filterBook = req.query

        //---------[Validation]

        if (filterBook.userId) {
            if (!mongoose.Types.ObjectId.isValid(filterBook.userId)) return res.status(400).send({ status: false, message: 'Invalid UserId Format' })
        }

        //---------[Incase 2 or more subcategory is given]

        if (filterBook.subcategory) {
            filterBook.subcategory = { $in: filterBook.subcategory.split(',') };
        }

        //---------[Find Book]

        let data = await bookModel.find({ $and: [filterBook, { isDeleted: false }] }).select({ title: 1, excerpt: 1, category: 1, releasedAt: 1, userId: 1, reviews: 1 }).sort({ title: 1 })

        if (Object.keys(data).length == 0) return res.status(404).send({ status: false, message: 'Book not found' })

        //---------[Response Send]

        res.status(200).send({ status: true, message: 'Book list', data: data })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


// =================================[ Get Book By Id ]=================================
let getBookById = async (req, res) => {
    try {
        let bookId = req.params.bookId

        //---------[Validations]

        if (!mongoose.Types.ObjectId.isValid(bookId)) return res.status(400).send({ status: false, message: 'Invalid UserId Format' })

        //---------[Checking Book is Present in Db or not]

        let checkBook = await bookModel.findOne({ _id: bookId, isDeleted: false })
        if (!checkBook) return res.status(404).send({ status: false, message: "Book Not Found" });

        //---------(Check Reviews)

        let reviewsData = await reviewModel.find({ bookId: bookId, isDeleted: false })

        //---------[Destructuring]

        let { _id, title, category, subcategory, excerpt, reviews, updatedAt, createdAt, releasedAt, isDeleted } = checkBook

        //---------[Create response]

        let data = { _id, title, category, subcategory, excerpt, reviews, updatedAt, createdAt, releasedAt, isDeleted, reviewsData }

        //---------[Send Response]

        res.status(200).send({ status: true, message: 'Book list', data: data })
    }
    catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


// =================================[ Update Books ]=================================
let updateBook = async (req, res) => {
    try {
        let bookId = req.params.bookId

        let data = req.body

        //---------[Validations]

        if (!mongoose.Types.ObjectId.isValid(bookId)) return res.status(400).send({ status: false, message: 'Invalid UserId Format' })

        if (Object.keys(data).length === 0) return res.status(400).send({ status: false, message: "Please Provide data to Update a book." })

        //---------[Check Book is Present in Db or not]

        let checkBook = await bookModel.findOne({ _id: bookId, isDeleted: false })
        if (!checkBook) return res.status(404).send({ status: false, message: "Book Not Found" });

        //---------[Authorisation]

        const token = req.userId
        if (token !== checkBook.userId.toString()) return res.status(403).send({ status: false, message: "you cannot update other users book" });

        //---------[Update Book By Filter ]

        //.....(Change Title)

        if (data.title) {
            if (!(/^[A-Za-z_ ]+$/.test(data.title))) return res.status(400).send({ status: false, message: "Please enter valid title" })
            let uniqueTittle = await bookModel.findOne({ title: data.title })
            if (uniqueTittle) return res.status(400).send({ status: false, message: "Title already exists" });
            checkBook.title = data.title
        }

        //.....(Change ISBN)

        if (data.ISBN) {
            let uniqueISBN = await bookModel.findOne({ ISBN: data.ISBN })
            if (uniqueISBN) return res.status(400).send({ status: false, message: "ISBN already exists" });
            if (!(/^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/.test(data.ISBN))) return res.status(400).send({ status: false, message: "Invalid ISBN Number" })
            checkBook.ISBN = data.ISBN
        }

        //.....(Change Excerpt)

        if ("excerpt" in data) {
            if (!isValidvalue(data.excerpt)) return res.status(400).send({ status: false, message: "Invalid excerpt" })
            checkBook.excerpt = data.excerpt
        }

        //.....(Change Release Date)

        if (data.releasedAt) {
            let validateDate = /^\d{4}\-(0?[1-9]|1[012])\-(0?[1-9]|[12][0-9]|3[01])$/gm
            if (!validateDate.test(data.releasedAt)) {
                return res.status(400).send({ status: false, message: "date must be in format  YYYY-MM-DD!!!" })
            }
            checkBook.releasedAt = data.releasedAt
        }
        checkBook.save()

        //---------[Send response]

        return res.status(200).send({ status: true, message: 'Updated Book', data: checkBook })

    } catch (err) {
        return res.status(500).send({ status: false, message: err.message })
    }
}


// =================================[ Delete Books ]=================================

let deleteBook = async (req, res) => {
    try {
        let bookId = req.params.bookId

        //---------[Validations]

        if (!mongoose.Types.ObjectId.isValid(bookId)) return res.status(400).send({ status: false, message: 'Invalid UserId Format' })

        //---------[Check Book is Present in Db or not]

        let checkBook = await bookModel.findOne({ _id: bookId, isDeleted: false });
        if (!checkBook) return res.status(404).send({ status: false, message: "Book Not Found" });

        //---------[Authorisation]

        const token = req.userId
        if (token !== checkBook.userId.toString()) res.status(403).send({ status: false, message: "you cannot delete other users book" });

        //---------[Update Book]

        await bookModel.findOneAndUpdate(
            { _id: checkBook },
            { isDeleted: true, deletedAt: Date.now() },
            { new: true }
        );

        //---------[Response send]

        res.status(200).send({ status: true, message: 'This Book is deleted successfully' });

    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};


// =================================[ Exports ]=================================

module.exports.createBook = createBook
module.exports.getBook = getBook
module.exports.getBookById = getBookById
module.exports.updateBook = updateBook
module.exports.deleteBook = deleteBook