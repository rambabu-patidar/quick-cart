const path = require("path");
const crypto = require("crypto");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");

const errorController = require("./controllers/error");
const User = require("./models/user");

const MONGODB_URI =
	"mongodb+srv://patidarrambabu135:<Password>@learningnodecluster01.q631tqm.mongodb.net/shop?retryWrites=true&w=majority&appName=LearningNodeCluster01";

const app = express();
const store = new MongoDBStore({
	uri: MONGODB_URI,
	collection: "sessions",
});

const csrfProtection = csrf();

// configuration for multer to store file in disk
// by default it stores in memory as buffer.
const fileStorage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, "images");
	},
	filename: (req, file, cb) => {
		crypto.randomBytes(16, (err, buffer) => {
			if (err) {
				console.log(err);
				throw new Error("cann't create a token with crypto");
			}

			const token = buffer.toString("hex");
			cb(null, token + "-" + file.originalname);
		});
	},
});

// filters for the files uploaded by user
const fileFilter = (req, file, cb) => {
	// pass true to second argument of cb to accept the file
	// pass false to second argument of cb to not accept it

	if (
		file.mimetype === "image/jpg" ||
		file.mimetype === "image/jpeg" ||
		file.mimetype === "image/png"
	) {
		cb(null, true);
	} else {
		cb(null, false);
	}
};

app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

app.use(bodyParser.urlencoded({ extended: false }));
// the name "image" is the name field I setted in form so be sure
app.use(
	multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use(express.static(path.join(__dirname, "public")));
// we can serve the file statically
// we added /images route because static serving by express assumes that we are already standing in images folder
// but our url consisted /images as prefix.
app.use("/images", express.static(path.join(__dirname, "images")));

app.use(
	session({
		secret: "my secret",
		resave: false,
		saveUninitialized: false,
		store: store,
	})
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
	res.locals.isAuthenticated = req.session.isLoggedIn;
	res.locals.csrfToken = req.csrfToken();
	next();
});

app.use((req, res, next) => {
	if (!req.session.user) {
		return next();
	}
	User.findById(req.session.user._id)
		.then((user) => {
			// throw new Error("Dummy");
			if (!user) {
				return next();
			}
			req.user = user;
			next();
		})
		.catch((err) => {
			return next(new Error(err));
		});
});

// https://expressjs.com/en/5x/api.html#res.locals

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
	// res.status(error.httpStatusCode).render(...)
	// res.redirect("/500");
	// console.log(error);
	res.status(500).render("500", {
		pageTitle: "Error!",
		path: "/500",
		isAuthenticated: req.session.isLoggedIn,
	});
});

mongoose
	.connect(MONGODB_URI)
	.then((result) => {
		console.log("Connected");
		app.listen(3000);
	})
	.catch((err) => {
		console.log(err);
	});
