/* Single edit point for the footer and /safety FDA line.
 *
 * Leave PUREBARIC_FDA_DISCLAIMER_LINE as an empty string until Matthew's
 * approved wording is in. When it is, set the string to that exact sentence.
 * Pages mount it at [data-fda-line]. An empty string shows nothing; do not
 * ship placeholder text.
 *
 * Documented in DECISIONS.md (2026-11-25).
 */
(function (root) {
  root.PUREBARIC_FDA_DISCLAIMER_LINE = "";
  function apply() {
    var t = root.PUREBARIC_FDA_DISCLAIMER_LINE;
    if (!t) return;
    var nodes = (root.document && root.document.querySelectorAll)
      ? root.document.querySelectorAll("[data-fda-line]")
      : [];
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = t;
      nodes[i].hidden = false;
    }
  }
  if (root.document && root.document.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})(typeof window !== "undefined" ? window : this);
