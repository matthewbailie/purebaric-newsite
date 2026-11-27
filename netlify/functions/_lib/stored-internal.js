// Read-only TEST/internal detection for already-stored booking (or waitlist) rows.
// Prefer the `internal` flag written at submit time. If that flag is missing
// (rows from before it existed), apply isInternalLead() to the stored name and
// email in memory only — never write the result back.
"use strict";

const { isInternalLead } = require("./lead-source");

function isStoredInternalLead(rec = {}) {
  if (rec.internal === true) return true;
  if (rec.internal === false) return false;
  return isInternalLead({
    name: rec.name || "",
    firstName: rec.firstName || "",
    lastName: rec.lastName || "",
    email: rec.email || "",
  });
}

module.exports = { isStoredInternalLead };
