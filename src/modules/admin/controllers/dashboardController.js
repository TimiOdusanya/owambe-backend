const dashboardService = require("../services/dashboardService");

exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const stats = await dashboardService.getDashboardStats(userId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.getRecentEvents = async (req, res) => {
  try {
    const userId = req.user._id;
    const { date, status, limit } = req.query;
    
    const filters = {};
    if (date) filters.date = date;
    if (status) filters.status = status;
    if (limit) filters.limit = limit;
    
    const events = await dashboardService.getRecentEvents(userId, filters);
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.getAnalyticsData = async (req, res) => {
  try {
    const userId = req.user._id;
    const analyticsData = await dashboardService.getAnalyticsData(userId);
    
    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};
