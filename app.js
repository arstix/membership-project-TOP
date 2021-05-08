/////// app.js

const express = require("express");
const bcrypt = require('bcryptjs');
const path = require("path");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const expressValidator = require('express-validator');
const { check, body, validationResult } = require('express-validator');
const bodyParser = require('body-parser')
const flash = require('connect-flash');
const cors = require('cors')
const cookieParser = require('cookie-parser');
const async = require('async')



const mongoDb = "mongodb+srv://user:GYDi9Suubjtb5WDf@cluster0.wa0e7.mongodb.net/myFirstDatabase?retryWrites=true&w=majority";


mongoose.connect(mongoDb, { useUnifiedTopology: true, useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "mongo connection error"));

const User = mongoose.model(
  "User",
  new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    confirmPassword: { type: String, required: true },
    isMember: { type: Boolean },
    isAdmin: { type: Boolean }
  })
);

const Messages = mongoose.model(
  "Messages",
  new Schema({
    title: { type: String, required: true },
    message: { type: String, required: true },
    author: { type: String, required: true },
  })
);



const app = express();
app.set("views", __dirname);
app.set("view engine", "ejs");

const urlencodedParser = bodyParser.urlencoded({extended: false})
app.use(session({ secret: "cats", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.use(cors())
app.use(cookieParser());
app.use(express.static('public'));
app.use(flash());
app.use(function(req, res, next) {
  res.locals.currentUser = req.user;
  next();
});
app.use(passport.initialize());

// Password authenthication for login
passport.use(
  new LocalStrategy({passReqToCallback: true,},(req,username, password, done) => {
    User.findOne({ username: username }, (err, user) => {
      if (err) {
        return done(err);
      };
      if (!user) {
        return done(null, false, req.flash('error', 'Incorrect username'));
      }
      bcrypt.compare(password, user.password, (err, res) => {
      if (res) {
        // passwords match! log user in
        return done(null, user)
      } else {
            return done(null, false, { message: 'Incorrect password please try again' })

      }
    })
    });
  })
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.get('/', (req,res) => {
  async.parallel({
      messages: function(callback) {
        Messages.find({}).exec(callback)
      },

  }, function(err, results) {
      if (err) { return next(err); }
      if (results.messages==null) { // No results.
          var err = new Error('Author not found');
          err.status = 404;
          return next(err);
      }
      // Successful, so render.
  res.render("index", { user: req.currentUser, messages: results.messages, author: results.author, delete: results.delete })
})
})
app.get('/login', (req,res) => {
  var messages = req.flash().error || []
  res.render("login", {messages})
})

app.post('/login',
  passport.authenticate('local', { successRedirect: '/',
                                 failureRedirect: '/login',
                                  failureFlash: true
                                 })
)

app.get('/sign-up', (req,res) =>
  res.render("signup")
)

app.post('/sign-up', check('password').exists(),
  check('confirmPassword',
    'Passwords fields must match')
    .exists()
    .custom((value, { req }) => value === req.body.password),
  (req, res) => {
    var error = validationResult(req);
     if (!error.isEmpty()) {
         const alert = error.array()
         res.render("signup", { alert: alert })
     } else {
       const user = new User({
         username: req.body.username,
         password: req.body.password,
         confirmPassword: req.body.confirmPassword,
         isMember: false,
         isAdmin: false
       })

       bcrypt.hash(user.password, 10, (err, hashedPassword) => {
           if (err) {
             return next(err)
           } else {
             user.password = hashedPassword
             user.confirmPassword = hashedPassword
             user.save()
             res.redirect('/')
           }
     });
   }});

   app.get('/admin', (req, res) => {
     res.render("admin")
   })

   app.post('/admin', (req, res) => {
     if(req.body.secret !== "adminroom") {
       req.flash("Error message")
       res.redirect('/admin')
       return
     }
     User.updateOne({username: req.user.username}, {$set:{isAdmin: true}}, (err, result)=>{
       if(err){
           res.send("Server Error, please try later");
           return;
           console.log(req.user)
       }
       if(result){
           req.flash("success", "Congratulations, You are a admin now");
           res.redirect("/")
       } else{
           res.send("Server Error, please try later");
           return;
       }
   })
})


   app.get('/private-club', (req, res) => {
     res.render("private-club")
   })

   app.post('/private-club', (req, res) => {
      if(req.body.secret !== "hostroom") {
        req.flash("Error message")
        res.redirect('/private-club')
        return
      }
      User.updateOne({username: req.user.username}, {$set:{isMember: true}}, (err, result)=>{
        if(err){
            res.send("Server Error, please try later");
            return;
        }
        if(result){
            req.flash("success", "Congratulations, You are a member now");
            res.redirect("/")
        } else{
            res.send("Server Error, please try later");
            return;
        }
    })
})


   app.get('/create-message', (req, res) => {
     res.render("create-message")
   })

   app.post('/create-message', (req, res) => {
      const message = new Messages({
        title: req.body.title,
        message: req.body.message,
        author: req.user.username
      })
        message.save()
        res.redirect('/')
   })

   app.get('/delete/:id', (req, res) => {
     Messages.findByIdAndRemove(req.params.id, function(err, message){
        res.render("delete.pug", {
          message: message
        })
     })
   })


   app.get("/log-out", (req, res) => {
     req.logout();
     res.redirect("/");
   });



app.use(express.urlencoded({ extended: false }));
app.listen(3000, () => console.log("app listening on port 3000!"));
