# CareerCarve Backend Assignment

### Project Overview:

You need to build a web application where students can book 1x1 sessions with mentors based on both parties' availabilities and certain preferences. The application should handle scheduling, mentor-student matching based on areas of interest, and payment processing.

### **Define Your Data Models**:

- **Mentors** and **Students** will be your primary data models.
- **Mentors** have attributes like `name`, `availability`, `areas_of_expertise`, and `is_premium`.
- **Students** might have `name`, `availability`, and `area_of_interest`.

- **Backend**: Use Node.js and Express for your server setup. This will handle requests from your frontend, interact with your database, and return data to the frontend.
- **Database**: Start with SQLite for simplicity. You'll need tables for students, mentors, and bookings.

### **Building the Backend**:

- **Express.js Setup**: Initialize your Node.js project and set up Express to handle incoming HTTP requests.
- **Database Integration**: Connect your Express application to SQLite. Define schemas for your data models.
- **API Routes**: Create routes to handle API requests:
    - `GET /mentors`: Fetch all mentors.
    - `POST /bookings`: Create a new booking.
    - `GET /bookings`: Retrieve bookings for a student or mentor.

