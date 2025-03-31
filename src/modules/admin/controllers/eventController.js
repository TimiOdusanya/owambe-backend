const eventService = require("../services/eventService");
const User = require("../../user/models/UserProfile.model")



exports.createEvent = async (req, res) => {
  try {
    const userId  = req.user._id;

    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
      return res
        .status(400)
        .json({ message: "Invalid organizerId. User not found." });
    }
    

     const eventData = {
       ...req.body,
       organizerId: userId,
     };

     const event = await eventService.createEvent(eventData);
     res.status(201).json(event);
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createMultipleEvents = async (req, res) => {
  try {

    const userId = req.user._id;
     const userExists = await User.exists({ _id: userId });
     if (!userExists) {
       return res
         .status(400)
         .json({ message: "Invalid organizerId. User not found." });
     }

   const eventsData = req.body.map((event) => ({
     ...event,
     organizerId: userId,
   }));

   const events = await eventService.createMultipleEvents(eventsData);
   res.status(201).json(events);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getEvent = async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllEvents = async (req, res) => {
  try {
    const { limit = 10, skip = 0 } = req.query;
    const userId = req.user._id;

    const events = await eventService.getAllEvents(
      userId,
      parseInt(limit),
      parseInt(skip)
    );

    res.json(events);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.updateEvent = async (req, res) => {
  try {
    const event = await eventService.updateEvent(req.params.id, req.body);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteEvent = async (req, res) => {
  try {
    const event = await eventService.deleteEvent(req.params.id);
    if (!event) return res.status(404).json({ message: "Event not found" });
    res.json({ message: "Event deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMultipleEvents = async (req, res) => {
  try {
    const { eventIds } = req.body;
    await eventService.deleteMultipleEvents(eventIds);
    res.json({ message: "Events deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
