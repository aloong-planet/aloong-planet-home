# Site appearance

> Related: [homepage](homepage.md) · [blog](blog.md) · [not-found page](not-found.md) · [Apps and Agents menus](nav-menus.md) · [site languages](site-languages.md)

## Problem Statement
A visitor whose system is set to a dark appearance should find every page of the site in the dark appearance too, as each app site it links to already is, rather than a page of bright colours.

## Solution
Every page of the site follows the system's light or dark appearance. Diagrams and pictures keep their own light colours in both.

## Functional Requirements

### site-appearance::REQ-001 The system decides the appearance (direct acceptance)

Every page of the site, the homepage, the Blog page, every post page and the not-found page in each of their languages, shows its light appearance while the system asks for light and its dark appearance while it asks for dark, from its first frame. A change of the system setting while a page is open changes the page at once, without a reload. The site offers no appearance switch and stores no choice.

### site-appearance::REQ-002 Diagrams and pictures keep their light colours

- site-appearance::REQ-002/AC-01: A diagram drawn in a post (a figure that is not an image file) keeps its light colours in both appearances. In the dark appearance it shows on a light sheet behind its drawing area, in the page and in the larger view; this sheet is an exception to blog::US-004/AC-01.
- site-appearance::REQ-002/AC-02: Images (post covers, animated images, app screenshots, the portrait, the dog and the site icon) show unchanged in both appearances.

## Quality Requirements

### site-appearance::QR-001 Contrast in both appearances

Applies to: the text of every page, in each appearance; text inside images is excluded.

- site-appearance::QR-001/AC-01: Text has a contrast of at least 4.5:1 against the ground it is drawn on, in the light and in the dark appearance. The post accent's own minimum is blog::US-003/AC-10.

## Failure modes and boundaries

- Scripting unavailable: both appearances work, and a page follows a change of the system setting (site-appearance::REQ-001).
- A system that states no appearance preference: the light appearance.
- A transparent image, such as the portrait and the dog, shows over the dark ground in the dark appearance (site-appearance::REQ-002/AC-02).

## Out of Scope

- Dark versions of diagrams and images: diagrams are drawn for a light ground, and the images are the apps' and the posts' own.
- Appearances other than light and dark, such as high contrast.
