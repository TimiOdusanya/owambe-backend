const Event = require("../models/Event");
const guestService = require("../services/guestService");

exports.createGuest = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    const guestData = { ...req.body, eventId };
    const guest = await guestService.createGuest(guestData);
    res.status(201).json(guest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.createMultipleGuests = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const guestsData = req.body.map((guest) => ({ ...guest, eventId }));
    const guests = await guestService.createMultipleGuests(guestsData);
    res.status(201).json({ success: true, guests });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



exports.getGuest = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const guest = await guestService.getGuestById(eventId, guestId);
    if (!guest) return res.status(404).json({ message: "Guest not found" });
    res.json(guest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllGuests = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedSkip = parseInt(skip);

    const {guests, totalCount} = await guestService.getAllGuests(
      eventId,
      parsedLimit, parsedSkip
    );

    res.json({
      guests,
      totalCount,
      currentPage: Math.floor(parsedSkip / parsedLimit) + 1,
      totalPages: Math.ceil(totalCount / parsedLimit),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateGuest = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const guest = await guestService.updateGuest(eventId, guestId, req.body);
    if (!guest) return res.status(404).json({ message: "Guest not found" });
    res.json(guest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteGuest = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const guest = await guestService.deleteGuest(eventId, guestId);
    if (!guest) return res.status(404).json({ message: "Guest not found" });
    res.json({ message: "Guest deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMultipleGuests = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestIds } = req.body;
    await guestService.deleteMultipleGuests(eventId, guestIds);
    res.json({ message: "Guests deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.sendInvite = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const guest = await guestService.sendInviteToGuest(eventId, guestId);
    res.json(guest);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.sendInvitesToMultiple = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestIds } = req.body;
    const guests = await guestService.sendInvitesToMultipleGuests(
      eventId,
      guestIds
    );
    res.json(guests);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.sendInvitesToAll = async (req, res) => {
  try {
    const { eventId } = req.params;
    const guests = await guestService.sendInvitesToAllGuests(eventId);
    res.json(guests);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
