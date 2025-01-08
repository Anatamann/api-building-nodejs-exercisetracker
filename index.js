require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose')
const app = express();

//--------- Initial configuration------------

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//-----------Mongoose database connection-------------

try{
  mongoose.connect(process.env.URI /*,{ useNewUrlParser: true, useUnifiedTopology: true }*/);
  console.log("Mongoose Database connected");
} catch(err){console.err(err)}

//--------------ModelSchema----------------------------

const userschema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  exerciselog: [{
      type: mongoose.Schema.Types.ObjectId, ref: 'Exercise'
    }]
});

const User = mongoose.model('User', userschema);

const exerciseschema = new mongoose.Schema({
  Userid: {
    type: mongoose.Schema.Types.ObjectId, ref: 'User',
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    // default: Date.now,
    validator: function(value) {
      if (value) {
        // Parse the input date string in 'yyyy-mm-dd' format
        const parsedDate = new Date(value);
        return isNaN(parsedDate) ? Date.now() : parsedDate; // Return current date if parsing fails
      }
      return Date.now(); // Return current date if no value is provided
      }
    }
});

const Exercise = mongoose.model('Exercise', exerciseschema);

//---------------------------------------------


//-------------------api/users-post--------------------

app.post('/api/users', async (req,res) =>{
  const newUser = req.body.username;
  if (!newUser) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try{
    const savedUser = await new User({username: newUser}).save();
    res.json({
      username: savedUser.username,
      _id: savedUser._id
    });
  } catch(err){
    res.status(400).json({error: err.message});
  }

});
//---------------------------------------------------

//--------------------api/users-get-------------------------
app.get('/api/users', async(req,res) => {
  try{
  const allUsers =  await User.find({},{username: 1, _id: 1});
  //const usernames = allUsers.map(user => user.username);
  //const ids = allUsers.map(user => user._id);
  res.json(allUsers);
  } catch(err){
    res.status(400).json({error: err.message});
  }
});

//----------------------------------------------------

//----------------api/:_id/exercise-post-------------------

app.post('/api/users/:_id/exercises', async (req,res) => {
  const userid = req.params._id;
  //console.log(req.body);

  try{
    const user = await User.findById(userid);
    if(!user){
      return res.status(404).json({error: 'User not found'});
    }
    const description = req.body.description;
    const duration = req.body.duration;
    const date = req.body.date ? new Date(req.body.date) : new Date();
    if(isNaN(date)){
      return res.status(400).json({error: 'Invalid date'});
    }
    
    const newExercise = new Exercise({
      Userid: userid,
      description: description,
      duration: duration,
      date: date.toDateString()
    });
    //console.log(newExercise);
    try{
    const savedExercise = await newExercise.save();
    user.exerciselog.push(savedExercise._id);
    await user.save();
    res.json({
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
      _id: user._id});
    } catch(err){res.json(err.message)};

  }catch(err){res.json(err.message)};
});
//-------------------------------------------------------

//-----------------api/users/:_id/logs-------------------
app.get('/api/users/:_id/logs', async (req,res) =>{
  const userid = req.params._id;
  if(!userid){ return res.status(404).json({error: 'Input a User_id'});}
  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  
  const user = await User.findById(userid).populate('exerciselog');
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  let logs = user.exerciselog;
  //console.log(logs);
    if (from) {
      logs = logs.filter(log => new Date(log.date) >= from);
    }
    
    if (to) {
      logs = logs.filter(log => new Date(log.date) <= to);
    }
    if (limit){
      logs = logs.slice(0, limit);
    }

    const userlog = {
      username: user.username,
      count: logs.length,
      _id: user._id,
      log: logs.map(log => ({
        description: log.description,
        duration: log.duration,
        date: log.date.toDateString()
      }))
    };
    res.json(userlog)
  
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
