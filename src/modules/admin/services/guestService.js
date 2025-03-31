const Guest = require("../models/Guest");

exports.createGuest = async (guestData) => {
  const guest = new Guest(guestData);
  await guest.save();
  return guest;
};

exports.createMultipleGuests = async (guestsData) => {
  return await Guest.insertMany(guestsData);
};


exports.getGuestById = async (eventId, guestId) => {
  return await Guest.findOne({ _id: guestId, eventId });
};

exports.getAllGuests = async (eventId, limit = 10, skip = 0) => {
   const [guests, totalCount] = await Promise.all([
    Guest.find({ eventId }).skip(skip).limit(limit),
    Guest.countDocuments({ eventId })
      .sort( {createdAt: -1}),
    ]);
  
    return { guests, totalCount };

};

exports.updateGuest = async (eventId, guestId, updateData) => {
  return await Guest.findOneAndUpdate({ _id: guestId, eventId }, updateData, {
    new: true,
  });
};

exports.deleteGuest = async (eventId, guestId) => {
  return await Guest.findOneAndDelete({ _id: guestId, eventId });
};

exports.deleteMultipleGuests = async (eventId, guestIds) => {
  return await Guest.deleteMany({ eventId, _id: { $in: guestIds } });
};

exports.sendInviteToGuest = async (eventId, guestId) => {
  const guest = await Guest.findOne({ eventId, _id: guestId });
  if (!guest) throw new Error("Guest not found");
  if (guest.inviteSent) throw new Error("Invite already sent");

  // Send invite logic (e.g., send email)
  // ...

  guest.inviteSent = true;
  await guest.save();
  return guest;
};

exports.sendInvitesToMultipleGuests = async (eventId, guestIds) => {
  const guests = await Guest.find({
    eventId,
    _id: { $in: guestIds },
    inviteSent: false,
  });
  for (const guest of guests) {
    // Send invite logic
    // ...
    guest.inviteSent = true;
    await guest.save();
  }
  return guests;
};

exports.sendInvitesToAllGuests = async (eventId) => {
  const guests = await Guest.find({ eventId, inviteSent: false });
  for (const guest of guests) {
    // Send invite logic
    // ...
    guest.inviteSent = true;
    await guest.save();
  }
  return guests;
};
