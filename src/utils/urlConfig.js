const isProduction = process.env.NODE_ENV === "production";

const DEFAULT_FRONTEND_URL_PROD = "https://owambe-website.vercel.app";
const DEFAULT_FRONTEND_URL_DEV = "http://localhost:5174";
const DEFAULT_DASHBOARD_URL_PROD = "https://owambe-dashboard.vercel.app";
const DEFAULT_DASHBOARD_URL_DEV = "http://localhost:5173";

const normalizeUrl = (url) => {
  if (!url) return null;
  return url.replace(/\/+$/, "");
};

const pickEnvUrl = (...candidates) => {
  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate);
    if (normalized) return normalized;
  }
  return null;
};

const getDashboardUrl = () => {
  return (
    pickEnvUrl(
      isProduction ? process.env.DASHBOARD_URL_PROD : process.env.DASHBOARD_URL_DEV,
      process.env.DASHBOARD_URL,
      isProduction ? DEFAULT_DASHBOARD_URL_PROD : DEFAULT_DASHBOARD_URL_DEV
    ) || DEFAULT_DASHBOARD_URL_DEV
  );
};

const getFrontendUrl = () => {
  return (
    pickEnvUrl(
      isProduction ? process.env.FRONTEND_URL_PROD : process.env.FRONTEND_URL_DEV,
      process.env.FRONTEND_URL,
      isProduction ? DEFAULT_FRONTEND_URL_PROD : DEFAULT_FRONTEND_URL_DEV
    ) || DEFAULT_FRONTEND_URL_DEV
  );
};

/**
 * True when a stored link was built without a configured frontend base (e.g. "null/eventId").
 */
const isBrokenFrontendUrl = (url) => {
  if (!url || typeof url !== "string") return true;
  const trimmed = url.trim();
  return (
    /^null\//i.test(trimmed) ||
    /^undefined\//i.test(trimmed) ||
    trimmed === "null" ||
    trimmed === "undefined"
  );
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
  isBrokenFrontendUrl,
};

