const isProduction = process.env.NODE_ENV === "production";

const normalizeUrl = (url) => {
  if (!url) return null;
  return url.replace(/\/+$/, "");
};

const getDashboardUrl = () => {
  const url = isProduction
    ? process.env.DASHBOARD_URL_PROD
    : process.env.DASHBOARD_URL_DEV;
  return normalizeUrl(url);
};

const getFrontendUrl = () => {
  const url = isProduction
    ? process.env.FRONTEND_URL_PROD
    : process.env.FRONTEND_URL_DEV;
  return normalizeUrl(url);
};

const getBackendUrl = () => {
  if (process.env.BACKEND_URL) {
    return normalizeUrl(process.env.BACKEND_URL);
  }
  
  if (process.env.BACKEND_URL_DEV && process.env.BACKEND_URL_PROD) {
    const url = isProduction
      ? process.env.BACKEND_URL_PROD
      : process.env.BACKEND_URL_DEV;
    return normalizeUrl(url);
  }
  
  return null;
};

const getAllowedOrigins = () => {
  const origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://localhost:5174",
    "https://owambe-dashboard.vercel.app",
    "https://owambe-website.vercel.app",
  ];

  if (process.env.DASHBOARD_URL_DEV) origins.push(normalizeUrl(process.env.DASHBOARD_URL_DEV));
  if (process.env.DASHBOARD_URL_PROD) origins.push(normalizeUrl(process.env.DASHBOARD_URL_PROD));
  if (process.env.FRONTEND_URL_DEV) origins.push(normalizeUrl(process.env.FRONTEND_URL_DEV));
  if (process.env.FRONTEND_URL_PROD) origins.push(normalizeUrl(process.env.FRONTEND_URL_PROD));

  return origins.filter(Boolean);
};

module.exports = {
  getDashboardUrl,
  getFrontendUrl,
  getBackendUrl,
  getAllowedOrigins,
  isProduction,
};

