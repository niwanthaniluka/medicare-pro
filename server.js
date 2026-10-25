// MediCare Pro — modular backend entry point
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const {enforceAccess} = require('./middleware/rbac');
const app = express();
app.use(cors({origin:'*',methods:['GET','POST','PUT','DELETE'],allowedHeaders:['Content-Type','Authorization']}));
app.use(express.json({limit:'1mb'}));
// RBAC applies to all API modules, including nested routes.
app.use('/api', enforceAccess);
app.use('/api', require('./routes/member1_core_security'));
app.use('/api', require('./routes/member2_hospital_operations'));
app.use('/api', require('./routes/member3_billing_audit_archives'));
app.use('/api', require('./routes/member4_ai_analytics'));
app.use(express.static(path.join(__dirname, '../hospital-frontend')));
app.use(express.static(__dirname));
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 MediCare Pro Enterprise Backend: http://localhost:${PORT}`));
