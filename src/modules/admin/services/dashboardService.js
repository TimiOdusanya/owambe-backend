const Event = require("../models/Event");
const Guest = require("../models/Guest");
const { eventStatus } = require("../../../utils/constantEnums");

// Helper function to calculate percentage increase
const calculatePercentageIncrease = (current, previous) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Helper function to get date range for previous period
const getPreviousPeriodRange = (currentStart, currentEnd) => {
  const duration = currentEnd.getTime() - currentStart.getTime();
  const previousEnd = new Date(currentStart.getTime() - 1);
  const previousStart = new Date(previousEnd.getTime() - duration);
  return { previousStart, previousEnd };
};

exports.getDashboardStats = async (userId) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  
  // Previous month range
  const { previousStart, previousEnd } = getPreviousPeriodRange(startOfMonth, endOfMonth);

  // Current month queries
  const [
    totalEventsCurrent,
    activeEventsCurrent,
    totalAttendeesCurrent
  ] = await Promise.all([
    // Total events in current month
    Event.countDocuments({
      organizerId: userId,
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }),
    
    // Active events (ongoing or future events)
    Event.countDocuments({
      organizerId: userId,
      startDateTime: { $gte: now }
    }),
    
    // Total attendees (guests with claimedInvite: true)
    Guest.countDocuments({
      claimedInvite: true,
      eventId: {
        $in: await Event.find({ organizerId: userId }).distinct('_id')
      }
    })
  ]);

  // Previous month queries
  const [
    totalEventsPrevious,
    activeEventsPrevious,
    totalAttendeesPrevious
  ] = await Promise.all([
    // Total events in previous month
    Event.countDocuments({
      organizerId: userId,
      createdAt: { $gte: previousStart, $lte: previousEnd }
    }),
    
    // Active events in previous month
    Event.countDocuments({
      organizerId: userId,
      startDateTime: { $gte: previousStart, $lt: previousEnd }
    }),
    
    // Total attendees in previous month (approximated)
    Guest.countDocuments({
      claimedInvite: true,
      eventId: {
        $in: await Event.find({ 
          organizerId: userId,
          createdAt: { $gte: previousStart, $lte: previousEnd }
        }).distinct('_id')
      }
    })
  ]);

  return {
    totalEvents: {
      current: totalEventsCurrent,
      previous: totalEventsPrevious,
      percentageIncrease: calculatePercentageIncrease(totalEventsCurrent, totalEventsPrevious)
    },
    activeEvents: {
      current: activeEventsCurrent,
      previous: activeEventsPrevious,
      percentageIncrease: calculatePercentageIncrease(activeEventsCurrent, activeEventsPrevious)
    },
    totalAttendees: {
      current: totalAttendeesCurrent,
      previous: totalAttendeesPrevious,
      percentageIncrease: calculatePercentageIncrease(totalAttendeesCurrent, totalAttendeesPrevious)
    }
  };
};

exports.getRecentEvents = async (userId, filters = {}) => {
  const { date, status, limit = 5 } = filters;
  
  let query = { organizerId: userId };
  
  // Add date filter
  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    query.createdAt = { $gte: startOfDay, $lte: endOfDay };
  }
  
  // Add status filter
  if (status) {
    query.status = status;
  }
  
  const events = await Event.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .populate('organizerId', 'name email');
    
  return events;
};

exports.getAnalyticsData = async (userId) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Calculate previous month and year
  let previousMonth, previousYear;
  if (currentMonth === 0) {
    // January - go to December of previous year
    previousMonth = 11;
    previousYear = currentYear - 1;
  } else {
    previousMonth = currentMonth - 1;
    previousYear = currentYear;
  }
  
  // Initialize data structure for all 12 months
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const analyticsData = monthNames.map((month, index) => ({
    month,
    currentMonth: 0,
    previousMonth: 0
  }));
  
  // Get current month data for all months
  const currentMonthEvents = await Event.aggregate([
    {
      $match: {
        organizerId: userId,
        createdAt: {
          $gte: new Date(currentYear, 0, 1),
          $lt: new Date(currentYear + 1, 0, 1)
        }
      }
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Get previous month data for all months
  const previousMonthEvents = await Event.aggregate([
    {
      $match: {
        organizerId: userId,
        createdAt: {
          $gte: new Date(previousYear, 0, 1),
          $lt: new Date(previousYear + 1, 0, 1)
        }
      }
    },
    {
      $group: {
        _id: { $month: "$createdAt" },
        count: { $sum: 1 }
      }
    }
  ]);
  
  // Populate current month data
  currentMonthEvents.forEach(item => {
    analyticsData[item._id - 1].currentMonth = item.count;
  });
  
  // Populate previous month data
  previousMonthEvents.forEach(item => {
    analyticsData[item._id - 1].previousMonth = item.count;
  });
  
  return analyticsData;
};
