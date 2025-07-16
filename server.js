const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Load data or initialize
const USERS_File = path.join(__dirname,"users.json");
const usersFile='users.json';


const deedsFile = 'deeds.json';


let users = [];
let deeds = [];

if (fs.existsSync(usersFile)) {
  try {
    users = JSON.parse(fs.readFileSync(usersFile));
  } catch (err) {
    console.error("❌ Error parsing users.json:", err.message);
  }
}

if (fs.existsSync(deedsFile)) {
  try {
    deeds = JSON.parse(fs.readFileSync(deedsFile));
  } catch (err) {
    console.error("❌ Error parsing deeds.json:", err.message);
  }
}

// Save JSON to file
function saveToFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Simple login system (NO password hashing — for demo only)
app.post('/auth/register', (req, res) => {
  const { email, password } = req.body;
  if (users.find(u => u.email === email)) {
    return res.json({ success: false, message: 'Email already exists' });
  }
  const user = { email, password, karma: 0 };
  users.push(user);
  saveToFile(usersFile, users);
  res.json({ success: true });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    res.json({ token: email }); // token = email for demo
  } else {
    res.json({ error: 'Invalid credentials' });
  }
});

// Middleware to simulate token
function authMiddleware(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  const user = users.find(u => u.email === token);
  if (!user) return res.status(401).json({ error: 'Invalid token' });
  req.user = user;
  next();
}
// Dashboard route
app.get("/dashboard", authMiddleware, (req, res) => {
  res.json({
    email: req.user.email,
    karma: req.user.karma || 0,
    deeds: [] // add real deeds if needed later
  });
});

// Upload config
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (_, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Submit a good deed
app.post('/submit', authMiddleware, upload.single('image'), (req, res) => {
  const deed = {
    id: Date.now(),
    email: req.user.email,
    description: req.body.description,
    image: req.file ? `/uploads/${req.file.filename} `: null,
    status: 'pending'
  };
  deeds.push(deed);
  saveToFile(deedsFile, deeds);
  res.json({ success: true });
});

// Get user dashboard
app.get('/dashboard', authMiddleware, (req, res) => {
  const userDeeds = deeds.filter(d => d.email === req.user.email);
  res.json({
    karma: req.user.karma,
    deeds: userDeeds
  });
});

// Admin view deeds
app.get('/admin/deeds', (req, res) => {
  res.json(deeds);
});
app.get('/',(req,res)=>{
res.send('🎉 KarmaCraft server is running!');
});
// Approve a deed
app.post('/admin/approve', (req, res) => {
  const { id } = req.body;
  const deed = deeds.find(d => d.id === id);
  if (deed && deed.status === 'pending') {
    deed.status = 'approved';
    const user = users.find(u => u.email === deed.email);
    if (user) user.karma += 10;
    saveToFile(usersFile, users);
    saveToFile(deedsFile, deeds);
    return res.json({ success: true });
  }
  res.json({ success: false });
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});