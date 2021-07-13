require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportlocalmongoose = require("passport-local-mongoose");
const multer = require("multer");
const path = require("path");
const helpers = require("./helpers");
const tf = require('@tensorflow/tfjs');
const tfnode = require("@tensorflow/tfjs-node");
const fs = require("fs");


const app = express();
app.set('view engine', 'ejs');
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true,
}));
app.use(session({
  secret: "MySecretKey",
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

const storage = multer.diskStorage({
  destination: function(req, file, cb){
    cb(null, "public/uploads/")
  },

  filename: function(req, file, cb){
    cb(null, file.fieldname+" - "+Date.now()+path.extname(file.originalname));
  }
});

async function load_model() {
    let m = await tf.loadLayersModel('file://xray/jsonModel/model.json')
    return m;
}

const model = load_model();


mongoose.connect("mongodb+srv://admin-neelanjan:neelanjan12@cluster0.yq9iq.mongodb.net/HealthDB?retryWrites=true&w=majority", {useNewUrlParser:true, useUnifiedTopology: true});
mongoose.set("useCreateIndex", true);

const detailsSchema = new mongoose.Schema({
  name: String,
  username: String,
  age: String,
  height: String,
  weight: String,
  fId: String,
  bloodgrp: String,
  disease: String,
  status: String,
  xraystatus: String
});

const userSchema = new mongoose.Schema({
  username: String,
  password: String
});


userSchema.plugin(passportlocalmongoose);


const Details = mongoose.model("Details", detailsSchema);
const User = mongoose.model("Users", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function(req, res){
  if(req.isAuthenticated()){
    console.log(req);
    res.render("home", {title: "Home", loggedIn: true, doctor: false});
  }
  else{
    res.render("home", {title: "Home", loggedIn: false, doctor: false});
  }
});

app.get("/login", function(req, res){
  if(req.isAuthenticated()){
    res.redirect("/patient/dashboard");
  }else{
    res.render("login", {title: "Login", loggedIn: false, doctor: false});
  }
});

app.get("/signup", function(req, res){
  if(req.isAuthenticated()){
    res.redirect("/patient/dashboard");
  }else{
    res.render("signup",{title: "SignUp", loggedIn: false, doctor: false});
  }
});

app.get("/profile", function(req, res){
  const accUser = req.user.username;
  const userN = "";
  console.log(accUser)
  Details.findOne({username: accUser}, function(err, user){
    if(err){
      console.log(err);
    }else{
      console.log(user.name);
      res.render("profile", {title: "Profile", loggedIn: true, userName: user.name, doctor: false});
    }
  });
});

app.get("/patient/dashboard", function(req, res){
  if(!req.isAuthenticated()){
    res.redirect("/login");
  }else{
    const accUser = req.user.username;
    Details.findOne({username: accUser}, function(err, user){
      if(err){
        console.log(err);
      }else{
        res.render("patient_dashboard", {title: "Dashboard", loggedIn:true, userName: user.name, doctor: false});
      }
    });
  }

});

app.get("/pharmacy", function(req, res){
  if(req.user.username!=="doctor@gmail.com")
  res.render("pharmacy", {title: "Pharmacy", loggedIn: true, doctor: false});
  else {
    res.render("pharmacy", {title: "Pharmacy", loggedIn: true, doctor: true});
  }
});

app.get("/patient/family", function(req, res){
  const accUser = req.user.username;
  Details.findOne({username: accUser}, function(err, user){
    if(user.fId==="0"){
      res.render("family",{title:"family", loggedIn: true, userName: user.name, members: [], doctor: false});
    }else{
      Details.find({fId: user.fId}, function(err, users){
        console.log(users);
        res.render("family", {title:"family", loggedIn: true, userName: user.name, members: users, doctor: false});
      })
    }
  });
});

app.get("/doctor", function(req, res){
  if(req.isAuthenticated()){
    Details.find({}, function(err, users){
      const memberP = [];
      users.forEach(function(user){
        if(user.username !== "doctor@gmail.com"){
          memberP.push(user);
        }
      });
      res.render("doctor", {title: "Doctor Dash", loggedIn: true, userName: "Doctor", members: memberP, doctor: true});
    });
  }else{
    res.redirect("/login");
  }
});

app.get("/doctor/diagnosis", function(req, res){
  if(req.isAuthenticated() && req.user.username ==="doctor@gmail.com"){
    res.render("diagnosis", {title: "Diagnosis", loggedIn: true, doctor: true, userName:"Doctor"});
  }
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  if(req.body.username === "doctor@gmail.com"){
    req.login(user, function(err){
      if(err){
        console.log(err);
      }else{
        passport.authenticate("local")(req, res, function(){
          res.redirect("/doctor");
        })
      }
    });
  }else{
    req.login(user, function(err){
      if(err){
        console.log(err);
      }
      else{
        passport.authenticate("local")(req, res, function(){
          res.redirect("/patient/dashboard");
        })
      }
    });
  }
});

app.post("/signup", function(req, res){
  const newName = req.body.name;
  const newEmail = req.body.username;
  const newPassword = req.body.password;
  const confPass = req.body.confpassword;
  console.log(req.body);
  if(newPassword!=confPass){
    res.redirect("/signup");
  }else{
    const newDet = new Details({
      name: newName,
      username: newEmail,
      fId: "0",
      disease: "",
      status: "Safe",
      xraystatus: "Not Uploaded",
    });
    newDet.save();
    User.register({username: req.body.username}, req.body.password, function(err, user){
      if(err){
        res.redirect("/signup");
      }else{
        passport.authenticate("local")(req, res, function(){
          res.redirect("/profile");
        });
      }
    });
  }
});

app.post("/profile", function(req, res){
  const accUser = req.user.username;
  const heightU = req.body.height;
  const weightU = req.body.weight;
  const ageU = req.body.age;
  const bloodgrpU = req.body.bloodgrp;
  Details.updateOne({username: accUser}, {height: heightU, weight: weightU, age: ageU, bloodgrp: bloodgrpU}, function(err){
    if(err){
      console.log(err);
    }
    else{
      res.redirect("/patient/dashboard");
    }
  });

});

app.post("/doctor/diagnosis", function(req, res){
  const duser = req.body.username;
  const name = req.body.name;
  const disease = req.body.disease;
  const status = req.body.status;

  Details.updateOne({username: duser}, {disease: disease, status: status}, function(err){
    if(err){
      console.log(err);
    }else{
      res.redirect("/doctor");
    }
  })
})

app.post("/patient/family", function(req, res){
  const famUser = req.body.memberUser;
  const currUser = req.user.username;
  Details.findOne({username: famUser}, function(err, user){
    if(err){
      res.redirect("/patient/family")
      console.log(err);
    }else{
      if(user.fId === "0"){
        Details.findOne({username: currUser}, function(err, userC){
          if(userC.fId === "0"){
              Details.find({}, function(err, users){
                const max = 0;
                users.forEach(function(user){
                  const a = parseInt(user.fId);
                  if(a>max){
                    max=a;
                  }
                });
                const assignFam = max+1;
                const assignF = assignFam.toString();
                Details.updateOne({username: currUser},{fId: assignF}, function(err){
                  if(err){
                    res.redirect("/patient/family");
                    console.log(err);
                  }else{
                    Details.updateOne({username: famUser}, {fId: assignF}, function(err){
                      if(err){
                        res.redirect("/patient/family");
                        console.log(err);
                      }
                      else{
                        res.redirect("/patient/family");
                      }
                    });
                  }
                });
              });
          }else{
            Details.updateOne({username: famUser}, {fId: userC.fId}, function(err){
              if(err){
                console.log(err);
              }else{
                res.redirect("/patient/family");
              }
            });
          }
        });
      }else{
        Details.updateOne({username: currUser}, {fId: user.fId}, function(err){
          if(err){
            console.log();
          }else{
            res.redirect("/patient/family");
          }
        });
      }
    }
  });
});

const readImage = path => {
  const imageBuffer = fs.readFileSync(path);
  const tfimage = tfnode.node.decodeImage(imageBuffer, 3);
  const tarImage = tf.image.resizeBilinear(tfimage, [224, 224]).toFloat();
  const offset = tf.scalar(255.0);
  const normalized = tf.scalar(1.0).sub(tarImage.div(offset));
  const batched = normalized.expandDims(0);
  return batched;
}

app.post("/patient/dashboard", function(req, res){
  const upload = multer({storage: storage, fileFilter: helpers.imageFilter}).single('xray_pic');
  upload(req, res, function(err){
    if(err){
      console.log(err);
    }else{
      const path = req.file.path.split('\\').join('/');
      const path1 = path.substring(6);
      //const predImage = readImage(path);
      //const answer = model.predict(predImage);
      model.then(function (res1) {
        const predImage = readImage(path);
        const prediction = res1.predict(predImage).dataSync();
        console.log(prediction[0]);
        console.log(req);
        if(prediction[0]>=0.25){
          Details.updateOne({username: req.user.username}, {disease: "COVID-19", status: "Threatened", xraystatus: "Positive"}, function(err){
            const resS = "You have a high chance of having COVID-19 as per your xray. Please consult a doctor immediately.";
            res.render("xrayres",{title: "Xray", userName: req.user.username, loggedIn: true, resString: resS, doctor: false});
          });
        }
        else{
          Details.updateOne({username: req.user.username}, {disease: "", status: "Not Threatened", xraystatus: "Negative"}, function(err){
            const resS = "Your xray does not indicate COVID-19. You are safe.";
            res.render("xrayres",{title: "Xray", userName: req.user.username, loggedIn: true, resString: resS, doctor: false});
          });
        }
        }, function (err) {
          console.log(err);
        });
      //console.log(answer);
      //res.render("imageres",{path: path1})
    }
  })
});

app.listen(process.env.PORT||3000, function(req, res){
  console.log("Server started on port 3000.")
});
