/**
 * URL configuration for guest site, organizer dashboard, and backend.
 *
 * Guest (invites, event QR):  FRONTEND_URL_*  → https://app.owambe.tech
 * Organizer dashboard:         DASHBOARD_URL_*   → https://owambe.tech
 *
 * Localhost defaults apply ONLY when running on a developer machine (not hosted).
 */

const isProduction = process.env.NODE_ENV === "production";

const GUEST_SITE_URL = "https://app.owambe.tech";
const DASHBOARD_SITE_URL = "https://owambe.tech";
const LOCAL_GUEST_URL = "http://localhost:5174";
const LOCAL_DASHBOARD_URL = "http://localhost:5173";

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

/** True when the process runs on a remote host (Easypanel, Render, etc.), not a dev laptop. */
const isHostedRuntime = () =>
  Boolean(
    process.env.RENDER === "true" ||
      process.env.RENDER ||
      /onrender\.com|easypanel\.host/i.test(process.env.BACKEND_URL || "") ||
      /onrender\.com|easypanel\.host/i.test(process.env.BACKEND_URL_DEV || "") ||
      /onrender\.com|easypanel\.host/i.test(process.env.BACKEND_URL_PROD || "")
  );

const isLocalRuntime = () => !isHostedRuntime();

const getDashboardUrl = () => {
  const fromEnv = pickEnvUrl(
    process.env.DASHBOARD_URL,
    isProduction ? process.env.DASHBOARD_URL_PROD : process.env.DASHBOARD_URL_DEV,
    process.env.DASHBOARD_URL_PROD,
    process.env.DASHBOARD_URL_DEV
  );
  if (fromEnv) return fromEnv;
  return isLocalRuntime() ? LOCAL_DASHBOARD_URL : DASHBOARD_SITE_URL;
};

/** Guest-facing site — used for invite links and event QR codes. */
const getFrontendUrl = () => {
  const fromEnv = pickEnvUrl(
    process.env.FRONTEND_URL,
    isProduction ? process.env.FRONTEND_URL_PROD : process.env.FRONTEND_URL_DEV,
    process.env.FRONTEND_URL_PROD,
    process.env.FRONTEND_URL_DEV
  );
  if (fromEnv) return fromEnv;
  return isLocalRuntime() ? LOCAL_GUEST_URL : GUEST_SITE_URL;
};

/**
 * True when a stored link is unusable (null/undefined base, localhost on hosted, or wrong site).
 */
const isBrokenFrontendUrl = (url) => {
  if (!url || typeof url !== "string") return true;
  const trimmed = url.trim();
  if (
    /^null\//i.test(trimmed) ||
    /^undefined\//i.test(trimmed) ||
    trimmed === "null" ||
    trimmed === "undefined"
  ) {
    return true;
  }
  // Hosted backends must not serve localhost links to real users
  if (!isLocalRuntime() && /localhost|127\.0\.0\.1/i.test(trimmed)) {
    return true;
  }
  // Event QR / invite links must use the guest site, not the organizer dashboard
  const dashboardBase = getDashboardUrl();
  if (dashboardBase && trimmed.startsWith(`${dashboardBase}/`)) {
    return true;
  }
  return false;
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
    GUEST_SITE_URL,
    DASHBOARD_SITE_URL,
  ];

  if (process.env.DASHBOARD_URL_DEV) origins.push(normalizeUrl(process.env.DASHBOARD_URL_DEV));
  if (process.env.DASHBOARD_URL_PROD) origins.push(normalizeUrl(process.env.DASHBOARD_URL_PROD));
  if (process.env.FRONTEND_URL_DEV) origins.push(normalizeUrl(process.env.FRONTEND_URL_DEV));
  if (process.env.FRONTEND_URL_PROD) origins.push(normalizeUrl(process.env.FRONTEND_URL_PROD));
  if (process.env.FRONTEND_URL) origins.push(normalizeUrl(process.env.FRONTEND_URL));
  if (process.env.DASHBOARD_URL) origins.push(normalizeUrl(process.env.DASHBOARD_URL));

  return [...new Set(origins.filter(Boolean))];
};

module.exports = {
  getDashboardUrl,
  getFrontendUrl,
  getBackendUrl,
  getAllowedOrigins,
  isProduction,
  isLocalRuntime,
  isHostedRuntime,
  isBrokenFrontendUrl,
};
