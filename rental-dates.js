(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PurebaricRentalDates = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

  function parseIsoDate(value) {
    const match = ISO_DATE.exec(String(value || ''));
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return { year, month, day };
  }

  function formatUtcDate(date) {
    return date.toISOString().slice(0, 10);
  }

  function addCalendarMonthsInclusive(isoDate, monthCount) {
    const start = parseIsoDate(isoDate);
    const months = Number(monthCount);
    if (!start || !Number.isInteger(months) || months < 1 || months > 120) return '';

    const targetMonthIndex = (start.month - 1) + months;
    const targetYear = start.year + Math.floor(targetMonthIndex / 12);
    const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastTargetDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
    const anniversaryDay = Math.min(start.day, lastTargetDay);
    const anniversary = new Date(Date.UTC(targetYear, targetMonth, anniversaryDay));
    anniversary.setUTCDate(anniversary.getUTCDate() - 1);
    return formatUtcDate(anniversary);
  }

  function matchingCalendarMonths(startDate, endDate, maxMonths) {
    const limit = Math.max(1, Math.min(120, Number(maxMonths) || 12));
    if (!parseIsoDate(startDate) || !parseIsoDate(endDate)) return null;
    for (let months = 1; months <= limit; months += 1) {
      if (addCalendarMonthsInclusive(startDate, months) === endDate) return months;
    }
    return null;
  }

  return { addCalendarMonthsInclusive, matchingCalendarMonths };
});
