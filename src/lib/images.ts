import type { StaticImageData } from "next/image";
import marcheAbidjan from "../../public/images/marche-abidjan.jpg";
import tissusAbidjan from "../../public/images/tissus-abidjan.jpg";
import stoneTown from "../../public/images/stone-town.jpg";
import dakar from "../../public/images/dakar.jpg";
import addisAbeba from "../../public/images/addis-abeba.jpg";
import cap from "../../public/images/cap.jpg";
import madagascar from "../../public/images/madagascar.jpg";
import lagosPortrait from "../../public/images/lagos-portrait.jpg";
import ghanaPortrait from "../../public/images/ghana-portrait.jpg";
import tuteurSourire from "../../public/images/tuteur-sourire.jpg";
import tuteurBarbe from "../../public/images/tuteur-barbe.jpg";
import eleveLaptop from "../../public/images/eleve-laptop.jpg";
import eleveVisio from "../../public/images/eleve-visio.jpg";

// Illustration photos (Unsplash licence, see public/images/CREDITS.md).
// They decorate the site and never stand for a real tutor or student.

export type Photo = { src: StaticImageData; alt: string };

export const PHOTOS = {
  marche: { src: marcheAbidjan, alt: "Femmes en pagne au marché d'Adjamé, à Abidjan" },
  tissus: { src: tissusAbidjan, alt: "Rouleaux de pagnes wax aux motifs colorés" },
  stoneTown: { src: stoneTown, alt: "Rue animée de Stone Town, à Zanzibar" },
  dakar: { src: dakar, alt: "Vue sur Dakar et l'océan Atlantique" },
  addis: { src: addisAbeba, alt: "Immeubles d'Addis-Abeba, en Éthiopie" },
  cap: { src: cap, alt: "Vue aérienne du Cap, en Afrique du Sud" },
  madagascar: { src: madagascar, alt: "L'allée des baobabs, à Madagascar" },
  portraitLagos: { src: lagosPortrait, alt: "Jeune femme souriante portant un foulard coloré" },
  portraitGhana: { src: ghanaPortrait, alt: "Femme de profil avec un foulard aux motifs kente" },
  portraitRue: { src: tuteurSourire, alt: "Jeune homme souriant, bras croisés, dans une rue" },
  portraitJoie: { src: tuteurBarbe, alt: "Homme qui rit, poings serrés de joie" },
  eleve: { src: eleveLaptop, alt: "Élève souriante devant son ordinateur, un carnet à la main" },
  visio: { src: eleveVisio, alt: "Élève qui suit un cours en visio sur son ordinateur" },
} satisfies Record<string, Photo>;

export const REGION_PHOTOS: Record<string, Photo> = {
  "Afrique de l'Ouest": PHOTOS.marche,
  "Afrique centrale": PHOTOS.tissus,
  "Afrique de l'Est": PHOTOS.stoneTown,
  "Afrique australe": PHOTOS.cap,
  "Corne de l'Afrique": PHOTOS.addis,
  "Océan Indien": PHOTOS.madagascar,
};

export function regionPhoto(region: string): Photo {
  return REGION_PHOTOS[region] ?? PHOTOS.tissus;
}
