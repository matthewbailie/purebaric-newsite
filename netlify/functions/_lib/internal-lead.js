// TEST and internal entries are excluded from real-lead counts and from every
// analytics send. Internal = the browser flag (?internal=1 → pb_internal, sent
// as pb_internal=1 with the form), a name with the word "test", an email whose
// local part has a "test" token, or the owner's own address (any gmail dot/+tag
// form). Mirrors isInternalLead() in /pb-metrics.js.
function isInternalLead({ name = "", firstName = "", lastName = "", email = "", flag = "" } = {}) {
  if (String(flag) === "1") return true;
  const fullName = [name, firstName, lastName].filter(Boolean).join(" ");
  if (/\btest\b/i.test(fullName)) return true;
  const e = String(email || "").trim().toLowerCase();
  if (!e) return false;
  const [local, domain] = e.split("@");
  if (domain === "gmail.com" && local.split("+")[0].replace(/\./g, "") === "matthewbailie") return true;
  return /(^|[._+\-])test([._+\-]|\d|$)/.test(local || "");
}

module.exports = { isInternalLead };
