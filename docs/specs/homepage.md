# Homepage

> Related: [blog](blog.md) · [homepage dog](homepage-dog.md) · [Apps and Agents menus](nav-menus.md) · [visitor total](visitor-counter.md)

## Problem Statement
A visitor who opens Aloong's site needs to see at once who Aloong is, what Aloong has written lately, and which apps, skills and plugins Aloong has made, without going to another page.

## Solution
The homepage opens with Aloong's portrait and a golden retriever, with an introduction beneath them and the newest posts beside them. The apps follow, then the skills and plugins.

## Functional Requirements

### homepage::REQ-001 First screen

The first screen of the homepage holds the seated blue-shirt portrait of Aloong together with the golden retriever, an introduction, and the visitor line of visitor-counter::REQ-001/AC-02.

- homepage::REQ-001/AC-01: On a window wider than 700px, the portrait and the dog stand together on the right of the first screen, with the introduction and the visitor line beneath them.
- homepage::REQ-001/AC-02: On a window 700px wide or narrower, the portrait and the dog stand together, centered in the window, with the introduction and the visitor line beneath them. The list of recent posts (blog::US-001/AC-07) follows.

## Constraints

### homepage::CON-001 One appearance, one language (direct acceptance)

Applies to: the homepage. The page uses the site's fixed light appearance and single language.
