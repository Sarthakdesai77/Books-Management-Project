//=================[Imports]==============

const userModel = require('../models/userModel')
const jwt = require("jsonwebtoken")

//=================[Validation Function]==============

//----(Title Validation)

const isvalid = function (title) {
    return ["Mr", "Mrs", "Miss"].indexOf(title) === -1
}
//----(Value Validation)

const isValidvalue = function (value) {
    if (typeof value === 'undefined' || value === null) return false
    if (typeof value === 'string' && value.trim().length === 0) return false
    return true;
}


// ====================================[ Create User ]=================================

let createUser = async (req, res) => {
    try {
        let body = req.body
        
        if (Object.keys(body).length === 0) return res.status(400).send({ status: false, message: "Please Provide data to create a new user." })

        let { name, email, phone, password, title, address } = body

        //---------[Required fields]
        
        if (!title) return res.status(400).send({ status: false, message: "title is required" })

        if (!name) return res.status(400).send({ status: false, message: "Name is required" })

        if (!email) return res.status(400).send({ status: false, message: "email is required" })

        if (!phone) return res.status(400).send({ status: false, message: "Phone is required" })

        if (!password) return res.status(400).send({ status: false, message: "password is required" })

        //----------[Check Validations]

        if (isvalid(title)) return res.status(400).send({ status: false, message: "title must be Mr , Miss , Mrs" })

        //---(Name)

        if (typeof name !== "string") return res.status(400).send({ status: false, message: "Name is Invalid" })
        if (!(/^[A-Za-z_ ]+$/.test(name))) return res.status(400).send({ status: false, message: "Name is Invalid" })

        //---(Phone)

        if (!(/^[6-9]\d{9}$/.test(phone))) return res.status(400).send({ status: false, message: "Phone Number Is Invalid" })

        //---(Email)

        if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) return res.status(400).send({ status: false, message: `Email should be a valid email address` });

        //---(Password)

        if (!(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,15}$/.test(password))) {
            return res.status(400).send({ status: false, message: `password shoud be 8 to 15 characters which contain at least one numeric digit, one uppercase and one lowercase letter` })
        }

        //---(Address)

        if (address) {
            if (typeof address !== 'object' || Array.isArray(address) || Object.keys(address).length == 0) {
                return res.status(400).send({ status: false, message: "address should be of type object and if address is given it should not be empty" })
            }

            let street = address.street
            let city = address.city
            let pincode = address.pincode

            if ("street" in req.body.address) {
                if (!isValidvalue(street)) return res.send({ status: false, message: 'please enter street' })
                let validateStreet = /^[a-zA-Z0-9]/
                if (!validateStreet.test(street)) {
                    return res.status(400).send({ status: false, message: "enter valid street name" })
                }
            }

            if ("city" in req.body.address) {
                if (!isValidvalue(city)) return res.send({ status: false, message: 'please enter street' })
                let validateCity = /^[a-zA-z',.\s-]{1,25}$/gm
                if (!validateCity.test(city)) {
                    return res.status(400).send({ status: false, message: "enter valid city name" })
                }
            }

            if ("pincode" in req.body.address) {
                if (!isValidvalue(pincode)) return res.send({ status: false, message: 'please enter street' })
                let validatePincode = /^[1-9]{1}[0-9]{2}\s{0,1}[0-9]{3}$/gm  
                //must not start with 0,6 digits and spaces
                if (!validatePincode.test(pincode)) {
                    return res.status(400).send({ status: false, message: "enter valid pincode" })
                }
            }
        }

        //---------[Find Email]

        let checkEmail = await userModel.findOne({ email })
        if (checkEmail) return res.status(400).send({ status: false, message: "Email is already used" })

        //---------[Find Phone]

        let checkPhone = await userModel.findOne({ phone })
        if (checkPhone) return res.status(400).send({ status: false, message: "Phone is already used" })

        //----------[create]

        const savedData = await userModel.create(body)
        
        const response = await userModel.findOne({_id:savedData._id}).select({__v:0})

        //---------[Response]

        res.status(201).send({ status: true, message: "Success", data: response })
    } catch (err) {
        res.status(500).send({ status: false, message: err.message })
    }
}


// =================================[ Login User ]=================================

let loginUser = async function (req, res) {
    try {
        let body = req.body

        if (Object.keys(body).length === 0) return res.status(400).send({ status: false, message: "please provide body to login" })

        let { email, password } = body

        //---------[Required fields]

        if (!email) return res.status(400).send({ status: false, message: "email is required" })

        if (!password) return res.status(400).send({ status: false, message: "password is required" })

        //---------[Validation]

        if (!(/^\w+([\.-]?\w+)@\w+([\.-]?\w+)(\.\w{2,3})+$/.test(email))) return res.status(400).send({ status: false, message: "email Id is invalid" })

        //---------[Find Email]

        let Email = await userModel.findOne({ email })
        if (!Email) return res.status(401).send({ status: false, message: "email is not correct" })

        //---------[Check Password]

        let user = await userModel.findOne({ email: email, password: password })
        if (!user) return res.status(401).send({ status: false, message: "password is not corerct" });

        // ---------[Create Token JWT]-------------

        let token = jwt.sign(
            {
                userId: user._id.toString(),
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 10 * 60 * 60
            },
            "project-3"
        )

        res.setHeader("x-api-key", token);

        //---------[Response]

        res.status(200).send({ status: true, message: "Success", data: { token: token } });
    } catch (err) {
        res.status(500).send({ status: false, message: err.message });
    }
};

// =================================[ Exports ]=================================

module.exports.createUser = createUser
module.exports.loginUser = loginUser