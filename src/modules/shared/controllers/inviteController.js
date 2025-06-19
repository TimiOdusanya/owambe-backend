const inviteService = require("../services/inviteService");
const Guest = require("../../admin/models/Guest");
const Event = require("../../admin/models/Event");
const Organizer = require("../../user/models/UserProfile.model");
const foodService = require("../../admin/services/foodService");
const drinkService = require("../../admin/services/drinkService");
const mediaService = require("../../admin/services/mediaService");


exports.inviteGuest = async (req, res) => {
    try {
      const { eventId, guestId } = req.params;
  
      const event = await Event.findById(eventId);
      if (!event) return res.status(404).json({ message: "Event not found" });
  
      const guest = await Guest.findOne({ _id: guestId, eventId });
      if (!guest) return res.status(404).json({ message: "Guest not found for this event" });
  
      // Send email and update inviteSent
      await inviteService.inviteGuest({ event, guest });
  
      guest.inviteSent = true;
      await guest.save();
  
      res.json({ message: "Invitation sent successfully" });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };


exports.claimEvent = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const { email } = req.body;

    const guest = await Guest.findOne({ _id: guestId, eventId });
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    if (guest.email !== email) {
      return res.status(400).json({ message: "Email does not match guest record" });
    }

    if (guest.claimedInvite) {
        return res.status(400).json({ message: "Invite already claimed" });
      }

    guest.claimedInvite = true;
    await guest.save();

    res.json({ message: "Invite claimed successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.InviteClaimed = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;

    const guest = await Guest.findOne({ _id: guestId, eventId });
    if (!guest) return res.status(404).json({ message: "Guest not found" });


    res.json({ claimedInvite: guest.claimedInvite });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.getEventForOneGuest = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const { menu, media } = req.query;

    // 1. Fetch guest and validate
    const guest = await Guest.findOne({ _id: guestId, eventId }).lean();
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    if (!guest.claimedInvite) {
      return res.status(403).json({ message: "Invite not claimed yet" });
    }

    // 2. Fetch event and organizer in parallel
    const [event, organizer] = await Promise.all([
      Event.findById(eventId).lean(),
      // organizerId will be fetched from the event
      Event.findById(eventId).select("organizerId").then(event =>
        Organizer.findById(event?.organizerId).lean()
      )
    ]);

    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!organizer) return res.status(404).json({ message: "Organizer not found" });

    // 3. Build base event response
    const eventResponse = {
      title: event.title,
      venue: event.venue,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      timeZone: event.timeZone,
      description: event.description,
      event: event.media,
      tables: event.tables,
      organizerName: `${organizer.firstName} ${organizer.surname}`,
      organizerPhone: organizer.phoneNumber,
      organizerEmail: organizer.email,
    };

    // 4. Handle query-specific logic
    if (menu !== undefined) {
      const [foodResult, drinkResult] = await Promise.all([
        foodService.getAllFood(eventId, 1000, 0),
        drinkService.getAllDrinks(eventId, 1000, 0),
      ]);
      return res.json({
        guest,
        event: eventResponse,
        menu: {
          food: foodResult.food,
          drinks: drinkResult.drinks,
        },
      });
    }

    if (media !== undefined) {
      const mediaResult = await mediaService.getAllMedia(eventId, 1000, 0);
      return res.json({
        guest,
        event: eventResponse,
        media: mediaResult.media,
      });
    }

    // 5. Default response
    return res.json({
      guest,
      event: eventResponse,
    });
  } catch (err) {
    console.error("Error in getEventForOneGuest:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};