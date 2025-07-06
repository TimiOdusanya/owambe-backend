const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const { authenticate } = require("../../../middleware/authMiddleware");

// Get dashboard statistics (total events, active events, total attendees with percentage increases)
router.get("/stats", authenticate, dashboardController.getDashboardStats);

// Get recent events with optional filtering by date and status
router.get("/recent-events", authenticate, dashboardController.getRecentEvents);

// Get analytics data for bar chart (events by month for current and previous year)
router.get("/analytics", authenticate, dashboardController.getAnalyticsData);

module.exports = router;
