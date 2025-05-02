const { sendEmail } = require("../../../utils/otpUtils");


exports.inviteGuest = async ({ event, guest }) => {
  const { _id: guestId, name: guestName, email } = guest;
  const { _id: eventId, title: eventName, venue, startDateTime, timeZone } = event;

  const eventDate = new Date(startDateTime).toLocaleString("en-US", {
    timeZone,
    dateStyle: "full",
    timeStyle: "short",
  });

  const buttonLink = `https://owambe-dashboard.vercel.app/${eventId}?guestId=${guestId}`;

  await sendEmail(email, "eventInvite", {
    subject: `You're Invited to ${eventName}! 🎉`,
    body: `Hi ${guestName}, you’re invited to <strong>${eventName}</strong>!<br/>
           <strong>Venue:</strong> ${venue}<br/>
           <strong>Date & Time:</strong> ${eventDate} (${timeZone})<br/><br/>
           Click the button below to claim your invite.`,
    buttonText: "Claim Your Invite",
    buttonLink,
  });
};

  