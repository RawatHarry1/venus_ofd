// server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const app = express();
const port = 3000;

// Import the bootstart index.js to setup routes and middleware
require('./bootstart/index')(app); // This will apply middleware and routes

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
