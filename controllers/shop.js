const path = require("path");
const fs = require("fs");

const PDFDocument = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/order");

const rootDir = require("../util/path");

exports.getProducts = (req, res, next) => {
	Product.find()
		.then((products) => {
			console.log(products);
			res.render("shop/product-list", {
				prods: products,
				pageTitle: "All Products",
				path: "/products",
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getProduct = (req, res, next) => {
	const prodId = req.params.productId;
	Product.findById(prodId)
		.then((product) => {
			res.render("shop/product-detail", {
				product: product,
				pageTitle: product.title,
				path: "/products",
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getIndex = (req, res, next) => {
	let message = req.flash("error");
	if (message.length > 0) {
		message = message[0];
	} else {
		message = null;
	}
	Product.find()
		.then((products) => {
			res.render("shop/index", {
				prods: products,
				pageTitle: "Shop",
				path: "/",
				errorMessage: message,
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getCart = (req, res, next) => {
	req.user
		.populate("cart.items.productId")
		.then((user) => {
			const products = user.cart.items;
			res.render("shop/cart", {
				path: "/cart",
				pageTitle: "Your Cart",
				products: products,
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postCart = (req, res, next) => {
	const prodId = req.body.productId;
	Product.findById(prodId)
		.then((product) => {
			return req.user.addToCart(product);
		})
		.then((result) => {
			console.log(result);
			res.redirect("/cart");
		});
};

exports.postCartDeleteProduct = (req, res, next) => {
	const prodId = req.body.productId;
	req.user
		.removeFromCart(prodId)
		.then((result) => {
			res.redirect("/cart");
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.postOrder = (req, res, next) => {
	req.user
		.populate("cart.items.productId")
		.then((user) => {
			const products = user.cart.items.map((i) => {
				return { quantity: i.quantity, product: { ...i.productId._doc } };
			});
			const order = new Order({
				user: {
					email: req.user.email,
					userId: req.user,
				},
				products: products,
			});
			return order.save();
		})
		.then((result) => {
			return req.user.clearCart();
		})
		.then(() => {
			res.redirect("/orders");
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getOrders = (req, res, next) => {
	Order.find({ "user.userId": req.user._id })
		.then((orders) => {
			res.render("shop/orders", {
				path: "/orders",
				pageTitle: "Your Orders",
				orders: orders,
			});
		})
		.catch((err) => {
			const error = new Error(err);
			error.httpStatusCode = 500;
			return next(error);
		});
};

exports.getInvoice = (req, res, next) => {
	const orderId = req.params.orderId;
	Order.findById(orderId)
		.then((order) => {
			if (!order) {
				return next(new Error("No order found!"));
			}

			if (order.user.userId.toString() !== req.user._id.toString()) {
				return next(new Error("Unauthorized Access!"));
			}

			const invoice = "invoice-" + orderId + ".pdf";
			const invoicePath = path.join(rootDir, "data", "invoices", invoice);

			// Create PDF document
			const pdfDoc = new PDFDocument();

			// Set headers
			res.setHeader("Content-Type", "application/pdf");
			res.setHeader("Content-Disposition", `inline; filename="${invoice}"`);

			// Handle errors during PDF creation
			pdfDoc.on("error", (err) => {
				console.error("PDF creation error:", err);
				return next(err);
			});

			// Pipe the PDF document to a file and the response
			pdfDoc.pipe(fs.createWriteStream(invoicePath)).on("error", (err) => {
				console.error("File write error:", err);
				return next(err);
			});

			pdfDoc.pipe(res).on("error", (err) => {
				console.error("Response pipe error:", err);
				return next(err);
			});

			// Write data to the PDF
			pdfDoc.fontSize(26).text("Invoice", {
				underline: true,
			});

			pdfDoc.text("_________________________");

			let totalPrice = 0;
			order.products.forEach((prod) => {
				totalPrice += prod.quantity * prod.product.price;
				pdfDoc
					.fontSize(14)
					.text(
						`${prod.product.title} - ${prod.quantity} x $${prod.product.price}`
					);
			});

			pdfDoc.text("_____________");
			pdfDoc.fontSize(20).text(`Total Price: $${totalPrice}`);
			pdfDoc.end(); // Finalize the PDF and end the streams
		})
		.catch((err) => {
			console.error("Order fetch error:", err);
			return next(err);
		});
};

// exports.getInvoice = (req, res, next) => {
// 	const orderId = req.params.orderId;
// 	Order.findById(orderId)
// 		.then((order) => {
// 			if (!order) {
// 				return next(new Error("No order found!"));
// 			}

// 			if (order.user.userId.toString() !== req.user._id.toString()) {
// 				return next(new Error("Unauthorized Access!"));
// 			}

// 			const invoice = "invoice-" + orderId + ".pdf";
// 			const invoicePath = path.join(rootDir, "data", "invoices", invoice);
// 			/*
// 			Reading file like this is not a good way because node first have to read whole file and store it in memory and then return
// 			it. For longer files this is not a good practise.
// 			so instead we should stream our response data.
// 			*/
// 			// fs.readFile(invoicePath, (err, data) => {
// 			// 	if (err) {
// 			// 		console.log("errror Here");
// 			// 		return next(err);
// 			// 	}
// 			// 	res.setHeader("Content-Type", "application/pdf"); // what type of content you are sending
// 			// 	res.setHeader("Content-Disposition", `inline; filename="${invoice}"`); // how content should be served online
// 			// 	res.send(data);
// 			// });

// 			// instead sendFile stream data to response and send it in chunck so that node has not to load all file content in memory
// 			// res.set({
// 			// 	"Content-Type": "application/pdf",
// 			// 	"Content-Disposition": `inline; filename="${invoice}"`,
// 			// });
// 			// res.sendFile(invoicePath, (err) => {
// 			// 	if (err) {
// 			// 		return next(err);
// 			// 	}
// 			// });

// 			// one more alternative manually handling {which happens under the hood in res.sendFile() method}
// 			// it create a read stream and pipes the data in res
// 			// hence this will also go in chuncks
// 			// const file = fs.createReadStream(invoicePath);
// 			// res.set({
// 			// 	"Content-Type": "application/pdf",
// 			// 	"Content-Disposition": `inline; filename="${invoice}"`,
// 			// });
// 			// file.pipe(res);

// 			// NOW I WANT TO CREATE THE PDF FOR OUR REAL ORDERS AND THEN SEND IT
// 			// USING pdfkit PACAKAGE FOR IT

// 			const pdfDoc = new PDFDocument();
// 			res.setHeader("Content-Type", "application/pdf");
// 			res.setHeader("Content-Disposition", `inline; filename="${invoice}"`);

// 			console.log("Here");
// 			pdfDoc.pipe(fs.createWriteStream(invoicePath)); // piping the data written on pdfDoc to store it in invoicePath file using creating a writable stream using fs
// 			pdfDoc.pipe(res); // piping the data on res

// 			// writing the data
// 			pdfDoc.fontSize(26).text("Invoice", {
// 				underline: true,
// 			});

// 			pdfDoc.text("____________________________________");

// 			let totalPrice = 0;
// 			order.products.forEach((prod) => {
// 				totalPrice += prod.quantity * prod.product.price;
// 				pdfDoc
// 					.fontSize(14)
// 					.text(
// 						`${prod.product.title} - ${prod.quantity} x $${prod.product.price}`
// 					);
// 			});
// 			pdf.text("__________________________");
// 			pdf.fontSize(20).text(`Total Price: $${totalPrice}`);
// 			pdfDoc.end(); // telling to stop piping the data streams.
// 		})
// 		.catch((err) => {
// 			return next(err);
// 		});
// };
