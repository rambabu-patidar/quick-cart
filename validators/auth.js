const { check, body } = require("express-validator");

const User = require("../models/user");

exports.postLogin = [
	check("email")
		.isEmail()
		.withMessage("Please enter a valid email")
		.normalizeEmail(),
	body("password")
		.trim()
		.isLength({ min: 5 })
		.withMessage("Password should be at least 5 charater long")
		.isAlphanumeric()
		.withMessage(
			"Password should not contain any special character other than letter and numbers"
		),
];

exports.postSignup = [
	check("email")
		.isEmail()
		.withMessage("Please Enter a valid mail!")
		.normalizeEmail()
		.custom((value, { req }) => {
			//The custom validator require true or false as a return value
			// but if we will send  promise here then if that promise resolve successfully
			// then also it consider it as true
			// and if the promise gets rejected then it consider it as false and the message
			// of the rejected promise is now taken as error and added to 'req' object 'errors' property

			// now if we found that email we show error that user already exists
			return User.findOne({ email: value }).then((fetchedUser) => {
				if (fetchedUser) {
					return Promise.reject("User with this email already exists");
				}
			});
			// if (value === "test@test.com") {
			// 	throw new Error("This email is forbidden");
			// }
			// return true;
		}),
	body(
		"password",
		"Password must not contain other than alphnumeric values and should be at least length of 5"
	)
		.trim()
		.isLength({ min: 5 })
		.isAlphanumeric(),

	body("confirmPassword")
		.trim()
		.custom((value, { req }) => {
			if (value !== req.body.password) {
				throw new Error("Confirm password should match password!");
			}
			return true;
		}),
];
