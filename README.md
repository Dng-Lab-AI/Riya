# Riya — apprendre les langues africaines

Plateforme de cours particuliers en ligne pour apprendre les langues africaines (swahili, wolof, yoruba, lingala, haoussa, amharique, zoulou…) avec des tuteurs natifs, en visio face à face directement sur le site. Elle s'adresse aux Africains, à la diaspora et à toute personne qui s'intéresse aux langues du continent.

## Démarrer

Prérequis : **Node.js 20.19 ou plus**.

```bash
npm install
```

Copiez `.env.example` vers `.env.local` et renseignez `MONGODB_URI` avec l'adresse de votre base (par exemple MongoDB Atlas, en terminant par `/riya`). Toutes les données passent par cette base : inscriptions, connexions (sessions), cours, messages, etc. Si `MONGODB_URI` manque, l'application affiche une erreur au lieu d'utiliser une autre base.

```bash
npm run dev
```

Pour travailler hors ligne, lancez `npm run db:local` dans un autre terminal (un MongoDB local, données dans `data/mongo`), puis mettez `MONGODB_URI=mongodb://127.0.0.1:27017/riya` dans `.env.local`.

Ouvrez http://localhost:3000. Au premier accès, la base `riya` est remplie avec des données de démonstration.

| Compte | E-mail | Mot de passe |
|---|---|---|
| Administrateur | `admin@riya.africa` | `admin1234` |
| Élève | `camille@exemple.fr` | `riya1234` |
| Tutrice (swahili) | `amani@riya.africa` | `riya1234` |
| Tutrice (wolof) | `fatou@riya.africa` | `riya1234` |

Pour repartir de zéro : `npm run db:reset`, puis redémarrez `npm run dev`.

## Tester la salle de classe vidéo

1. Ouvrez deux navigateurs différents (ou une fenêtre normale et une fenêtre privée).
2. Connectez-vous avec `camille@exemple.fr` dans l'un et `amani@riya.africa` dans l'autre.
3. Dans **Mes cours**, cliquez sur **Salle de classe** pour le cours prévu dans quelques minutes, des deux côtés.
4. Autorisez la caméra et le micro, puis cliquez sur **Rejoindre la classe**.

En développement, la salle est toujours ouverte pour les cours confirmés. En production, elle ouvre 15 minutes avant le début et ferme 30 minutes après la fin.

## Fonctionnalités

- **Catalogue de langues** (`/langues`) et fiches détaillées par langue.
- **Recherche de tuteurs** (`/tuteurs`) avec filtres (langue, prix, pays, disponibilité, spécialité) et tri.
- **Profil tuteur** : présentation, avis, favoris, message, réservation d'un créneau dans le fuseau horaire de l'élève.
- **Comptes** élève et tuteur, sessions sécurisées (cookie httpOnly, mots de passe hachés avec scrypt).
- **Tableau de bord** : demandes à accepter ou refuser, planning, annulation, clôture des cours, avis, revenus.
- **Salle de classe intégrée** (`/classe/[id]`) : visio face à face en WebRTC (pair à pair), micro et caméra activables, partage d'écran, discussion écrite pendant le cours, minuteur, reconnexion automatique, salle d'attente avec aperçu de la caméra.
- **Documents partagés en classe** : le tuteur dépose des PDF, images, audios, Word, PowerPoint, Excel ou textes (15 Mo maximum), stockés dans MongoDB (GridFS). L'élève les voit immédiatement, le tuteur peut en **présenter** un en grand aux deux participants, et chacun peut les télécharger. Seuls l'élève et le tuteur du cours y ont accès.
- **Notes du cours en direct** : le tuteur écrit les points clés, le vocabulaire (`mot = traduction`) et les devoirs pendant la séance, et l'élève les voit se mettre à jour.
- **Noter la séance** : en quittant la classe, ou depuis la page du cours, l'élève donne une note globale et quatre critères (clarté, interaction, contenu, rythme), avec ce qu'il a aimé et ce qui pourrait être amélioré. Ce retour est **privé** : le tuteur le retrouve dans son tableau de bord (moyennes et commentaires), il n'apparaît pas sur son profil public.
- **Résumé du cours** (`/cours/[id]`) : une fiche de révision pour l'élève, avec un résumé, les points à retenir, le vocabulaire et des exemples, la grammaire, des exercices et les devoirs. Elle est rédigée par IA (OpenAI / ChatGPT) à partir des notes du tuteur, de la discussion écrite et des documents (PDF, images et textes sont lus). La page regroupe aussi les notes, la discussion et les documents, et peut s'imprimer. Le résumé est généré automatiquement quand le tuteur clôture le cours, ou à la demande ; le tuteur peut le régénérer. Il nécessite `OPENAI_API_KEY`.
- **Classe interactive** : tableau blanc partagé (couleurs, gomme ; le tuteur efface), réactions animées (👏 ❤️ 😂 🔥…), main levée, quiz éclair lancés par le tuteur (bonne réponse révélée après coup, confettis quand c'est juste). Le tuteur peut faire proposer une question par l'IA.
- **Assistant IA en classe** : le tuteur l'active, et chacun accepte ou refuse que sa voix soit transcrite (accord retirable à tout moment). La transcription utilise la reconnaissance vocale du navigateur (Chrome ou Edge ; français, anglais, swahili, zoulou, amharique). Elle sert aux **sous-titres en direct** de l'autre participant et au résumé du cours. Les deux participants peuvent aussi poser des questions à l'IA pendant la séance. La transcription peut être supprimée depuis la page du cours.
- **Résumé enrichi** : en plus de la fiche de révision, un résumé de l'échange entre le tuteur et l'élève, les corrections (« dit → correct »), une partie « Pour mieux comprendre », les résultats des quiz et des **cartes mémoire** animées.
- **Identité visuelle propre** : en-tête flottant, cadres en arche (inspirés des portes de Stone Town), mosaïque de régions en photos, bandeau de salutations qui défile, cartes tuteurs en grille et filtres en barre horizontale. Les photos d'illustration (licence Unsplash) sont dans `public/images` et déclarées dans `src/lib/images.ts` ; crédits dans `public/images/CREDITS.md`.
- **Animations** sur tout le site (apparition au défilement, cartes, salle de classe). Elles respectent le réglage « réduire les animations » du système.
- **Paiement selon le pays** (`src/lib/payments`) : l'élève paie en réservant, dans sa devise et avec les moyens de son pays. Cameroun et Afrique centrale : MTN Mobile Money, Orange Money ou carte, en FCFA. Afrique de l'Ouest (UEMOA) : Orange, MTN, Moov ou carte, en FCFA. Nigeria, Ghana, Kenya, etc. : mobile money ou carte en monnaie locale si un taux est fourni (`PAYMENT_FX_RATES`). Ailleurs : carte, Apple Pay ou Google Pay en euros. Les prix des tuteurs restent en euros (conversion FCFA exacte, taux fixe). Le tuteur ne voit une demande qu'une fois payée ; l'élève est remboursé si le tuteur refuse ou annule, ou s'il annule lui-même plus de 24 h avant. Un créneau non payé est libéré après 30 minutes. Prestataire : Flutterwave (`FLUTTERWAVE_SECRET_KEY`, webhook `/api/paiements/flutterwave`) ; sans clé, en développement, une caisse de démonstration permet de tester tout le parcours.
- **Messagerie** entre élèves et tuteurs.
- **Forum communautaire** par catégorie et par langue.
- **Administration** : statistiques, validation des tuteurs, gestion des membres, modération.

## Architecture

- **Next.js 16** (App Router, Server Components, Server Actions), **React 19**, **Tailwind CSS 4**, **MongoDB** (driver officiel).
- `src/lib/db.ts` : connexion MongoDB, types des documents, index, données de démo au premier lancement.
- `src/lib/queries.ts` : lectures utilisées par les pages.
- `src/lib/actions/*` : Server Actions. Chaque action vérifie l'identité et les droits côté serveur.
- `src/lib/classroom.ts` et `src/app/api/classe/[id]/route.ts` : ouverture de la salle, serveurs ICE, relais de signalisation WebRTC et chat de la classe.
- `src/components/Classroom.tsx` : la salle de classe côté navigateur.
- `src/components/ui.tsx` : composants de base, dont le logo Riya (`LogoMark`, `Logo`). Le logo est aussi dans `src/app/icon.svg` (favicon) et `public/riya-logo.svg`.

### Comment marche la visio

La vidéo et le son passent **directement entre les navigateurs** de l'élève et du tuteur (WebRTC) : rien ne transite par le serveur, et il n'y a aucun abonnement à payer. Le serveur sert seulement à mettre les deux navigateurs en relation, en relayant l'offre, la réponse et les candidats ICE via MongoDB.

Sur certains réseaux très fermés (réseaux d'entreprise, certains opérateurs mobiles), la connexion directe est impossible. Il faut alors un serveur relais **TURN**. Renseignez `TURN_URLS`, `TURN_USERNAME` et `TURN_CREDENTIAL` (voir `.env.example`). Vous pouvez héberger [coturn](https://github.com/coturn/coturn) ou utiliser un service TURN managé.

## Avant la mise en production

- **Reconnaissance vocale** : la transcription passe par le service de reconnaissance vocale du navigateur (chez Chrome, les serveurs de Google) et ne reconnaît pas encore le wolof, le yoruba, le lingala, etc. Pour une transcription plus fiable ou dans plus de langues, on peut brancher un service de reconnaissance vocale dédié.
- **IA (OpenAI / ChatGPT)** : ajoutez `OPENAI_API_KEY` dans `.env.local` (clé créée sur platform.openai.com > API keys). Le modèle par défaut est `gpt-5.5` ; changez-le avec `OPENAI_MODEL`. Elle sert au résumé des cours, aux réponses de l'assistant en classe et aux quiz proposés. Le résumé est d'autant meilleur que la séance a été transcrite (assistant IA accepté) ou que le tuteur a pris des notes.
- **HTTPS obligatoire** : les navigateurs n'autorisent la caméra que sur une page sécurisée.
- **TURN** pour fiabiliser la visio (voir ci-dessus).
- **Paiement** : créer un compte Flutterwave (entreprise camerounaise), renseigner `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_WEBHOOK_HASH` et `SITE_URL`, puis tester avec les clés de test avant les clés réelles. Les versements aux tuteurs (part après commission `RIYA_COMMISSION`) se font encore à la main.
- **E-mails** : confirmation d'inscription, mot de passe oublié, notifications.
- **Hébergement** : la signalisation fonctionne par requêtes régulières. Elle convient à un hébergement classique comme serverless, avec une base MongoDB Atlas.
