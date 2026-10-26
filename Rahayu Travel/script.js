"use strict";

// Demo front-end. Configure a real backend and secure admin authentication before production.
const PRICE = 90000;
const ADMIN_WA = "6282285206168";
const DEMO_PIN = "rahayutravelgacor2026";

// Helper utilities
const $ = (selector) => document.querySelector(selector);
const money = (number) => new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
}).format(number);

// LocalStorage reader with fallback
const readLocalStorage = (key, fallback) => {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
};

// Initial state data
let bookings = readLocalStorage("goodtravel_bookings", []);
let times = readLocalStorage("goodtravel_times", ["07:00", "10:00", "13:00", "16:00"]);

// Save data to localStorage
function saveData() {
    localStorage.setItem("goodtravel_bookings", JSON.stringify(bookings));
    localStorage.setItem("goodtravel_times", JSON.stringify(times));
}

// Toast notification helper
function notify(message) {
    const toastElement = $("#toast");
    toastElement.textContent = message;
    toastElement.style.display = "block";
    setTimeout(() => {
        toastElement.style.display = "none";
    }, 3200);
}

// Route synchronization between "From" and "To" selects
function routeSync(direction) {
    if (direction === "from") {
        $("#to").value = $("#from").value === "Pekanbaru" ? "Pangkalan Kerinci" : "Pekanbaru";
    } else {
        $("#from").value = $("#to").value === "Pekanbaru" ? "Pangkalan Kerinci" : "Pekanbaru";
    }
}

$("#from").addEventListener("change", () => routeSync("from"));
$("#to").addEventListener("change", () => routeSync("to"));

// Render schedules and times configuration
function renderTimes() {
    const selectTime = $("#time");
    const currentSelectedTime = selectTime.value;
    
    // Update dropdown options
    selectTime.replaceChildren(...times.map(t => new Option(t, t)));
    if (times.includes(currentSelectedTime)) {
        selectTime.value = currentSelectedTime;
    }

    // Render schedule cards in UI
    $("#scheduleCards").replaceChildren(...times.map(t => {
        const card = document.createElement("article");
        card.className = "glass schedule-card";
        
        const timeDiv = document.createElement("div");
        timeDiv.className = "time";
        timeDiv.textContent = t + " WIB";
        
        const title = document.createElement("h3");
        title.textContent = "Pangkalan Kerinci ↔ Pekanbaru";
        
        const description = document.createElement("p");
        description.textContent = "Jadwal contoh. Ketersediaan wajib dikonfirmasi admin.";
        
        const priceDiv = document.createElement("div");
        priceDiv.className = "price";
        priceDiv.textContent = money(PRICE) + " / kursi";
        
        card.append(timeDiv, title, description, priceDiv);
        return card;
    }));

    // Render time tag controls inside admin dashboard
    $("#timeTags").replaceChildren(...times.map(t => {
        const button = document.createElement("button");
        button.textContent = t + " ×";
        button.onclick = () => {
            times = times.filter(x => x !== t);
            saveData();
            renderTimes();
        };
        return button;
    }));
}

// Set minimum date input to today
const now = new Date();
$("#date").min = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

// Live total price recalculation based on seats
$("#seats").addEventListener("input", () => {
    const seatsCount = Math.max(1, Number($("#seats").value) || 1);
    $("#total").textContent = money(PRICE * seatsCount);
});

// Handle Booking Form Submission
$("#bookingForm").addEventListener("submit", (e) => {
    e.preventDefault();
    
    const newBooking = {
        id: Date.now().toString(36),
        name: $("#name").value.trim(),
        phone: $("#phone").value.trim(),
        from: $("#from").value,
        to: $("#to").value,
        date: $("#date").value,
        time: $("#time").value,
        seats: Number($("#seats").value),
        pickup: $("#pickup").value,
        address: $("#address").value.trim(),
        status: "Menunggu"
    };

    // Validation check
    if (!newBooking.name || !newBooking.phone || !newBooking.address || !newBooking.date || 
        newBooking.date < $("#date").min || newBooking.from === newBooking.to || 
        !newBooking.time || newBooking.seats < 1 || newBooking.seats > 6) {
        notify("Periksa kembali data booking.");
        return;
    }

    bookings.unshift(newBooking);
    saveData();
    renderDashboard();
    notify("Booking tersimpan di browser ini. Lanjutkan konfirmasi WhatsApp.");

    // Format WhatsApp message
    const waMessage = `Halo GOOD TRAVEL, saya ingin booking.%0AID: ${encodeURIComponent(newBooking.id)}%0ANama: ${encodeURIComponent(newBooking.name)}%0AWhatsApp: ${encodeURIComponent(newBooking.phone)}%0ARute: ${encodeURIComponent(newBooking.from + " - " + newBooking.to)}%0ATanggal: ${encodeURIComponent(newBooking.date)}%0AJam: ${encodeURIComponent(newBooking.time)}%0AKursi: ${newBooking.seats}%0AJemput: ${encodeURIComponent(newBooking.pickup + " / " + newBooking.address)}%0AEstimasi: ${encodeURIComponent(money(newBooking.seats * PRICE))}`;
    
    const anchor = document.createElement("a");
    anchor.href = `https://wa.me/${ADMIN_WA}?text=${waMessage}`;
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    anchor.click();
    
    e.target.reset();
    $("#total").textContent = money(PRICE);
    routeSync("from");
});

// Admin Dialog Controls
const dialog = $("#adminDialog");
$("#openAdmin").onclick = () => dialog.showModal();
$("#closeAdmin").onclick = () => dialog.close();

// Admin Login Handler
$("#loginBtn").onclick = () => {
    if ($("#pin").value !== DEMO_PIN) {
        notify("PIN demo salah.");
        return;
    }
    $("#loginView").hidden = true;
    $("#dashboard").hidden = false;
    renderDashboard();
};

// Render Admin Dashboard Data & Stats
function renderDashboard() {
    const totalSeats = bookings.reduce((sum, b) => sum + b.seats, 0);
    $("#bookingCount").textContent = bookings.length;
    $("#seatCount").textContent = totalSeats;
    $("#revenue").textContent = money(totalSeats * PRICE);

    const tableBody = $("#rows");
    tableBody.replaceChildren();

    bookings.forEach((bookingItem) => {
        const tr = document.createElement("tr");
        
        [bookingItem.name, `${bookingItem.from} → ${bookingItem.to}`, `${bookingItem.date} ${bookingItem.time}`, bookingItem.seats].forEach(val => {
            const td = document.createElement("td");
            td.textContent = val;
            tr.append(td);
        });

        // Status update select element
        const tdStatus = document.createElement("td");
        const selectStatus = document.createElement("select");
        ["Menunggu", "Dikonfirmasi", "Selesai", "Dibatalkan"].forEach(statusOption => {
            selectStatus.add(new Option(statusOption, statusOption));
        });
        selectStatus.value = bookingItem.status;
        selectStatus.onchange = () => {
            bookingItem.status = selectStatus.value;
            saveData();
        };
        tdStatus.append(selectStatus);
        tr.append(tdStatus);

        // Delete action button
        const tdAction = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Hapus";
        deleteButton.onclick = () => {
            if (confirm("Hapus booking ini?")) {
                bookings = bookings.filter(x => x.id !== bookingItem.id);
                saveData();
                renderDashboard();
            }
        };
        tdAction.append(deleteButton);
        tr.append(tdAction);

        tableBody.append(tr);
    });
}

// Add new schedule/time form handler
$("#timeForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const newTimeValue = $("#newTime").value;
    if (newTimeValue && !times.includes(newTimeValue)) {
        times.push(newTimeValue);
        times.sort();
        saveData();
        renderTimes();
        notify("Jadwal demo ditambahkan.");
    }
    e.target.reset();
});

// Export Bookings data to CSV
$("#exportCsv").onclick = () => {
    const csvRows = [
        ["ID", "Nama", "WhatsApp", "Dari", "Ke", "Tanggal", "Jam", "Kursi", "Penjemputan", "Alamat", "Status"],
        ...bookings.map(b => [b.id, b.name, b.phone, b.from, b.to, b.date, b.time, b.seats, b.pickup, b.address, b.status])
    ];
    
    const csvContent = "\ufeff" + csvRows.map(row => row.map(val => '"' + String(val).replace(/"/g, '""') + '"').join(",")).join("\r\n");
    const blobUrl = URL.createObjectURL(new Blob([csvContent], { type: "text/csv;charset=utf-8" }));
    
    const downloadAnchor = document.createElement("a");
    downloadAnchor.href = blobUrl;
    downloadAnchor.download = "good-travel-bookings.csv";
    downloadAnchor.click();
    
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
};

// Initial triggers
renderTimes();
renderDashboard();