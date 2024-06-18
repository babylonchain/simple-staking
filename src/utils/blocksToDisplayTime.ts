import {
  add,
  differenceInCalendarDays,
  differenceInWeeks,
  formatDistanceStrict,
} from "date-fns";

const BLOCKS_PER_HOUR = 6;
const WEEKS_PRECISION = 5;

/**
 * Converts a number of blocks into days or weeks
 * Returns the time in days if the difference is less than 7 days
 * Otherwise, returns the time in weeks
 *
 * @param {number} blocks - The number of blocks to convert.
 * @returns {string} - The converted time in days or weeks.
 * Rounded to 5 weeks if the difference is greater than 7 days.
 *
 * Examples of usage:
 * blocksToDisplayTime(30000); // "29 weeks"
 * blocksToDisplayTime(1); // "1 day"
 * blocksToDisplayTime(200); // "2 days"
 */
export const blocksToDisplayTime = (blocks: number): string => {
  // If no blocks are provided, throw an error
  if (!blocks) throw new Error("No blocks provided");

  // Calculate the equivalent time in hours
  const hours = blocks / BLOCKS_PER_HOUR;

  // Calculate the start and end dates
  // get the timestamp now
  const startDate = new Date();
  const endDate = add(startDate, { hours });

  const dayDifference = differenceInCalendarDays(endDate, startDate);
  // If the difference is greater than or equal to 7 days, return the difference in weeks
  if (dayDifference >= 7) {
    // Calculate the difference in weeks
    const weeks = differenceInWeeks(endDate, startDate);
    const roundedWeeks = Math.round(weeks / WEEKS_PRECISION) * WEEKS_PRECISION;
    return `${roundedWeeks} weeks`;
  }

  // Otherwise, return the difference in days and round up to the nearest day
  return formatDistanceStrict(startDate, endDate, {
    unit: "day",
    roundingMethod: "ceil",
  });
};
