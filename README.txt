Uncounted Solar Gigawatts - Web GIS Demo Web App
================================================

Overview
--------
This is a web-based GIS application that visualizes solar PV, building, and Area of Interest (AOI) datasets on a Google Satellite basemap. It interactively computes solar installed capacity and other key metrics and allows the user to download dynamic reports containing high-fidelity maps, data visualizations, and calculated energy metrics for any selected geographic region.

Prerequisites
-------------
- Docker and Docker Compose
- Node.js (Optional, for local development without Docker)

How to Run (Dockerized - Preferred)
-----------------------------------
1. Open a terminal in the project directory.
2. Run the following command to build and start the containers:
   docker-compose up --build -d

3. The application consists of two main services:
   - Client (React Frontend): Available at http://localhost:3000
   - Server (Node.js Backend): Available at http://localhost:5000
   - Database (PostGIS): Running on port 5433

4. Access the web app in your browser at http://localhost:3000.

Note: The database container ('db') will automatically initialize using the seed data if configured, or you can run the seed script manually.
To run the seed script manually:
   docker exec -it projectsubmission-server-1 npm run seed

How to Stop
-----------
Run the following command to stop the containers:
   docker-compose down



Features Implemented
--------------------
- Custom Google Satellite basemap integration with togglable labels.
- Accurate Capacity Calculations matching the formulas provided (No. of Panels = Solar_Area / 2.58, Installed Capacity = Panels * 580).
- Advanced AOI and interactive spatial selection (draw a polygon to instantly calculate stats).
- HeraldX corporate branding and premium UI/UX.
- Dynamic PDF Generation.
- PostGIS spatial backend for real-time intersection queries.

GitHub Repository
-----------------
The complete source code for this project is available on GitHub:
https://github.com/tcantbenormal/Project-Submission