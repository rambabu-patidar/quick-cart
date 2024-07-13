module.exports = (req, res, next) => {
	// if the user is not logged in redirect to login page
	if (!req.session?.isLoggedIn) {
		return res.redirect("/login");
	}
	// if it reaches user is logged in
	next();
};
