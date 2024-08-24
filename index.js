const express = require("express");
const path = require("path");
const cors = require("cors");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

app.use(express.json());
app.use(cors());

const dbPath = path.join(__dirname, "database.db");

let db = null;

const initializeDBAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        app.listen(3000, () => {
            console.log("Server is running at http://localhost:3000");
        })
    } catch (e) {
        console.log(`DB Error: ${e.message}`);
        process.exit(1);
    }
}

initializeDBAndServer();

// GET API to retrieve all the mentors
app.get("/mentors", async (request, response) => {
    try {
        const getMentorsQuery = `SELECT * FROM mentors`;
        const mentors = await db.all(getMentorsQuery);
        response.json(mentors);
    } catch (e) {
        console.log(`Error Getting Mentors: ${e.message}`);
        response.status(500).send("An error occured while retriving the mentors");
    }
});

// POST API to create new mentor
app.post("/mentors", async (request, response) => {
    const mentorDetails = request.body;
    const { name, availability, areas_of_expertise, is_premium } = mentorDetails;
    try {
        const createMentorQuery = `
            INSERT INTO mentors (name, availability, areas_of_expertise, is_premium)
            VALUES (?, ?, ?, ?)
        `;
        const mentorId = await db.run(createMentorQuery, [name, availability, areas_of_expertise, is_premium]);
        response.json({ id: mentorId.lastID, ...mentorDetails });
    } catch (e) {
        console.log(`Error Creating Mentor: ${e.message}`);
        response.status(500).send("An error occured while creating the mentor");
    }
});

// GET API to retrieve all students
app.get("/students", async (request, response) => {
    try {
        const getStudentsQuery = `SELECT * FROM students`;
        const students = await db.all(getStudentsQuery);
        response.json(students);
    } catch (e) {
        console.log(`Error Getting Students: ${e.message}`);
        response.status(500).send("An error occured while retriving the students");
    }
});

// POST API to create a new student
app.post("/students", async (request, response) => {
    const studentDetails = request.body;
    const { name, availability, area_of_interest } = studentDetails;
    try {
        const createStudentQuery = `
            INSERT INTO students (name, availability, area_of_interest)
            VALUES (?, ?, ?)
        `;
        const studentId = await db.run(createStudentQuery, [name, availability, area_of_interest]);
        response.json({ id: studentId.lastID, ...studentDetails });
    } catch (e) {
        console.log(`Error Creating Student: ${e.message}`);
        response.status(500).send("An error occured while creating the student");
    }
});

// POST API to create a new booking
app.post("/bookings", async (request, response) => {
    const bookingDetails = request.body;
    const { student_id, area_of_interest, mentor_id, duration, scheduled_time } = bookingDetails;

    try {
        let mentor;

        if (mentor_id) {
            // If a specific mentor is selected (premium service)
            mentor = await db.get(`SELECT * FROM mentors WHERE id = ?`, [mentor_id]);
        } else {
            // Assign an available mentor based on the student's area of interest
            mentor = await db.get(`
                SELECT * FROM mentors
                WHERE areas_of_expertise LIKE '%' || ? || '%' AND availability >= ?
                ORDER BY is_premium DESC, availability ASC
                LIMIT 1
            `, [area_of_interest, scheduled_time]);
        }

        if (!mentor) {
            return response.status(400).send("No available mentor found for the selected time or area of interest");
        }

        // Check if the mentor is available at the selected time
        const existingBookings = await db.all(`
            SELECT * FROM bookings WHERE mentor_id = ? AND scheduled_time = ?
        `, [mentor.id, scheduled_time]);

        if (existingBookings.length > 0) {
            return response.status(400).send("Mentor is not available at the selected time");
        }

        let sessionCost = 0; // Default cost for non-premium mentors

        if (mentor.is_premium === 1) {
            // Calculate payment based on duration for premium mentors
            const basePrice = 2000;
            const durationFactor = duration / 30;
            sessionCost = basePrice * durationFactor;
        }

        // Create booking
        const createBookingQuery = `
            INSERT INTO bookings (student_id, mentor_id, scheduled_time, duration)
            VALUES (?, ?, ?, ?)
        `;
        const bookingId = await db.run(createBookingQuery, [student_id, mentor.id, scheduled_time, duration]);

        response.json({
            id: bookingId.lastID,
            ...bookingDetails,
            sessionCost // Only show the integer value of the cost if applicable
        });
    } catch (e) {
        console.log(`Error Creating Booking: ${e.message}`);
        response.status(500).send("An error occurred while creating the booking");
    }
});

// GET API to get all bookings for a specific student
app.get("/bookings/student/:studentId", async (request, response) => {
    const { studentId } = request.params;
    try {
        const getBookingsQuery = `
            SELECT 
                bookings.id AS booking_id,
                students.name AS student_name,
                mentors.name AS mentor_name,
                bookings.scheduled_time,
                bookings.duration
            FROM bookings 
            INNER JOIN students ON bookings.student_id = students.id
            INNER JOIN mentors ON bookings.mentor_id = mentors.id
            WHERE bookings.student_id = ?
        `;
        const bookings = await db.all(getBookingsQuery, [studentId]);
        response.json(bookings);
    } catch (e) {
        console.log(`Error Retrieving Bookings: ${e.message}`);
        response.status(500).send("An error occured while retrieving the bookings for a specific student");
    }
});

// GET API to get all bookings for a specific mentor
app.get("/bookings/mentor/:mentorId", async (request, response) => {
    const { mentorId } = request.params;
    try {
        const getBookingsQuery = `
            SELECT 
                bookings.id AS booking_id, 
                students.name AS student_name, 
                mentors.name AS mentor_name, 
                bookings.scheduled_time,
                bookings.duration 
            FROM bookings 
            INNER JOIN students ON bookings.student_id = students.id 
            INNER JOIN mentors ON bookings.mentor_id = mentors.id 
            WHERE bookings.mentor_id = ?
        `;
        const bookings = await db.all(getBookingsQuery, [mentorId]);
        response.json(bookings);
    } catch (e) {
        console.log(`Error Retrieving Bookings: ${e.message}`);
        response.status(500).send("An error occured while retrieving the bookings for a specific mentor");
    }
});

// DELETE API to cancle a booking
app.delete("/bookings/:bookingId", async (request, response) => {
    const { bookingId } = request.params;
    try {
        const deleteBookingQuery = `DELETE FROM bookings WHERE id = ?`;
        await db.run(deleteBookingQuery, [bookingId]);
        response.send({ message: "Booking cancelled successfully" });
    } catch (e) {
        console.log(`Error Cancelling Booking: ${e.message}`);
        response.status(500).send("An error occured while cancelling the booking");
    }
});

// PUT API to update a mentor's availability
app.put("/mentors/:mentorId", async (request, response) => {
    const { mentorId } = request.params;
    const { availability } = request.body;
    try {
        const updateMentorQuery = `UPDATE mentors SET availability = ? WHERE id = ?`;
        await db.run(updateMentorQuery, [availability, mentorId]);
        response.send({ message: "Mentor's availability updated successfully" });
    } catch (e) {
        console.log(`Error Updating Mentor's Availability: ${e.message}`);
        response.status(500).send("An error occured while updating the mentor's availability");
    }
});

// PUT API to update a student's availability
app.put("/students/:studentId", async (request, response) => {
    const { studentId } = request.params;
    const { availability } = request.body;
    try {
        const updateStudentQuery = `UPDATE students SET availability = ? WHERE id = ?`;
        await db.run(updateStudentQuery, [availability, studentId]);
        response.send({ message: "Student's availability updated successfully" });
    } catch (e) {
        console.log(`Error Updating Student's Availability: ${e.message}`);
        response.status(500).send("An error occured while updating the student's availability");
    }
});

module.exports = app;