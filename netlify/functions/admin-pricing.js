const { getPricing, setPricing, getBusinessPricing, setBusinessPricing, getPaymentLinks, setPaymentLinks } = require("./_lib/storage");
const { requireAuth, parseBody, json } = require("./_lib/admin");

exports.handler = async (event, context) => {
  const authErr = await requireAuth(event, context);
  if (authErr) return authErr;

  const method = event.httpMethod;
  try {
    if (method === "GET") {
      const [months, business, links] = await Promise.all([getPricing(), getBusinessPricing(), getPaymentLinks()]);
      return json(200, { months, business, links });
    }

    if (method === "PUT" || method === "POST") {
      const body = parseBody(event);
      // Accept { months: {1:..,..12:..} } or a flat { "1":.., "12":.. }.
      const months = body.months || (body.business ? null : body);
      const saved = months ? await setPricing(months) : await getPricing();
      const business = body.business ? await setBusinessPricing(body.business) : await getBusinessPricing();
      const links = body.links ? await setPaymentLinks(body.links) : await getPaymentLinks();
      return json(200, { months: saved, business, links });
    }

    return json(405, { error: "method_not_allowed" });
  } catch (err) {
    console.error("admin-pricing error", err);
    return json(500, { error: err.message || "internal_error", stack: err.stack });
  }
};
