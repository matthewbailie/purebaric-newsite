// Scheduled weekly (see netlify.toml). Looks ahead a week and a half and sends ONE digest email, and
// one text to subscribed recipients, listing every running rental that ends in that window. Sends
// nothing when no rental is ending. Runs on Netlify, so it needs no one's computer to be on.
const { listRentals, listChambers, listMachines, getNotifications, getTwilioConfig } = require("./_lib/storage");
const { emailsForEvent, smsForEvent, smsNumbersForEvent } = require("./_lib/notifications");
const { rentalsEndingSoon, LOOKAHEAD_DAYS } = require("./_lib/rental-ending");
const { notifyAdminEndingSoon, notifyAdminEndingSoonSms } = require("./_lib/email");

// "Today" in Utah, not UTC.
const todayInUtah = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Denver" });

exports.handler = async () => {
  const today = todayInUtah();
  let count = 0;
  try {
    const list = rentalsEndingSoon(await listRentals(), today);
    count = list.length;
    if (!count) return { statusCode: 200, body: JSON.stringify({ today, count }) };

    const [chambers, machines, cfg, twilio] = await Promise.all([
      listChambers({ includeArchived: true }), listMachines({ includeArchived: true }), getNotifications(), getTwilioConfig(),
    ]);

    try {
      await notifyAdminEndingSoon(list, { to: emailsForEvent(cfg, "rental_ending"), today, days: LOOKAHEAD_DAYS, chambers, machines });
    } catch (err) {
      console.error("rental-ending email failed", err);
    }
    // The text is independent of the email: one failing never blocks the other.
    try {
      const r = await notifyAdminEndingSoonSms(list, {
        days: LOOKAHEAD_DAYS,
        gateways: smsForEvent(cfg, "rental_ending"),
        numbers: smsNumbersForEvent(cfg, "rental_ending"),
        twilio,
      });
      console.log("rental-ending sms", JSON.stringify(r));
    } catch (err) {
      console.error("rental-ending sms failed", err);
    }
  } catch (err) {
    console.error("rental-ending-notify error", err);
  }
  return { statusCode: 200, body: JSON.stringify({ today, count }) };
};
