import { EVENT_TYPES } from "../constants.js";
import { parseDateOnly, startOfTodayUTC } from "./dates.js";

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validates and sanitises an event payload.
 * existingDate: when updating, an unchanged date is allowed even if it is now close to today.
 */
export function validateEvent(body = {}, { existingDate = null } = {}) {
  const errors = {};
  const str = (v) => (typeof v === "string" ? v.trim() : "");

  const title = str(body.title);
  const type = str(body.type);
  const description = str(body.description);
  const thumbnail = str(body.thumbnail);
  const location = str(body.location);

  if (title.length < 5 || title.length > 80) errors.title = "Title must be between 5 and 80 characters.";
  if (!EVENT_TYPES.includes(type)) errors.type = "Please pick a valid event type.";
  if (description.length < 30 || description.length > 600)
    errors.description = "Description must be between 30 and 600 characters.";
  if (!isHttpUrl(thumbnail)) errors.thumbnail = "Please provide a valid http(s) image URL.";
  if (location.length < 3 || location.length > 120) errors.location = "Location must be between 3 and 120 characters.";

  const eventDate = parseDateOnly(body.eventDate);
  if (!eventDate) {
    errors.eventDate = "Please choose a valid event date.";
  } else {
    const unchanged = existingDate && eventDate.getTime() === new Date(existingDate).getTime();
    if (!unchanged && eventDate.getTime() <= startOfTodayUTC().getTime()) {
      errors.eventDate = "Events can only be planned for a future date.";
    }
  }

  return {
    errors,
    valid: Object.keys(errors).length === 0,
    value: { title, type, description, thumbnail, location, eventDate },
  };
}
