# Lunch & Learn: Accessibility Basics

**Date:** 2026-11-19
**Presenter:** Naomi Botha (Design)
**Attendees:** about 14 people from Design, Engineering and Product

---

**Naomi Botha:** Thanks for joining. Today is just a knowledge share, no decisions or homework. I want to cover three things: colour contrast, keyboard navigation, and screen readers.

**Naomi Botha:** First, contrast. WCAG AA asks for a contrast ratio of 4.5 to 1 for body text and 3 to 1 for large text. A lot of the light grey placeholder text we see around the web fails this.

**Kabelo Dlamini:** Does that apply to disabled buttons too?

**Naomi Botha:** Good question. Disabled controls are exempt under WCAG, but it's still kind to make them readable.

**Naomi Botha:** Second, keyboard navigation. Everything you can click should be reachable with Tab, and focus should always be visible. Removing the focus outline without replacing it is one of the most common mistakes.

**Fatima Patel:** What about modals?

**Naomi Botha:** Modals should trap focus while open and return focus to the button that opened them when they close.

**Naomi Botha:** Third, screen readers. Use real buttons and links instead of clickable divs, label your form inputs, and give images meaningful alt text, or empty alt text if they're decorative.

**Kabelo Dlamini:** It would be nice to audit our app one day.

**Naomi Botha:** Maybe! But that's a conversation for planning, not today. Nobody is signing up for anything here.

**Naomi Botha:** That's it from me. The slides are in the shared design folder if you want to revisit them. Thanks everyone.
