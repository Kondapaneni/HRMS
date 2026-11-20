// Interview rounds are chosen by Admin. A numbered round never automatically
// becomes the Final Round; that requires selecting the checkbox in Recruitment.
const NUMBERED_ROUND = /^([1-9][0-9]*)(st|nd|rd|th) Round Interview$/;

export function ordinal(number) {
  if (!Number.isSafeInteger(number) || number < 1) {
    throw new RangeError('Interview round must be a positive safe integer');
  }
  const lastTwo = number % 100;
  const suffix = lastTwo >= 11 && lastTwo <= 13
    ? 'th'
    : number % 10 === 1 ? 'st'
    : number % 10 === 2 ? 'nd'
    : number % 10 === 3 ? 'rd' : 'th';
  return `${number}${suffix}`;
}

export function nextNumberedInterviewRound(application) {
  const history = Array.isArray(application?.application_timeline)
    ? application.application_timeline.map(event => event?.status_change)
    : [];
  // Timeline matters when the most recent status is "Final Round Interview":
  // an Admin may still choose to continue with a numbered round instead.
  const statuses = [application?.status, ...history];
  let highest = 0;
  for (const status of statuses) {
    const match = typeof status === 'string' ? NUMBERED_ROUND.exec(status) : null;
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isSafeInteger(n) && n > highest &&
        `${ordinal(n)} Round Interview` === status) highest = n;
  }
  if (highest >= Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Maximum interview round number reached');
  }
  return `${ordinal(highest + 1)} Round Interview`;
}

export function selectedInterviewRound(nextNumberedRound, isFinalRound) {
  return isFinalRound ? 'Final Round Interview' : nextNumberedRound;
}
