import React from "react";
import BookingFormSection from "@/components/public/BookingFormSection";

export const metadata = {
  title: "Book the Band | Eagleburger Band Pittsburgh",
  description: "Request the Eagleburger Band for parades, street festivals, weddings, and private events. Check musician availability and rates.",
};

export default function BookingPage() {
  return (
    <div className="pb-16" suppressHydrationWarning>
      <BookingFormSection
        headline="Book the Eagleburger Band"
        subheadline="Tell us about your event. We will check band availability, outline performance options, and follow up with you promptly."
        badgeText="Direct Event Inquiry"
        defaultEventType="Community Parade & Festival"
        buttonText="Submit Booking Request"
      />
    </div>
  );
}