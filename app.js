// ---------- CONFIG MODULES ----------
const Sequelize = require('sequelize')
const express = require('express')
const bodyParser = require('body-parser')
const session = require('express-session')
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const app = express();


// ---------- BCRYPT ----------
const bcrypt = require('bcrypt');
const saltRounds = 10;
const myPlaintextPassword = 'myPassword';
const someOtherPlaintextPassword = 'somePassword';


// ---------- SEQUELIZE ----------
const sequelize = new Sequelize('blog_app', process.env.POSTGRES_USER, null, {
    host: 'localhost',
    dialect: 'postgres',
    storage: './session.postgres',
    define: {
        timestamps: true
    }
});


// ---------- VIEWS ----------
app.use(express.static('public'))
app.set('views', 'views')
app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({ extended: true }));


// ---------- SESSIONS & SEQUELIZE STORE ----------
app.use(session({
    store: new SequelizeStore({
        db: sequelize,
        checkExpirationInterval: 15 * 60 * 1000,
        expiration: 24 * 60 * 60 * 1000
    }),
    secret: "safe",
    saveUnitialized: true,
    resave: false
}));


// ---------- MULTER ---------- 
const multer  = require('multer')
const myStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/user-images')
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now())
    }
})
const upload = multer({ storage: myStorage });


// ---------- MODEL DEFINITIONS ----------
const User = sequelize.define('users', {
    firstname: { type: Sequelize.STRING },
    lastname: { type: Sequelize.STRING },
    username: { type: Sequelize.STRING },
    email: { type: Sequelize.STRING },
    password: { type: Sequelize.STRING },
    profilePicture: { type: Sequelize.STRING }
})

const Blogpost = sequelize.define('blogposts', {
    title: { type: Sequelize.STRING },
    body: { type: Sequelize.TEXT }
})

const Comment = sequelize.define('comments', {
    argument: { type: Sequelize.TEXT }
})


// ---------- TABLE ASSOCIATIONS ----------
// User table : no foreign keys
// Blogpost table : 1 foreign key (user)
// Comment table : 2 foreign keys (blogpost & user)
User.hasMany(Blogpost);
Blogpost.belongsTo(User);

User.hasMany(Comment);
Comment.belongsTo(User);

Blogpost.hasMany(Comment);
Comment.belongsTo(Blogpost)

sequelize.sync();






//  ROUTING 



// -------------------- HOME / LOGIN FORM --------------------

// ---------- (GET) index.pug  
app.get('/', function(request, response) {
    response.render('index', {
        message: request.query.message,
        user: request.session.user
    });
});

// ---------- (POST) index.pug 
app.post('/', function(request, response) {

    var email = request.body.email
    var password = request.body.password

    User.findOne({
        where: {
            email: email
        }
    })
    .then(function(user) {
        if (user !== null) {
            bcrypt.compare(password, user.password, function(err, res) { // compare PW with hash in DB
                if(res) {
                    request.session.user = user;
                    console.log('SESSION IS' + request.session.user);
                    response.redirect('profile');
                } else {
                    response.redirect('/?message=' + encodeURIComponent('Login not successful! Please try again.'));
                }  
            })
        } else {
            response.redirect('/?message=' + encodeURIComponent('This email address does not exist.'));
        }
    })
    .catch(function(error) {
        console.error(error)
    })
});





// -------------------- SIGNUP FORM --------------------

// ---------- (GET) signup.pug 
app.get("/signup", (req, res) => {
    res.render("signup");
})

// ---------- (POST) signup.pug, redirect to /profile
app.post('/signup', upload.single('profileImage'), (req, res, next) => {
    let path = req.file.path.replace('public', '')
    bcrypt.hash(req.body.password, 10)
    .then(function(hash) {
        
        User.create({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            username: req.body.username,
            email: req.body.email,
            password: hash,
            profilePicture: path

        }).then((user) => {
        req.session.user = user;
        res.redirect ('profile');
        })
    })
})





// --------------------PROFILE PAGES--------------------

// ---------- (GET) profile.pug 


app.get('/profile', function(request, response) {
    const banana = request.session.user;

    Blogpost.findAll({
        where: {
            userId: banana.id
        },
        include: [{
            model: User
        }]
    })
        .then((blogposts) => {
            console.log(blogposts)
            const mapped = blogposts.map(function(object) {
                return object.dataValues;
            });
            console.log(mapped);
            response.render('profile', { user: banana, userposts: mapped });
    })
});


// app.get('/profile', function(request, response) {
    
//     const user = request.session.user;

//     Blogpost.findAll({
//         where: {
//             userId: user.id
//         }
//     })
//     .then((blogposts) => {
//         const mapped = blogposts.map( function(object) {
//             return object.dataValues;
//         });

//         response.render('profile', { user: user, userposts: mapped});
//     })
// });



// --------------------PROFILE ID--------------------



// ---------- (GET) profile_one.pug --- indiv. profile page
app.get('/allusers/:profileId', (req,res) =>{

    const profileId = req.params.profileId;

    User.findOne({
        where: {
            id: profileId
        },
        include: [{
            model: Blogpost
        }]
    })
    .then(function(user) {
        res.render("profile_one", {id: profileId, firstname: user.firstname, lastname: user.lastname, email: user.email, username: user.username, profilePicture: user.profilePicture})
    })
})






// --------------------NEW ENTRY--------------------

// ---------- (GET) newentry.pug
app.get('/newentry', function(req, res) {
    console.log('Logged in user is ' + req.session.user.username)
    res.render("newentry");
});

// ---------- (POST) newentry.pug --- redirect to entry_one.pug
app.post('/newentry', function(req, res) {

    var title = req.body.title;
    var body = req.body.body;

    var userId = req.session.user.id

    User.findOne({
        where: {
            id: userId
        }
    })
        .then(function(user) {
            return user.createBlogpost({
                title: title,
                body: body,
                userId: userId
            })
        })
        .then((blogpost) => {
            res.redirect(`/entries/${blogpost.id}`);
        })
});





// --------------------ALL ENTRIES--------------------

// ---------- (GET) entries.pug
app.get('/entries', function(req, res) {

    Blogpost.findAll({
            include: [{
                model: User
            }]
        })
        .then((blogposts) => {
            res.render('entries', { postList: blogposts })
        })
})

// ---------- (GET) entry_one.pug --- blogpostId
app.get('/entries/:blogpostId', function(req, res) {
    
    const blogpostId = req.params.blogpostId;

    let post = {};
    let author = {};

    Blogpost.findOne({
            where: {
                id: blogpostId
            },
            include: [{
                model: User}]
            })
    .then(function(blogpost) {
        post = blogpost.dataValues;
        author = blogpost.user.dataValues;

        return Comment.findAll({
            where: {
                blogpostId: blogpostId
            },
            include: [{
                model: User}]
        })
    })
    .then( comments => {
        const mappedComments = comments.map( function(object) {
            return object.dataValues;
        });

        res.render("entry_one", { blogpost: post, user: author, comments: mappedComments});
    });
});




// app.get('/entries/:blogpostId', function(req, res) {
    
//     const blogpostId = req.params.blogpostId;

//     let post = {};
//     let author = {};

//     Blogpost.findOne({
//             where: {
//                 id: blogpostId
//             },
//             include: [{
//                 model: User
//             },{model: Comment}]
//         })
//         .then(function(blogpost) {
//             // console.log(`Blogpost is ${JSON.stringify(blogpost)}`)
//             // go through the list os userId's 

//             res.render("entry_one", { title: blogpost.title, body: blogpost.body, id: blogpostId, userValue: blogpost.user, commentValue: blogpost.comments});
//         })
// });





// --------------------ALL USERS--------------------

// ---------- (GET) allusers.pug
app.get('/allusers', function (request, response) {
    User.findAll().then(function (users) {
        users = users.map(function (userRow) {
            var columns = userRow.dataValues;
            return {
                id: columns.id,
                firstname: columns.firstname,
                lastname: columns.lastname,
                username: columns.username,
                email: columns.email,
                profilePicture: columns.profilePicture
            }
        });

        response.render('allusers', {
            userResults: users
        });
    });
});





// --------------------COMMENTS--------------------
// no pug page
// exists on entry_one.pug

// ---------- (POST)
app.post('/entry_one/:blogpostId', function(req, res) {
   
    var argument = req.body.argument;
    var userId = req.session.user.id;
    var blogpostId = req.params.blogpostId;

    User.findOne({
        where: {
            id: userId
        }
    })
        .then(function(user) {
            return user.createComment({
                argument: argument,
                userId: userId,
                blogpostId: blogpostId
            })
        })
        .then((comment) => {
            res.redirect(`/entries/${comment.blogpostId}`);
        })
});




// --------------------LOGOUT--------------------

// ---------- (GET) no pug page
app.get('/logout', function (request, response) {
    request.session.destroy(function(error) {
        if(error) {
            throw error;
        }
        response.redirect('/?message=' + encodeURIComponent('Successfully logged out.'));
    })
});





// ---------- PORT ----------
app.listen(3000, function() {
    console.log("App listening on port 3000")
})