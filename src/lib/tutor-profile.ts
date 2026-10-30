import type { TutorProfile } from "./db";

// Blank profile given to a new tutor until they fill it in and an admin approves it.
export function emptyTutorProfile(): TutorProfile {
  return {
    headline: "", about: "", hourlyRate: 15, yearsExperience: 0, specialties: [], availability: [], speaks: "",
    approved: false, languages: [], ratingSum: 0, ratingCount: 0, lessonCount: 0,
  };
}
