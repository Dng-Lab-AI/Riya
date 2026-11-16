import type { StaticImageData } from "next/image";
import marcheAbidjan from "../../public/images/marche-abidjan.jpg";
import tissusAbidjan from "../../public/images/tissus-abidjan.jpg";
import stoneTown from "../../public/images/stone-town.jpg";
import addisAbeba from "../../public/images/addis-abeba.jpg";
import cap from "../../public/images/cap.jpg";
import madagascar from "../../public/images/madagascar.jpg";
import lagosPortrait from "../../public/images/lagos-portrait.jpg";
import ghanaPortrait from "../../public/images/ghana-portrait.jpg";
import tuteurSourire from "../../public/images/tuteur-sourire.jpg";
import tuteurBarbe from "../../public/images/tuteur-barbe.jpg";
import eleveLaptop from "../../public/images/eleve-laptop.jpg";
import eleveVisio from "../../public/images/eleve-visio.jpg";
import goree from "../../public/images/goree.jpg";
import amboseli from "../../public/images/amboseli.jpg";

// Illustration photos (Unsplash licence, see public/images/CREDITS.md).
// They decorate the site and never stand for a real tutor or student.

export type Photo = { src: StaticImageData; alt: string };

export const PHOTOS = {
  marche: { src: marcheAbidjan, alt: "Women in wax-print wraps at Adjamé market, Abidjan" },
  tissus: { src: tissusAbidjan, alt: "Rolls of colourful wax-print fabric" },
  stoneTown: { src: stoneTown, alt: "Busy street in Stone Town, Zanzibar" },
  addis: { src: addisAbeba, alt: "Buildings in Addis Ababa, Ethiopia" },
  cap: { src: cap, alt: "Aerial view of Cape Town, South Africa" },
  madagascar: { src: madagascar, alt: "The Avenue of the Baobabs, Madagascar" },
  portraitLagos: { src: lagosPortrait, alt: "Smiling young woman wearing a colourful headscarf" },
  portraitGhana: { src: ghanaPortrait, alt: "Woman in profile wearing a kente-pattern headscarf" },
  portraitRue: { src: tuteurSourire, alt: "Smiling young man with crossed arms in a street" },
  portraitJoie: { src: tuteurBarbe, alt: "Man laughing, fists clenched with joy" },
  eleve: { src: eleveLaptop, alt: "Smiling student at her laptop, notebook in hand" },
  visio: { src: eleveVisio, alt: "Student following a video lesson on her laptop" },
  goree: { src: goree, alt: "Beach and colourful houses on Gorée Island, Senegal" },
  amboseli: { src: amboseli, alt: "Elephant in the savannah of Amboseli park, Kenya" },
} satisfies Record<string, Photo>;

export const REGION_PHOTOS: Record<string, Photo> = {
  "Afrique de l'Ouest": PHOTOS.goree,
  "Afrique centrale": PHOTOS.tissus,
  "Afrique de l'Est": PHOTOS.amboseli,
  "Afrique australe": PHOTOS.cap,
  "Corne de l'Afrique": PHOTOS.addis,
  "Océan Indien": PHOTOS.madagascar,
};

export function regionPhoto(region: string): Photo {
  return REGION_PHOTOS[region] ?? PHOTOS.tissus;
}
