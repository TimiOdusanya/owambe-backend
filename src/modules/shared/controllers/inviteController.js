const inviteService = require("../services/inviteService");
const Guest = require("../../admin/models/Guest");
const Event = require("../../admin/models/Event");


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

    const guest = await Guest.findOne({ _id: guestId, eventId });
    if (!guest) return res.status(404).json({ message: "Guest not found" });

    if (!guest.claimedInvite) {
      return res.status(403).json({ message: "Invite not claimed yet" });
    }

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json({
      guest,
      event: {
        title: event.title,
        venue: event.venue,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        timeZone: event.timeZone,
        description: event.description,
        tables: event.tables,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
