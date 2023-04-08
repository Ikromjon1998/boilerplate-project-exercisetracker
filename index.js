const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const shortid = require('shortid')
require('dotenv').config()

console.log(process.env.DB_URI);

connectToDatabase();

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  _id: { type: String, default: shortid.generate }, 
  logs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Exercise' }]
});

const ExerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Exercise = mongoose.model("Exercise", ExerciseSchema);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const user = new User({ username });
    await user.save();
    res.json({ username: user.username, _id: user._id });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const { _id } = req.params;
  try {
    const user = await User.findById(_id);
    if (!user) throw new Error("User not found");
    const exercise = new Exercise({ userId: user._id, description, duration, date });
    await exercise.save();
    user.logs.push(exercise._id);
    await user.save();
    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date ? exercise.date.toDateString() : null // check if date is set
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const { _id } = req.params;
  try {
    const user = await User.findById(_id).populate('logs');
    if (!user) throw new Error("User not found");
    let log = user.logs.map(exercise => ({
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date ? exercise.date.toDateString() : null // check if date is set
    }));
    if (from) log = log.filter(exercise => exercise.date >= new Date(from));
    if (to) log = log.filter(exercise => exercise.date <= new Date(to));
    if (limit) log = log.slice(0, limit);
    res.json({
      _id: user._id,
      username: user.username,
      count: user.logs.length,
      log
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to database');
  } catch (error) {
    console.error('Error connecting to database', error);
  }
}
