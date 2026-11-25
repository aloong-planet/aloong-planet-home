# Homepage dog

## Problem Statement
The homepage dog should greet readers without requiring a pointer hover.

## Solution
Play the dog's greeting automatically and let readers pause it.

## Functional Requirements

### homepage-dog::REQ-001 Automatic greeting (direct acceptance)
After the page and motion images finish loading, the visible homepage dog starts its entry animation and loops the wagging segment. Pointer proximity and pointer departure do not control playback.

### homepage-dog::REQ-002 Pause and resume (direct acceptance)
The dog button is named “小狗摇尾巴” on the Chinese homepage and "Dog wagging its tail" on the English homepage. Clicking it or activating it with Enter or Space toggles playback. Its pressed state reflects whether playback is requested. Pausing before the motion images load keeps the dog still when they arrive.

### homepage-dog::REQ-003 Background pages (direct acceptance)
A hidden page stops drawing animation frames. Returning to the visible page resumes the greeting if playback is requested, preserving a manual pause.

### homepage-dog::REQ-004 Reduced motion (direct acceptance)
When the browser requests reduced motion, requested playback shows a still greeting frame instead of continuous animation. Turning reduced motion off resumes requested playback.

### homepage-dog::REQ-005 Loading failure (direct acceptance)
The sitting dog remains visible while motion images load or if decoding fails. Other homepage content remains usable.

## Out of Scope
New dog artwork, new page layout and changes to the not-found dog are excluded.
