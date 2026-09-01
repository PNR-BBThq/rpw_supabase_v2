import loginHandler from '../backend/auth/login.js';
import registerHandler from '../backend/auth/register.js';
import forgotPasswordHandler from '../backend/auth/forgot-password.js';
import logSessionHandler from '../backend/auth/log-session.js';
import updateAccessHandler from '../backend/auth/update-access.js';

import analyticsHandler from '../backend/data/analytics.js';
import deleteEntryHandler from '../backend/data/delete-entry.js';
import kpiHandler from '../backend/data/kpi.js';
import masterTanamanHandler from '../backend/data/master-tanaman.js';
import myTasksHandler from '../backend/data/my-tasks.js';
import pendingHandler from '../backend/data/pending.js';
import redundantHandler from '../backend/data/redundant.js';
import singleRecordHandler from '../backend/data/single-record.js';
import submitBancianHandler from '../backend/data/submit-bancian.js';
import tumpuanHandler from '../backend/data/tumpuan.js';
import updateEntryHandler from '../backend/data/update-entry.js';
import verifyHandler from '../backend/data/verify.js';

import pdfExportHandler from '../backend/export/pdf.js';
import gdriveUploadHandler from '../backend/gdrive/upload.js';

import usersDeleteHandler from '../backend/users/delete.js';
import usersListHandler from '../backend/users/list.js';
import usersUpdateHandler from '../backend/users/update.js';

// Pastikan laluan Supabase Client menggunakan direktori backend
import { handleOptions } from '../backend/supabase-client.js';

const routes = {
  '/api/auth/login': loginHandler,
  '/api/auth/register': registerHandler,
  '/api/auth/forgot-password': forgotPasswordHandler,
  '/api/auth/log-session': logSessionHandler,
  '/api/auth/update-access': updateAccessHandler,

  '/api/data/analytics': analyticsHandler,
  '/api/data/delete-entry': deleteEntryHandler,
  '/api/data/kpi': kpiHandler,
  '/api/data/master-tanaman': masterTanamanHandler,
  '/api/data/my-tasks': myTasksHandler,
  '/api/data/pending': pendingHandler,
  '/api/data/redundant': redundantHandler,
  '/api/data/single-record': singleRecordHandler,
  '/api/data/submit-bancian': submitBancianHandler,
  '/api/data/tumpuan': tumpuanHandler,
  '/api/data/update-entry': updateEntryHandler,
  '/api/data/verify': verifyHandler,

  '/api/export/pdf': pdfExportHandler,
  '/api/gdrive/upload': gdriveUploadHandler,

  '/api/users/delete': usersDeleteHandler,
  '/api/users/list': usersListHandler,
  '/api/users/update': usersUpdateHandler
};

export default async function handler(req, res) {
  // CORS Preflight Handler (Selesaikan ralat CORS jika dipanggil dari luar)
  if (handleOptions(req, res)) return;

  // Dapatkan laluan (pathname) daripada URL
  let pathname = req.url.split('?')[0];
  
  // Vercel kekadang membuang awalan /api pada certain rewrites
  if (!pathname.startsWith('/api')) {
     pathname = '/api' + pathname;
  }

  // Cari handler yang sepadan
  const routeHandler = routes[pathname];

  if (routeHandler) {
    return routeHandler(req, res);
  }

  // Jika laluan tiada
  return res.status(404).json({ 
      success: false, 
      message: 'API Route Not Found (Vercel Monolithic Endpoint)',
      requestedPath: pathname
  });
}
