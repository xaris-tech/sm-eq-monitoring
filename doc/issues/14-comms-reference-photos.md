# 14 — Reference photos for equipment parts

**What to build:** Users can see what each part looks like without leaving the checklist. Each of the 9 comms items, plus the Beltpack, Headset, and In-ear monitor sections, shows a small thumbnail. Tapping it opens a full-size viewer that closes with a tap, Escape, or a close button. Items without a photo show a non-tappable "No photo yet" placeholder, never a broken image. Photos are static files bundled with the app, compressed to about 800px wide and lazy-loaded. The product owner supplies photos of the church's actual gear, which get resized and wired in as they arrive. Addresses feedback from Jennifer Carbonel. See [PRD §3.2](../PRD-comms-checklist-feedback.md).

**Blocked by:** None — can start immediately.

**Status:** done

- [x] All 12 entries show either a thumbnail or the placeholder
- [x] The viewer is usable at 360px width and closable by keyboard
- [x] Images are lazy-loaded with the item name as alt text
- [x] No broken-image icon appears for missing photos
- [x] Photos supplied by the product owner are resized and wired in

## Comments

**2026-09-28 — built; waiting on photos.** `COMMS_PHOTOS` in `js/config.js` holds all 12 photo paths in one place (the 9 comms items plus `BELTPACK`, `HEADSET`, `IN-EAR`), all `''` for now. This replaces the PRD's "optional `photo` on each item" so every photo is wired from a single list. Each comms item shows a 48px thumbnail left of its name. The Beltpack and Headset sections have a reference strip (Beltpack, In-ear monitor / Headset). An empty path renders a non-tappable dashed "No photo yet" tile. An image that fails to load is swapped for the same tile by a capture-phase `error` listener. The full-screen viewer opens on tap, focuses Close, and closes on a tap anywhere, Escape, or Close, returning focus to the thumbnail. `img/comms/README.md` explains how to shoot, size, name and wire photos.

Also fixed a layout regression this ticket introduced: at 360px the thumbnail squeezed the item name into the status buttons. The item header now wraps (name basis 120px), so the buttons move to their own line on narrow phones.

Verified: frontend `node --test` shows 47/47 passing (3 new: every item and device has a photo slot, configured paths exist on disk, markup and handlers present). In headless Chromium at 360px:
- 9 item placeholders and 3 strip placeholders, 0 broken images.
- A wrong path (`img/comms/does-not-exist.jpg`) fell back to the placeholder with no `<img>` left.
- A real image (`SM-log.png`, standing in for a supplied photo) showed with alt "Base Station" and `loading=lazy`. Tapping opened the viewer with focus on Close; Escape closed it and returned focus to the thumbnail. A tap on the image and the Close button also close it. Opening it never changed the item's status.
- No overlaps and no sideways scroll at 360, 390 and 768px (screenshots checked).

**Needs a human (criterion left unchecked):** "Photos supplied by the product owner are resized and wired in". No photos exist yet. Once they're sent, resize to ~800px / ~100KB, drop them in `img/comms/`, and fill the paths in `COMMS_PHOTOS`. The "configured paths exist" test catches typos.

**2026-09-28 — photos wired in.** The product owner supplied 11 photos (all but the in-ear monitor). Each was renamed to its item code, flattened onto white, and saved as a progressive JPEG at quality 85 (4–30KB; all were already under 800px wide). Paths are set in `COMMS_PHOTOS`. Per the owner's request, the "SM1" sticker was removed from the beltpack and headset photos so one generic image serves all SM1–SM8. The sticker area was refilled from the surrounding pixels; on the headset the fill follows the ear cup's curved edge, with the background filled separately. Originals were kept outside the repo.

Verified: frontend tests 47/47, including "configured photo paths exist". In headless Chromium at 390px all 11 images loaded (none broken), In-ear monitor shows "No photo yet", and the Beltpack and Headset viewers show the unlabelled images. No console errors.

**Still open:** there is no in-ear monitor photo yet. When one arrives, add `img/comms/IN-EAR.jpg` and set `'IN-EAR'` in `COMMS_PHOTOS`.

**2026-09-28 — in-ear slot removed.** The product owner confirmed in-ear monitors are personal equipment, one per person, with no shared unit to photograph. The `IN-EAR` photo slot and its "No photo yet" tile are gone; the reference photos are now the 9 comms items plus Beltpack and Headset (11, all supplied). Nothing is left open on this ticket.
