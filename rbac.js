const jwt = require('jsonwebtoken');
const pool = require('../db');
// RBAC: API authorization is enforced on the server, not just in the sidebar.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET must be set in hospital-backend/.env');
const canonicalRole = role => role === 'receptionist' ? 'app_user' : role;
const access = {
  'GET /api/specializations': ['db_admin','app_user','doctor','report_user'],
  'POST /api/specializations': ['db_admin'],
  'PUT /api/specializations/:id': ['db_admin'],
  'DELETE /api/specializations/:id': ['db_admin'],
  'GET /api/doctors': ['db_admin','app_user','doctor','report_user'],
  'POST /api/doctors': ['db_admin'],
  'PUT /api/doctors/:id': ['db_admin'],
  'DELETE /api/doctors/:id': ['db_admin'],
  'GET /api/schedules': ['db_admin','app_user','doctor','report_user'],
  'GET /api/analytics/doctors': ['db_admin','report_user'],
  'POST /api/appointments/book': ['db_admin','app_user'],
  'GET /api/appointments': ['db_admin','app_user','report_user'],
  'PUT /api/appointments/:id/status': ['db_admin','app_user'],
  'GET /api/patients': ['db_admin','app_user'],
  'POST /api/patients': ['db_admin','app_user'],
  'PUT /api/patients/:id': ['db_admin','app_user'],
  'DELETE /api/patients/:id': ['db_admin'],
  'GET /api/bills': ['db_admin','app_user','report_user'],
  'PUT /api/bills/:id/pay': ['db_admin','app_user'],
  'GET /api/audit-logs': ['db_admin','report_user'],
  'GET /api/views/deleted-patients': ['db_admin'],
  'GET /api/views/deleted-doctors': ['db_admin'],
  'GET /api/ai/forecast': ['db_admin','report_user']
};
const enforceAccess = (req,res,next) => {
  if (req.path === '/health' || req.path === '/auth/login' || req.path === '/auth/register') return next();
  const matchPath = req.path.replace(/\/\d+(?=\/|$)/g, '/:id');
  const allowed = access[`${req.method} /api${matchPath}`];
  if (!allowed) return res.status(404).json({success:false,message:'API route not available'});
  const auth = req.get('Authorization') || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({success:false,message:'Please sign in first'});
  let claims;
  try { claims = jwt.verify(auth.slice(7), JWT_SECRET, {algorithms:['HS256']}); }
  catch (_) { return res.status(401).json({success:false,message:'Session expired or invalid'}); }
  (async () => {
    const [users] = await pool.execute('SELECT id, username, role FROM users WHERE id = ?', [claims.id]);
    if (!users.length || users[0].username !== claims.username) return res.status(401).json({success:false,message:'Account not found'});
    req.staff = {id:users[0].id, username:users[0].username, role:canonicalRole(users[0].role)};
    if (!allowed.includes(req.staff.role)) return res.status(403).json({success:false,message:'Access denied for this staff role'});
    next();
  })().catch(err => {console.error('Authorization error:',err); res.status(500).json({success:false,message:'Authorization check failed'});});
};
module.exports = {enforceAccess};
