const { validationResult } = require("express-validator");
const mongoose = require("mongoose");

const Product = require("../models/product");

exports.getAddProduct = (req, res, next) => {
	// we can protect the routes like this but very cumbersom to add on every handlers.
	// if (!req.session?.isLoggedIn) {
	// 	return res.redirect("/login");
	// }

	res.render("admin/edit-product", {
		pageTitle: "Add Product",
		path: "/admin/add-product",
		editing: false,
		errorMessage: undefined,
		hasError: false,
		product: {
			title: "",
			imageUrl: "",
			price: "",
			description: "",
		},
		validationErrors: [],
	});
};

exports.postAddProduct = (req, res, next) => {
	const title = req.body.title;
	const image = req.file;
	const price = req.body.price;
	const description = req.body.description;

	if (!image) {
		return res.status(422).render("admin/edit-product", {
			pageTitle: "Add Product",
			path: "/admin/add-product",
			editing: false,
			errorMessage: "Uploaded file in not an Image!",
			hasError: true,
			product: {
				title,
				price,
				description,
			},
			validationErrors: [],
		});
	}
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		console.log(errors.array());
		return res.status(422).render("admin/edit-product", {
			pageTitle: "Add Product",
			path: "/admin/add-product",
			editing: false,
			errorMessage: errors.array()[0].msg,
			hasError: true,
			product: {
				title,
				price,
				description,
			},
			validationErrors: errors.array(),
		});
	}

	const imageUrl = image.path;

	const product = new Product({
		// _id: new mongoose.Types.ObjectId("668ebf1d259104f7fb6ac3a0"),
		title: title,
		price: price,
		description: description,
		imageUrl: imageUrl,
		userId: req.user,
	});
	product
		.save()
		.then((result) => {
			// console.log(result);
			console.log("Created Product");
			res.redirect("/admin/products");
		})
		.catch((err) => {
			// redirecting like this everywhere is not good as we have to write this every time
			// res.redirect("/500");

			// Express provides us a way that if we call next function passing a error into it
			// then it doesn't execute all the middleware below it and will try to find the
			// special type of middleware with four parameter in its handler(in which first one will be the error parameter) which we can define at a single
			// place.

			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error); // execution will go the special middleware.
		});
};

exports.getEditProduct = (req, res, next) => {
	const editMode = req.query.edit;
	if (!editMode) {
		return res.redirect("/");
	}
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			if (!product) {
				return res.redirect("/");
			}
			res.render("admin/edit-product", {
				pageTitle: "Edit Product",
				path: "/admin/edit-product",
				editing: editMode,
				product: product,
				errorMessage: undefined,
				hasError: false,
				validationErrors: [],
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postEditProduct = (req, res, next) => {
	const prodId = req.body.productId;
	const updatedTitle = req.body.title;
	const updatedPrice = req.body.price;
	const updatedImage = req.file;
	const updatedDesc = req.body.description;

	// for editing a product this is the mechanism we are using
	// if the user don't want to upload new file we keep the previous one
	// if the user upload a new file while editing it we replace previous with new one.

	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		console.log(errors.array());
		return res.status(422).render("admin/edit-product", {
			pageTitle: "Edit Product",
			path: "/admin/edit-product",
			editing: true,
			errorMessage: errors.array()[0].msg,
			hasError: true,
			product: {
				title: updatedTitle,
				price: updatedPrice,
				description: updatedDesc,
				_id: prodId,
			},
			validationErrors: errors.array(),
		});
	}

	Product.findById(prodId)
		.then((product) => {
			if (product.userId.toString() !== req.user._id.toString()) {
				return res.redirect("/");
			}

			product.title = updatedTitle;
			product.price = updatedPrice;
			product.description = updatedDesc;
			if (updatedImage) {
				product.imageUrl = updatedImage.path;
			}
			return product.save().then((result) => {
				console.log("UPDATED PRODUCT!");
				res.redirect("/admin/products");
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getProducts = (req, res, next) => {
	Product.find({ userId: req.user._id })
		// .select('title price -_id')
		// .populate('userId', 'name')
		.then((products) => {
			// console.log(products);
			res.render("admin/products", {
				prods: products,
				pageTitle: "Admin Products",
				path: "/admin/products",
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postDeleteProduct = (req, res, next) => {
	const prodId = req.body.productId;

	Product.findOne({ _id: prodId, userId: req.user._id })
		.then((product) => {
			if (!product) {
				return res.redirect("/");
			}

			return product.deleteOne().then((result) => {
				console.log("PRODUCT DESTROYED");
				res.redirect("/admin/products");
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
	// Product.deleteOne({ _id: prodId, userId: req.user._id })
	// 	.then(() => {
	// 		console.log("DESTROYED PRODUCT");
	// 		res.redirect("/admin/products");
	// 	})
	// 	.catch((err) => console.log(err));
};
