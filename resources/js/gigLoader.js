export function loadGigs(jsonPath, listElementId) {
  function renderUpcomingGigs(gigArray) {
    const today = new Date();
    const list = document.getElementById(listElementId);
    list.innerHTML = "";

    const upcomingGigs = gigArray.filter((gig) => new Date(gig.date) >= today);

    if (upcomingGigs.length === 0) {
      list.innerHTML =
        "<li class='list-group-item'>No upcoming gigs at this time.</li>";
      return;
    }

    upcomingGigs.sort((a, b) => new Date(a.date) - new Date(b.date));

    for (const gig of upcomingGigs) {
      const gigDate = new Date(gig.date);
      const formattedDate = gigDate.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      let dateLine = `<span class="gig-date">${formattedDate}</span>`;
      if (gig.time) {
        const formattedTime = formatTime(gig.time);
        dateLine += ` <span class="gig-date">@ ${formattedTime}</span>`;
      }

      let locationHTML = "";
      if (gig.location) {
        if (gig.locationUrl) {
          locationHTML = `<div class="gig-location"><a href="${gig.locationUrl}" target="_blank" class="text-muted fst-italic">${gig.location}</a></div>`;
        } else {
          locationHTML = `<div class="gig-location text-muted fst-italic">${gig.location}</div>`;
        }
      }

      let titleHTML = "";
      if (gig.eventUrl) {
        titleHTML = `<a href="${gig.eventUrl}" target="_blank" class="gig-title fw-bold fs-5 text-decoration-none">${gig.title}</a>`;
      } else {
        titleHTML = `<div class="gig-title fw-bold fs-5">${gig.title}</div>`;
      }

      const item = document.createElement("li");
      item.className = "list-group-item py-4 mb-3 border shadow-sm";
      item.innerHTML = `
        <div class="mb-2">
          <div class="gig-title fw-bold fs-5">${titleHTML}</div>
          <div class="text-muted">${dateLine}</div>
          ${locationHTML}
        </div>
        <p class="mb-0">${gig.description}</p>
      `;
      list.appendChild(item);
    }
  }

  // Format "HH:mm" to "h:mm AM/PM"
  function formatTime(rawTime) {
    if (/am|pm/i.test(rawTime)) return rawTime;
    const [hours, minutes] = rawTime.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return rawTime;
    const date = new Date();
    date.setHours(hours, minutes);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  fetch(jsonPath)
    .then((response) => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then((data) => renderUpcomingGigs(data))
    .catch((error) => {
      console.error("Failed to load gigs:", error);
      const list = document.getElementById(listElementId);
      list.innerHTML =
        "<li class='list-group-item text-danger'>Unable to load gigs.</li>";
    });
}
