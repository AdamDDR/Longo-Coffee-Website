/**
 * Authentication Middleware
 * Checks if a user session exists. If not, returns 401 for APIs or redirects for HTML.
 */
module.exports = function(req, res, next) {
  if (!req.session.user) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    return res.redirect('/auth');
  }
  next();
};
