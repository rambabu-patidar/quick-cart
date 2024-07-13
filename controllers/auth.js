const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");

// this twillio sendGrid only supports the businesses and doesn't allow to create a account.
// const sendgridTransport = require("nodemailer-sendgrid-transport");

const User = require("../models/user");

// The pass field below is not my password for this email
// rather you should create a "app password" in google and use here.
// https://support.google.com/accounts/answer/185833

// here my email(from) is considerd as the shopping website email.

const YOUR_GMAIL = "yourgmail135@gmail.com";

const APP_PASSWORD = "YOUR_APP_PASSWORD";
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: {
		user: YOUR_GMAIL,
		pass: APP_PASSWORD,
	},
});

exports.getLogin = (req, res, next) => {
	let message = req.flash("error");
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	res.render("auth/login", {
		path: "/login",
		pageTitle: "Login",
		isAuthenticated: false,
		errorMessage: message,
		oldInput: { email: "", password: "" },
		validationErrors: [],
	});
};

exports.getSignup = (req, res, next) => {
	let message = req.flash("error");
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	res.render("auth/signup", {
		path: "/signup",
		pageTitle: "Signup",
		isAuthenticated: false,
		errorMessage: message,
		oldInput: {
			email: "",
			password: "",
			confirmPassword: "",
		},
		validationErrors: [],
	});
};

exports.postLogin = (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(422).render("auth/login", {
			path: "/login",
			pageTitle: "Login",
			isAuthenticated: false,
			errorMessage: errors.array()[0].msg,
			oldInput: {
				email,
				password,
			},
			validationErrors: errors.array(),
		});
	}

	// find the user with certain mail
	// compare its password
	// create a session for him/her

	let fetchedUser;
	User.findOne({ email: email })
		.then((user) => {
			fetchedUser = user;
			if (!fetchedUser) {
				return res.status(422).render("auth/login", {
					path: "/login",
					pageTitle: "Login",
					isAuthenticated: false,
					errorMessage: "Invalid email or password",
					oldInput: {
						email,
						password,
					},
					validationErrors: [{ path: "email" }],
				});
			}

			bcrypt.compare(password, fetchedUser.password).then((doMatch) => {
				if (doMatch) {
					req.session.isLoggedIn = true;
					req.session.user = user;
					return req.session.save((err) => {
						if (err) {
							console.log(err);
							req.flash(
								"error",
								"Sorry your session is not saved! Please try again"
							);
							return res.redirect("/login");
						}
						res.redirect("/");
					});
				}
				return res.status(422).render("auth/login", {
					path: "/login",
					pageTitle: "Login",
					isAuthenticated: false,
					errorMessage: "Invalid email or password",
					oldInput: {
						email,
						password,
					},
					validationErrors: [{ path: "password" }],
				});
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postSignup = (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;
	const confirmPassword = req.body.confirmPassword;

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		console.log(errors.array());
		return res.status(422).render("auth/signup", {
			path: "/signup",
			pageTitle: "Signup",
			isAuthenticated: false,
			errorMessage: errors.array()[0].msg,
			oldInput: {
				email,
				password,
				confirmPassword,
			},
			validationErrors: errors.array(),
		});
	}

	bcrypt
		.hash(password, 12)
		.then((encryptedPassword) => {
			const user = new User({
				email: email,
				password: encryptedPassword,
				cart: { items: [] },
			});

			return user.save();
		})
		.then(() => {
			// Here we send the mail.
			const mailOptions = {
				from: YOUR_GMAIL,
				to: email,
				subject: "Signup Successed!",
				html: "<h1>You successfully signed up!</h1>",
			};
			res.redirect("/login");
			return transporter.sendMail(mailOptions);
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postLogout = (req, res, next) => {
	req.session.destroy((err) => {
		if (err) {
			console.log(err);
		}
		res.redirect("/");
	});
};

exports.getReset = (req, res, next) => {
	let message = req.flash("error");
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	res.render("auth/reset", {
		path: "/reset",
		pageTitle: "Reset Password",
		isAuthenticated: false,
		errorMessage: message,
	});
};

exports.postReset = (req, res, next) => {
	// email that has been sent to reset password form
	const email = req.body.email;
	// create a token using crypto core package
	// find user in the database
	// if found set the two optional field i.e. resetToken and resetTokenExpiration
	// save the updated user
	// send him a mail with that token to updated password

	crypto.randomBytes(32, (err, buffer) => {
		if (err) {
			console.log(err);
			return res.redirect("/reset");
		}
		const token = buffer.toString("hex");
		User.findOne({ email: email })
			.then((user) => {
				if (!user) {
					req.flash("error", "No account with that email found!!");
					return res.redirect("/reset");
				}
				user.resetToken = token;
				user.resetTokenExpiration = Date.now() + 3600000;

				return user
					.save()
					.then((result) => {
						const mailOptions = {
							from: YOUR_GMAIL,
							to: email,
							subject: "Password Reset!",
							html: `
						<p>You requested the password reset</p>
						<p>click this <a href="http://localhost:3000/reset/${token}">link </a>to reset your password</p>
					`,
						};

						res.redirect("/");
						return transporter.sendMail(mailOptions);
					})
					.catch((err) => {
						const error = new Error(err);
						error.httpStatusCode = 500;
						return next(error);
					});
			})
			.catch((err) => {
				const error = new Error(err);
				error.httpStatusCode = 500;
				return next(error);
			});
	});
};

exports.getNewPassword = (req, res, next) => {
	// if the token we sent is the one we got in the url and a user exist for that token
	// if yes then only we will render this page.

	const token = req.params.token;
	User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
		.then((user) => {
			if (!user) {
				req.flash("error", "Unidentified token or token expired!");
				return res.redirect("/login");
			}
			let message = req.flash("error");
			if (message.length > 0) {
				message = message[0];
			} else {
				message = null;
			}
			res.render("auth/new-password", {
				path: "/new-password",
				pageTitle: "New Password",
				isAuthenticated: false,
				errorMessage: message,
				userId: user._id.toString(),
				passwordToken: token,
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postNewPassword = (req, res, next) => {
	const newPassword = req.body.password;
	const userId = req.body.userId;
	const passwordToken = req.body.passwordToken;

	// we need the passwordToken here also because user may change the token and send post request which may update the passowrd of other user

	/* steps
	
	1. get the user using passwordToken, userId and tokenExpiration fields
	2. if you don't get user return with some error
	3. if found you encrypt the password using bcrypt package
	4. now you update the password , set resetToken to undefined and resetTokenExpiration to undefined also
	5. save the user with new password 
	6. redirect to login
	*/

	let resetUser;
	User.findOne({
		resetToken: passwordToken,
		resetTokenExpiration: { $gt: Date.now() },
		_id: userId,
	})
		.then((user) => {
			if (!user) {
				req.flash("error", "Unidentified Token or token expired!!");
				return res.redirect("/reset");
			}
			resetUser = user;
			return bcrypt
				.hash(newPassword, 12)
				.then((encryptedPassword) => {
					resetUser.password = encryptedPassword;
					resetUser.resetToken = undefined;
					resetUser.resetTokenExpiration = undefined;

					return resetUser.save();
				})
				.then((result) => {
					res.redirect("/login");
				})
				.catch((err) => {
					const error = new Error(err);
					error.httpStatusCode = 500;
					return next(error);
				});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};
