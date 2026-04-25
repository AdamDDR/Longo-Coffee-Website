/**
 * Admin Guard Middleware
 * Ensures the logged-in user has the 'admin' or 'super_admin' role.
 * Dual behavior as specified:
 * - HTML routes (/admin/*): redirect 302 to auth
 * - API routes (/api/admin/*): 401 JSON response
 */
module.exports = function(req, res, next) {
  // Check if session exists and role is admin or super_admin
  const role = req.session && req.session.user && req.session.user.role;
  const isAdmin = role === 'admin' || role === 'super_admin';

  if (!isAdmin) {
    const isApiRequest = req.originalUrl.startsWith('/api/admin');
    
    if (isApiRequest) {
      return res.status(401).json({ error: 'Unauthorized: Admin access required' });
    } else {
      return res.redirect('/auth');
    }
  }

  // Force password change check
  if (req.session.user.force_password_change) {
    const isSettingsPage = req.originalUrl.startsWith('/admin/settings');
    const isPasswordApi = req.originalUrl === '/api/admin/settings/password';
    
    if (!isSettingsPage && !isPasswordApi) {
      const isApiRequest = req.originalUrl.startsWith('/api/admin');
      if (isApiRequest) {
        return res.status(403).json({ error: 'Password change required', forcePasswordChange: true });
      } else {
        return res.redirect('/admin/settings?force_password_change=true');
      }
    }
  }

  next();
};

/**
 * Super Admin Guard Middleware
 * Only allows super_admin role through.
 */
module.exports.superAdminGuard = function(req, res, next) {
  const role = req.session && req.session.user && req.session.user.role;
  
  if (role !== 'super_admin') {
    const isApiRequest = req.originalUrl.startsWith('/api/admin');
    if (isApiRequest) {
      return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
    } else {
      return res.redirect('/admin/dashboard');
    }
  }

  next();
};
