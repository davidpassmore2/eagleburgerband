# Stage 61: Verification Walkthrough & Testing Guide

This guide walks through verifying the newly implemented Stage 61 features: CMS Studio Modernization for Public System Pages, Smart Form Wrappers (`audition_form`, `contact_form`), Dynamic Section Rendering, and Safe Fallbacks across all public routes.

---

### Scenario 1: Audition Form Section in CMS Pages Studio (`/admin/pages`)

1. **Navigate to Pages Studio:**
   - Log in as an administrator or web manager and open `/admin/pages`.
2. **Select the "Join the Band" Page:**
   - Click on the `join` page in the system pages list.
   - Verify that the sections list auto-hydrates if previously empty, showing default sections including an **Audition Form** (`audition_form`) section.
3. **Customize Audition Form Section:**
   - In the section editor for the Audition Form, update:
     - **Headline**: e.g. "Come Play With Us!"
     - **Subheadline**: e.g. "We rehearse weekly and welcome brass, woodwinds, and percussionists."
     - **Badge Text**: e.g. "Auditions Open"
     - **Button Text**: e.g. "Send My Audition Request"
   - Click **Save Page**.
4. **Verify on Public Site:**
   - Navigate to `/join`.
   - Verify that the custom headline, subheadline, badge, and button label are rendered.
   - Submit a test audition to verify that validation, honeypot protection, and Firestore writes to `audition_submissions` work seamlessly.

---

### Scenario 2: Contact Form Section in CMS Pages Studio (`/admin/pages`)

1. **Select the "Contact" Page:**
   - In `/admin/pages`, switch to the `contact` page.
   - Verify that the sections list contains a **Contact Form** (`contact_form`) section and Quick Path cards.
2. **Customize Contact Form Section:**
   - In the section editor for the Contact Form, update:
     - **Headline**: e.g. "Connect With The Band"
     - **Subheadline**: e.g. "Send us an inquiry or reach out about performances."
     - **Badge Text**: e.g. "Direct Contact"
     - **Button Text**: e.g. "Submit Inquiries"
   - Click **Save Page**.
3. **Verify on Public Site:**
   - Navigate to `/contact`.
   - Verify that the custom copy and button text appear on the contact form.
   - Submit a test inquiry and ensure the confirmation banner displays and the document is saved to `contact_submissions`.

---

### Scenario 3: Section Reordering & Fallback Protections

1. **Reorder Sections on `/join` or `/contact`:**
   - In `/admin/pages`, use the **Move Up / Move Down** controls on the `join` or `contact` page sections.
   - Click **Save Page**.
   - Check the corresponding public URL and verify that the sections render in the updated sequence.
2. **Test Fallback Guards:**
   - In `/admin/pages`, delete the form section from `join` or `book` and save.
   - Open `/join` or `/book` in the browser.
   - Verify that the route cleanly falls back to the default code-level form wrapper, ensuring visitors never hit a broken page or missing contact channel.

---

### Scenario 4: All Public System Pages Dynamic Verification

1. **Verify `/book`:**
   - Confirm CMS sections are rendered from `pageData.sections`, including the `booking_form`.
2. **Verify `/gigs`:**
   - Confirm public gig listings render at the top, followed by any dynamic CMS sections configured in `/admin/pages`.
3. **Verify `/giving`:**
   - Confirm sponsor & donation highlights render cleanly without React children array errors.
4. **Verify `/testimonials`:**
   - Confirm testimonials catalog renders alongside any custom CMS banner or narrative blocks.

