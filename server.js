const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const moment = require('moment')

const cors = require('cors')

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI);
const userSchema = new mongoose.Schema({ username: String});
const exerciseSchema = new mongoose.Schema({ 
  userId: mongoose.ObjectId,
  description: String,
  duration: Number,
  date: Date
});
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(cors());

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post(
  '/api/exercise/new-user',
  (req, res) => {
    const user = new User({
      username: req.body.username
    });

    user.save((error, data) => {
      if(error) console.log(error);
      
      res.json({username: data.username,_id: data._id});
    });
  }
);

app.post(
  '/api/exercise/add',
  (req, res) => {

    let date = req.body.date ? moment(req.body.date) : moment();

    const exercise = new Exercise({
      userId: req.body.userId,
      description: req.body.description,
      duration: parseInt(req.body.duration),
      date: date
    });

    exercise.save((error, data) => {
      if(error) console.log(error);
      
      let user = User.findById(data.userId, (error, user) => {
        if(error) console.log(error);

        res.json({
          _id: data.userId,
          username: user.username,
          description: data.description,
          duration: parseInt(data.duration),
          date: moment(data.date).format('ddd MMM DD YYYY')
        });
      });

    });
  }
);

app.get(
  '/api/exercise/log',
  (req, res) => {
    User.findById(
      req.query.userId, 
      async (error, data) => {
        if(error) console.log(error);

        let logQuery = Exercise.find({userId: req.query.userId});
        
        if(req.query.limit) logQuery.limit(parseInt(req.query.limit));

        let exercises = await logQuery.exec();

        res.json({
          _id: data._id,
          username: data.username,
          count: exercises.length,
          log: exercises.map(e => e = {
            description: e.description,
            duration: e.duration,
            date: moment(e.date).format('ddd MMM DD YYYY')
          })
        });
      }
    );
  }
);

app.get(
  '/api/exercise/users',
  async (req, res) =>  {
    let users = await User.find({}).exec();

    res.json(users);
  }
);

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
